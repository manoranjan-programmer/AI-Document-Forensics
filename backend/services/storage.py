"""
Database and Storage Service
Provides persistent storage using Supabase PostgreSQL if credentials are provided,
or an SQLite + local JSON file fallback for offline/development environments.
"""

import os
import json
import sqlite3
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path
from dotenv import load_dotenv

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(ENV_PATH)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
os.makedirs(DATA_DIR, exist_ok=True)
SQLITE_DB_PATH = os.path.join(DATA_DIR, "forensics.db")
OUTPUTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "outputs"))
os.makedirs(OUTPUTS_DIR, exist_ok=True)


class StorageService:
    def __init__(self):
        self.supabase_client = None
        self.use_supabase = False

        if SUPABASE_URL and SUPABASE_KEY and SUPABASE_URL != "your_supabase_url":
            try:
                from supabase import create_client
                # Normalize Supabase base URL (strip /rest/v1 or trailing slashes)
                clean_url = SUPABASE_URL.split("/rest/v1")[0].rstrip("/")
                self.supabase_client = create_client(clean_url, SUPABASE_KEY)
                self.use_supabase = True
                print("Connected to Supabase Storage & Database.")

                # Ensure 'documents' storage bucket exists in Supabase
                try:
                    existing_buckets = [b.name for b in self.supabase_client.storage.list_buckets()]
                    if "documents" not in existing_buckets:
                        self.supabase_client.storage.create_bucket("documents", options={"public": True})
                        print("Created Supabase storage bucket 'documents'.")
                except Exception as b_err:
                    print(f"Supabase bucket verification: {b_err}")

            except Exception as e:
                print(f"Supabase connection failed, falling back to local SQLite: {e}")
                self.use_supabase = False
        else:
            print("Supabase credentials not configured. Using local SQLite storage.")

        self._init_sqlite()

    def _init_sqlite(self):
        with sqlite3.connect(SQLITE_DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS investigations (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                progress REAL DEFAULT 0.0,
                current_step TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                investigation_id TEXT,
                original_filename TEXT NOT NULL,
                saved_filename TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                content_type TEXT NOT NULL,
                page_count INTEGER DEFAULT 1,
                supabase_url TEXT,
                uploaded_at TEXT NOT NULL
            )
            """)
            try:
                cursor.execute("ALTER TABLE documents ADD COLUMN supabase_url TEXT")
            except Exception:
                pass
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS agent_results (
                id TEXT PRIMARY KEY,
                investigation_id TEXT NOT NULL,
                agent_name TEXT NOT NULL,
                result_json TEXT NOT NULL,
                status TEXT NOT NULL,
                error TEXT,
                created_at TEXT NOT NULL
            )
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS evidence_items (
                id TEXT PRIMARY KEY,
                investigation_id TEXT NOT NULL,
                evidence_id TEXT NOT NULL,
                document TEXT NOT NULL,
                page INTEGER NOT NULL,
                evidence_type TEXT NOT NULL,
                bounding_box TEXT,
                detection_confidence REAL,
                related_text TEXT,
                explanation TEXT NOT NULL,
                source_level TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS investigation_reports (
                id TEXT PRIMARY KEY,
                investigation_id TEXT UNIQUE NOT NULL,
                report_json TEXT NOT NULL,
                pdf_path TEXT,
                status TEXT NOT NULL,
                overall_classification TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS human_reviews (
                id TEXT PRIMARY KEY,
                investigation_id TEXT UNIQUE NOT NULL,
                reviewer_name TEXT NOT NULL,
                decision TEXT NOT NULL,
                comments TEXT NOT NULL,
                reviewed_at TEXT NOT NULL,
                signature_url TEXT
            )
            """)
            try:
                cursor.execute("ALTER TABLE human_reviews ADD COLUMN signature_url TEXT")
            except Exception:
                pass
            conn.commit()

    # --- Investigation Methods ---
    def create_investigation(self, investigation_id: Optional[str] = None) -> str:
        inv_id = investigation_id or f"INV-{uuid.uuid4().hex[:8].upper()}"
        now = datetime.utcnow().isoformat()
        with sqlite3.connect(SQLITE_DB_PATH) as conn:
            conn.execute(
                "INSERT INTO investigations (id, status, progress, current_step, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (inv_id, "initialized", 0.0, "Ready to begin", now, now)
            )
            conn.commit()
        return inv_id

    def update_investigation_progress(self, investigation_id: str, status: str, progress: float, current_step: str):
        now = datetime.utcnow().isoformat()
        with sqlite3.connect(SQLITE_DB_PATH) as conn:
            conn.execute(
                "UPDATE investigations SET status = ?, progress = ?, current_step = ?, updated_at = ? WHERE id = ?",
                (status, progress, current_step, now, investigation_id)
            )
            conn.commit()

    def get_investigation(self, investigation_id: str) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(SQLITE_DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute("SELECT * FROM investigations WHERE id = ?", (investigation_id,)).fetchone()
            if not row:
                return None
            return dict(row)

    # --- Document Methods ---
    def upload_file_to_supabase(
        self,
        file_path: str,
        remote_filename: Optional[str] = None,
        content_type: Optional[str] = None,
        bucket_name: str = "documents",
    ) -> Optional[str]:
        """
        Uploads a document or generated artifact to the Supabase Storage bucket.
        Returns the public URL of the uploaded document in Supabase, or None if failed.
        """
        if not self.use_supabase or not self.supabase_client:
            return None
        if not os.path.exists(file_path):
            return None

        remote_name = remote_filename or os.path.basename(file_path)
        mime = content_type or ("application/pdf" if remote_name.endswith(".pdf") else "image/png")

        try:
            with open(file_path, "rb") as f:
                content = f.read()

            self.supabase_client.storage.from_(bucket_name).upload(
                remote_name,
                content,
                file_options={"content-type": mime, "upsert": "true"},
            )
            public_url = self.supabase_client.storage.from_(bucket_name).get_public_url(remote_name)
            print(f"[Supabase Storage] Document stored: {remote_name} -> {public_url}")
            return public_url
        except Exception as e:
            print(f"[Supabase Storage] Notice: could not upload {remote_name}: {e}")
            return None

    def save_document_record(self, doc_data: Dict[str, Any]) -> str:
        doc_id = doc_data.get("id") or f"DOC-{uuid.uuid4().hex[:8].upper()}"
        file_path = doc_data.get("file_path")
        saved_filename = doc_data.get("saved_filename")
        content_type = doc_data.get("content_type")

        # 1. Upload document directly to Supabase Storage bucket 'documents'
        supabase_url = doc_data.get("supabase_url")
        if not supabase_url and file_path and os.path.exists(file_path):
            supabase_url = self.upload_file_to_supabase(
                file_path=file_path,
                remote_filename=saved_filename,
                content_type=content_type,
                bucket_name="documents",
            )
            doc_data["supabase_url"] = supabase_url

        # 2. Persist record locally to SQLite
        with sqlite3.connect(SQLITE_DB_PATH) as conn:
            conn.execute(
                """INSERT OR REPLACE INTO documents 
                (id, investigation_id, original_filename, saved_filename, file_path, file_size, content_type, page_count, supabase_url, uploaded_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    doc_id,
                    doc_data.get("investigation_id"),
                    doc_data["original_filename"],
                    doc_data["saved_filename"],
                    doc_data["file_path"],
                    doc_data["file_size"],
                    doc_data["content_type"],
                    doc_data.get("page_count", 1),
                    supabase_url,
                    doc_data.get("uploaded_at", datetime.utcnow().isoformat()),
                )
            )
            conn.commit()

        # 3. If Supabase table exists in Postgres, synchronize document record
        if self.use_supabase and self.supabase_client:
            try:
                self.supabase_client.table("documents").upsert({
                    "id": doc_id,
                    "investigation_id": doc_data.get("investigation_id"),
                    "original_filename": doc_data["original_filename"],
                    "saved_filename": doc_data["saved_filename"],
                    "file_size": doc_data["file_size"],
                    "content_type": doc_data["content_type"],
                    "page_count": doc_data.get("page_count", 1),
                    "supabase_url": supabase_url,
                    "uploaded_at": doc_data.get("uploaded_at", datetime.utcnow().isoformat()),
                }).execute()
            except Exception:
                pass

        return doc_id

    def get_documents_by_investigation(self, investigation_id: str) -> List[Dict[str, Any]]:
        with sqlite3.connect(SQLITE_DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute("SELECT * FROM documents WHERE investigation_id = ?", (investigation_id,)).fetchall()
            return [dict(r) for r in rows]

    def get_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(SQLITE_DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
            return dict(row) if row else None

    # --- Agent Results ---
    def save_agent_result(self, investigation_id: str, agent_name: str, result: Dict[str, Any], status: str = "success", error: Optional[str] = None):
        result_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        with sqlite3.connect(SQLITE_DB_PATH) as conn:
            conn.execute(
                """INSERT INTO agent_results (id, investigation_id, agent_name, result_json, status, error, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (result_id, investigation_id, agent_name, json.dumps(result), status, error, now)
            )
            conn.commit()

    def get_agent_results(self, investigation_id: str) -> Dict[str, Any]:
        with sqlite3.connect(SQLITE_DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute("SELECT * FROM agent_results WHERE investigation_id = ? ORDER BY created_at ASC", (investigation_id,)).fetchall()
            results = {}
            for r in rows:
                results[r["agent_name"]] = {
                    "status": r["status"],
                    "error": r["error"],
                    "data": json.loads(r["result_json"]) if r["result_json"] else None,
                    "created_at": r["created_at"],
                }
            return results

    # --- Evidence Items ---
    def save_evidence_items(self, investigation_id: str, items: List[Dict[str, Any]]):
        now = datetime.utcnow().isoformat()
        with sqlite3.connect(SQLITE_DB_PATH) as conn:
            for item in items:
                pk = str(uuid.uuid4())
                conn.execute(
                    """INSERT INTO evidence_items 
                    (id, investigation_id, evidence_id, document, page, evidence_type, bounding_box, detection_confidence, related_text, explanation, source_level, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        pk,
                        investigation_id,
                        item.get("evidence_id", ""),
                        item.get("document", ""),
                        item.get("page", 1),
                        item.get("evidence_type", ""),
                        json.dumps(item.get("bounding_box")) if item.get("bounding_box") is not None else None,
                        item.get("detection_confidence"),
                        json.dumps(item.get("related_text", [])),
                        item.get("explanation", ""),
                        item.get("source_level", "model_prediction"),
                        now,
                    )
                )
            conn.commit()

    def get_evidence_items(self, investigation_id: str) -> List[Dict[str, Any]]:
        with sqlite3.connect(SQLITE_DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute("SELECT * FROM evidence_items WHERE investigation_id = ? ORDER BY evidence_id ASC", (investigation_id,)).fetchall()
            out = []
            for r in rows:
                d = dict(r)
                if d.get("bounding_box"):
                    d["bounding_box"] = json.loads(d["bounding_box"])
                if d.get("related_text"):
                    d["related_text"] = json.loads(d["related_text"])
                out.append(d)
            return out

    # --- Investigation Report ---
    def save_report(self, investigation_id: str, report_data: Dict[str, Any], pdf_path: Optional[str] = None):
        rep_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        status = report_data.get("investigation_status", "Pending Human Investigation")
        cls = report_data.get("overall_classification", "Pending")

        # Upload generated PDF report to Supabase Storage
        if pdf_path and os.path.exists(pdf_path):
            supabase_pdf = self.upload_file_to_supabase(
                file_path=pdf_path,
                remote_filename=f"reports/{os.path.basename(pdf_path)}",
                content_type="application/pdf",
                bucket_name="documents",
            )
            if supabase_pdf:
                report_data["supabase_pdf_url"] = supabase_pdf

        with sqlite3.connect(SQLITE_DB_PATH) as conn:
            conn.execute(
                """INSERT OR REPLACE INTO investigation_reports 
                (id, investigation_id, report_json, pdf_path, status, overall_classification, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (rep_id, investigation_id, json.dumps(report_data), pdf_path, status, cls, now)
            )
            conn.commit()

    def get_report(self, investigation_id: str) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(SQLITE_DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute("SELECT * FROM investigation_reports WHERE investigation_id = ?", (investigation_id,)).fetchone()
            if not row:
                return None
            data = json.loads(row["report_json"])
            data["pdf_report_path"] = row["pdf_path"]

            # Synchronize with latest human review if recorded
            rev = self.get_review(investigation_id)
            if rev:
                data["review"] = rev
                data["investigation_status"] = f"Reviewed: {rev.get('decision', 'Completed')}"
            return data

    # --- Human Review ---
    def save_review(self, investigation_id: str, reviewer_name: str, decision: str, comments: str) -> Dict[str, Any]:
        rev_id = f"REV-{uuid.uuid4().hex[:8].upper()}"
        now = datetime.utcnow().isoformat()

        # Dynamic realistic cursive handwritten signature image generation
        sig_url = None
        try:
            from tools.signature_generator import generate_digital_signature_image
            sig_dir = os.path.join(OUTPUTS_DIR, "signatures")
            os.makedirs(sig_dir, exist_ok=True)
            sig_path = os.path.join(sig_dir, f"sig_{investigation_id}.png")
            generate_digital_signature_image(
                name=reviewer_name,
                output_path=sig_path,
                decision=decision,
                timestamp=now,
            )
            sig_url = f"/static/outputs/signatures/sig_{investigation_id}.png"
        except Exception as e:
            print(f"Notice: signature generation: {e}")

        with sqlite3.connect(SQLITE_DB_PATH) as conn:
            conn.execute(
                """INSERT OR REPLACE INTO human_reviews 
                (id, investigation_id, reviewer_name, decision, comments, reviewed_at, signature_url)
                VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (rev_id, investigation_id, reviewer_name, decision, comments, now, sig_url)
            )
            # Update report status to human decision
            conn.execute(
                "UPDATE investigations SET status = ?, current_step = 'Human Review Completed', updated_at = ? WHERE id = ?",
                ("reviewed", now, investigation_id)
            )
            conn.commit()

        # Update in-memory / JSON report as well if it exists
        report = self.get_report(investigation_id)
        if report:
            report["investigation_status"] = f"Reviewed: {decision}"
            report["review"] = {
                "review_id": rev_id,
                "reviewer_name": reviewer_name,
                "decision": decision,
                "comments": comments,
                "reviewed_at": now,
                "signature_url": sig_url,
            }
            # Re-generate PDF report on disk with the signed human review details
            pdf_path = report.get("pdf_report_path")
            if pdf_path:
                try:
                    from tools.report_generator import generate_forensics_pdf_report
                    generate_forensics_pdf_report(report, pdf_path)
                except Exception as e:
                    print(f"Failed to regenerate PDF on review: {e}")
            self.save_report(investigation_id, report, pdf_path)

        return {
            "review_id": rev_id,
            "reviewer_name": reviewer_name,
            "decision": decision,
            "comments": comments,
            "reviewed_at": now,
            "signature_url": sig_url,
        }

    def get_review(self, investigation_id: str) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(SQLITE_DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute("SELECT * FROM human_reviews WHERE investigation_id = ?", (investigation_id,)).fetchone()
            if not row:
                return None
            rev_data = dict(row)

            # Ensure signature image exists if reviewer_name is present
            if not rev_data.get("signature_url") and rev_data.get("reviewer_name"):
                try:
                    from tools.signature_generator import generate_digital_signature_image
                    sig_dir = os.path.join(OUTPUTS_DIR, "signatures")
                    os.makedirs(sig_dir, exist_ok=True)
                    sig_path = os.path.join(sig_dir, f"sig_{investigation_id}.png")
                    generate_digital_signature_image(
                        name=rev_data["reviewer_name"],
                        output_path=sig_path,
                        decision=rev_data.get("decision", "Verified"),
                        timestamp=rev_data.get("reviewed_at", ""),
                    )
                    rev_data["signature_url"] = f"/static/outputs/signatures/sig_{investigation_id}.png"
                    conn.execute("UPDATE human_reviews SET signature_url = ? WHERE investigation_id = ?", (rev_data["signature_url"], investigation_id))
                    conn.commit()
                except Exception:
                    pass

            return rev_data


# Singleton instance
storage = StorageService()


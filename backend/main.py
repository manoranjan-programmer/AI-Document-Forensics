"""
FastAPI Backend: Agentic AI Document Forensics & Contextual Investigation System
File: backend/main.py
"""

import os
import uuid
import logging
import threading
from typing import List, Optional
from datetime import datetime
from pathlib import Path

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    HTTPException,
    BackgroundTasks,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from schemas.schemas import (
    DocumentUploadResponse,
    InvestigationStartRequest,
    InvestigationReviewRequest,
    InvestigationReviewResponse,
    InvestigationReport,
)
from services.storage import storage
from tools.pdf_processor import is_supported_file, extract_pages_from_document

from tools.runtime_guard import (
    available_memory_mb,
    get_model_status,
    module_available,
)

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("backend_main")

# Base Directories
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)

# Model Weights Paths
MOBILENET_PATH = os.path.join(MODELS_DIR, "document_forensics_model.keras")
YOLO_PATH = os.path.join(MODELS_DIR, "best.pt")
CONFIG_PATH = os.path.join(MODELS_DIR, "model_config.json")

# Orchestrator is created lazily on the first investigation.
# Importing this module (and therefore serving /, /health and /docs) must never
# load EasyOCR, TensorFlow, YOLO, PyTorch or Sentence-Transformers.
_orchestrator: Optional["ForensicsOrchestrator"] = None
_orchestrator_lock = threading.Lock()


def get_orchestrator() -> "ForensicsOrchestrator":
    from agents.orchestrator import ForensicsOrchestrator
    """
    Returns the process-wide orchestrator, building it on first use.

    The double-checked lock keeps concurrent investigations from constructing
    two orchestrators (and therefore two copies of every model).
    """
    global _orchestrator
    if _orchestrator is None:
        with _orchestrator_lock:
            if _orchestrator is None:
                logger.info("Initializing forensics orchestrator (lazy, first investigation)...")
                _orchestrator = ForensicsOrchestrator(
                    mobilenet_path=MOBILENET_PATH,
                    yolo_path=YOLO_PATH,
                    config_path=CONFIG_PATH,
                    uploads_dir=UPLOADS_DIR,
                    outputs_dir=OUTPUTS_DIR,
                )
                logger.info("Forensics orchestrator ready.")
    return _orchestrator


def orchestrator_initialized() -> bool:
    return _orchestrator is not None

# Initialize FastAPI App
app = FastAPI(
    title="Agentic AI Document Forensics System",
    description="Multi-agent document verification, visual anomaly detection, contextual analysis, and human review.",
    version="1.0.0",
)

# CORS Configuration
# Note: Modern browsers block responses if allow_credentials=True is combined with allow_origins=["*"].
# We dynamically match localhost and 127.0.0.1 on any port.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files to serve generated images and PDF reports
app.mount("/static/outputs", StaticFiles(directory=OUTPUTS_DIR), name="outputs")
app.mount("/static/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


# --- Background Worker Function ---
def run_investigation_task(investigation_id: str, document_records: List[dict]):
    try:
        logger.info(f"Background task starting for {investigation_id}")
        get_orchestrator().run_investigation(investigation_id, document_records)
        logger.info(f"Background task completed for {investigation_id}")
    except Exception as e:
        logger.error(f"Background task error for {investigation_id}: {e}", exc_info=True)
        storage.update_investigation_progress(
            investigation_id, "failed", 0.0, f"Error: {str(e)}"
        )


# ==========================================
# API Endpoints
# ==========================================

@app.get("/")
def get_root():
    """API Welcome Message and Status."""
    return {
        "system": "Agentic AI Document Forensics and Contextual Investigation System",
        "status": "online",
        "timestamp": datetime.utcnow().isoformat(),
        "endpoints": {
            "health": "/health",
            "upload": "POST /documents/upload",
            "start": "POST /investigation/start",
            "status": "GET /investigation/{id}",
            "findings": "GET /investigation/{id}/findings",
            "evidence": "GET /investigation/{id}/evidence",
            "report": "GET /investigation/{id}/report",
            "pdf": "GET /investigation/{id}/report/pdf",
            "review": "POST /investigation/{id}/review",
        },
    }


@app.get("/health")
def get_health():
    """
    Checks backend services, model files, and dependency status.

    Deliberately does NOT touch the orchestrator or import any AI framework:
    this endpoint must stay cheap so it can be polled while the box is under
    memory pressure. Model state is read from the runtime registry, which only
    reflects models that were actually loaded by a real investigation.
    """
    mobilenet_exists = os.path.exists(MOBILENET_PATH)
    yolo_exists = os.path.exists(YOLO_PATH)
    config_exists = os.path.exists(CONFIG_PATH)

    loaded = get_model_status()

    def model_state(registry_key: str, installed: bool) -> str:
        entry = loaded.get(registry_key)
        if entry:
            return entry["state"]
        return "not_loaded" if installed else "not_installed"

    easyocr_installed = module_available("easyocr")
    st_installed = module_available("sentence_transformers")
    tf_installed = module_available("tensorflow")
    yolo_installed = module_available("ultralytics")
    transformers_installed = module_available("transformers")

    llm_enabled = os.getenv("ENABLE_LOCAL_LLM", "false").strip().lower() in (
        "true",
        "1",
        "yes",
    )

    return {
        "status": "healthy" if (mobilenet_exists and yolo_exists) else "degraded",
        "models": {
            "mobilenet_classifier": "ready" if mobilenet_exists else "missing",
            "yolov8_tampering_detector": "ready" if yolo_exists else "missing",
            "model_config": "ready" if config_exists else "missing",
            "sentence_transformers": model_state("sentence_transformer", st_installed),
            "easyocr": model_state("easyocr", easyocr_installed),
            "local_llm_qwen": (
                model_state("qwen_llm", transformers_installed)
                if llm_enabled
                else "disabled_rule_based_fallback"
            ),
        },
        "runtime": {
            "orchestrator": "initialized" if orchestrator_initialized() else "not_initialized",
            "loaded_models": sorted(
                name for name, entry in loaded.items() if entry["state"] == "loaded"
            ),
            "failed_models": {
                name: entry["error"]
                for name, entry in loaded.items()
                if entry["state"] == "failed"
            },
            "packages_installed": {
                "tensorflow": tf_installed,
                "ultralytics": yolo_installed,
                "easyocr": easyocr_installed,
                "sentence_transformers": st_installed,
                "transformers": transformers_installed,
            },
            "available_memory_mb": available_memory_mb(),
        },
        "storage": "supabase" if storage.use_supabase else "local_sqlite",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/documents/upload", response_model=List[DocumentUploadResponse])
async def upload_documents(
    files: List[UploadFile] = File(...),
    investigation_id: Optional[str] = Form(None),
):
    """
    Upload multiple PDF or image documents.
    Validates file format, restricts size, and prepares them for investigation.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No files uploaded."
        )

    MAX_SIZE = 50 * 1024 * 1024  # 50 MB per file
    saved_records = []

    for file in files:
        if not is_supported_file(file.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type: {file.filename}. Allowed: PDF, PNG, JPG, JPEG, TIFF, BMP, WEBP",
            )

        # Unique safe filename
        doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
        file_ext = Path(file.filename).suffix.lower()
        safe_filename = f"{doc_id}_{Path(file.filename).stem}{file_ext}"
        saved_path = os.path.join(UPLOADS_DIR, safe_filename)

        # Stream save and check size
        content = await file.read()
        if len(content) > MAX_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File {file.filename} exceeds maximum size limit of 50MB.",
            )

        with open(saved_path, "wb") as f:
            f.write(content)

        # Compute page count
        try:
            pages = extract_pages_from_document(
                saved_path, os.path.join(OUTPUTS_DIR, "pages", doc_id)
            )
            page_count = len(pages)
        except Exception as e:
            logger.warning(f"Failed to pre-extract pages for {file.filename}: {e}")
            page_count = 1

        record = {
            "id": doc_id,
            "investigation_id": investigation_id,
            "original_filename": file.filename,
            "saved_filename": safe_filename,
            "file_path": saved_path,
            "file_size": len(content),
            "content_type": file.content_type or "application/octet-stream",
            "page_count": page_count,
            "uploaded_at": datetime.utcnow().isoformat(),
        }

        storage.save_document_record(record)
        saved_records.append(
            DocumentUploadResponse(
                document_id=doc_id,
                original_filename=file.filename,
                saved_filename=safe_filename,
                file_size_bytes=len(content),
                content_type=record["content_type"],
                page_count=page_count,
                supabase_url=record.get("supabase_url"),
                uploaded_at=record["uploaded_at"],
            )
        )

    return saved_records


@app.post("/investigation/start")
def start_investigation(
    req: InvestigationStartRequest,
    background_tasks: BackgroundTasks,
):
    """
    Initiates an end-to-end investigation for uploaded documents using the LangGraph orchestrator.
    Runs asynchronously in the background.
    """
    if not req.document_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must specify at least one document_id.",
        )

    # Validate documents exist
    doc_records = []
    for doc_id in req.document_ids:
        rec = storage.get_document(doc_id)
        if not rec:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID {doc_id} not found.",
            )
        doc_records.append(rec)

    # Create investigation record
    investigation_id = storage.create_investigation()

    # Associate documents with this investigation
    for rec in doc_records:
        rec["investigation_id"] = investigation_id
        storage.save_document_record(rec)

    # Queue execution
    background_tasks.add_task(run_investigation_task, investigation_id, doc_records)

    return {
        "investigation_id": investigation_id,
        "status": "processing",
        "progress": 0.0,
        "current_step": "Queued for multi-agent examination",
        "document_count": len(doc_records),
        "created_at": datetime.utcnow().isoformat(),
    }


@app.get("/investigation/{investigation_id}")
def get_investigation_status(investigation_id: str):
    """Returns investigation progress, status, and summary."""
    inv = storage.get_investigation(investigation_id)
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation {investigation_id} not found.",
        )

    report = storage.get_report(investigation_id)
    review = storage.get_review(investigation_id)

    return {
        "investigation_id": inv["id"],
        "status": inv["status"],
        "progress": inv["progress"],
        "current_step": inv["current_step"],
        "created_at": inv["created_at"],
        "updated_at": inv["updated_at"],
        "has_report": report is not None,
        "is_reviewed": review is not None,
        "review_decision": review.get("decision") if review else None,
        "summary": report.get("executive_summary") if report else None,
    }


@app.get("/investigation/{investigation_id}/findings")
def get_investigation_findings(investigation_id: str):
    """Returns raw structured findings from all six forensic agents."""
    inv = storage.get_investigation(investigation_id)
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation {investigation_id} not found.",
        )

    agent_results = storage.get_agent_results(investigation_id)
    return {
        "investigation_id": investigation_id,
        "status": inv["status"],
        "agents": agent_results,
    }


@app.get("/investigation/{investigation_id}/evidence")
def get_investigation_evidence(investigation_id: str):
    """Returns mapped evidence items with document/page references and bounding boxes."""
    inv = storage.get_investigation(investigation_id)
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation {investigation_id} not found.",
        )

    items = storage.get_evidence_items(investigation_id)
    return {
        "investigation_id": investigation_id,
        "total_evidence_items": len(items),
        "evidence_items": items,
    }


@app.get("/investigation/{investigation_id}/report")
def get_investigation_report(investigation_id: str):
    """Returns the full investigation report JSON."""
    report = storage.get_report(investigation_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report for investigation {investigation_id} is not yet available or in progress.",
        )
    return report


@app.get("/investigation/{investigation_id}/report/pdf")
def download_investigation_pdf(investigation_id: str):
    """Downloads the generated PDF report."""
    report = storage.get_report(investigation_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report for investigation {investigation_id} not found.",
        )

    pdf_path = report.get("pdf_report_path")
    if not pdf_path:
        pdf_path = os.path.join(OUTPUTS_DIR, "reports", f"report_{investigation_id}.pdf")
        report["pdf_report_path"] = pdf_path

    # Ensure PDF is freshly compiled with latest human review and dynamic handwritten signature
    try:
        from tools.report_generator import generate_forensics_pdf_report
        generate_forensics_pdf_report(report, pdf_path)
    except Exception as e:
        logger.warning(f"Failed to refresh PDF with signature on download: {e}")

    if not os.path.exists(pdf_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF report file is missing or still being compiled.",
        )

    filename = f"Forensics_Report_{investigation_id}.pdf"
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=filename,
    )


@app.post("/investigation/{investigation_id}/review", response_model=InvestigationReviewResponse)
def submit_investigation_review(
    investigation_id: str,
    req: InvestigationReviewRequest,
):
    """
    Allows an authorized investigator to submit a review and final decision.
    Valid decisions: 'Verified Authentic', 'Confirmed Tampered', 'Inconclusive'.
    """
    inv = storage.get_investigation(investigation_id)
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation {investigation_id} not found.",
        )

    valid_decisions = ["Verified Authentic", "Confirmed Tampered", "Inconclusive"]
    if req.decision not in valid_decisions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid decision '{req.decision}'. Allowed choices: {valid_decisions}",
        )

    review_record = storage.save_review(
        investigation_id=investigation_id,
        reviewer_name=req.reviewer_name,
        decision=req.decision,
        comments=req.comments,
    )

    logger.info(
        f"Investigator '{req.reviewer_name}' submitted review for {investigation_id}: {req.decision}"
    )
    return InvestigationReviewResponse(**review_record)


@app.get("/investigations")
def list_investigations():
    """Lists recent investigations for dashboard navigation."""
    import sqlite3
    from services.storage import SQLITE_DB_PATH
    with sqlite3.connect(SQLITE_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute("SELECT * FROM investigations ORDER BY created_at DESC LIMIT 25").fetchall()
        inv_list = []
        for r in rows:
            d = dict(r)
            rev = storage.get_review(d["id"])
            d["is_reviewed"] = rev is not None
            d["review_decision"] = rev["decision"] if rev else None
            inv_list.append(d)
        return inv_list


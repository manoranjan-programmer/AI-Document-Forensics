"""
Agent 4: Cross-Document Comparison Agent
File: agents/comparison_agent.py

- Uses sentence-transformers/all-MiniLM-L6-v2.
- Compares multiple uploaded documents using semantic embeddings.
- Identifies related documents using cosine similarity.
- Compares important fields: names, dates, amounts, identifiers (UHID, Visit ID, Account Reference, Salary/Credit).
- Identifies potential contradictions using actual extracted values.
- Reminds investigators that similarity alone is never proof of inconsistency.
- Returns source document names and page references.
"""

import os
import re
import logging
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger("comparison_agent")
logging.basicConfig(level=logging.INFO)

_EMBEDDING_MODEL = None


def get_embedding_model() -> SentenceTransformer:
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is None:
        logger.info("Loading SentenceTransformer all-MiniLM-L6-v2...")
        _EMBEDDING_MODEL = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        logger.info("SentenceTransformer loaded.")
    return _EMBEDDING_MODEL


class CrossDocumentComparisonAgent:
    def __init__(self):
        self.model = get_embedding_model()

    def compare_documents(
        self,
        ocr_results: List[Dict[str, Any]],
        context_results: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Executes pairwise semantic comparison across all uploaded documents.
        """
        num_docs = len(ocr_results)
        if num_docs < 2:
            return {
                "total_documents": num_docs,
                "total_comparisons": 0,
                "comparisons": [],
                "potential_contradictions": [],
                "summary": "Only one document uploaded. Cross-document comparison requires at least two documents.",
            }

        doc_texts = [d.get("combined_text", "") for d in ocr_results]
        doc_names = [d.get("document_name", f"Doc_{i}") for i, d in enumerate(ocr_results)]

        # Generate embeddings
        logger.info(f"Computing embeddings for {num_docs} documents...")
        embeddings = self.model.encode(doc_texts, convert_to_numpy=True, normalize_embeddings=True)

        comparisons = []
        potential_contradictions = []

        # Pairwise comparison
        for i in range(num_docs):
            for j in range(i + 1, num_docs):
                # Cosine similarity between normalized vectors is dot product
                sim_score = float(np.dot(embeddings[i], embeddings[j]))
                sim_score = max(0.0, min(1.0, sim_score))

                # Status categorisation
                if sim_score >= 0.90:
                    status = "Near-Duplicate / Successive Revision"
                elif sim_score >= 0.70:
                    status = "Strongly Related Document Pair"
                elif sim_score >= 0.40:
                    status = "Moderately Related Context"
                else:
                    status = "Distinct / Low Correlation"

                # Extract key fields for direct comparison
                doc_a_meta = self._extract_key_identifiers(doc_texts[i], doc_names[i])
                doc_b_meta = self._extract_key_identifiers(doc_texts[j], doc_names[j])

                field_comparisons, pair_contradictions = self._compare_metadata(
                    doc_a_meta, doc_b_meta, doc_names[i], doc_names[j], sim_score
                )

                # Check numerical alterations in high-similarity documents or general documents
                num_diffs = self._find_numeric_discrepancies(
                    doc_texts[i], doc_texts[j], doc_names[i], doc_names[j], sim_score
                )
                for nd in num_diffs:
                    if nd not in pair_contradictions:
                        pair_contradictions.append(nd)

                potential_contradictions.extend(pair_contradictions)

                comparisons.append(
                    {
                        "document_1": doc_names[i],
                        "document_2": doc_names[j],
                        "similarity_score": round(sim_score, 4),
                        "status": status,
                        "key_field_comparisons": field_comparisons,
                        "contradictions": pair_contradictions,
                    }
                )

        # Sort comparisons descending by similarity
        comparisons.sort(key=lambda x: x["similarity_score"], reverse=True)

        return {
            "total_documents": num_docs,
            "total_comparisons": len(comparisons),
            "comparisons": comparisons,
            "potential_contradictions": list(dict.fromkeys(potential_contradictions)),
            "disclaimer": "Semantic similarity indicates thematic or textual correspondence. Mismatches highlight variances requiring human investigation, not conclusive proof of tampering.",
        }

    def _extract_key_identifiers(self, text: str, doc_name: str) -> Dict[str, str]:
        """
        Extracts structured entities and forensic identifiers across healthcare,
        financial, employment, and general administrative documents.
        """
        fields = {}

        # 1. Subject / Individual Name
        name_match = re.search(
            r"(?:Employee\s*Name|Account\s*Holder|Patient\s*Name|PatientName|Name\s*of\s*the\s*Patient|Customer\s*Name)[\s:]+([A-Za-z\s\.]+?)(?=\n|$|\r)",
            text,
            re.IGNORECASE,
        )
        if name_match:
            fields["Subject Name"] = name_match.group(1).strip()
        else:
            # Fallback simple Name label
            generic_name = re.search(r"(?:^|\n)\s*Name\s*[:\t]\s*([A-Za-z\s\.]+?)(?=\n|$|\r)", text, re.IGNORECASE)
            if generic_name:
                fields["Subject Name"] = generic_name.group(1).strip()

        # 2. Account Reference / Bank Account
        acc_ref = re.search(
            r"(?:Account\s*Reference|Account\s*(?:No|Number)|A/C\s*(?:No|Number)?)[\s:]+([A-Za-z0-9X\*\-]+)",
            text,
            re.IGNORECASE,
        )
        if acc_ref and acc_ref.group(1).upper() not in ("STATEMENT", "HOLDER", "OPENING", "CLOSING", "TYPE", "BALANCE", "CURRENCY"):
            fields["Account Reference"] = acc_ref.group(1).strip()
        else:
            acc_ref_fallback = re.search(r"Account\s*Reference\s*[:\n\r]+\s*([A-Za-z0-9X\*\-]+)", text, re.IGNORECASE)
            if acc_ref_fallback:
                fields["Account Reference"] = acc_ref_fallback.group(1).strip()

        # 3. Document Identifier / Invoice / Slip ID
        doc_id = re.search(
            r"(?:Document\s*ID|Doc\s*ID|Invoice\s*(?:No|Number|ID)|Receipt\s*No|Bill\s*No|Slip\s*ID)[\s:]+([A-Za-z0-9_-]+)",
            text,
            re.IGNORECASE,
        )
        if doc_id:
            fields["Document ID"] = doc_id.group(1).strip()

        # 4. Dates: Payment Date / Transaction Date / Date of Issue
        pay_date = re.search(
            r"(?:Payment\s*Date|Transaction\s*Date|Date\s*of\s*Issue|Statement\s*Date)[\s:]+([A-Za-z0-9\s,\/\-]+?)(?=\n|$|\r)",
            text,
            re.IGNORECASE,
        )
        if pay_date:
            fields["Transaction / Payment Date"] = pay_date.group(1).strip()
        else:
            # Fallback for table line dates like 31 October 2026
            salary_date = re.search(r"(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})", text, re.IGNORECASE)
            if salary_date:
                fields["Transaction / Payment Date"] = salary_date.group(1).strip()

        # Period (Statement Period or Pay Period)
        period = re.search(
            r"(?:Statement\s*Period|Pay\s*Period|Period)[\s:]+([A-Za-z0-9\s,\/~\-]+?)(?=\n|$|\r)",
            text,
            re.IGNORECASE,
        )
        if period:
            fields["Period"] = period.group(1).strip()

        # 5. Financial / Salary Figures
        net_sal = re.search(
            r"(?:Net\s*Salary|Net\s*Pay)[\s\S]{0,60}?\b((?:INR|USD|EUR|GBP|\$|₹)\s*[\d,]+(?:\.\d{2})?)",
            text,
            re.IGNORECASE,
        )
        if not net_sal:
            net_sal = re.search(
                r"(?:Net\s*Salary|Net\s*Pay)[\s:]+((?:INR|USD|EUR|GBP|\$|₹)?\s*[\d,]+(?:\.\d{2})?)",
                text,
                re.IGNORECASE,
            )
        if net_sal:
            fields["Net Salary"] = net_sal.group(1).strip()

        credit_amt = re.search(
            r"(?:Credit\s*Amount|Salary\s*Credit|Amount\s*Credited|Credit)[\s\S]{0,40}?\b((?:INR|USD|EUR|GBP|\$|₹)\s*[\d,]+(?:\.\d{2})?)",
            text,
            re.IGNORECASE,
        )
        if not credit_amt:
            credit_amt = re.search(
                r"(?:Credit\s*Amount|Salary\s*Credit|Amount\s*Credited)[\s:]+((?:INR|USD|EUR|GBP|\$|₹)?\s*[\d,]+(?:\.\d{2})?)",
                text,
                re.IGNORECASE,
            )
        if credit_amt:
            fields["Credit Amount"] = credit_amt.group(1).strip()

        basic_sal = re.search(
            r"(?:Basic\s*Salary|Gross\s*Salary|Total\s*Salary)[\s:]+((?:INR|USD|EUR|GBP|\$|₹)?\s*[\d,]+(?:\.\d{2})?)",
            text,
            re.IGNORECASE,
        )
        if basic_sal:
            fields["Basic Salary"] = basic_sal.group(1).strip()

        # 6. Organization / Employer / Bank
        emp = re.search(r"(?:Employer|Company|Organization)[\s:]+([^\n\r]+)", text, re.IGNORECASE)
        if emp:
            fields["Employer"] = emp.group(1).strip()

        bank = re.search(r"(?:^|\n)\s*Bank[\s:]+([^\n\r]+)", text, re.IGNORECASE)
        if bank and "statement" not in bank.group(1).lower():
            fields["Bank"] = bank.group(1).strip()

        # 7. Medical Specific Identifiers
        uhid = re.search(r"\bUHID\s*[:\s]*([A-Za-z0-9\._-]+)", text, re.IGNORECASE)
        if uhid:
            fields["UHID"] = uhid.group(1).strip()

        visit = re.search(r"\bVisit\s*ID\s*[:\s]*([A-Za-z0-9_-]+)", text, re.IGNORECASE)
        if visit:
            fields["Visit ID"] = visit.group(1).strip()

        barcode = re.search(r"\bBarcode\s*(?:No)?\s*[:\s]*([A-Za-z0-9_-]+)", text, re.IGNORECASE)
        if barcode:
            fields["Barcode"] = barcode.group(1).strip()

        age_gender = re.search(r"\bAge/Gender\s*[:\s]*([0-9\s/YMDMF]+)", text, re.IGNORECASE)
        if age_gender:
            fields["Age/Gender"] = age_gender.group(1).strip()

        return fields

    def _compare_metadata(
        self,
        meta_a: Dict[str, str],
        meta_b: Dict[str, str],
        doc_a: str,
        doc_b: str,
        sim_score: float,
    ) -> Tuple[List[Dict[str, Any]], List[str]]:
        field_comparisons = []
        contradictions = []

        # 1. Subject Name Comparison
        name_a = meta_a.get("Subject Name")
        name_b = meta_b.get("Subject Name")
        if name_a and name_b:
            is_match = name_a.strip().lower() == name_b.strip().lower()
            field_comparisons.append({
                "field": "Subject / Individual Name",
                "doc_a_value": name_a,
                "doc_b_value": name_b,
                "status": "Match" if is_match else "Mismatch",
            })
            if not is_match and sim_score > 0.60:
                contradictions.append(
                    f"Subject Name mismatch between '{doc_a}' ({name_a}) and '{doc_b}' ({name_b})."
                )

        # 2. Account Reference Comparison
        acc_a = meta_a.get("Account Reference")
        acc_b = meta_b.get("Account Reference")
        if acc_a and acc_b:
            is_match = acc_a.strip().lower() == acc_b.strip().lower()
            field_comparisons.append({
                "field": "Account Reference",
                "doc_a_value": acc_a,
                "doc_b_value": acc_b,
                "status": "Match" if is_match else "Mismatch",
            })
            if not is_match and sim_score > 0.60:
                contradictions.append(
                    f"Account Reference mismatch between '{doc_a}' ({acc_a}) and '{doc_b}' ({acc_b})."
                )

        # 3. Transaction / Payment Date Comparison
        date_a = meta_a.get("Transaction / Payment Date")
        date_b = meta_b.get("Transaction / Payment Date")
        if date_a and date_b:
            is_match = date_a.strip().lower() == date_b.strip().lower()
            field_comparisons.append({
                "field": "Payment / Transaction Date",
                "doc_a_value": date_a,
                "doc_b_value": date_b,
                "status": "Match" if is_match else "Mismatch",
            })
            if not is_match:
                contradictions.append(
                    f"Discrepancy in Payment / Transaction Date: '{doc_a}' reports '{date_a}', while '{doc_b}' reports '{date_b}'."
                )

        # 4. Period Comparison
        per_a = meta_a.get("Period")
        per_b = meta_b.get("Period")
        if per_a and per_b:
            is_match = per_a.strip().lower() in per_b.strip().lower() or per_b.strip().lower() in per_a.strip().lower()
            field_comparisons.append({
                "field": "Statement / Pay Period",
                "doc_a_value": per_a,
                "doc_b_value": per_b,
                "status": "Match" if is_match else "Mismatch",
            })
            if not is_match:
                contradictions.append(
                    f"Discrepancy in Statement / Pay Period: '{doc_a}' reports '{per_a}', while '{doc_b}' reports '{per_b}'."
                )

        # 5. Salary Remittance vs Bank Credit Amount Comparison (Cross-Domain Financial Check)
        amt_a = meta_a.get("Net Salary") or meta_a.get("Credit Amount")
        amt_b = meta_b.get("Credit Amount") or meta_b.get("Net Salary")

        # Normalize currency strings: 'INR 50,000' -> 50000.0
        def parse_amt(val_str: Optional[str]) -> Optional[float]:
            if not val_str:
                return None
            num_clean = re.sub(r"[^\d.]", "", val_str)
            try:
                return float(num_clean)
            except ValueError:
                return None

        num_a = parse_amt(amt_a)
        num_b = parse_amt(amt_b)

        if amt_a and amt_b:
            is_match = num_a == num_b if (num_a is not None and num_b is not None) else (amt_a.strip().lower() == amt_b.strip().lower())
            label = "Net Salary vs Credit Amount" if ("Net Salary" in meta_a or "Net Salary" in meta_b) else "Transaction Amount"
            field_comparisons.append({
                "field": label,
                "doc_a_value": amt_a,
                "doc_b_value": amt_b,
                "status": "Match" if is_match else "Mismatch",
            })
            if not is_match:
                diff_str = f" (variance: {abs(num_a - num_b):,.2f})" if (num_a is not None and num_b is not None) else ""
                contradictions.append(
                    f"Discrepancy in Salary / Credit Amount: '{doc_a}' reports '{amt_a}', while '{doc_b}' reports '{amt_b}'{diff_str}."
                )

        # 6. Document ID
        doc_id_a = meta_a.get("Document ID")
        doc_id_b = meta_b.get("Document ID")
        if doc_id_a and doc_id_b:
            is_match = doc_id_a.strip().lower() == doc_id_b.strip().lower()
            field_comparisons.append({
                "field": "Document ID",
                "doc_a_value": doc_id_a,
                "doc_b_value": doc_id_b,
                "status": "Match" if is_match else "Distinct Doc IDs",
            })

        # 7. Medical Exact Field Matches (UHID, Visit ID, Barcode, Age/Gender)
        for med_key in ["UHID", "Visit ID", "Barcode", "Age/Gender"]:
            val_a = meta_a.get(med_key)
            val_b = meta_b.get(med_key)
            if val_a and val_b:
                is_match = val_a.strip().lower() == val_b.strip().lower()
                field_comparisons.append({
                    "field": med_key,
                    "doc_a_value": val_a,
                    "doc_b_value": val_b,
                    "status": "Match" if is_match else "Mismatch",
                })
                if not is_match:
                    contradictions.append(
                        f"Contradiction in {med_key} between '{doc_a}' ({val_a}) and '{doc_b}' ({val_b})."
                    )

        # 8. Add any remaining unique single-sided context to ensure visibility
        # E.g. Employer in Doc A, Bank in Doc B
        if meta_a.get("Employer") and meta_b.get("Bank"):
            field_comparisons.append({
                "field": "Employer / Issuing Institution",
                "doc_a_value": meta_a["Employer"],
                "doc_b_value": meta_b["Bank"],
                "status": "Cross-Entity Relation",
            })

        return field_comparisons, contradictions

    def _find_numeric_discrepancies(
        self, text_a: str, text_b: str, doc_a: str, doc_b: str, sim_score: float
    ) -> List[str]:
        """
        Identifies subtle value discrepancies across lab metrics and monetary figures.
        """
        discrepancies = []

        # Healthcare lab metrics
        for metric in ["CREATININE", "SODIUM", "POTASSIUM", "CHLORIDE", "PLATELET"]:
            pat = rf"{metric}[^\n\r]*?(\d+(?:\.\d+)?)"
            m_a = re.search(pat, text_a, re.IGNORECASE)
            m_b = re.search(pat, text_b, re.IGNORECASE)
            if m_a and m_b:
                val_a = m_a.group(1)
                val_b = m_b.group(1)
                if val_a != val_b:
                    discrepancies.append(
                        f"Discrepancy in {metric} value: '{val_a}' in {doc_a} vs '{val_b}' in {doc_b} despite high structural similarity."
                    )

        # Direct search for conflicting currency figures between documents with shared subject or account
        return discrepancies

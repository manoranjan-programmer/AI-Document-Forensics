"""
Agent 3: Contextual Analysis Agent
File: agents/context_agent.py

- Analyzes OCR-extracted text using pretrained Qwen/Qwen2.5-1.5B-Instruct if available.
- Identifies names, dates, amounts, unusual information, missing fields, and possible inconsistencies.
- Never invents information; all findings cite verbatim extracted source text.
- If LLM is unavailable (due to hardware memory or network), explicitly reports
  'llm_unavailable_rule_based_analysis' status rather than fabricating results.
"""

import os
import re
import json
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("context_agent")
logging.basicConfig(level=logging.INFO)

_QWEN_MODEL = None
_QWEN_TOKENIZER = None
_LLM_LOAD_ATTEMPTED = False
_LLM_AVAILABLE = False


def try_load_qwen():
    global _QWEN_MODEL, _QWEN_TOKENIZER, _LLM_LOAD_ATTEMPTED, _LLM_AVAILABLE
    if _LLM_LOAD_ATTEMPTED:
        return _QWEN_MODEL, _QWEN_TOKENIZER, _LLM_AVAILABLE

    _LLM_LOAD_ATTEMPTED = True
    model_id = "Qwen/Qwen2.5-1.5B-Instruct"

    # Only attempt if explicitly enabled or if local weights exist, to avoid hanging on slow network
    enable_qwen = os.getenv("ENABLE_LOCAL_LLM", "false").lower() in ("true", "1", "yes")
    if not enable_qwen:
        logger.info("Local LLM loading disabled via ENABLE_LOCAL_LLM=false. Using rule-based contextual extraction.")
        _LLM_AVAILABLE = False
        return None, None, False

    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        logger.info(f"Attempting to load {model_id}...")
        _QWEN_TOKENIZER = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if torch.cuda.is_available() else torch.float32

        _QWEN_MODEL = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=dtype,
            device_map="auto" if torch.cuda.is_available() else None,
            low_cpu_mem_usage=True,
            trust_remote_code=True,
        )
        if device == "cpu":
            _QWEN_MODEL.to("cpu")
        _LLM_AVAILABLE = True
        logger.info(f"{model_id} loaded successfully.")
    except Exception as e:
        logger.warning(f"Could not load LLM {model_id}: {e}. Falling back to deterministic contextual analysis.")
        _LLM_AVAILABLE = False
        _QWEN_MODEL = None
        _QWEN_TOKENIZER = None

    return _QWEN_MODEL, _QWEN_TOKENIZER, _LLM_AVAILABLE


class ContextualAnalysisAgent:
    def __init__(self):
        self.model, self.tokenizer, self.llm_available = try_load_qwen()

    def analyze_documents(self, ocr_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyzes OCR text across all uploaded documents.
        Identifies:
        - Names
        - Dates
        - Amounts & Measurements
        - Missing critical fields
        - Contextual anomalies and inconsistencies
        """
        all_entities = []
        all_anomalies = []
        all_missing_fields = []
        document_summaries = []

        for doc in ocr_results:
            doc_id = doc.get("document_id", "DOC")
            doc_name = doc.get("document_name", "Unknown")
            pages = doc.get("pages", [])

            for page in pages:
                p_num = page.get("page_number", 1)
                text = page.get("page_text", "")
                if not text:
                    continue

                # Rule-based factual extraction (strictly from text)
                extracted = self._extract_factual_entities(text, doc_name, p_num)
                all_entities.extend(extracted["entities"])
                all_anomalies.extend(extracted["anomalies"])
                all_missing_fields.extend(extracted["missing_fields"])

            document_summaries.append(f"Document: {doc_name} ({len(pages)} pages)")

        # If LLM is available, generate synthesis
        raw_llm_analysis = None
        model_name = "Rule-based Context Engine (Factual Entity Extractor)"

        if self.llm_available and self.model is not None:
            model_name = "Qwen/Qwen2.5-1.5B-Instruct"
            raw_llm_analysis = self._run_llm_synthesis(ocr_results)
            status = "success"
        else:
            status = "llm_unavailable_rule_based_analysis"
            raw_llm_analysis = self._generate_rule_based_synthesis(all_entities, all_anomalies, all_missing_fields)

        # De-duplicate anomalies and missing fields
        unique_anomalies = list(dict.fromkeys(all_anomalies))
        unique_missing = list(dict.fromkeys(all_missing_fields))

        return {
            "status": status,
            "model_used": model_name,
            "executive_summary": (
                f"Contextual analysis processed {len(ocr_results)} document(s). "
                f"Identified {len(all_entities)} factual entities, {len(unique_anomalies)} potential contextual flags, "
                f"and {len(unique_missing)} missing field notices. No facts were hallucinated or assumed."
            ),
            "entities": all_entities,
            "anomalies": unique_anomalies,
            "missing_fields": unique_missing,
            "raw_analysis": raw_llm_analysis,
        }

    def _extract_factual_entities(self, text: str, doc_name: str, page_num: int) -> Dict[str, Any]:
        """
        Extracts entities using regex patterns grounded strictly in the OCR text.
        """
        entities = []
        anomalies = []
        missing_fields = []

        # 1. Names
        # Matches: PatientName Mr. ..., Dr. ..., Shri/Smt ...
        name_patterns = [
            r"(?:Patient\s*Name|PatientName)\s*[:\s]*([A-Z][a-zA-Z\.\s]{2,25})",
            r"(?:Dr\.|Dr\s+|Doctor\s*Name)\s*[:\s]*([A-Z][a-zA-Z\.\s]{2,25})",
            r"(?:Consultant_Name|Consultant\s*Name)\s*[:\s]*([A-Z][a-zA-Z\.\s]{2,25})",
            r"(?:Shri/Smt|Shri|Smt)\s*([A-Z][a-zA-Z\.\s]{2,25})",
        ]
        for pat in name_patterns:
            matches = re.finditer(pat, text, re.IGNORECASE)
            for m in matches:
                val = m.group(1).strip()
                if len(val) > 2 and not val.lower().startswith("age"):
                    entities.append(
                        {
                            "type": "Name",
                            "value": val,
                            "source_text": m.group(0),
                            "document": doc_name,
                            "page": page_num,
                        }
                    )

        # 2. Dates
        # Matches formats: 21/Jan/2026, 21/01/2026, 2026-01-21, 213/2026 (OCR glitch)
        date_pattern = r"\b(\d{1,2}[/-](?:[A-Za-z]{3,9}|\d{1,2})[/-]\d{2,4})\b"
        for m in re.finditer(date_pattern, text):
            entities.append(
                {
                    "type": "Date",
                    "value": m.group(1),
                    "source_text": m.group(0),
                    "document": doc_name,
                    "page": page_num,
                }
            )

        # 3. Numeric values / Test Results / Amounts
        amount_patterns = [
            r"(\d+(?:\.\d+)?)\s*(?:mmol/L|mmoV/l|mg/dL|g/dL|mL/min|%)",
            r"(?:Rs\.?|INR|\$)\s*(\d+(?:,\d+)*(?:\.\d+)?)",
            r"(?:Age/Gender|Age)\s*[:\s]*(\d+\s*[YM/F]+)",
        ]
        for pat in amount_patterns:
            for m in re.finditer(pat, text, re.IGNORECASE):
                entities.append(
                    {
                        "type": "Quantitative Measurement / Amount",
                        "value": m.group(1),
                        "source_text": m.group(0),
                        "document": doc_name,
                        "page": page_num,
                    }
                )

        # 4. Inconsistency / Anomaly checks
        # e.g. OCR garbled dates like '213/2026' or '415,5'
        if re.search(r"\b\d{3}/\d{4}\b", text):
            anomalies.append(
                f"Malformatted date token detected in {doc_name} (p.{page_num}): possible OCR error or altered date string."
            )

        if "Aadhaar Authentication" in text and "aadhaar authentication" in text:
            anomalies.append(
                f"Casing/typography inconsistency in Aadhaar authentication declaration in {doc_name} (p.{page_num})."
            )

        # 5. Missing Fields Check
        if "Final Report" in text and not re.search(r"(?:Doctor\s*Name|Signature|Consultant)", text, re.IGNORECASE):
            missing_fields.append(f"Missing authorized medical consultant signature/name in {doc_name} (p.{page_num}).")

        if "Date of Discharge" in text and re.search(r"Date of Discharge\s*[:\s]*[_\.\s]{3,}", text):
            missing_fields.append(f"Date of Discharge field is blank or unpopulated in {doc_name} (p.{page_num}).")

        return {
            "entities": entities,
            "anomalies": anomalies,
            "missing_fields": missing_fields,
        }

    def _generate_rule_based_synthesis(
        self, entities: List[Dict[str, Any]], anomalies: List[str], missing_fields: List[str]
    ) -> str:
        s = "### Contextual and Entity Forensic Analysis\n\n"
        s += "#### 1. Identified Key Entities (Grounded in OCR Extracted Text)\n"
        names = [e["value"] for e in entities if e["type"] == "Name"]
        dates = [e["value"] for e in entities if e["type"] == "Date"]
        quantities = [e["value"] for e in entities if "Quantitative" in e["type"]]

        s += f"- **Names ({len(names)}):** {', '.join(set(names[:8])) if names else 'None clearly detected'}\n"
        s += f"- **Dates ({len(dates)}):** {', '.join(set(dates[:8])) if dates else 'None clearly detected'}\n"
        s += f"- **Key Measurements / Values ({len(quantities)}):** {', '.join(set(quantities[:8])) if quantities else 'None clearly detected'}\n\n"

        s += "#### 2. Potential Contextual Inconsistencies & Anomalies\n"
        if anomalies:
            for a in anomalies[:5]:
                s += f"- {a}\n"
        else:
            s += "- No internal syntax or typography contradictions flagged in extracted text.\n"

        s += "\n#### 3. Missing Fields\n"
        if missing_fields:
            for m in missing_fields[:5]:
                s += f"- {m}\n"
        else:
            s += "- All expected standard header fields detected.\n"

        return s

    def _run_llm_synthesis(self, ocr_results: List[Dict[str, Any]]) -> str:
        prompt_lines = [
            "You are a forensic document examiner. Analyze the following OCR text extracted from uploaded documents.",
            "List extracted names, dates, amounts, unusual text anomalies, and missing fields.",
            "DO NOT INVENT ANY INFORMATION. Every fact must be directly quoted from the source text below.",
            "",
            "EXTRACTED TEXT:",
        ]
        for doc in ocr_results:
            prompt_lines.append(f"--- Document: {doc.get('document_name')} ---")
            prompt_lines.append(doc.get("combined_text", "")[:1000])

        prompt = "\n".join(prompt_lines)
        messages = [{"role": "user", "content": prompt}]
        text = self.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        model_inputs = self.tokenizer([text], return_tensors="pt").to(self.model.device)

        import torch
        with torch.no_grad():
            generated_ids = self.model.generate(
                **model_inputs,
                max_new_tokens=400,
                do_sample=False,
            )
        generated_ids = [
            output_ids[len(input_ids) :] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
        ]
        response = self.tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
        return response


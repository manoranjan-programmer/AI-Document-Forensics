"""
Agent 5: Evidence Investigation Agent
File: agents/evidence_agent.py

- Combines outputs from OCR, Visual, Contextual, and Cross-Document agents.
- Maps suspicious visual regions to OCR text where coordinates overlap.
- Links contextual findings and cross-document mismatches to source documents.
- Generates unique evidence IDs (EVIDENCE_1, EVIDENCE_2, ...).
- Includes page number, bounding box, source text, confidence, and explanation.
- Clearly separates model predictions, extracted facts, and inferred concerns.
"""

import os
import re
import logging
from typing import List, Dict, Any, Optional
from tools.image_processor import compute_box_intersection_ratio

logger = logging.getLogger("evidence_agent")
logging.basicConfig(level=logging.INFO)


class EvidenceInvestigationAgent:
    def __init__(self):
        pass

    def compile_evidence(
        self,
        ocr_results: List[Dict[str, Any]],
        visual_results: List[Dict[str, Any]],
        context_results: Optional[Dict[str, Any]] = None,
        comparison_results: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Synthesizes an indexed, explainable evidence list.
        """
        evidence_list = []
        counter = 1

        # Build lookup for OCR text by (doc_name, page_number)
        ocr_boxes_by_page = {}
        for doc in ocr_results:
            d_name = doc.get("document_name", "")
            for p in doc.get("pages", []):
                p_num = p.get("page_number", 1)
                ocr_boxes_by_page[(d_name, p_num)] = p.get("text_items", [])

        # 1. Map Visual Tampering Regions to Overlapping OCR Text
        for v_doc in visual_results:
            d_name = v_doc.get("document_name", "")
            suspicious_regions = v_doc.get("suspicious_regions", [])

            for region in suspicious_regions:
                box = region.get("box", [])
                conf = region.get("confidence", 0.0)
                p_num = region.get("page_number", 1)

                # Find intersecting OCR text items
                overlapping_text = []
                page_text_items = ocr_boxes_by_page.get((d_name, p_num), [])

                for item in page_text_items:
                    item_box = item.get("box", [])
                    if len(item_box) == 4 and len(box) == 4:
                        ratio = compute_box_intersection_ratio(item_box, box)
                        if ratio > 0.30:  # More than 30% inside suspicious region
                            overlapping_text.append(item.get("text", ""))

                explanation = (
                    f"YOLOv8 detected a localized visual anomaly with {conf * 100:.1f}% confidence."
                )
                if overlapping_text:
                    explanation += f" Corresponds to extracted text: '{' '.join(overlapping_text)}'."

                evidence_list.append(
                    {
                        "evidence_id": f"EVIDENCE_{counter}",
                        "document": d_name,
                        "page": p_num,
                        "evidence_type": "Potentially suspicious visual region",
                        "category": "Visual Tampering Anomaly",
                        "bounding_box": box,
                        "detection_confidence": round(conf, 4),
                        "related_text": overlapping_text,
                        "explanation": explanation,
                        "source_level": "model_prediction",
                    }
                )
                counter += 1

            # Document-level classification evidence
            tamper_score = v_doc.get("tampering_score", 0.0)
            threshold = v_doc.get("threshold", 0.9)
            classification = v_doc.get("classification", "Likely Authentic")

            evidence_list.append(
                {
                    "evidence_id": f"EVIDENCE_{counter}",
                    "document": d_name,
                    "page": 1,
                    "evidence_type": "Document-level classification",
                    "category": "MobileNetV2 Classifier Finding",
                    "bounding_box": None,
                    "detection_confidence": round(tamper_score, 4),
                    "related_text": [],
                    "explanation": (
                        f"MobileNetV2 classification assigned a score of {tamper_score:.4f} "
                        f"(decision threshold: {threshold:.2f}), classifying document as '{classification}'."
                    ),
                    "source_level": "model_prediction",
                }
            )
            counter += 1

        # 2. Contextual Inconsistencies and Anomalies
        if context_results:
            anomalies = context_results.get("anomalies", [])
            for anom in anomalies:
                evidence_list.append(
                    {
                        "evidence_id": f"EVIDENCE_{counter}",
                        "document": "Cross-Document Context",
                        "page": 1,
                        "evidence_type": "Contextual Anomaly",
                        "category": "Entity / Grammar Forensic Notice",
                        "bounding_box": None,
                        "detection_confidence": None,
                        "related_text": [],
                        "explanation": str(anom),
                        "source_level": "inferred_concern",
                    }
                )
                counter += 1

            missing_fields = context_results.get("missing_fields", [])
            for miss in missing_fields:
                evidence_list.append(
                    {
                        "evidence_id": f"EVIDENCE_{counter}",
                        "document": "Document Context",
                        "page": 1,
                        "evidence_type": "Missing Critical Field",
                        "category": "Verification Protocol Warning",
                        "bounding_box": None,
                        "detection_confidence": None,
                        "related_text": [],
                        "explanation": str(miss),
                        "source_level": "inferred_concern",
                    }
                )
                counter += 1

        # 3. Cross-Document Contradictions and Mismatches
        if comparison_results:
            comparisons = comparison_results.get("comparisons", [])
            handled_contradictions = set()

            def find_target_box(target_doc, val_str):
                if not val_str:
                    return None
                val_clean = str(val_str).strip().lower()

                # 1. Exact text match
                for (d_n, p_n), items in ocr_boxes_by_page.items():
                    if d_n == target_doc or target_doc in d_n or d_n in target_doc:
                        for it in items:
                            t = it.get("text", "").strip()
                            if t.lower() == val_clean:
                                return d_n, p_n, it.get("box"), t

                # 2. Substring match
                for (d_n, p_n), items in ocr_boxes_by_page.items():
                    if d_n == target_doc or target_doc in d_n or d_n in target_doc:
                        for it in items:
                            t = it.get("text", "").strip()
                            t_lower = t.lower()
                            if len(t) >= 4 and (val_clean in t_lower or t_lower in val_clean):
                                if any(c.isdigit() for c in t):
                                    return d_n, p_n, it.get("box"), t

                # 3. Numeric tokens match
                val_nums = re.findall(r"\d+", val_clean)
                if val_nums:
                    for (d_n, p_n), items in ocr_boxes_by_page.items():
                        if d_n == target_doc or target_doc in d_n or d_n in target_doc:
                            for it in items:
                                t = it.get("text", "").strip()
                                if all(num in t for num in val_nums) and any(c.isdigit() for c in t):
                                    return d_n, p_n, it.get("box"), t

                return None

            # Process structured field mismatches from comparisons (Date, Amount, Account, etc.)
            for pair in comparisons:
                doc_a = pair.get("document_1", "")
                doc_b = pair.get("document_2", "")
                for fc in pair.get("key_field_comparisons", []):
                    if fc.get("status") == "Mismatch":
                        field = fc.get("field", "")
                        val_a = fc.get("doc_a_value")
                        val_b = fc.get("doc_b_value")
                        contra_text = f"Discrepancy in {field}: '{doc_a}' reports '{val_a}', while '{doc_b}' reports '{val_b}'."
                        handled_contradictions.add(contra_text)

                        # Ground Doc A
                        res_a = find_target_box(doc_a, val_a)
                        if res_a:
                            d_n, p_n, box, t = res_a
                            evidence_list.append({
                                "evidence_id": f"EVIDENCE_{counter}",
                                "document": d_n,
                                "page": p_n,
                                "evidence_type": "Cross-Document Value Discrepancy",
                                "category": "Relational Consistency Warning",
                                "bounding_box": box,
                                "detection_confidence": 0.95,
                                "related_text": [t],
                                "explanation": contra_text,
                                "source_level": "inferred_concern",
                            })
                            counter += 1

                        # Ground Doc B
                        res_b = find_target_box(doc_b, val_b)
                        if res_b:
                            d_n, p_n, box, t = res_b
                            evidence_list.append({
                                "evidence_id": f"EVIDENCE_{counter}",
                                "document": d_n,
                                "page": p_n,
                                "evidence_type": "Cross-Document Value Discrepancy",
                                "category": "Relational Consistency Warning",
                                "bounding_box": box,
                                "detection_confidence": 0.95,
                                "related_text": [t],
                                "explanation": contra_text,
                                "source_level": "inferred_concern",
                            })
                            counter += 1

            # Fallback for any other contradictions in potential_contradictions
            contradictions = comparison_results.get("potential_contradictions", [])
            for contra in contradictions:
                # If already covered, skip
                if any(contra in hc or hc in contra for hc in handled_contradictions):
                    continue
                matched_items_by_doc = {}
                for (doc_n, page_n), items in ocr_boxes_by_page.items():
                    for it in items:
                        t = it.get("text", "").strip()
                        if any(c.isdigit() for c in t) and t in str(contra):
                            matched_items_by_doc[(doc_n, page_n)] = (t, it.get("box"))
                            break
                        elif len(t) >= 4 and t in str(contra) and "SAMPLE" not in t and (doc_n, page_n) not in matched_items_by_doc:
                            matched_items_by_doc[(doc_n, page_n)] = (t, it.get("box"))

                if matched_items_by_doc:
                    for (doc_n, page_n), (t, box) in matched_items_by_doc.items():
                        evidence_list.append(
                            {
                                "evidence_id": f"EVIDENCE_{counter}",
                                "document": doc_n,
                                "page": page_n,
                                "evidence_type": "Cross-Document Value Discrepancy",
                                "category": "Relational Consistency Warning",
                                "bounding_box": box,
                                "detection_confidence": 0.95,
                                "related_text": [t],
                                "explanation": str(contra),
                                "source_level": "inferred_concern",
                            }
                        )
                        counter += 1
                else:
                    evidence_list.append(
                        {
                            "evidence_id": f"EVIDENCE_{counter}",
                            "document": "Cross-Document Correlation",
                            "page": 1,
                            "evidence_type": "Cross-Document Discrepancy",
                            "category": "Relational Consistency Warning",
                            "bounding_box": None,
                            "detection_confidence": None,
                            "related_text": [],
                            "explanation": str(contra),
                            "source_level": "inferred_concern",
                        }
                    )
                    counter += 1

        logger.info(f"Synthesized {len(evidence_list)} evidence items.")
        return evidence_list


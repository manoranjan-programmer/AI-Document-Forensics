"""
Agent 6: Investigation Report Agent
File: agents/report_agent.py

- Generates a structured investigation report combining all agent outputs.
- Includes executive summary, document summaries, classification results,
  suspicious visual regions, contextual findings, cross-document comparisons,
  and mapped evidence registry.
- Generates downloadable PDF and JSON reports.
- Final decision strictly remains 'Pending Human Investigation' until an authorized investigator submits a review.
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from tools.report_generator import generate_forensics_pdf_report

logger = logging.getLogger("report_agent")
logging.basicConfig(level=logging.INFO)


class InvestigationReportAgent:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def generate_report(
        self,
        investigation_id: str,
        ocr_results: List[Dict[str, Any]],
        visual_results: List[Dict[str, Any]],
        context_results: Dict[str, Any],
        comparison_results: Dict[str, Any],
        evidence_items: List[Dict[str, Any]],
        human_review: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Builds both JSON and PDF investigation reports.
        """
        logger.info(f"Generating investigation report for {investigation_id}...")
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

        # Determine overall classification
        any_tampered = any(v.get("is_tampered_candidate", False) for v in visual_results)
        any_visual_regions = any(len(v.get("suspicious_regions", [])) > 0 for v in visual_results)
        has_contradictions = len(comparison_results.get("potential_contradictions", [])) > 0

        if any_tampered or any_visual_regions or has_contradictions:
            overall_class = "Potentially Tampered / High Risk"
            investigation_recommendation = (
                "Automated agents flagged one or more visual anomalies, classification thresholds, "
                "or cross-document value contradictions. Rigorous manual inspection by a forensic expert "
                "is strongly advised before accepting these documents."
            )
        else:
            overall_class = "Likely Authentic / Low Anomaly"
            investigation_recommendation = (
                "Automated inspection found no high-confidence visual manipulation or internal "
                "contradictions. Standard verification procedures apply."
            )

        # Status: Pending Human Investigation unless human review exists
        if human_review:
            investigation_status = f"Reviewed: {human_review.get('decision', 'Completed')}"
        else:
            investigation_status = "Pending Human Investigation"

        # Document summaries
        doc_summaries = []
        total_pages = 0
        for doc in ocr_results:
            d_id = doc.get("document_id")
            d_name = doc.get("document_name")
            p_count = doc.get("page_count", 1)
            total_pages += p_count

            # Find matching visual result
            v_match = next((v for v in visual_results if v.get("document_id") == d_id or v.get("document_name") == d_name), {})

            doc_summaries.append(
                {
                    "document_id": d_id,
                    "document_name": d_name,
                    "page_count": p_count,
                    "classification": v_match.get("classification", "Likely Authentic"),
                    "tampering_score": v_match.get("tampering_score", 0.0),
                    "threshold": v_match.get("threshold", 0.9),
                    "suspicious_regions": v_match.get("suspicious_regions", []),
                    "annotated_pages": v_match.get("annotated_pages", []),
                }
            )

        # Total counts
        total_suspicious_regions = sum(len(d["suspicious_regions"]) for d in doc_summaries)
        total_contradictions = len(comparison_results.get("potential_contradictions", []))

        report_payload = {
            "report_title": "Agentic AI Document Forensics Investigation Report",
            "investigation_id": investigation_id,
            "generated_at": now_str,
            "investigation_status": investigation_status,
            "overall_classification": overall_class,
            "executive_summary": {
                "total_documents": len(ocr_results),
                "total_pages": total_pages,
                "suspicious_regions_count": total_suspicious_regions,
                "cross_document_mismatches_count": total_contradictions,
                "total_evidence_items": len(evidence_items),
                "status": investigation_status,
                "recommendation": investigation_recommendation,
            },
            "documents": doc_summaries,
            "visual_forensics": {
                "results": visual_results,
                "summary": f"Analyzed {len(visual_results)} document(s). Detected {total_suspicious_regions} visual regions of concern.",
            },
            "contextual_analysis": context_results,
            "cross_document_comparison": comparison_results,
            "evidence_items": evidence_items,
            "review": human_review,
            "disclaimer": (
                "This report was compiled by an agentic AI forensics pipeline. Predictions from MobileNetV2, "
                "YOLOv8, and NLP models indicate potential anomalies and do NOT constitute legal proof of fraud. "
                "Final decisions must be signed by an authorized human investigator."
            ),
        }

        # Write JSON Report to disk
        json_filename = f"report_{investigation_id}.json"
        json_path = os.path.join(self.output_dir, json_filename)
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(report_payload, f, indent=4)
        report_payload["json_report_path"] = json_path

        # Generate PDF Report
        pdf_filename = f"report_{investigation_id}.pdf"
        pdf_path = os.path.join(self.output_dir, pdf_filename)
        try:
            generate_forensics_pdf_report(report_payload, pdf_path)
            report_payload["pdf_report_path"] = pdf_path
            logger.info(f"PDF report generated at {pdf_path}")
        except Exception as e:
            logger.error(f"Failed to generate PDF report: {e}")
            report_payload["pdf_report_path"] = None

        return report_payload


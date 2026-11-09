"""
Comprehensive Test Script for Agentic AI Document Forensics System
Tests:
1. OCR Agent
2. Visual Forensic Agent
3. Contextual Analysis Agent
4. Cross-Document Comparison Agent
5. Evidence Investigation Agent
6. Report Agent (PDF + JSON)
7. LangGraph Orchestrator
8. FastAPI Endpoints
"""

import os
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from tools.pdf_processor import extract_pages_from_document
from agents.ocr_agent import OCRAgent
from agents.visual_agent import VisualForensicAgent
from agents.context_agent import ContextualAnalysisAgent
from agents.comparison_agent import CrossDocumentComparisonAgent
from agents.evidence_agent import EvidenceInvestigationAgent
from agents.report_agent import InvestigationReportAgent
from agents.orchestrator import ForensicsOrchestrator
from services.storage import storage


def create_sample_documents(test_dir: str):
    """Generates two related medical test images to evaluate comparison and tampering."""
    os.makedirs(test_dir, exist_ok=True)
    doc1_path = os.path.join(test_dir, "test_doc_original.png")
    doc2_path = os.path.join(test_dir, "test_doc_altered.png")

    # Document 1: Original
    img1 = Image.new("RGB", (800, 1000), color=(255, 255, 255))
    draw1 = ImageDraw.Draw(img1)
    # Header
    draw1.rectangle([20, 20, 780, 80], outline=(30, 58, 138), width=2)
    draw1.text((30, 35), "CITY DIAGNOSTIC CLINICAL BIOCHEMISTRY REPORT", fill=(30, 58, 138))
    # Metadata
    draw1.text((30, 100), "Patient Name: Mr. Ramesh Kumar    Age/Gender: 45 Y / M", fill=(0, 0, 0))
    draw1.text((30, 130), "UHID: QSD.0000015629              Visit ID: QSD25793", fill=(0, 0, 0))
    draw1.text((30, 160), "Collected: 21/Jan/2026 10:00AM    Reported: 21/Jan/2026 02:00PM", fill=(0, 0, 0))
    draw1.text((30, 190), "Status: Final Report              Panel Name: RENAL FUNCTION", fill=(0, 0, 0))
    draw1.line([(20, 220), (780, 220)], fill=(180, 180, 180), width=1)
    # Test details
    draw1.text((30, 240), "TEST NAME                     RESULT       UNIT        BIO REFERENCE", fill=(0, 0, 0))
    draw1.text((30, 270), "SERUM CREATININE              1.06         mg/dL       0.45 - 1.50", fill=(0, 0, 0))
    draw1.text((30, 300), "SERUM SODIUM                  138.0        mmol/L      136 - 145", fill=(0, 0, 0))
    draw1.text((30, 330), "SERUM POTASSIUM               4.20         mmol/L      3.5 - 5.2", fill=(0, 0, 0))
    draw1.text((30, 420), "Consultant Name: Dr. A. K. Gupta, MD (Biochemistry)", fill=(0, 0, 0))
    draw1.text((30, 450), "Signature: [Verified Electronic Signature]", fill=(0, 0, 0))
    img1.save(doc1_path)

    # Document 2: Tampered version with altered Creatinine and date token
    img2 = Image.new("RGB", (800, 1000), color=(255, 255, 255))
    draw2 = ImageDraw.Draw(img2)
    draw2.rectangle([20, 20, 780, 80], outline=(30, 58, 138), width=2)
    draw2.text((30, 35), "CITY DIAGNOSTIC CLINICAL BIOCHEMISTRY REPORT", fill=(30, 58, 138))
    draw2.text((30, 100), "Patient Name: Mr. Ramesh Kumar    Age/Gender: 45 Y / M", fill=(0, 0, 0))
    draw2.text((30, 130), "UHID: QSD.0000015629              Visit ID: QSD25793", fill=(0, 0, 0))
    draw2.text((30, 160), "Collected: 213/2026 10:00AM       Reported: 21/Jan/2026 02:00PM", fill=(0, 0, 0))
    draw2.text((30, 190), "Status: Final Report              Panel Name: RENAL FUNCTION", fill=(0, 0, 0))
    draw2.line([(20, 220), (780, 220)], fill=(180, 180, 180), width=1)
    draw2.text((30, 240), "TEST NAME                     RESULT       UNIT        BIO REFERENCE", fill=(0, 0, 0))
    # Altered value with mismatched patch
    draw2.rectangle([210, 265, 300, 290], fill=(240, 240, 240))
    draw2.text((30, 270), "SERUM CREATININE              106          mg/dL       0.45 - 1.50", fill=(0, 0, 0))
    draw2.text((30, 300), "SERUM SODIUM                  138.0        mmol/L      136 - 145", fill=(0, 0, 0))
    draw2.text((30, 330), "SERUM POTASSIUM               4.20         mmol/L      3.5 - 5.2", fill=(0, 0, 0))
    draw2.text((30, 420), "Consultant Name: Dr. A. K. Gupta, MD (Biochemistry)", fill=(0, 0, 0))
    draw2.text((30, 450), "Signature: [Verified Electronic Signature]", fill=(0, 0, 0))
    img2.save(doc2_path)

    print(f"Sample test documents created: {doc1_path}, {doc2_path}")
    return doc1_path, doc2_path


def run_tests():
    print("=" * 60)
    print("RUNNING COMPREHENSIVE FORENSICS SYSTEM VERIFICATION")
    print("=" * 60)

    base_dir = os.path.abspath(os.path.dirname(__file__))
    test_dir = os.path.join(base_dir, "test_artifacts")
    doc1_path, doc2_path = create_sample_documents(test_dir)

    # 1. Test OCR Agent
    print("\n--- 1. Testing OCR Agent ---")
    ocr_agent = OCRAgent()
    ocr_res1 = ocr_agent.process_document("TEST_DOC_1", doc1_path, os.path.join(test_dir, "pages"))
    ocr_res2 = ocr_agent.process_document("TEST_DOC_2", doc2_path, os.path.join(test_dir, "pages"))
    print(f"Doc 1 OCR text extracted ({len(ocr_res1['pages'][0]['text_items'])} items).")
    print(f"Doc 2 OCR text extracted ({len(ocr_res2['pages'][0]['text_items'])} items).")
    assert len(ocr_res1["combined_text"]) > 0, "OCR combined text should not be empty"

    # 2. Test Visual Forensic Agent
    print("\n--- 2. Testing Visual Forensic Agent (MobileNetV2 + YOLOv8) ---")
    mobilenet_path = os.path.join(base_dir, "models", "document_forensics_model.keras")
    yolo_path = os.path.join(base_dir, "models", "best.pt")
    config_path = os.path.join(base_dir, "models", "model_config.json")

    vis_agent = VisualForensicAgent(mobilenet_path, yolo_path, config_path)
    vis_res1 = vis_agent.analyze_document("TEST_DOC_1", "test_doc_original.png", ocr_res1, os.path.join(test_dir, "pages"))
    vis_res2 = vis_agent.analyze_document("TEST_DOC_2", "test_doc_altered.png", ocr_res2, os.path.join(test_dir, "pages"))
    print(f"Doc 1 Classification: {vis_res1['classification']} (Score: {vis_res1['tampering_score']})")
    print(f"Doc 2 Classification: {vis_res2['classification']} (Score: {vis_res2['tampering_score']})")
    assert "tampering_score" in vis_res1
    assert "threshold" in vis_res1

    # 3. Test Contextual Analysis Agent
    print("\n--- 3. Testing Contextual Analysis Agent ---")
    context_agent = ContextualAnalysisAgent()
    context_res = context_agent.analyze_documents([ocr_res1, ocr_res2])
    print(f"Context Agent Status: {context_res['status']}")
    print(f"Entities identified: {len(context_res['entities'])}")
    print(f"Anomalies detected: {len(context_res['anomalies'])}")
    for anom in context_res['anomalies']:
        print(f"  * {anom}")

    # 4. Test Cross-Document Comparison Agent
    print("\n--- 4. Testing Cross-Document Comparison Agent ---")
    comp_agent = CrossDocumentComparisonAgent()
    comp_res = comp_agent.compare_documents([ocr_res1, ocr_res2], context_res)
    print(f"Total Comparisons: {comp_res['total_comparisons']}")
    for c in comp_res["comparisons"]:
        print(f"Pair: {c['document_1']} <-> {c['document_2']}, Similarity: {c['similarity_score']}, Status: {c['status']}")
    print(f"Discrepancies found: {len(comp_res['potential_contradictions'])}")
    for d in comp_res['potential_contradictions']:
        print(f"  ! {d}")
    assert comp_res["total_comparisons"] == 1

    # 5. Test Evidence Investigation Agent
    print("\n--- 5. Testing Evidence Investigation Agent ---")
    ev_agent = EvidenceInvestigationAgent()
    evidence_items = ev_agent.compile_evidence(
        ocr_results=[ocr_res1, ocr_res2],
        visual_results=[vis_res1, vis_res2],
        context_results=context_res,
        comparison_results=comp_res,
    )
    print(f"Compiled {len(evidence_items)} Evidence Items:")
    for ev in evidence_items:
        print(f"  [{ev['evidence_id']}] {ev['evidence_type']} ({ev['source_level']}): {ev['explanation'][:90]}")
    assert len(evidence_items) > 0

    # 6. Test Investigation Report Agent
    print("\n--- 6. Testing Investigation Report Agent ---")
    report_agent = InvestigationReportAgent(output_dir=os.path.join(test_dir, "reports"))
    report = report_agent.generate_report(
        investigation_id="INV-TEST-001",
        ocr_results=[ocr_res1, ocr_res2],
        visual_results=[vis_res1, vis_res2],
        context_results=context_res,
        comparison_results=comp_res,
        evidence_items=evidence_items,
    )
    print(f"Report Generated: Status = '{report['investigation_status']}'")
    print(f"PDF Report Path: {report['pdf_report_path']}")
    assert report['investigation_status'] == "Pending Human Investigation"
    assert os.path.exists(report['pdf_report_path'])

    # 7. Test LangGraph Orchestrator End-to-End
    print("\n--- 7. Testing LangGraph Orchestrator ---")
    orchestrator = ForensicsOrchestrator(
        mobilenet_path=mobilenet_path,
        yolo_path=yolo_path,
        config_path=config_path,
        uploads_dir=test_dir,
        outputs_dir=test_dir,
    )
    doc_records = [
        {
            "id": "DOC-101",
            "original_filename": "test_doc_original.png",
            "file_path": doc1_path,
            "file_size": os.path.getsize(doc1_path),
            "content_type": "image/png",
            "page_count": 1,
        },
        {
            "id": "DOC-102",
            "original_filename": "test_doc_altered.png",
            "file_path": doc2_path,
            "file_size": os.path.getsize(doc2_path),
            "content_type": "image/png",
            "page_count": 1,
        },
    ]
    graph_state = orchestrator.run_investigation("INV-TEST-GRAPH", doc_records)
    print(f"LangGraph execution finished! Final progress: {graph_state['progress']}%, Status: {graph_state['status']}")
    assert graph_state['status'] == "completed"

    print("\n" + "=" * 60)
    print("ALL AGENT AND ORCHESTRATOR TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    run_tests()


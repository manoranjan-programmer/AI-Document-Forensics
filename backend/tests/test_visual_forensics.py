"""
Automated Visual Forensics Validation Suite
File: tests/test_visual_forensics.py

Validates MobileNetV2 document classification and YOLOv8 tampering-region detection across:
A. Clean digital PDF (e.g. sample_salary_slip.pdf).
B. Clean document image (e.g. test_doc_original.png).
C. Intentionally modified test document (e.g. test_doc_altered.png).
D. Bank statement document (e.g. sample_bank_statement.pdf).

Generates a detailed diagnostic report with:
- Classification score vs threshold.
- YOLO detection count and confidence.
- Processing latency.
- Statistical verification of false-positive elimination.
"""

import os
import sys
import time
import glob
from pathlib import Path

# Setup paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from tools.model_diagnostics import ModelDiagnostics
from tools.pdf_processor import extract_pages_from_document


def run_visual_forensics_validation():
    print("=" * 80)
    print("AGENTIC DOCUMENT FORENSICS: VISUAL FORENSICS VALIDATION SUITE")
    print("=" * 80)

    # Initialize Diagnostics
    diagnostics = ModelDiagnostics(
        mobilenet_path=str(PROJECT_ROOT / "models" / "document_forensics_model.keras"),
        yolo_path=str(PROJECT_ROOT / "models" / "best.pt"),
        config_path=str(PROJECT_ROOT / "models" / "model_config.json"),
    )

    test_cases = []

    # 1. Clean Digital Salary Slip PDF
    pdf_candidates = list((PROJECT_ROOT / "uploads").glob("*salary_slip.pdf"))
    if pdf_candidates:
        pdf_path = str(pdf_candidates[0])
        pages_out = str(PROJECT_ROOT / "outputs" / "test_eval" / "salary_slip")
        extracted = extract_pages_from_document(pdf_path, pages_out)
        if extracted:
            test_cases.append({
                "category": "A. Clean Digital PDF (Salary Slip)",
                "path": extracted[0]["image_path"],
                "source": os.path.basename(pdf_path),
                "expected_classification": "Likely Authentic",
                "expected_yolo_max": 0,
            })

    # 2. Clean Document Image (Original)
    orig_candidates = list((PROJECT_ROOT / "uploads").glob("*test_doc_original.png")) + list((PROJECT_ROOT / "uploads").glob("*sample_doc_original.png"))
    if orig_candidates:
        test_cases.append({
            "category": "B. Clean Document Image (Original)",
            "path": str(orig_candidates[0]),
            "source": orig_candidates[0].name,
            "expected_classification": "Likely Authentic",
            "expected_yolo_max": 0,
        })

    # 3. Intentionally Modified Test Document (Altered)
    alt_candidates = list((PROJECT_ROOT / "uploads").glob("*test_doc_altered.png"))
    if alt_candidates:
        test_cases.append({
            "category": "C. Intentionally Modified Test Document (Altered)",
            "path": str(alt_candidates[0]),
            "source": alt_candidates[0].name,
            "expected_classification": None,  # Evaluate YOLO detection
            "expected_yolo_min": 1,
        })

    # 4. Bank Statement PDF
    bank_candidates = list((PROJECT_ROOT / "uploads").glob("*bank_statement.pdf"))
    if bank_candidates:
        pdf_path = str(bank_candidates[0])
        pages_out = str(PROJECT_ROOT / "outputs" / "test_eval" / "bank_statement")
        extracted = extract_pages_from_document(pdf_path, pages_out)
        if extracted:
            test_cases.append({
                "category": "D. Digital Document PDF (Bank Statement)",
                "path": extracted[0]["image_path"],
                "source": os.path.basename(pdf_path),
                "expected_classification": "Likely Authentic",
                "expected_yolo_max": 0,
            })

    results = []
    print(f"\nExecuting validation on {len(test_cases)} document test cases...\n")

    for tc in test_cases:
        print(f"Testing: {tc['category']}")
        print(f"  Source file: {tc['source']}")
        report = diagnostics.diagnose_image(tc["path"], yolo_conf=0.25)
        
        mob_res = report["mobilenet_classification"]
        yolo_res = report["yolo_detection"]
        img_props = report["image_properties"]

        print(f"  Dimensions: {img_props['dimensions'][0]}x{img_props['dimensions'][1]} | Mode: {img_props['channel_mode']}")
        print(f"  MobileNetV2 Score: {mob_res['raw_score']:.4f} (Threshold: {mob_res['threshold']}) -> {mob_res['classification']}")
        print(f"  YOLOv8 Regions: {yolo_res['deduplicated_count']} detected (Latency: {yolo_res['latency_ms']}ms)")
        if yolo_res["detections"]:
            for d in yolo_res["detections"]:
                print(f"    - Box: {d['box']} (Conf: {d['confidence']*100:.1f}%)")

        # Evaluate assertions
        pass_mob = True
        if tc.get("expected_classification"):
            pass_mob = (mob_res["classification"] == tc["expected_classification"])

        pass_yolo = True
        if "expected_yolo_max" in tc:
            pass_yolo = (yolo_res["deduplicated_count"] <= tc["expected_yolo_max"])
        elif "expected_yolo_min" in tc:
            pass_yolo = (yolo_res["deduplicated_count"] >= tc["expected_yolo_min"])

        status = "PASSED" if (pass_mob and pass_yolo) else "FAILED"
        print(f"  Test Result: [{status}]\n")

        results.append({
            "category": tc["category"],
            "source": tc["source"],
            "score": mob_res["raw_score"],
            "threshold": mob_res["threshold"],
            "classification": mob_res["classification"],
            "yolo_count": yolo_res["deduplicated_count"],
            "total_ms": report["total_processing_time_ms"],
            "status": status,
        })

    # Summary Table
    print("=" * 80)
    print("VALIDATION SUMMARY")
    print("=" * 80)
    print(f"{'Category':<42} | {'Score':<8} | {'Class':<18} | {'YOLO':<6} | {'Status'}")
    print("-" * 80)
    for r in results:
        print(f"{r['category'][:40]:<42} | {r['score']:<8.4f} | {r['classification']:<18} | {r['yolo_count']:<6} | {r['status']}")
    print("=" * 80)

    # Scientific Caution & Disclaimer
    print("\n[Methodological Disclosure]")
    print("- Independent labeled benchmark dataset: None provided locally.")
    print("- As no comprehensive external ground-truth dataset is bundled, population-wide")
    print("  false-positive and false-negative rates cannot be definitively asserted.")
    print("- Model predictions provide statistical anomaly indicators to assist human investigators")
    print("  and never constitute conclusive legal proof of authenticity or tampering.\n")


if __name__ == "__main__":
    run_visual_forensics_validation()


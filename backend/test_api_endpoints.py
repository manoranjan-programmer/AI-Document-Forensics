"""
API Endpoints Test Suite
Uses FastAPI TestClient to test all 10 endpoints.
"""

import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from main import app


def test_api():
    print("=" * 60)
    print("TESTING ALL FASTAPI ENDPOINTS")
    print("=" * 60)

    client = TestClient(app)

    # 1. GET /
    print("\n1. Testing GET /")
    res = client.get("/")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    print("   Output:", res.json()["system"], "- Status:", res.json()["status"])

    # 2. GET /health
    print("\n2. Testing GET /health")
    res = client.get("/health")
    assert res.status_code == 200
    print("   Health:", res.json())

    # 3. POST /documents/upload
    print("\n3. Testing POST /documents/upload")
    test_file_path = os.path.join(os.path.dirname(__file__), "test_artifacts", "test_doc_original.png")
    test_file_path2 = os.path.join(os.path.dirname(__file__), "test_artifacts", "test_doc_altered.png")

    with open(test_file_path, "rb") as f1, open(test_file_path2, "rb") as f2:
        files = [
            ("files", ("test_doc_original.png", f1, "image/png")),
            ("files", ("test_doc_altered.png", f2, "image/png")),
        ]
        res = client.post("/documents/upload", files=files)
    assert res.status_code == 200, f"Upload failed: {res.text}"
    uploaded_docs = res.json()
    print(f"   Uploaded {len(uploaded_docs)} files.")
    doc_ids = [d["document_id"] for d in uploaded_docs]
    print("   Document IDs:", doc_ids)

    # 4. POST /investigation/start
    print("\n4. Testing POST /investigation/start")
    res = client.post("/investigation/start", json={"document_ids": doc_ids, "notes": "API automated test case"})
    assert res.status_code == 200, f"Start failed: {res.text}"
    start_payload = res.json()
    inv_id = start_payload["investigation_id"]
    print("   Investigation ID:", inv_id, "- Status:", start_payload["status"])

    # 5. GET /investigation/{id}
    print(f"\n5. Testing GET /investigation/{inv_id}")
    res = client.get(f"/investigation/{inv_id}")
    assert res.status_code == 200
    print("   Status details:", res.json())

    # 6. GET /investigation/{id}/findings
    print(f"\n6. Testing GET /investigation/{inv_id}/findings")
    res = client.get(f"/investigation/{inv_id}/findings")
    assert res.status_code == 200
    print("   Findings status:", res.json()["status"])

    # 7. GET /investigation/{id}/evidence
    print(f"\n7. Testing GET /investigation/{inv_id}/evidence")
    res = client.get(f"/investigation/{inv_id}/evidence")
    assert res.status_code == 200
    print("   Evidence items count:", res.json()["total_evidence_items"])

    # 8. GET /investigation/{id}/report
    print(f"\n8. Testing GET /investigation/{inv_id}/report")
    res = client.get(f"/investigation/{inv_id}/report")
    assert res.status_code == 200
    rep = res.json()
    print("   Report Title:", rep["report_title"])
    print("   Overall Finding:", rep["overall_classification"])
    print("   Investigation Status:", rep["investigation_status"])

    # 9. GET /investigation/{id}/report/pdf
    print(f"\n9. Testing GET /investigation/{inv_id}/report/pdf")
    res = client.get(f"/investigation/{inv_id}/report/pdf")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    print(f"   PDF downloaded successfully! Bytes: {len(res.content)}")

    # 10. POST /investigation/{id}/review
    print(f"\n10. Testing POST /investigation/{inv_id}/review")
    review_body = {
        "reviewer_name": "Senior Investigator Alex Vance",
        "decision": "Confirmed Tampered",
        "comments": "Pixel artifact analysis and discrepancy in Serum Creatinine between documents confirms intentional alteration of medical record.",
    }
    res = client.post(f"/investigation/{inv_id}/review", json=review_body)
    assert res.status_code == 200, f"Review submission failed: {res.text}"
    rev_result = res.json()
    print("   Review saved:", rev_result)

    # Verify review updated the status
    res = client.get(f"/investigation/{inv_id}")
    assert res.json()["is_reviewed"] is True
    assert res.json()["review_decision"] == "Confirmed Tampered"
    print("   Verification: Case marked as reviewed with decision:", res.json()["review_decision"])

    print("\n" + "=" * 60)
    print("ALL 10 API ENDPOINTS TESTED AND VERIFIED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    test_api()

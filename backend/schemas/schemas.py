"""
Pydantic Schemas for Document Forensics Investigation System
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime


class DocumentUploadResponse(BaseModel):
    document_id: str
    original_filename: str
    saved_filename: str
    file_size_bytes: int
    content_type: str
    page_count: int
    supabase_url: Optional[str] = None
    uploaded_at: str


class OCRBoundingBox(BaseModel):
    box: List[float]  # [x1, y1, x2, y2]
    text: str
    confidence: float
    page_number: int


class OCRPageResult(BaseModel):
    page_number: int
    image_path: str
    width: int
    height: int
    text_items: List[OCRBoundingBox]
    page_text: str


class OCRDocumentResult(BaseModel):
    document_id: str
    document_name: str
    page_count: int
    pages: List[OCRPageResult]
    combined_text: str


class VisualDetection(BaseModel):
    box: List[float]  # [x1, y1, x2, y2]
    confidence: float
    label: str = "suspicious_region"
    page_number: int = 1


class VisualDocumentResult(BaseModel):
    document_id: str
    document_name: str
    classification: str  # "Likely Authentic" or "Potentially Tampered"
    tampering_score: float
    threshold: float
    is_tampered_candidate: bool
    suspicious_regions: List[VisualDetection]
    annotated_pages: List[str] = []


class ContextualAnalysisResult(BaseModel):
    status: str  # "success", "llm_unavailable_rule_based_fallback", "unavailable"
    model_used: str
    executive_summary: str
    entities: List[Dict[str, Any]] = []
    anomalies: List[str] = []
    missing_fields: List[str] = []
    raw_analysis: Optional[str] = None


class CrossDocumentPairComparison(BaseModel):
    document_1: str
    document_2: str
    similarity_score: float
    status: str
    key_field_comparisons: List[Dict[str, Any]] = []
    contradictions: List[str] = []


class CrossDocumentResult(BaseModel):
    total_documents: int
    total_comparisons: int
    comparisons: List[CrossDocumentPairComparison]
    potential_contradictions: List[str] = []


class EvidenceItem(BaseModel):
    evidence_id: str  # e.g. "EVIDENCE_1"
    document: str
    page: int
    evidence_type: str  # "Suspicious Visual Region", "Classification Anomaly", "Contextual Discrepancy", "Cross-Document Contradiction"
    bounding_box: Optional[List[float]] = None
    detection_confidence: Optional[float] = None
    related_text: List[str] = []
    explanation: str
    source_level: str  # "model_prediction", "extracted_fact", "inferred_concern"


class InvestigationStartRequest(BaseModel):
    document_ids: List[str]
    notes: Optional[str] = None


class InvestigationReviewRequest(BaseModel):
    reviewer_name: str = Field(..., min_length=1)
    decision: str = Field(..., description="Verified Authentic, Confirmed Tampered, or Inconclusive")
    comments: str = Field(..., min_length=1)


class InvestigationReviewResponse(BaseModel):
    review_id: str
    reviewer_name: str
    decision: str
    comments: str
    reviewed_at: str


class InvestigationReport(BaseModel):
    investigation_id: str
    report_title: str = "Agentic AI Document Forensics Investigation Report"
    generated_at: str
    investigation_status: str  # "Pending Human Investigation" until signed
    overall_classification: str
    executive_summary: Dict[str, Any]
    documents: List[Dict[str, Any]]
    visual_forensics: Dict[str, Any]
    contextual_analysis: Dict[str, Any]
    cross_document_comparison: Dict[str, Any]
    evidence_items: List[EvidenceItem]
    review: Optional[InvestigationReviewResponse] = None
    pdf_report_path: Optional[str] = None


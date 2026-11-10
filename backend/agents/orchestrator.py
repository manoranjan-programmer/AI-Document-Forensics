"""
LangGraph Investigation Orchestrator
File: agents/orchestrator.py

Coordinates the multi-agent document forensics workflow:
Document Validation -> OCR Extraction -> Visual Forensics -> Contextual Analysis
-> Cross-Document Comparison -> Evidence Investigation -> Report Generation -> Awaiting Human Review.
"""

import os
import logging
import threading
from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, START, END

from services.storage import storage
from tools.runtime_guard import release_memory

logger = logging.getLogger("orchestrator")
logging.basicConfig(level=logging.INFO)


class InvestigationState(TypedDict):
    investigation_id: str
    document_ids: List[str]
    document_records: List[Dict[str, Any]]
    output_pages_dir: str
    output_reports_dir: str

    # Intermediate Agent Results
    ocr_results: List[Dict[str, Any]]
    visual_results: List[Dict[str, Any]]
    context_results: Dict[str, Any]
    comparison_results: Dict[str, Any]
    evidence_items: List[Dict[str, Any]]
    final_report: Dict[str, Any]

    # Flow Management & Telemetry
    progress: float
    current_step: str
    status: str
    errors: List[str]
    agent_status: Dict[str, str]


class ForensicsOrchestrator:
    def __init__(
        self,
        mobilenet_path: str,
        yolo_path: str,
        config_path: str,
        uploads_dir: str,
        outputs_dir: str,
    ):
        self.uploads_dir = uploads_dir
        self.outputs_dir = outputs_dir
        self.output_pages_dir = os.path.join(outputs_dir, "pages")
        self.output_reports_dir = os.path.join(outputs_dir, "reports")

        os.makedirs(self.output_pages_dir, exist_ok=True)
        os.makedirs(self.output_reports_dir, exist_ok=True)

        # Model paths are recorded, not loaded. Every agent is constructed on
        # first use, so creating the orchestrator costs no model memory.
        self.mobilenet_path = mobilenet_path
        self.yolo_path = yolo_path
        self.config_path = config_path

        self._agents: Dict[str, Any] = {}
        self._agent_lock = threading.Lock()

        # Build Graph (binds node methods only; loads nothing)
        self.graph = self._build_graph()

    # --- Lazy agent accessors ---

    def _get_agent(self, key: str, factory):
        """
        Builds an agent once and reuses it. The lock prevents two concurrent
        investigations from constructing duplicate copies of the same model.
        """
        agent = self._agents.get(key)
        if agent is None:
            with self._agent_lock:
                agent = self._agents.get(key)
                if agent is None:
                    logger.info(f"Initializing {key} (lazy)...")
                    agent = factory()
                    self._agents[key] = agent
        return agent

    @property
    def ocr_agent(self):
        from agents.ocr_agent import OCRAgent
        return self._get_agent("ocr_agent", OCRAgent)

    @property
    def visual_agent(self):
        from agents.visual_agent import VisualForensicAgent
        return self._get_agent(
            "visual_agent",
            lambda: VisualForensicAgent(
                mobilenet_path=self.mobilenet_path,
                yolo_path=self.yolo_path,
                config_path=self.config_path,
            ),
        )

    @property
    def context_agent(self):
        from agents.context_agent import ContextualAnalysisAgent
        return self._get_agent("context_agent", ContextualAnalysisAgent)

    @property
    def comparison_agent(self):
        from agents.comparison_agent import CrossDocumentComparisonAgent
        return self._get_agent("comparison_agent", CrossDocumentComparisonAgent)

    @property
    def evidence_agent(self):
        from agents.evidence_agent import EvidenceInvestigationAgent
        return self._get_agent("evidence_agent", EvidenceInvestigationAgent)

    @property
    def report_agent(self):
        from agents.report_agent import InvestigationReportAgent
        return self._get_agent(
            "report_agent",
            lambda: InvestigationReportAgent(output_dir=self.output_reports_dir),
        )

    def loaded_agents(self) -> List[str]:
        """Names of agents constructed so far. Used for diagnostics."""
        return sorted(self._agents.keys())

    def _build_graph(self):
        workflow = StateGraph(InvestigationState)

        # Define Nodes
        workflow.add_node("ocr_node", self._node_ocr)
        workflow.add_node("visual_node", self._node_visual)
        workflow.add_node("context_node", self._node_context)
        workflow.add_node("comparison_node", self._node_comparison)
        workflow.add_node("evidence_node", self._node_evidence)
        workflow.add_node("report_node", self._node_report)

        # Flow Edges
        workflow.add_edge(START, "ocr_node")
        workflow.add_edge("ocr_node", "visual_node")
        workflow.add_edge("visual_node", "context_node")
        workflow.add_edge("context_node", "comparison_node")
        workflow.add_edge("comparison_node", "evidence_node")
        workflow.add_edge("evidence_node", "report_node")
        workflow.add_edge("report_node", END)

        return workflow.compile()

    # --- Node Implementations ---

    def _node_ocr(self, state: InvestigationState) -> Dict[str, Any]:
        inv_id = state["investigation_id"]
        logger.info(f"[{inv_id}] Step 1/6: Running OCR Extraction...")
        storage.update_investigation_progress(inv_id, "processing", 15.0, "OCR Text Extraction")

        ocr_results = []
        errors = list(state.get("errors", []))
        node_errors: List[str] = []
        documents = state.get("document_records", [])

        for doc in documents:
            try:
                res = self.ocr_agent.process_document(
                    document_id=doc["id"],
                    file_path=doc["file_path"],
                    output_pages_dir=self.output_pages_dir,
                )
                ocr_results.append(res)
            except Exception as e:
                err_msg = f"OCR failed for {doc.get('original_filename')}: {e}"
                logger.error(err_msg)
                errors.append(err_msg)
                node_errors.append(err_msg)

        # An agent that produced nothing is reported as failed, never as success.
        if not ocr_results:
            ocr_status = "failed"
        elif len(ocr_results) < len(documents):
            ocr_status = "partial"
        else:
            ocr_status = "success"

        storage.save_agent_result(
            inv_id,
            "ocr_agent",
            {"documents": ocr_results, "agent_status": ocr_status},
            status=ocr_status,
            error="; ".join(node_errors) if node_errors else None,
        )
        release_memory()
        return {
            "ocr_results": ocr_results,
            "errors": errors,
            "agent_status": {**state.get("agent_status", {}), "ocr_agent": ocr_status},
            "progress": 30.0,
            "current_step": "Visual Forensics Inspection",
        }

    def _node_visual(self, state: InvestigationState) -> Dict[str, Any]:
        inv_id = state["investigation_id"]
        logger.info(f"[{inv_id}] Step 2/6: Running Visual Forensics (MobileNetV2 + YOLOv8)...")
        storage.update_investigation_progress(inv_id, "processing", 30.0, "Visual Forensics Inspection")

        visual_results = []
        errors = list(state.get("errors", []))
        node_errors: List[str] = []
        ocr_by_id = {d["document_id"]: d for d in state.get("ocr_results", [])}
        documents = state.get("document_records", [])

        for doc in documents:
            doc_id = doc["id"]
            ocr_res = ocr_by_id.get(doc_id, {"pages": []})
            try:
                res = self.visual_agent.analyze_document(
                    document_id=doc_id,
                    document_name=doc["original_filename"],
                    ocr_result=ocr_res,
                    output_dir=self.output_pages_dir,
                )
                visual_results.append(res)
            except Exception as e:
                err_msg = f"Visual forensics failed for {doc.get('original_filename')}: {e}"
                logger.error(err_msg)
                errors.append(err_msg)
                node_errors.append(err_msg)

        if not visual_results:
            visual_status = "failed"
        elif len(visual_results) < len(documents):
            visual_status = "partial"
        else:
            visual_status = "success"

        storage.save_agent_result(
            inv_id,
            "visual_agent",
            {"documents": visual_results, "agent_status": visual_status},
            status=visual_status,
            error="; ".join(node_errors) if node_errors else None,
        )
        release_memory()
        return {
            "visual_results": visual_results,
            "errors": errors,
            "agent_status": {**state.get("agent_status", {}), "visual_agent": visual_status},
            "progress": 50.0,
            "current_step": "Contextual Analysis",
        }

    def _node_context(self, state: InvestigationState) -> Dict[str, Any]:
        inv_id = state["investigation_id"]
        logger.info(f"[{inv_id}] Step 3/6: Running Contextual Analysis...")
        storage.update_investigation_progress(inv_id, "processing", 50.0, "Contextual Analysis")

        errors = list(state.get("errors", []))
        node_errors: List[str] = []
        ocr_results = state.get("ocr_results", [])
        try:
            res = self.context_agent.analyze_documents(ocr_results)
        except Exception as e:
            err_msg = f"Contextual analysis encountered an error: {e}"
            logger.error(err_msg)
            errors.append(err_msg)
            node_errors.append(err_msg)
            res = {
                "status": "error",
                "executive_summary": "Error during contextual evaluation.",
                "entities": [],
                "anomalies": [],
                "missing_fields": [],
            }

        # The agent always runs, but it may run on the deterministic rule engine
        # instead of the local LLM. That distinction is reported, not hidden.
        if res.get("status") == "error":
            context_status = "failed"
        elif not ocr_results:
            context_status = "no_input"
        elif res.get("status") == "llm_unavailable_rule_based_analysis":
            context_status = "fallback"
        else:
            context_status = "success"

        storage.save_agent_result(
            inv_id,
            "context_agent",
            {**res, "agent_status": context_status},
            status=context_status,
            error="; ".join(node_errors) if node_errors else None,
        )
        release_memory()
        return {
            "context_results": res,
            "errors": errors,
            "agent_status": {**state.get("agent_status", {}), "context_agent": context_status},
            "progress": 65.0,
            "current_step": "Cross-Document Comparison",
        }

    def _node_comparison(self, state: InvestigationState) -> Dict[str, Any]:
        inv_id = state["investigation_id"]
        logger.info(f"[{inv_id}] Step 4/6: Running Cross-Document Comparison (Sentence-BERT)...")
        storage.update_investigation_progress(inv_id, "processing", 65.0, "Cross-Document Comparison")

        errors = list(state.get("errors", []))
        node_errors: List[str] = []
        ocr_results = state.get("ocr_results", [])
        try:
            res = self.comparison_agent.compare_documents(
                ocr_results=ocr_results,
                context_results=state.get("context_results"),
            )
        except Exception as e:
            err_msg = f"Cross-document comparison error: {e}"
            logger.error(err_msg)
            errors.append(err_msg)
            node_errors.append(err_msg)
            res = {
                "total_documents": len(ocr_results),
                "total_comparisons": 0,
                "comparisons": [],
                "potential_contradictions": [],
            }

        if node_errors:
            comparison_status = "failed"
        elif len(ocr_results) < 2:
            comparison_status = "no_input"
        else:
            comparison_status = "success"

        storage.save_agent_result(
            inv_id,
            "comparison_agent",
            {**res, "agent_status": comparison_status},
            status=comparison_status,
            error="; ".join(node_errors) if node_errors else None,
        )
        release_memory()
        return {
            "comparison_results": res,
            "errors": errors,
            "agent_status": {**state.get("agent_status", {}), "comparison_agent": comparison_status},
            "progress": 80.0,
            "current_step": "Evidence Mapping",
        }

    def _node_evidence(self, state: InvestigationState) -> Dict[str, Any]:
        inv_id = state["investigation_id"]
        logger.info(f"[{inv_id}] Step 5/6: Synthesizing Evidence Items...")
        storage.update_investigation_progress(inv_id, "processing", 80.0, "Evidence Mapping")

        errors = list(state.get("errors", []))
        visual_results = state.get("visual_results", [])
        try:
            items = self.evidence_agent.compile_evidence(
                ocr_results=state.get("ocr_results", []),
                visual_results=visual_results,
                context_results=state.get("context_results"),
                comparison_results=state.get("comparison_results"),
            )

            # Map grounded evidence bounding boxes (e.g. cross-document discrepancy regions) back to visual results
            from tools.image_processor import draw_tampering_annotations
            for v_doc in visual_results:
                d_name = v_doc.get("document_name", "")
                d_id = v_doc.get("document_id", "")

                doc_ev_boxes = [
                    ev for ev in items
                    if (ev.get("document") == d_name or ev.get("document") == d_id or d_name in ev.get("document", "") or (ev.get("document") and ev.get("document") in d_name))
                    and ev.get("bounding_box") is not None
                    and ev.get("category") != "MobileNetV2 Classifier Finding"
                ]

                if doc_ev_boxes:
                    for ev in doc_ev_boxes:
                        p_num = ev.get("page", 1)
                        box = ev.get("bounding_box")
                        existing_boxes = [r.get("box") for r in v_doc.get("suspicious_regions", [])]
                        if box not in existing_boxes:
                            label = ev.get("evidence_type", "Detected Anomaly Region")
                            conf = ev.get("detection_confidence") or 0.95
                            new_region = {
                                "box": [round(c, 2) for c in box],
                                "confidence": round(conf, 4),
                                "label": label,
                                "page_number": p_num,
                                "overlapping_text": ev.get("related_text", []),
                                "explanation": ev.get("explanation", ""),
                            }
                            v_doc["suspicious_regions"].append(new_region)

                            for pr in v_doc.get("page_results", []):
                                if pr.get("page_number") == p_num:
                                    pr_boxes = [r.get("box") for r in pr.get("suspicious_regions", [])]
                                    if box not in pr_boxes:
                                        pr["suspicious_regions"].append(new_region)
                                    if pr.get("image_path") and pr.get("annotated_image_path"):
                                        try:
                                            draw_tampering_annotations(
                                                pr["image_path"],
                                                pr["suspicious_regions"],
                                                pr["annotated_image_path"],
                                            )
                                        except Exception as d_err:
                                            logger.warning(f"Could not redraw annotations for {d_name}: {d_err}")

                    v_doc["is_tampered_candidate"] = True
                    v_doc["classification"] = "Potentially Tampered"

                    # Update overall and page tampering score to match the detected anomaly confidence (e.g. 0.9500)
                    if v_doc.get("suspicious_regions"):
                        max_conf = max(r.get("confidence", 0.0) for r in v_doc["suspicious_regions"])
                        v_doc["tampering_score"] = round(max(v_doc.get("tampering_score", 0.0), max_conf), 4)
                        for pr in v_doc.get("page_results", []):
                            if pr.get("suspicious_regions"):
                                max_p_conf = max(r.get("confidence", 0.0) for r in pr["suspicious_regions"])
                                pr["tampering_score"] = round(max(pr.get("tampering_score", 0.0), max_p_conf), 4)
                                pr["classification"] = "Potentially Tampered"
                                pr["is_tampered_candidate"] = True

            storage.save_agent_result(inv_id, "visual_agent", {"documents": visual_results})

        except Exception as e:
            err_msg = f"Evidence compilation error: {e}"
            logger.error(err_msg, exc_info=True)
            errors.append(err_msg)
            items = []

        storage.save_evidence_items(inv_id, items)
        storage.save_agent_result(inv_id, "evidence_agent", {"items": items})
        return {
            "evidence_items": items,
            "visual_results": visual_results,
            "errors": errors,
            "progress": 90.0,
            "current_step": "Generating Forensic Report",
        }

    def _node_report(self, state: InvestigationState) -> Dict[str, Any]:
        inv_id = state["investigation_id"]
        logger.info(f"[{inv_id}] Step 6/6: Generating Comprehensive Report & PDF...")
        storage.update_investigation_progress(inv_id, "processing", 90.0, "Generating Report")

        errors = list(state.get("errors", []))
        try:
            report_data = self.report_agent.generate_report(
                investigation_id=inv_id,
                ocr_results=state.get("ocr_results", []),
                visual_results=state.get("visual_results", []),
                context_results=state.get("context_results", {}),
                comparison_results=state.get("comparison_results", {}),
                evidence_items=state.get("evidence_items", []),
                human_review=storage.get_review(inv_id),
            )
            storage.save_report(inv_id, report_data, report_data.get("pdf_report_path"))
        except Exception as e:
            err_msg = f"Report generation error: {e}"
            logger.error(err_msg)
            errors.append(err_msg)
            report_data = {}

        storage.update_investigation_progress(inv_id, "completed", 100.0, "Pending Human Investigation")
        return {
            "final_report": report_data,
            "errors": errors,
            "progress": 100.0,
            "status": "completed",
            "current_step": "Pending Human Investigation",
        }

    def run_investigation(self, investigation_id: str, document_records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Executes the compiled LangGraph pipeline synchronously or within a background worker.
        """
        initial_state: InvestigationState = {
            "investigation_id": investigation_id,
            "document_ids": [d["id"] for d in document_records],
            "document_records": document_records,
            "output_pages_dir": self.output_pages_dir,
            "output_reports_dir": self.output_reports_dir,
            "ocr_results": [],
            "visual_results": [],
            "context_results": {},
            "comparison_results": {},
            "evidence_items": [],
            "final_report": {},
            "progress": 0.0,
            "current_step": "Initializing",
            "status": "processing",
            "errors": [],
        }

        logger.info(f"Starting LangGraph execution for {investigation_id} ({len(document_records)} docs)...")
        final_state = self.graph.invoke(initial_state)
        logger.info(f"LangGraph execution finished for {investigation_id}.")
        return final_state


"""
Agent 2: Visual Forensic Agent
File: agents/visual_agent.py

- Loads MobileNetV2 classification model (document_forensics_model.keras)
  and YOLOv8 region detection model (best.pt).
- Classifies documents as Likely Authentic or Potentially Tampered.
- Detects suspicious visual tampering regions using YOLOv8.
- Returns classification score, configured threshold, bounding boxes, and detection confidence.
- Handles multiple pages.
- Never describes model predictions as proof of fraud.
- Does not inject normal OCR text fields as fake tampering anomalies.
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
import numpy as np
from PIL import Image

from tools.image_processor import (
    load_image_for_mobilenet,
    draw_tampering_annotations,
    filter_duplicate_boxes,
    compute_box_intersection_ratio,
)

logger = logging.getLogger("visual_agent")
logging.basicConfig(level=logging.INFO)

# Global cached models
_MOBILENET_MODEL = None
_YOLO_MODEL = None
_MODEL_CONFIG = None


def get_model_config(config_path: str) -> Dict[str, Any]:
    global _MODEL_CONFIG
    if _MODEL_CONFIG is None:
        if os.path.exists(config_path):
            with open(config_path, "r") as f:
                _MODEL_CONFIG = json.load(f)
        else:
            _MODEL_CONFIG = {
                "threshold": 0.90,
                "input_size": [224, 224],
                "labels": {"0": "Authentic", "1": "Tampered"},
                "model": "MobileNetV2",
            }
    return _MODEL_CONFIG


def get_mobilenet_model(model_path: str):
    global _MOBILENET_MODEL
    if _MOBILENET_MODEL is None:
        import keras
        import tensorflow as tf
        logger.info(f"Loading MobileNetV2 model from {model_path}...")

        def preprocess_input(x):
            return tf.keras.applications.mobilenet_v2.preprocess_input(x)

        custom_objects = {"preprocess_input": preprocess_input}
        _MOBILENET_MODEL = keras.models.load_model(
            model_path, custom_objects=custom_objects, compile=False
        )
        logger.info("MobileNetV2 model loaded successfully.")
    return _MOBILENET_MODEL


def get_yolo_model(model_path: str):
    global _YOLO_MODEL
    if _YOLO_MODEL is None:
        from ultralytics import YOLO
        logger.info(f"Loading YOLOv8 tampering detection model from {model_path}...")
        _YOLO_MODEL = YOLO(model_path)
        logger.info("YOLOv8 model loaded successfully.")
    return _YOLO_MODEL


class VisualForensicAgent:
    def __init__(
        self,
        mobilenet_path: str,
        yolo_path: str,
        config_path: str,
        yolo_conf: float = 0.25,
    ):
        self.mobilenet_path = mobilenet_path
        self.yolo_path = yolo_path
        self.config_path = config_path
        self.yolo_conf = float(os.getenv("YOLO_CONFIDENCE_THRESHOLD", yolo_conf))

        self.config = get_model_config(config_path)
        self.threshold = float(self.config.get("threshold", 0.90))
        self.input_size = tuple(self.config.get("input_size", [224, 224]))

        self.mobilenet = get_mobilenet_model(mobilenet_path)
        self.yolo = get_yolo_model(yolo_path)

    def analyze_page(
        self,
        image_path: str,
        page_number: int,
        output_dir: str,
        ocr_items: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Runs MobileNetV2 classification and YOLOv8 tampering region detection on a single page image.
        """
        # 1. MobileNetV2 Classification
        # IMPORTANT: Model contains an internal preprocessing Lambda layer (lambda_1).
        # We pass original pixel values in [0.0, 255.0] range via standard Keras loading.
        # Do NOT apply preprocess_input a second time.
        input_array = load_image_for_mobilenet(image_path, target_size=self.input_size)
        pred = self.mobilenet.predict(input_array, verbose=0)
        # Class 1 is Tampered, Class 0 is Authentic
        raw_score = float(pred[0][0])
        is_tampered_candidate = raw_score >= self.threshold
        page_classification = "Potentially Tampered" if is_tampered_candidate else "Likely Authentic"

        # 2. YOLOv8 Tampering Region Detection
        suspicious_regions = []
        try:
            yolo_res = self.yolo(image_path, conf=self.yolo_conf, verbose=False)[0]
            if yolo_res.boxes is not None and len(yolo_res.boxes) > 0:
                for box in yolo_res.boxes:
                    coords = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
                    conf = float(box.conf[0].item())

                    # Check if coordinates overlap any OCR extracted text for contextual reference
                    overlapping_texts = []
                    if ocr_items:
                        for item in ocr_items:
                            ibox = item.get("box", [])
                            if len(ibox) == 4 and compute_box_intersection_ratio(ibox, coords) > 0.25:
                                overlapping_texts.append(item.get("text", ""))

                    suspicious_regions.append(
                        {
                            "box": [round(c, 2) for c in coords],
                            "confidence": round(conf, 4),
                            "label": "Visual Anomaly Region (Candidate)",
                            "page_number": page_number,
                            "overlapping_text": overlapping_texts,
                        }
                    )

            # Apply Non-Maximum Suppression (NMS) duplicate-box filtering
            suspicious_regions = filter_duplicate_boxes(suspicious_regions, iou_threshold=0.45)

        except Exception as e:
            logger.warning(f"YOLO inference exception on page {page_number}: {e}")

        # 3. Create Annotated Image for UI
        os.makedirs(output_dir, exist_ok=True)
        annotated_filename = f"annotated_p{page_number}_{os.path.basename(image_path)}"
        annotated_path = os.path.join(output_dir, annotated_filename)

        if suspicious_regions:
            draw_tampering_annotations(image_path, suspicious_regions, annotated_path)
        else:
            # If no regions, save base image
            with Image.open(image_path) as img:
                img.convert("RGB").save(annotated_path, format="PNG")

        return {
            "page_number": page_number,
            "image_path": image_path,
            "tampering_score": round(raw_score, 4),
            "threshold": self.threshold,
            "classification": page_classification,
            "is_tampered_candidate": is_tampered_candidate,
            "suspicious_regions": suspicious_regions,
            "annotated_image_path": annotated_path,
        }

    def analyze_document(
        self,
        document_id: str,
        document_name: str,
        ocr_result: Dict[str, Any],
        output_dir: str,
    ) -> Dict[str, Any]:
        """
        Analyzes all pages of a document and returns document-level summary.
        """
        pages = ocr_result.get("pages", [])
        page_results = []
        all_suspicious_regions = []
        scores = []

        doc_output_dir = os.path.join(output_dir, document_id)

        for page in pages:
            page_num = page.get("page_number", 1)
            img_path = page.get("image_path")
            if not img_path or not os.path.exists(img_path):
                continue

            ocr_items = page.get("text_items", [])
            res = self.analyze_page(img_path, page_num, doc_output_dir, ocr_items=ocr_items)
            page_results.append(res)
            all_suspicious_regions.extend(res["suspicious_regions"])
            scores.append(res["tampering_score"])

        max_score = max(scores) if scores else 0.0
        doc_classification = "Potentially Tampered" if max_score >= self.threshold else "Likely Authentic"

        annotated_pages = [p["annotated_image_path"] for p in page_results if "annotated_image_path" in p]

        return {
            "document_id": document_id,
            "document_name": document_name,
            "classification": doc_classification,
            "tampering_score": round(max_score, 4),
            "threshold": self.threshold,
            "is_tampered_candidate": max_score >= self.threshold,
            "suspicious_regions": all_suspicious_regions,
            "page_results": page_results,
            "annotated_pages": annotated_pages,
            "disclaimer": "Automated visual anomaly detection indicates potential statistical inconsistencies and is not proof of fraud. Final determination requires human review.",
        }

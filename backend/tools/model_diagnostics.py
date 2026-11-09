"""
Model Diagnostics Module for Document Forensics AI
File: tools/model_diagnostics.py

Provides comprehensive inspection and diagnostics for:
1. Model loading status (MobileNetV2, YOLOv8, Model Config).
2. Input image dimensions.
3. Input image pixel range and statistics.
4. Input channel format (RGB/BGR).
5. MobileNetV2 raw prediction score.
6. Configured threshold.
7. Final classification.
8. YOLO detection count.
9. Individual YOLO detection confidence scores.
10. Bounding-box coordinates.
11. Processing time.

Privacy notice: Does not expose sensitive document contents in diagnostic logs.
"""

import os
import time
import json
import logging
from typing import Dict, Any, Optional, List
import numpy as np
from PIL import Image

from agents.visual_agent import (
    get_mobilenet_model,
    get_yolo_model,
    get_model_config,
)
from tools.image_processor import load_image_for_mobilenet, filter_duplicate_boxes

logger = logging.getLogger("model_diagnostics")
logging.basicConfig(level=logging.INFO)


class ModelDiagnostics:
    def __init__(
        self,
        mobilenet_path: str = "backend/models/document_forensics_model.keras",
        yolo_path: str = "backend/models/best.pt",
        config_path: str = "backend/models/model_config.json",
    ):
        self.mobilenet_path = mobilenet_path
        self.yolo_path = yolo_path
        self.config_path = config_path

        # Resolve paths relative to cwd or backend
        if not os.path.exists(self.mobilenet_path) and os.path.exists(os.path.basename(self.mobilenet_path)):
            self.mobilenet_path = os.path.basename(self.mobilenet_path)
        if not os.path.exists(self.yolo_path) and os.path.exists(os.path.basename(self.yolo_path)):
            self.yolo_path = os.path.basename(self.yolo_path)
        if not os.path.exists(self.config_path) and os.path.exists(os.path.basename(self.config_path)):
            self.config_path = os.path.basename(self.config_path)

        self.config = get_model_config(self.config_path)
        self.threshold = float(self.config.get("threshold", 0.90))
        self.input_size = tuple(self.config.get("input_size", [224, 224]))

        self.mobilenet = get_mobilenet_model(self.mobilenet_path)
        self.yolo = get_yolo_model(self.yolo_path)

    def diagnose_image(
        self,
        image_path: str,
        yolo_conf: float = 0.25,
    ) -> Dict[str, Any]:
        """
        Runs comprehensive diagnostic evaluation on a document image.
        Returns detailed telemetry including pixel stats, model scores, and timing.
        """
        start_time = time.perf_counter()

        if not os.path.exists(image_path):
            return {
                "status": "error",
                "error": f"Image file not found: {image_path}",
            }

        # 1. Image Inspection
        with Image.open(image_path) as img:
            orig_width, orig_height = img.size
            channel_mode = img.mode
            img_format = img.format or "UNKNOWN"
            # Sample pixel statistics
            img_rgb = img.convert("RGB")
            raw_array = np.array(img_rgb, dtype=np.float32)
            pixel_min = float(np.min(raw_array))
            pixel_max = float(np.max(raw_array))
            pixel_mean = float(np.mean(raw_array))
            pixel_std = float(np.std(raw_array))

        # 2. MobileNetV2 Inference Timing & Execution
        # Preprocessing: Keras standard loading to [0.0, 255.0] matching internal lambda_1
        t_mob_start = time.perf_counter()
        mob_input = load_image_for_mobilenet(image_path, target_size=self.input_size)
        mob_pred = self.mobilenet.predict(mob_input, verbose=0)
        raw_score = float(mob_pred[0][0])
        classification = "Potentially Tampered" if raw_score >= self.threshold else "Likely Authentic"
        mob_time_ms = round((time.perf_counter() - t_mob_start) * 1000, 2)

        # 3. YOLOv8 Inference Timing & Execution
        t_yolo_start = time.perf_counter()
        yolo_res = self.yolo(image_path, conf=yolo_conf, verbose=False)[0]
        yolo_time_ms = round((time.perf_counter() - t_yolo_start) * 1000, 2)

        detections = []
        if yolo_res.boxes is not None and len(yolo_res.boxes) > 0:
            for b in yolo_res.boxes:
                coords = [round(c, 2) for c in b.xyxy[0].tolist()]
                conf = round(float(b.conf[0].item()), 4)
                detections.append({
                    "box": coords,
                    "confidence": conf,
                    "label": "Visual Anomaly Region (Candidate)",
                })

        # Apply NMS deduplication
        dedup_detections = filter_duplicate_boxes(detections, iou_threshold=0.45)
        total_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

        diagnostics = {
            "status": "success",
            "file": os.path.basename(image_path),
            "image_properties": {
                "dimensions": [orig_width, orig_height],
                "channel_mode": channel_mode,
                "format": img_format,
                "pixel_range": [pixel_min, pixel_max],
                "pixel_mean": round(pixel_mean, 2),
                "pixel_std": round(pixel_std, 2),
            },
            "mobilenet_classification": {
                "model": "MobileNetV2",
                "input_shape": list(mob_input.shape),
                "input_pixel_range": [float(np.min(mob_input)), float(np.max(mob_input))],
                "internal_lambda_layer": "preprocess_input (MobileNetV2 [-1, 1])",
                "raw_score": round(raw_score, 4),
                "threshold": self.threshold,
                "classification": classification,
                "latency_ms": mob_time_ms,
            },
            "yolo_detection": {
                "model": "YOLOv8 (best.pt)",
                "confidence_threshold": yolo_conf,
                "raw_detection_count": len(detections),
                "deduplicated_count": len(dedup_detections),
                "detections": dedup_detections,
                "latency_ms": yolo_time_ms,
            },
            "total_processing_time_ms": total_time_ms,
        }

        logger.info(
            f"[Diagnostics] File: {os.path.basename(image_path)} | "
            f"MobileNet Score: {raw_score:.4f} ({classification}) | "
            f"YOLO Regions: {len(dedup_detections)} | Time: {total_time_ms}ms"
        )
        return diagnostics


if __name__ == "__main__":
    import sys
    diag = ModelDiagnostics()
    test_files = sys.argv[1:] if len(sys.argv) > 1 else [
        "backend/uploads/DOC-7406AACA_test_doc_original.png",
        "backend/uploads/DOC-1B5543F2_test_doc_altered.png",
    ]
    for tf_path in test_files:
        if os.path.exists(tf_path):
            res = diag.diagnose_image(tf_path)
            print(json.dumps(res, indent=2))


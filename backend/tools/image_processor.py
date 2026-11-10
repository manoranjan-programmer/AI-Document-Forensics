"""
Image Processing Tools for Document Forensics
Handles image preprocessing for MobileNetV2, YOLOv8 annotation overlays,
and bounding box geometry.
"""

import os
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from PIL import Image, ImageDraw, ImageFont


def load_image_for_mobilenet(
    image_path: str, target_size: Tuple[int, int] = (224, 224)
) -> np.ndarray:
    """
    Loads an image and prepares it for MobileNetV2.
    IMPORTANT:
    1. The trained model (document_forensics_model.keras) contains its own
       preprocessing Lambda layer (lambda_1) that executes preprocess_input internally.
       Therefore, the input to the model MUST be original pixel values in the range [0.0, 255.0].
       Do NOT apply preprocess_input a second time or normalize to [0, 1].
    2. Uses keep_aspect_ratio=True to prevent unnatural horizontal character distortion
       that occurs when A4 (1:1.41) documents are squeezed into 1:1 squares, which triggers
       geometric tampering false positives.
    """
    import tensorflow as tf
    img = tf.keras.utils.load_img(image_path, target_size=target_size, keep_aspect_ratio=True)
    img_array = tf.keras.utils.img_to_array(img)  # Shape (224, 224, 3), float32, range [0, 255]
    return np.expand_dims(img_array, axis=0)  # Shape (1, 224, 224, 3)


def compute_iou(box_a: List[float], box_b: List[float]) -> float:
    """
    Computes Intersection over Union (IoU) between two bounding boxes [x1, y1, x2, y2].
    """
    x1 = max(box_a[0], box_b[0])
    y1 = max(box_a[1], box_b[1])
    x2 = min(box_a[2], box_b[2])
    y2 = min(box_a[3], box_b[3])

    inter_w = max(0.0, x2 - x1)
    inter_h = max(0.0, y2 - y1)
    inter_area = inter_w * inter_h

    area_a = max(0.0, (box_a[2] - box_a[0]) * (box_a[3] - box_a[1]))
    area_b = max(0.0, (box_b[2] - box_b[0]) * (box_b[3] - box_b[1]))
    union_area = area_a + area_b - inter_area

    if union_area <= 0:
        return 0.0
    return inter_area / union_area


def filter_duplicate_boxes(
    detections: List[Dict[str, Any]], iou_threshold: float = 0.50
) -> List[Dict[str, Any]]:
    """
    Applies Non-Maximum Suppression (NMS) to remove duplicate or heavily overlapping detections.
    Sorts by confidence descending and suppresses lower-confidence boxes with IoU > threshold.
    """
    if len(detections) <= 1:
        return detections

    # Sort descending by confidence
    sorted_dets = sorted(detections, key=lambda d: d.get("confidence", 0.0), reverse=True)
    kept = []

    for det in sorted_dets:
        box = det.get("box", [])
        if len(box) != 4:
            continue
        # Check IoU against already kept boxes
        overlap = False
        for k in kept:
            if compute_iou(box, k.get("box", [])) > iou_threshold:
                overlap = True
                break
        if not overlap:
            kept.append(det)

    return kept


def draw_tampering_annotations(
    image_path: str,
    detections: List[Dict[str, Any]],
    output_path: str,
    box_color: str = "#EF4444",  # Red-500
    fill_color: Optional[str] = "rgba(239, 68, 68, 0.2)",
) -> str:
    """
    Draws YOLO detected tampering bounding boxes and confidence on the image.
    detections: list of dicts with 'box': [x1, y1, x2, y2], 'confidence': float
    Saves annotated image to output_path and returns output_path.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with Image.open(image_path) as img:
        base_img = img.convert("RGBA")
        overlay = Image.new("RGBA", base_img.size, (255, 255, 255, 0))
        draw = ImageDraw.Draw(overlay)

        for det in detections:
            box = det.get("box", [])
            conf = det.get("confidence", 0.0)
            label = det.get("label", "Suspicious Region")

            if len(box) == 4:
                x1, y1, x2, y2 = [float(v) for v in box]
                # Bounding box rectangle
                draw.rectangle([x1, y1, x2, y2], outline=(239, 68, 68, 255), width=3)
                # Fill box with semi-transparency
                draw.rectangle([x1, y1, x2, y2], fill=(239, 68, 68, 45))

                # Text label background and badge
                badge_text = f"{label} ({conf * 100:.1f}%)"
                badge_h = 22
                badge_w = max(len(badge_text) * 8, 90)
                badge_y1 = max(0, y1 - badge_h)
                draw.rectangle([x1, badge_y1, x1 + badge_w, badge_y1 + badge_h], fill=(220, 38, 38, 230))
                draw.text((x1 + 4, badge_y1 + 3), badge_text, fill=(255, 255, 255, 255))

        combined = Image.alpha_composite(base_img, overlay).convert("RGB")
        combined.save(output_path, format="PNG")

    return output_path


def compute_box_intersection_ratio(box_a: List[float], box_b: List[float]) -> float:
    """
    Computes intersection area over box_a area.
    Useful to check how much of an OCR word box (box_a) falls inside a tampering region (box_b).
    Each box is [x1, y1, x2, y2].
    """
    x1 = max(box_a[0], box_b[0])
    y1 = max(box_a[1], box_b[1])
    x2 = min(box_a[2], box_b[2])
    y2 = min(box_a[3], box_b[3])

    inter_w = max(0.0, x2 - x1)
    inter_h = max(0.0, y2 - y1)
    inter_area = inter_w * inter_h

    area_a = max(0.0, (box_a[2] - box_a[0]) * (box_a[3] - box_a[1]))
    if area_a <= 0:
        return 0.0

    return inter_area / area_a

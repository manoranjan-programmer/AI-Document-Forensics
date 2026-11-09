"""
PDF and Document Processor Tool
Handles converting PDF pages into images using PyMuPDF (fitz)
and handling image uploads.
"""

import os
from typing import List, Dict, Any, Tuple
from pathlib import Path
import fitz  # PyMuPDF
from PIL import Image

SUPPORTED_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"}
SUPPORTED_PDF_EXTS = {".pdf"}
SUPPORTED_EXTS = SUPPORTED_IMAGE_EXTS.union(SUPPORTED_PDF_EXTS)


def is_supported_file(filename: str) -> bool:
    ext = Path(filename).suffix.lower()
    return ext in SUPPORTED_EXTS


def extract_pages_from_document(
    file_path: str, output_dir: str, dpi: int = 200
) -> List[Dict[str, Any]]:
    """
    Extracts pages from a PDF or single image file and saves them as images.
    Returns a list of page dicts with:
    - page_number (1-indexed)
    - image_path: absolute path to page image
    - width: width in pixels
    - height: height in pixels
    - original_file: source document name
    """
    os.makedirs(output_dir, exist_ok=True)
    file_path = str(Path(file_path).resolve())
    ext = Path(file_path).suffix.lower()
    base_name = Path(file_path).stem
    pages = []

    if ext in SUPPORTED_PDF_EXTS:
        doc = fitz.open(file_path)
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            pix = page.get_pixmap(dpi=dpi)
            out_filename = f"{base_name}_page_{page_idx + 1}.png"
            out_path = os.path.join(output_dir, out_filename)
            pix.save(out_path)

            pages.append(
                {
                    "page_number": page_idx + 1,
                    "image_path": out_path,
                    "width": pix.width,
                    "height": pix.height,
                    "original_file": os.path.basename(file_path),
                }
            )
        doc.close()

    elif ext in SUPPORTED_IMAGE_EXTS:
        # Single image document
        out_filename = f"{base_name}_page_1.png"
        out_path = os.path.join(output_dir, out_filename)
        with Image.open(file_path) as img:
            rgb_img = img.convert("RGB")
            width, height = rgb_img.size
            rgb_img.save(out_path, format="PNG")

        pages.append(
            {
                "page_number": 1,
                "image_path": out_path,
                "width": width,
                "height": height,
                "original_file": os.path.basename(file_path),
            }
        )
    else:
        raise ValueError(f"Unsupported file format: {ext}")

    return pages


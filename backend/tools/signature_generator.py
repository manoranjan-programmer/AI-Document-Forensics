"""
Signature Generator Tool
Dynamically creates realistic handwritten digital signature images based on investigator names.
Includes flowing cursive calligraphy, natural underline flourish, and security verification stamp.
"""

import os
import hashlib
from typing import Optional
from PIL import Image, ImageDraw, ImageFont


def generate_digital_signature_image(
    name: str,
    output_path: str,
    decision: str = "Verified",
    timestamp: str = "",
) -> str:
    """
    Generates a realistic cursive handwritten signature image as a transparent PNG.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    font_candidates = [
        r"C:\Windows\Fonts\BRUSHSCI.TTF",
        r"C:\Windows\Fonts\segoesc.ttf",
        r"C:\Windows\Fonts\Inkfree.ttf",
        r"C:\Windows\Fonts\MISTRAL.TTF",
        r"C:\Windows\Fonts\FRSCRIPT.TTF",
        r"C:\Windows\Fonts\LHANDW.TTF",
    ]
    font_path = None
    for f in font_candidates:
        if os.path.exists(f):
            font_path = f
            break

    # Generate unique cryptographic verification hash
    hash_seed = f"{name}:{timestamp}:{decision}"
    sig_hash = hashlib.sha256(hash_seed.encode()).hexdigest()[:10].upper()

    font_size = 46
    try:
        font = ImageFont.truetype(font_path, font_size) if font_path else ImageFont.load_default()
    except Exception:
        font = ImageFont.load_default()

    try:
        meta_font = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 13)
    except Exception:
        meta_font = ImageFont.load_default()

    bbox = font.getbbox(name)
    text_w = max(bbox[2] - bbox[0], 120)
    text_h = max(bbox[3] - bbox[1], 25)

    img_w = max(int(text_w + 60), 320)
    text_x = 16
    text_y = max(8 - bbox[1], 4)
    line_y = text_y + bbox[3] + 4
    badge_y = line_y + 7
    img_h = badge_y + 24

    img = Image.new("RGBA", (img_w, img_h), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    # Rich authentic Navy Blue fountain pen ink color: (18, 52, 110)
    ink_color = (18, 52, 110, 245)

    # Draw cursive handwritten signature name
    draw.text((text_x - bbox[0], text_y), name, font=font, fill=ink_color)

    # Dynamic natural pen flourish stroke underneath
    points = [
        (text_x, line_y),
        (text_x + int(text_w * 0.40), line_y + 3),
        (text_x + int(text_w * 0.75), line_y - 2),
        (text_x + int(text_w * 1.05), line_y + 4),
        (text_x + int(text_w * 1.15), line_y),
    ]
    for i in range(len(points) - 1):
        draw.line([points[i], points[i + 1]], fill=ink_color, width=2)

    # Cryptographic validation sub-badge
    sec_color = (71, 85, 105, 220)
    sec_text = f"DIGITALLY CERTIFIED • {sig_hash} • VERIFIED"
    draw.text((text_x, badge_y), sec_text, font=meta_font, fill=sec_color)

    img.save(output_path, "PNG")
    return output_path

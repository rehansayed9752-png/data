from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

def export_high_resolution_sketch(
    source_image_path: str,
    case_number: str,
    iteration_number: int,
    officer_badge: str,
    audit_hash_prefix: str,
) -> str:
    """
    Upscales the 1024x1024 composite to 2048x2048 using Lanczos4 resampling +
    unsharp masking, and appends a forensic chain-of-custody metadata footer.
    """
    src = Path(source_image_path)
    if not src.exists():
        raise FileNotFoundError(f"Source sketch image not found: {source_image_path}")

    img = Image.open(src).convert("RGB")
    upscaled = img.resize((2048, 2048), resample=Image.Resampling.LANCZOS)
    upscaled = upscaled.filter(ImageFilter.UnsharpMask(radius=2.0, percent=140, threshold=2))

    # Add 120px evidentiary chain-of-custody footer banner (2048 x 2168 total)
    canvas = Image.new("RGB", (2048, 2168), color=(15, 23, 42))
    canvas.paste(upscaled, (0, 0))
    draw = ImageDraw.Draw(canvas)
    
    footer_text = (
        f"OFFICIAL FORENSIC COMPOSITE | CASE: {case_number} | ITERATION #{iteration_number} | "
        f"OFFICER BADGE: {officer_badge} | SHA-256 AUDIT: {audit_hash_prefix[:16]}... | RES: 2048x2048px"
    )
    # Draw simple clean text banner
    draw.text((48, 2092), footer_text, fill=(226, 232, 240))

    high_res_path = src.with_name(f"{src.stem}_HIGHRES_2048.png")
    canvas.save(high_res_path, format="PNG", optimize=True)
    return str(high_res_path)

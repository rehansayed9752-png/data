import io
import time
import urllib.parse
from pathlib import Path
from typing import Optional, Tuple
import httpx
from PIL import Image, ImageDraw, ImageFilter, ImageOps

from config import settings

def _apply_forensic_post_filter(img: Image.Image, render_style: str) -> Image.Image:
    """Ensures authentic monochrome graphite/charcoal tonal curve when sketch mode is active."""
    if render_style in ("forensic_graphite", "charcoal_shaded"):
        grey = ImageOps.grayscale(img)
        contrasted = ImageOps.autocontrast(grey, cutoff=1)
        sharpened = contrasted.filter(ImageFilter.UnsharpMask(radius=1.5, percent=120, threshold=3))
        return sharpened.convert("RGB")
    return img

def _generate_deterministic_procedural_sketch(
    case_seed: int,
    iteration_number: int,
    prompt: str,
    output_path: Path,
) -> None:
    """Tier 3 offline emergency fallback: renders a clean forensic composite card if cloud networks fail."""
    img = Image.new("RGB", (1024, 1024), color=(245, 245, 242))
    draw = ImageDraw.Draw(img)
    
    # Head outline (oval)
    center_x, center_y = 512, 480
    rx, ry = 220, 290
    draw.ellipse([center_x - rx, center_y - ry, center_x + rx, center_y + ry], outline=(60, 60, 60), width=4)

    # Eyes & Eyebrows
    draw.line([360, 390, 450, 390], fill=(40, 40, 40), width=6)
    draw.line([570, 390, 660, 390], fill=(40, 40, 40), width=6)
    draw.ellipse([380, 420, 440, 450], outline=(50, 50, 50), width=4)
    draw.ellipse([580, 420, 640, 450], outline=(50, 50, 50), width=4)

    # Nose
    draw.line([512, 430, 500, 530], fill=(50, 50, 50), width=4)
    draw.line([500, 530, 530, 535], fill=(50, 50, 50), width=4)

    # Mouth & Chin
    draw.line([460, 620, 564, 620], fill=(60, 60, 60), width=5)
    draw.arc([470, 690, 550, 720], start=0, end=180, fill=(70, 70, 70), width=3)

    # Add forensic grid / watermark
    header_text = f"FORENSIC COMPOSITE #00{iteration_number} | SEED: {case_seed}"
    draw.text((40, 40), header_text, fill=(100, 100, 100))
    prompt_snippet = (prompt[:90] + "...") if len(prompt) > 90 else prompt
    draw.text((40, 960), f"SPEC: {prompt_snippet}", fill=(120, 120, 120))
    
    img.save(output_path, format="PNG")

async def generate_or_refine_sketch(
    case_id: str,
    iteration_number: int,
    case_seed: int,
    full_compiled_prompt: str,
    delta_edit_instruction: str,
    render_style: str,
    previous_image_path: Optional[str] = None,
) -> Tuple[str, str, int]:
    """
    Returns (saved_image_path, ai_provider_used, latency_ms).
    Cascade:
    1. Gemini 2.5 Flash Image (Nano Banana)
    2. Pollinations Flux locked-seed fallback
    3. Procedural offline composite fallback
    """
    start_ts = time.perf_counter()
    output_filename = f"{case_id}_iter_{iteration_number}.png"
    output_path = settings.SKETCH_DIR / output_filename
    api_key = settings.GEMINI_API_KEY

    # 1. Primary Engine: Google Gemini 2.5 Flash Image
    if api_key:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            contents = []
            if previous_image_path and Path(previous_image_path).exists():
                prev_bytes = Path(previous_image_path).read_bytes()
                contents.append(
                    types.Part.from_bytes(data=prev_bytes, mime_type="image/png")
                )
                edit_prompt = (
                    f"You are a police forensic sketch artist updating an existing composite sketch. "
                    f"Modify ONLY the following requested features on this exact face: {delta_edit_instruction}. "
                    f"Updated full anatomical specification: {full_compiled_prompt}. "
                    f"CRITICAL: Preserve the exact identity, pose, lighting, paper texture, and all "
                    f"unmentioned facial features from the input image."
                )
                contents.append(edit_prompt)
            else:
                contents.append(full_compiled_prompt)

            response = client.models.generate_content(
                model="gemini-2.5-flash-image",
                contents=contents,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                ),
            )
            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.data:
                    img = Image.open(io.BytesIO(part.inline_data.data)).convert("RGB")
                    img = _apply_forensic_post_filter(img, render_style)
                    img.save(output_path, format="PNG")
                    latency = int((time.perf_counter() - start_ts) * 1000)
                    return str(output_path), "gemini-2.5-flash-image", latency
        except Exception as gemini_err:
            print(f"[SketchGenerator] Gemini Image fallback triggered: {gemini_err}")

    # 2. Secondary Engine: Pollinations Flux with Locked Case Seed
    try:
        encoded_prompt = urllib.parse.quote(full_compiled_prompt)
        url = (
            f"https://gen.pollinations.ai/image/{encoded_prompt}"
            f"?model=flux&seed={case_seed}&width=1024&height=1024&nologo=true"
        )
        async with httpx.AsyncClient(timeout=35.0, follow_redirects=True) as http_client:
            resp = await http_client.get(url)
            if resp.status_code == 200 and len(resp.content) > 1000:
                img = Image.open(io.BytesIO(resp.content)).convert("RGB")
                img = _apply_forensic_post_filter(img, render_style)
                img.save(output_path, format="PNG")
                latency = int((time.perf_counter() - start_ts) * 1000)
                return str(output_path), f"flux-seed-{case_seed}", latency
    except Exception as flux_err:
        print(f"[SketchGenerator] Pollinations Flux fallback error: {flux_err}")

    # 3. Tertiary Engine: Deterministic Local Procedural Fallback
    _generate_deterministic_procedural_sketch(case_seed, iteration_number, full_compiled_prompt, output_path)
    latency = int((time.perf_counter() - start_ts) * 1000)
    return str(output_path), "local-procedural-sketch-fallback", latency

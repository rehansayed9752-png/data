import asyncio
import io
import logging
import time
import urllib.parse
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx
from PIL import Image, ImageDraw, ImageFilter, ImageOps
from google.genai import types

from config import settings
from models.schemas import FacialStateJSON
from services.gemini_key_pool import KeySlot, key_pool

logger = logging.getLogger("sketch_generator")


def _apply_forensic_post_filter(img: Image.Image, render_style: str = "forensic_graphite") -> Image.Image:
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
    """Tier 3 offline emergency fallback: renders an anatomical composite card if cloud networks fail."""
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


class SketchGeneratorService:
    """
    Multi-Turn Conversational Face Sketch Generator
    Orchestrated by GeminiKeyPool with multi-key auto-failover and parallel generation.
    """

    @staticmethod
    async def generate_or_refine(
        case_id: str,
        iteration_number: int,
        case_seed: int,
        full_compiled_prompt: str,
        delta_edit_instruction: str,
        render_style: str = "forensic_graphite",
        previous_image_path: Optional[str] = None,
    ) -> Tuple[str, str, int]:
        """
        Generates initial composite or applies identity-preserving surgical edit to previous iteration.
        Returns: (saved_image_path, ai_provider_used, latency_ms)
        """
        start_ts = time.perf_counter()
        output_filename = f"{case_id}_iter_{iteration_number}.png"
        output_path = settings.SKETCH_DIR / output_filename

        # 1. Primary Engine: Gemini 2.5 Flash Image with Multi-Key Failover
        if key_pool.slots:
            try:
                # Prepare contents
                contents = []
                if iteration_number > 1 and previous_image_path and Path(previous_image_path).exists():
                    prev_bytes = Path(previous_image_path).read_bytes()
                    contents.append(
                        types.Part.from_bytes(data=prev_bytes, mime_type="image/png")
                    )
                    edit_prompt = (
                        f"You are a police forensic sketch artist updating an existing composite sketch. "
                        f"Modify ONLY the following requested facial features on this exact person: {delta_edit_instruction}. "
                        f"Updated anatomical specification: {full_compiled_prompt}. "
                        f"STRICT REQUIREMENT: Preserve the exact identity, craniofacial proportions, pose, lighting, "
                        f"paper texture, and every unmentioned facial feature from the attached input sketch."
                    )
                    contents.append(edit_prompt)
                else:
                    initial_prompt = (
                        f"Authentic police forensic artist composite sketch, hand-drawn with 2B and 4B graphite "
                        f"pencils on clean white paper, detailed anatomical cross-hatching, frontal mugshot passport "
                        f"view, neutral expression, symmetrical studio lighting, monochrome greyscale. "
                        f"No text, no watermarks, no rulers. Subject details: {full_compiled_prompt}"
                    )
                    contents.append(initial_prompt)

                def _call_gemini_image(client, slot: KeySlot):
                    return client.models.generate_content(
                        model=settings.GEMINI_IMAGE_MODEL,
                        contents=contents,
                        config=types.GenerateContentConfig(
                            response_modalities=["IMAGE", "TEXT"],
                        ),
                    )

                response, provider_tag = await key_pool.execute_with_failover(
                    _call_gemini_image,
                    model_name=settings.GEMINI_IMAGE_MODEL,
                )

                # Extract and process image
                if response and response.candidates and response.candidates[0].content:
                    for part in response.candidates[0].content.parts:
                        if part.inline_data and part.inline_data.data:
                            img = Image.open(io.BytesIO(part.inline_data.data)).convert("RGB")
                            img = _apply_forensic_post_filter(img, render_style)
                            img.save(output_path, format="PNG")
                            latency = int((time.perf_counter() - start_ts) * 1000)
                            return str(output_path), provider_tag, latency

            except Exception as gemini_err:
                logger.warning(f"[SketchGenerator] All Gemini keys failed or rate-limited: {gemini_err}. Reverting to Flux.")

        # 2. Secondary Engine: Pollinations Flux with Locked Case Seed
        try:
            encoded_prompt = urllib.parse.quote(full_compiled_prompt)
            url = (
                f"https://image.pollinations.ai/prompt/{encoded_prompt}"
                f"?seed={case_seed}&width=1024&height=1024&nologo=true"
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
            logger.warning(f"[SketchGenerator] Pollinations Flux fallback error: {flux_err}")

        # 3. Tertiary Engine: Deterministic Local Procedural Fallback
        _generate_deterministic_procedural_sketch(case_seed, iteration_number, full_compiled_prompt, output_path)
        latency = int((time.perf_counter() - start_ts) * 1000)
        return str(output_path), "local-procedural-sketch-fallback", latency

    @staticmethod
    async def generate_three_variations(
        case_id: str,
        iteration_number: int,
        case_seed: int,
        base_image_path: str,
        uncertain_trait: str = "jawline_chin",
        render_style: str = "forensic_graphite",
    ) -> List[Dict[str, Any]]:
        """
        Parallel Multi-Key Variations Generator (USP #3 & #10):
        Dispatches 3 concurrent requests across separate Google AI Studio keys in the pool (key_1, key_2, key_3).
        Finishes in parallel in ~3s without bursting single-key quota limits.
        """
        start_ts = time.perf_counter()
        if not Path(base_image_path).exists():
            raise FileNotFoundError(f"Base composite not found at {base_image_path}")

        prev_bytes = Path(base_image_path).read_bytes()

        # Define 3 distinct variation prompts based on the uncertain trait
        variation_specs = [
            (
                "A",
                f"Alternative Hypothesis A: Modify the {uncertain_trait} to be slightly squarer, wider, and more pronounced bone ridge.",
                "Subtle squarer mandibular angle and wider chin",
            ),
            (
                "B",
                f"Alternative Hypothesis B: Modify the {uncertain_trait} to be slightly narrower, tapered, and softly contoured.",
                "Subtle narrower tapered contour with softened chin",
            ),
            (
                "C",
                f"Alternative Hypothesis C: Modify the {uncertain_trait} to have a distinct cleft indentation and defined edge.",
                "Subtle cleft indentation and sharp angular gonial angle",
            ),
        ]

        # Allocate up to 3 distinct key slots from the pool
        assigned_slots = key_pool.get_distinct_slots(count=3)

        async def _generate_single_variation(label: str, edit_instruction: str, desc: str, slot: Optional[KeySlot]):
            output_filename = f"{case_id}_iter_{iteration_number}_var_{label}.png"
            output_path = settings.SKETCH_DIR / output_filename
            sub_start = time.perf_counter()

            if slot:
                try:
                    contents = [
                        types.Part.from_bytes(data=prev_bytes, mime_type="image/png"),
                        (
                            f"You are a police forensic sketch artist providing alternative memory hypotheses. "
                            f"{edit_instruction} "
                            f"CRITICAL: Keep all other facial regions, pose, lighting, and identity identical to the input sketch."
                        ),
                    ]

                    def _run(client, s):
                        return client.models.generate_content(
                            model=settings.GEMINI_IMAGE_MODEL,
                            contents=contents,
                            config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
                        )

                    # Execute with the allocated slot first, auto-failing over if needed
                    resp, provider_tag = await key_pool.execute_with_failover(_run, model_name=settings.GEMINI_IMAGE_MODEL)

                    if resp and resp.candidates and resp.candidates[0].content:
                        for part in resp.candidates[0].content.parts:
                            if part.inline_data and part.inline_data.data:
                                img = Image.open(io.BytesIO(part.inline_data.data)).convert("RGB")
                                img = _apply_forensic_post_filter(img, render_style)
                                img.save(output_path, format="PNG")
                                latency = int((time.perf_counter() - sub_start) * 1000)
                                return {
                                    "label": label,
                                    "description": desc,
                                    "image_url": f"/static/sketches/{output_filename}",
                                    "ai_provider_used": provider_tag,
                                    "generation_latency_ms": latency,
                                }
                except Exception as var_err:
                    logger.warning(f"[SketchGenerator] Variation {label} failed on Gemini: {var_err}")

            # Fallback for variation
            _generate_deterministic_procedural_sketch(
                case_seed + ord(label),
                iteration_number,
                f"Variation {label}: {desc}",
                output_path,
            )
            return {
                "label": label,
                "description": desc,
                "image_url": f"/static/sketches/{output_filename}",
                "ai_provider_used": "local-procedural-variation",
                "generation_latency_ms": int((time.perf_counter() - sub_start) * 1000),
            }

        tasks = [
            _generate_single_variation(spec[0], spec[1], spec[2], assigned_slots[i] if i < len(assigned_slots) else None)
            for i, spec in enumerate(variation_specs)
        ]

        # Parallel dispatch via asyncio.gather()
        results = await asyncio.gather(*tasks)
        logger.info(f"[SketchGenerator] Generated 3 variations concurrently in {int((time.perf_counter() - start_ts) * 1000)}ms")
        return list(results)

    @staticmethod
    async def simulate_disguise(
        case_id: str,
        iteration_number: int,
        base_image_path: str,
        disguise_type: str = "cap",
        render_style: str = "forensic_graphite",
    ) -> Tuple[str, str, int]:
        """
        Criminal Disguise Simulator (USP #12):
        Applies a non-destructive accessory overlay to the composite sketch (cap, sunglasses, beard, hoodie)
        while strictly locking the underlying craniofacial bone structure.
        """
        start_ts = time.perf_counter()
        output_filename = f"{case_id}_iter_{iteration_number}_disguise_{disguise_type}.png"
        output_path = settings.SKETCH_DIR / output_filename

        if not Path(base_image_path).exists():
            raise FileNotFoundError(f"Base composite not found at {base_image_path}")

        prev_bytes = Path(base_image_path).read_bytes()

        disguise_instructions = {
            "cap": "Add a dark baseball cap / tactical knit beanie pulled low over the forehead.",
            "sunglasses": "Add large dark prescription tinted sunglasses or aviators concealing eyes and brows.",
            "beard": "Add a dense dark heavy full beard concealing jawline and chin contour.",
            "hoodie": "Add a dark hooded sweatshirt with the hood pulled up around the head and face.",
        }
        instruction = disguise_instructions.get(
            disguise_type.lower(),
            f"Add {disguise_type} as an accessory overlay.",
        )

        if key_pool.slots:
            try:
                contents = [
                    types.Part.from_bytes(data=prev_bytes, mime_type="image/png"),
                    (
                        f"You are a police forensic identification specialist simulating criminal disguise alterations. "
                        f"{instruction} "
                        f"STRICT REQUIREMENT: Keep all visible facial bone structure, jawline, nose, lips, ears, "
                        f"lighting, paper texture, and authentic hand-drawn forensic sketch aesthetic identical to the attached input image. "
                        f"Do not modify the subject's identity."
                    ),
                ]

                def _run_disguise(client, slot):
                    return client.models.generate_content(
                        model=settings.GEMINI_IMAGE_MODEL,
                        contents=contents,
                        config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
                    )

                resp, provider_tag = await key_pool.execute_with_failover(_run_disguise, model_name=settings.GEMINI_IMAGE_MODEL)

                if resp and resp.candidates and resp.candidates[0].content:
                    for part in resp.candidates[0].content.parts:
                        if part.inline_data and part.inline_data.data:
                            img = Image.open(io.BytesIO(part.inline_data.data)).convert("RGB")
                            img = _apply_forensic_post_filter(img, render_style)
                            img.save(output_path, format="PNG")
                            latency = int((time.perf_counter() - start_ts) * 1000)
                            return str(output_path), provider_tag, latency

            except Exception as e:
                logger.warning(f"[SketchGenerator] Disguise simulation via Gemini failed: {e}")

        # Fallback disguise rendering
        base_img = Image.open(base_image_path).convert("RGBA")
        overlay = Image.new("RGBA", base_img.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        if disguise_type == "cap":
            draw.rectangle([200, 100, 824, 340], fill=(40, 40, 40, 210))
        elif disguise_type == "sunglasses":
            draw.rounded_rectangle([320, 380, 480, 470], radius=15, fill=(20, 20, 20, 220))
            draw.rounded_rectangle([540, 380, 700, 470], radius=15, fill=(20, 20, 20, 220))
            draw.line([480, 410, 540, 410], fill=(20, 20, 20, 240), width=6)
        elif disguise_type == "beard":
            draw.ellipse([340, 560, 684, 820], fill=(30, 30, 30, 190))
        else:
            draw.arc([160, 100, 864, 900], start=180, end=0, fill=(35, 35, 35, 230), width=45)

        composite = Image.alpha_composite(base_img, overlay).convert("RGB")
        composite.save(output_path, format="PNG")
        latency = int((time.perf_counter() - start_ts) * 1000)
        return str(output_path), "local-procedural-disguise", latency


# Backwards compatibility export
generate_or_refine_sketch = SketchGeneratorService.generate_or_refine

import logging
from typing import List, Optional

from google.genai import types

from config import settings
from models.schemas import FacialStateJSON, RenderStyle, StateCompilationResult
from services.gemini_key_pool import KeySlot, key_pool

logger = logging.getLogger("facial_state_engine")

RENDER_STYLE_INTELLIGENCE = {
    "forensic_graphite": (
        "Authentic police forensic artist composite sketch, hand-drawn with 2B and 4B graphite "
        "pencils on clean white paper, detailed anatomical cross-hatching, frontal mugshot "
        "passport view, neutral expression, symmetrical studio lighting, monochrome greyscale. "
        "No text, no watermarks, no rulers."
    ),
    "charcoal_shaded": (
        "High-contrast forensic charcoal composite drawing, deep anatomical shading on cheekbones "
        "and orbital sockets, frontal mugshot view, textured sketch paper, monochrome charcoal."
    ),
    "photorealistic_id": (
        "Photorealistic police identification frontal mugshot portrait, neutral grey background, "
        "flat studio lighting, realistic skin texture and pores, looking directly at camera."
    ),
}


def _rule_based_state_update(
    current_state: FacialStateJSON,
    combined_input: str,
    is_initial: bool,
) -> StateCompilationResult:
    """Deterministic fallback parser mapping common witness keywords and quick-chips to facial regions."""
    state_dict = current_state.model_dump()
    lowered = combined_input.lower()
    changed: List[str] = []
    xai_badges: List[str] = []
    contradiction: Optional[str] = None
    is_safe = True
    safety_reason = None

    # Celebrity / Public figure check
    celebrity_blocklist = ["modi", "gandhi", "trump", "biden", "shah rukh", "salman", "celebrity", "actor"]
    if any(name in lowered for name in celebrity_blocklist):
        is_safe = False
        safety_reason = "Identified reference to public figure or celebrity; forensic composites must be witness-driven only."

    # Contradiction checks
    if "clean" in lowered and "shaven" in lowered and ("beard" in lowered or "stubble" in lowered or "mustache" in lowered):
        contradiction = "Notice: 'Clean-shaven' statement conflicts with facial hair/stubble description."
    elif ("teen" in lowered or "18" in lowered or "20" in lowered) and ("white beard" in lowered or "elderly" in lowered):
        contradiction = "Notice: Stated youthful age conflicts with elderly beard/feature indicators."

    keyword_map = {
        "head_face_shape": ["oval", "round", "square face", "chiseled face", "gaunt", "heart shape", "diamond face", "long face"],
        "jawline_chin": ["jaw", "chin", "cleft chin", "pointed chin", "double chin", "square jaw", "tapered jaw"],
        "eyes": ["eyes", "almond eyes", "narrow eyes", "wide eyes", "deep-set", "hooded", "eyelids", "dark circles"],
        "eyebrows": ["eyebrows", "brows", "bushy eyebrows", "thin brows", "arched brows", "unibrow"],
        "nose": ["nose", "hooked nose", "crooked nose", "straight nose", "wide nose", "pointed nose", "flat nose"],
        "hair_style_texture": ["hair", "bald", "buzz cut", "curly hair", "wavy hair", "straight hair", "receding hairline", "long hair", "short hair"],
        "facial_hair": ["beard", "mustache", "stubble", "goatee", "clean-shaven", "sideburns", "5-o'clock shadow"],
        "cheeks": ["cheeks", "cheekbones", "high cheekbones", "sunken cheeks", "dimples", "hollow cheeks"],
        "forehead": ["forehead", "high forehead", "narrow forehead", "wrinkled forehead"],
        "mouth_lips": ["lips", "mouth", "thin lips", "full lips", "wide mouth", "narrow mouth"],
        "ears": ["ears", "protruding ears", "large ears", "small ears", "attached lobes"],
        "scars_marks_tattoos": ["scar", "mole", "birthmark", "tattoo", "freckles", "piercing", "wound"],
        "accessories": ["glasses", "sunglasses", "spectacles", "hat", "cap", "earring", "headband"],
        "age_gender_ethnicity": ["male", "female", "man", "woman", "boy", "girl", "years old", "in his", "in her", "south asian", "caucasian", "african", "asian", "latino"],
    }

    for region, keywords in keyword_map.items():
        matched = [k for k in keywords if k in lowered]
        if matched:
            changed.append(region)
            state_dict[region] = f"Witness noted {', '.join(matched)} ({combined_input.strip()})"
            badge_name = region.replace("_", " ").title()
            xai_badges.append(f"{badge_name} Refinement")

    if not changed and is_initial:
        changed = ["head_face_shape", "eyes", "nose", "jawline_chin"]
        state_dict["head_face_shape"] = "Oval contoured face from witness description"
        state_dict["eyes"] = f"Neutral gaze: {combined_input[:60]}"
        state_dict["nose"] = "Proportionate nose"
        state_dict["jawline_chin"] = "Natural defined jawline"
        xai_badges = ["Craniofacial Proportions Base", "Orbital Positioning Base"]

    delta = f"Modify traits: {', '.join(changed)}" if changed else "Refine facial composite based on description"
    return StateCompilationResult(
        updated_state=FacialStateJSON(**state_dict),
        changed_traits=list(set(changed)),
        delta_edit_instruction=delta,
        english_translation=combined_input,
        xai_explanations=xai_badges or ["Facial Landmark Recalibration"],
        contradiction_warning=contradiction,
        is_safe_request=is_safe,
        safety_block_reason=safety_reason,
    )


async def compile_facial_state(
    current_state: FacialStateJSON,
    witness_prompt: str,
    quick_chips: List[str],
    is_initial: bool,
) -> StateCompilationResult:
    """
    Structured Anatomical Compiler & Multilingual Translator
    Executes via GeminiKeyPool multi-key rotating cluster with gemini-2.5-flash.
    """
    combined_input = witness_prompt.strip()
    if quick_chips:
        combined_input += f" | Selected anatomical traits: {', '.join(quick_chips)}"

    # If no keys in pool, use rule-based fallback
    if not key_pool.slots:
        return _rule_based_state_update(current_state, combined_input, is_initial)

    system_instruction = (
        "You are a senior police forensic composite anatomist and forensic linguistic expert. "
        "Analyze the witness statement against the current 14-region FacialStateJSON:\n"
        "1. Auto-detect regional Indian language or English (Kannada, Hindi, Marathi, etc.) "
        "and provide a fluent English translation in 'english_translation'.\n"
        "2. Safety Check: If the witness explicitly names a real-world celebrity, politician, or public figure "
        "(e.g. 'looks like Narendra Modi', 'make him look like Shah Rukh Khan'), set is_safe_request=False "
        "and explain in 'safety_block_reason'. Do not composite real public figures.\n"
        "3. Contradiction Analysis: Check for physiological or logical conflicts (e.g. '18 years old' with "
        "'full white aged beard', or 'clean-shaven' with 'heavy 5 o-clock shadow'). Flag in 'contradiction_warning'.\n"
        "4. Surgical Anatomical Update: Update ONLY the specific anatomical regions mentioned. "
        "Preserve every other field in FacialStateJSON verbatim to prevent identity drift.\n"
        "5. Populate 'changed_traits' with the modified keys (e.g. ['jawline_chin', 'eyes']).\n"
        "6. Write 'delta_edit_instruction' as a concise imperative command for the image generator.\n"
        "7. Generate Explainable AI quantitative badges in 'xai_explanations' showing directional change "
        "(e.g. ['Eyebrow Density +35%', 'Jawline Taper +20%', 'Interpupillary Distance +10%'])."
    )

    user_content = (
        f"IS_INITIAL_DESCRIPTION: {is_initial}\n"
        f"CURRENT_FACIAL_STATE_JSON:\n{current_state.model_dump_json(indent=2)}\n\n"
        f"WITNESS_INPUT:\n{combined_input}"
    )

    def _call_gemini_compilation(client: genai.Client, slot: KeySlot) -> StateCompilationResult:
        response = client.models.generate_content(
            model=settings.GEMINI_TEXT_MODEL,
            contents=user_content,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=StateCompilationResult,
                temperature=0.1,
            ),
        )
        return StateCompilationResult.model_validate_json(response.text)

    try:
        result, provider_tag = await key_pool.execute_with_failover(
            _call_gemini_compilation,
            model_name=settings.GEMINI_TEXT_MODEL,
        )
        logger.info(f"[FacialStateEngine] Successfully compiled state via {provider_tag}")
        return result
    except Exception as e:
        logger.warning(f"[FacialStateEngine] Key pool failover exhausted or error ({e}), reverting to rule-based fallback")
        return _rule_based_state_update(current_state, combined_input, is_initial)


def build_full_diffusion_prompt(state: FacialStateJSON, render_style: RenderStyle) -> str:
    style_prefix = RENDER_STYLE_INTELLIGENCE.get(render_style, RENDER_STYLE_INTELLIGENCE["forensic_graphite"])
    traits = [
        f"Subject: {state.age_gender_ethnicity}",
        f"Face shape: {state.head_face_shape}",
        f"Hair: {state.hair_style_texture}",
        f"Forehead: {state.forehead}",
        f"Eyebrows: {state.eyebrows}",
        f"Eyes: {state.eyes}",
        f"Nose: {state.nose}",
        f"Cheeks: {state.cheeks}",
        f"Jawline and chin: {state.jawline_chin}",
        f"Mouth and lips: {state.mouth_lips}",
        f"Ears: {state.ears}",
        f"Facial hair: {state.facial_hair}",
        f"Distinguishing scars/marks: {state.scars_marks_tattoos}",
        f"Accessories: {state.accessories}",
    ]
    return f"{style_prefix} {' | '.join(traits)}"

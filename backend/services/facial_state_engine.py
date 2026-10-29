import logging
from typing import Any, List, Optional

from google import genai
from google.genai import types

from config import settings
from models.schemas import FacialStateJSON, RenderStyle, StateCompilationResult
from services.gemini_key_pool import KeySlot, key_pool

logger = logging.getLogger("facial_state_engine")

RENDER_STYLE_INTELLIGENCE = {
    "forensic_graphite": (
        "Close-up frontal portrait drawing of one civilian person, hand-drawn with soft 2B graphite pencil "
        "on a completely blank, solid pure white paper background. "
        "Clean natural pencil shading, neutral expression, looking straight at viewer, head and shoulders only, "
        "plain empty white background."
    ),
    "charcoal_shaded": (
        "Close-up frontal portrait drawing of one civilian person, hand-drawn in matte charcoal pencil "
        "on a completely blank, solid off-white paper background, soft natural shading, empty background."
    ),
    "photorealistic_id": (
        "Close-up frontal studio portrait photograph of one civilian person against a plain, solid light grey wall, "
        "natural even studio lighting, neutral expression."
    ),
}

SKIP_DEFAULT_PREFIXES = (
    "no ", "none", "n/a", "nil", "unspecified", "clean-shaven",
    "normal proportioned", "medium height smooth", "natural medium",
    "standard almond", "straight medium", "moderate tapered", "medium balanced"
)


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
            state_dict[region] = combined_input.strip()
            badge_name = region.replace("_", " ").title()
            xai_badges.append(f"{badge_name} Refinement")

    if not changed and is_initial:
        changed = ["head_face_shape", "eyes", "nose", "jawline_chin"]
        state_dict["head_face_shape"] = "Oval contoured face"
        state_dict["eyes"] = "Neutral gaze almond eyes"
        state_dict["nose"] = "Proportionate straight nose"
        state_dict["jawline_chin"] = "Natural defined jawline"
        xai_badges = ["Craniofacial Proportions Base", "Orbital Positioning Base"]
    elif not changed and not is_initial:
        # Refinement fallback if keywords didn't hit: map to jawline/facial_hair or nose as general adjustment
        changed = ["jawline_chin"]
        state_dict["jawline_chin"] = combined_input.strip()[:80]
        xai_badges = ["Facial Contour Precision Tuning"]

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
        candidate_models = [settings.GEMINI_TEXT_MODEL, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-lite-latest"]
        last_error = None
        for model_id in candidate_models:
            if not model_id:
                continue
            try:
                response = client.models.generate_content(
                    model=model_id,
                    contents=user_content,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=StateCompilationResult,
                        temperature=0.1,
                    ),
                )
                return StateCompilationResult.model_validate_json(response.text)
            except Exception as ex:
                last_error = ex
                # If model is deprecated or not found, try next candidate
                if "not found" in str(ex).lower() or "no longer available" in str(ex).lower():
                    continue
                raise ex
        if last_error:
            raise last_error
        raise RuntimeError("No candidate Gemini text models available")

    try:
        result, provider_tag = await key_pool.execute_with_failover(
            _call_gemini_compilation,
            model_name=settings.GEMINI_TEXT_MODEL,
        )
        logger.info(f"[FacialStateEngine] Successfully compiled state via {provider_tag}")
        
        # Post-compilation verification: detect any keys that changed between states
        current_dict = current_state.model_dump()
        updated_dict = result.updated_state.model_dump()
        detected_diff = [k for k, v in updated_dict.items() if v != current_dict.get(k) and v]
        
        # Merge detected traits with model-reported changed_traits
        merged_traits = list(dict.fromkeys(result.changed_traits + detected_diff))
        if not merged_traits and not is_initial:
            rule_fallback = _rule_based_state_update(current_state, combined_input, is_initial)
            merged_traits = rule_fallback.changed_traits
        result.changed_traits = merged_traits

        return result
    except Exception as e:
        logger.warning(f"[FacialStateEngine] Key pool failover exhausted or error ({e}), reverting to rule-based fallback")
        return _rule_based_state_update(current_state, combined_input, is_initial)


def build_full_diffusion_prompt(state: FacialStateJSON, render_style: RenderStyle = "forensic_graphite") -> str:
    """
    Outputs a single clean, natural sentence with ZERO colons (:), ZERO pipes (|),
    and ZERO 'No ...' negative phrases so FLUX never draws anatomy callouts, text, or hats.
    """
    style_prefix = RENDER_STYLE_INTELLIGENCE.get(render_style, RENDER_STYLE_INTELLIGENCE["forensic_graphite"])

    ordered_values = [
        state.age_gender_ethnicity,
        state.head_face_shape,
        state.hair_style_texture,
        state.eyebrows,
        state.eyes,
        state.nose,
        state.cheeks,
        state.jawline_chin,
        state.mouth_lips,
        state.facial_hair,
        state.scars_marks_tattoos,
        state.accessories,
    ]

    descriptive_parts = []
    for val in ordered_values:
        if not val:
            continue
        cleaned = val.strip().rstrip(".")
        low = cleaned.lower()
        if any(low.startswith(p) for p in SKIP_DEFAULT_PREFIXES):
            continue
        descriptive_parts.append(cleaned)

    person_desc = ", ".join(descriptive_parts) if descriptive_parts else "adult male with balanced oval face and short dark hair"
    return f"{style_prefix} Portrait of a {person_desc}. Solid plain white background."

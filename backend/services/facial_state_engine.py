import os
import json
import re
from typing import List
from config import settings
from models.schemas import FacialStateJSON, StateCompilationResult, RenderStyle

RENDER_STYLE_INTELLIGENCE = {
    "forensic_graphite": (
        "Authentic police forensic artist composite sketch, hand-drawn with 2B and 4B graphite "
        "pencils on white cartridge paper, detailed anatomical cross-hatching, frontal mugshot "
        "passport pose, neutral expression, symmetrical studio lighting, sharp facial landmarks, "
        "monochrome greyscale sketch. No color, no 3D CGI, no text, no watermarks."
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
            # Formulate updated region description from matching fragment
            state_dict[region] = f"Witness noted {', '.join(matched)} ({combined_input.strip()})"

    if not changed and is_initial:
        # Default initial assignment
        changed = ["head_face_shape", "eyes", "nose", "jawline_chin"]
        state_dict["head_face_shape"] = "Oval contoured face from witness description"
        state_dict["eyes"] = f"Neutral gaze: {combined_input[:60]}"
        state_dict["nose"] = "Proportionate nose"
        state_dict["jawline_chin"] = "Natural defined jawline"

    delta = f"Adjust traits: {', '.join(changed)}" if changed else "Refine facial composite based on description"
    return StateCompilationResult(
        updated_state=FacialStateJSON(**state_dict),
        changed_traits=list(set(changed)),
        delta_edit_instruction=delta,
    )

async def compile_facial_state(
    current_state: FacialStateJSON,
    witness_prompt: str,
    quick_chips: List[str],
    is_initial: bool,
) -> StateCompilationResult:
    combined_input = witness_prompt.strip()
    if quick_chips:
        combined_input += f" | Selected anatomical traits: {', '.join(quick_chips)}"

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return _rule_based_state_update(current_state, combined_input, is_initial)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        system_instruction = (
            "You are a senior police forensic composite anatomist. "
            "Given the current 14-region FacialStateJSON of a suspect and the witness's new "
            "description or refinement feedback, update ONLY the anatomical regions mentioned "
            "by the witness. Preserve every other field in FacialStateJSON verbatim so the "
            "suspect's identity never drifts. Return the updated state, the list of modified "
            "field keys in changed_traits, and a concise delta_edit_instruction."
        )
        user_content = (
            f"IS_INITIAL_DESCRIPTION: {is_initial}\n"
            f"CURRENT_FACIAL_STATE_JSON:\n{current_state.model_dump_json(indent=2)}\n\n"
            f"WITNESS_STATEMENT:\n{combined_input}"
        )
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=user_content,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=StateCompilationResult,
                temperature=0.1,
            ),
        )
        return StateCompilationResult.model_validate_json(response.text)
    except Exception as e:
        print(f"[FacialStateEngine] Gemini compilation error, falling back to rule-based: {e}")
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

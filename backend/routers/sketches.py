import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db.database import CaseModel, OfficerModel, SketchIterationModel, get_db
from models.schemas import (
    DisguiseResultSchema,
    FacialStateJSON,
    GenerateSketchRequest,
    GenerateVariationsRequest,
    SimulateDisguiseRequest,
    SketchIterationSchema,
    UpdateLikenessRequest,
    VariationResultSchema,
)
from services.audit_service import log_audit_event
from services.facial_state_engine import (
    build_full_diffusion_prompt,
    compile_facial_state,
)
from services.image_upscaler import export_high_resolution_sketch
from services.sketch_generator import SketchGeneratorService, generate_or_refine_sketch

router = APIRouter(prefix="/cases/{case_id}/sketches", tags=["sketches"])


@router.post("/generate", response_model=SketchIterationSchema)
async def generate_sketch(
    case_id: str,
    sketch_req: GenerateSketchRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    case_query = select(CaseModel).where(CaseModel.id == case_id)
    case_res = await db.execute(case_query)
    case = case_res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    officer_id = sketch_req.officer_id or case.lead_officer_id

    # Count prior iterations
    iter_count_query = (
        select(SketchIterationModel)
        .where(SketchIterationModel.case_id == case_id)
        .order_by(SketchIterationModel.iteration_number.desc())
    )
    iter_count_res = await db.execute(iter_count_query)
    all_iterations = iter_count_res.scalars().all()

    current_iter_num = len(all_iterations) + 1
    is_initial = current_iter_num == 1

    # Determine base facial state & previous image with guaranteed absolute path
    prev_image_path = None
    if sketch_req.parent_iteration_id:
        parent_iter = next((it for it in all_iterations if it.id == sketch_req.parent_iteration_id), None)
        if parent_iter:
            base_state = FacialStateJSON(**parent_iter.facial_state_snapshot)
            filename = Path(parent_iter.image_url).name
            prev_image_path = str(settings.SKETCH_DIR / filename)
        else:
            base_state = FacialStateJSON(**case.current_facial_state)
    elif all_iterations:
        latest = all_iterations[0]
        base_state = FacialStateJSON(**latest.facial_state_snapshot)
        filename = Path(latest.image_url).name
        prev_image_path = str(settings.SKETCH_DIR / filename)
    else:
        base_state = FacialStateJSON(**case.current_facial_state)

    # 1. Compile state through Gemini structured output / rule-based compiler
    compilation_result = await compile_facial_state(
        current_state=base_state,
        witness_prompt=sketch_req.witness_prompt,
        quick_chips=sketch_req.quick_chips,
        is_initial=is_initial,
    )

    # Safety policy check
    if not compilation_result.is_safe_request:
        raise HTTPException(
            status_code=400,
            detail=compilation_result.safety_block_reason or "Safety policy violation: Celebrity or public figure detected.",
        )

    render_style = sketch_req.render_style_override or case.render_style
    full_prompt = build_full_diffusion_prompt(compilation_result.updated_state, render_style)

    # 2. Generate sketch
    saved_img_path, provider, latency_ms = await generate_or_refine_sketch(
        case_id=case.id,
        iteration_number=current_iter_num,
        case_seed=case.case_seed,
        full_compiled_prompt=full_prompt,
        delta_edit_instruction=compilation_result.delta_edit_instruction,
        render_style=render_style,
        previous_image_path=prev_image_path,
    )

    img_filename = Path(saved_img_path).name
    web_image_url = f"/static/sketches/{img_filename}"

    # 3. Create iteration record
    iteration_id = str(uuid.uuid4())
    iteration_record = SketchIterationModel(
        id=iteration_id,
        case_id=case.id,
        iteration_number=current_iter_num,
        parent_iteration_id=sketch_req.parent_iteration_id or (all_iterations[0].id if all_iterations else None),
        witness_prompt=sketch_req.witness_prompt,
        compiled_diffusion_prompt=full_prompt,
        facial_state_snapshot=compilation_result.updated_state.model_dump(),
        changed_traits=compilation_result.changed_traits,
        image_url=web_image_url,
        ai_provider_used=provider,
        generation_latency_ms=latency_ms,
        created_by_officer_id=officer_id,
    )
    db.add(iteration_record)

    # Update case state
    case.current_facial_state = compilation_result.updated_state.model_dump()
    case.current_iteration_id = iteration_id
    await db.commit()
    await db.refresh(iteration_record)

    # 4. Log audit event
    action_type = "GENERATED_INITIAL_SKETCH" if is_initial else "REFINED_FACIAL_FEATURE"
    await log_audit_event(
        session=db,
        officer_id=officer_id,
        action_type=action_type,
        resource_target=f"case:{case.case_number}:iter:{current_iter_num}",
        case_id=case.id,
        case_number=case.case_number,
        details={
            "iteration_id": iteration_id,
            "iteration_number": current_iter_num,
            "changed_traits": compilation_result.changed_traits,
            "witness_prompt": sketch_req.witness_prompt,
            "english_translation": compilation_result.english_translation,
            "xai_explanations": compilation_result.xai_explanations,
            "contradiction_warning": compilation_result.contradiction_warning,
            "ai_provider_used": provider,
            "latency_ms": latency_ms,
        },
        ip_address=request.client.host if request.client else "127.0.0.1",
        user_agent=request.headers.get("user-agent", "ForensicTerminal/1.0"),
    )

    return iteration_record


@router.post("/{iteration_id}/variations", response_model=List[VariationResultSchema])
async def generate_variations(
    case_id: str,
    iteration_id: str,
    var_req: GenerateVariationsRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Parallel Multi-Key Variations Generator (USP #3 & #10):
    Dispatches concurrent requests across separate Google AI Studio keys in the pool.
    """
    case_res = await db.execute(select(CaseModel).where(CaseModel.id == case_id))
    case = case_res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    iter_res = await db.execute(
        select(SketchIterationModel).where(
            SketchIterationModel.id == iteration_id,
            SketchIterationModel.case_id == case_id,
        )
    )
    iteration = iter_res.scalar_one_or_none()
    if not iteration:
        raise HTTPException(status_code=404, detail="Iteration not found")

    local_img_path = str(settings.SKETCH_DIR / Path(iteration.image_url).name)
    variations = await SketchGeneratorService.generate_three_variations(
        case_id=case.id,
        iteration_number=iteration.iteration_number,
        case_seed=case.case_seed,
        base_image_path=local_img_path,
        uncertain_trait=var_req.uncertain_trait,
        render_style=case.render_style,
    )

    officer_id = var_req.officer_id or case.lead_officer_id
    await log_audit_event(
        session=db,
        officer_id=officer_id,
        action_type="GENERATED_HYPOTHESIS_VARIATIONS",
        resource_target=f"case:{case.case_number}:iter:{iteration.iteration_number}:variations",
        case_id=case.id,
        case_number=case.case_number,
        details={
            "uncertain_trait": var_req.uncertain_trait,
            "variations_count": len(variations),
            "iteration_id": iteration.id,
        },
        ip_address=request.client.host if request.client else "127.0.0.1",
        user_agent=request.headers.get("user-agent", "ForensicTerminal/1.0"),
    )

    return variations


@router.post("/{iteration_id}/disguise", response_model=DisguiseResultSchema)
async def simulate_disguise(
    case_id: str,
    iteration_id: str,
    disguise_req: SimulateDisguiseRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Criminal Disguise Simulator (USP #12):
    Applies non-destructive accessory overlay to composite sketch while locking facial bone structure.
    """
    case_res = await db.execute(select(CaseModel).where(CaseModel.id == case_id))
    case = case_res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    iter_res = await db.execute(
        select(SketchIterationModel).where(
            SketchIterationModel.id == iteration_id,
            SketchIterationModel.case_id == case_id,
        )
    )
    iteration = iter_res.scalar_one_or_none()
    if not iteration:
        raise HTTPException(status_code=404, detail="Iteration not found")

    local_img_path = str(settings.SKETCH_DIR / Path(iteration.image_url).name)
    saved_path, provider, latency_ms = await SketchGeneratorService.simulate_disguise(
        case_id=case.id,
        iteration_number=iteration.iteration_number,
        base_image_path=local_img_path,
        disguise_type=disguise_req.disguise_type,
        render_style=case.render_style,
    )

    web_url = f"/static/sketches/{Path(saved_path).name}"
    officer_id = disguise_req.officer_id or case.lead_officer_id

    await log_audit_event(
        session=db,
        officer_id=officer_id,
        action_type="SIMULATED_CRIMINAL_DISGUISE",
        resource_target=f"case:{case.case_number}:iter:{iteration.iteration_number}:disguise:{disguise_req.disguise_type}",
        case_id=case.id,
        case_number=case.case_number,
        details={
            "disguise_type": disguise_req.disguise_type,
            "iteration_id": iteration.id,
            "provider": provider,
            "latency_ms": latency_ms,
        },
        ip_address=request.client.host if request.client else "127.0.0.1",
        user_agent=request.headers.get("user-agent", "ForensicTerminal/1.0"),
    )

    return DisguiseResultSchema(
        disguise_type=disguise_req.disguise_type,
        image_url=web_url,
        ai_provider_used=provider,
        generation_latency_ms=latency_ms,
    )


@router.post("/{iteration_id}/likeness", response_model=SketchIterationSchema)
async def update_likeness(
    case_id: str,
    iteration_id: str,
    likeness_req: UpdateLikenessRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    iter_query = select(SketchIterationModel).where(
        SketchIterationModel.id == iteration_id,
        SketchIterationModel.case_id == case_id,
    )
    iter_res = await db.execute(iter_query)
    iteration = iter_res.scalar_one_or_none()
    if not iteration:
        raise HTTPException(status_code=404, detail="Iteration not found")

    iteration.witness_likeness_score = likeness_req.witness_likeness_score
    await db.commit()
    await db.refresh(iteration)

    officer_id = likeness_req.officer_id or iteration.created_by_officer_id
    await log_audit_event(
        session=db,
        officer_id=officer_id,
        action_type="UPDATED_LIKENESS_SCORE",
        resource_target=f"iteration:{iteration.id}",
        case_id=case_id,
        details={
            "iteration_number": iteration.iteration_number,
            "witness_likeness_score": likeness_req.witness_likeness_score,
        },
        ip_address=request.client.host if request.client else "127.0.0.1",
        user_agent=request.headers.get("user-agent", "ForensicTerminal/1.0"),
    )
    return iteration


@router.post("/{iteration_id}/export-highres")
async def export_highres(
    case_id: str,
    iteration_id: str,
    request: Request,
    officer_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    case_res = await db.execute(select(CaseModel).where(CaseModel.id == case_id))
    case = case_res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    iter_res = await db.execute(select(SketchIterationModel).where(SketchIterationModel.id == iteration_id))
    iteration = iter_res.scalar_one_or_none()
    if not iteration:
        raise HTTPException(status_code=404, detail="Iteration not found")

    active_officer_id = officer_id or case.lead_officer_id
    officer_res = await db.execute(select(OfficerModel).where(OfficerModel.id == active_officer_id))
    officer = officer_res.scalar_one_or_none()
    officer_badge = officer.badge_number if officer else "KA-4091"

    local_img_path = str(settings.SKETCH_DIR / Path(iteration.image_url).name)

    audit_entry = await log_audit_event(
        session=db,
        officer_id=active_officer_id,
        action_type="EXPORTED_HIGH_RES_SKETCH",
        resource_target=f"case:{case.case_number}:iter:{iteration.iteration_number}",
        case_id=case.id,
        case_number=case.case_number,
        details={
            "iteration_id": iteration.id,
            "iteration_number": iteration.iteration_number,
            "dimensions": "2048x2168",
        },
        ip_address=request.client.host if request.client else "127.0.0.1",
        user_agent=request.headers.get("user-agent", "ForensicTerminal/1.0"),
    )

    high_res_path = export_high_resolution_sketch(
        source_image_path=local_img_path,
        case_number=case.case_number,
        iteration_number=iteration.iteration_number,
        officer_badge=officer_badge,
        audit_hash_prefix=audit_entry.row_hash,
    )

    high_res_url = f"/static/sketches/{Path(high_res_path).name}"
    iteration.high_res_image_url = high_res_url
    await db.commit()

    return {
        "iteration_id": iteration.id,
        "high_res_image_url": high_res_url,
        "audit_hash": audit_entry.row_hash,
        "resolution": "2048x2048 (with chain-of-custody footer banner)",
    }

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

RenderStyle = Literal["forensic_graphite", "charcoal_shaded", "photorealistic_id"]
OfficerRole = Literal["investigator", "forensic_specialist", "supervisor"]

class FacialStateJSON(BaseModel):
    age_gender_ethnicity: str = Field(default="Adult male, approximately 30-35 years old")
    head_face_shape: str = Field(default="Balanced oval face shape")
    hair_style_texture: str = Field(default="Short neat dark hair")
    forehead: str = Field(default="Medium height smooth forehead")
    eyebrows: str = Field(default="Natural medium-thickness eyebrows")
    eyes: str = Field(default="Standard almond-shaped eyes, neutral gaze")
    nose: str = Field(default="Straight medium-width nose")
    cheeks: str = Field(default="Natural medium cheekbones")
    jawline_chin: str = Field(default="Moderate tapered jawline and rounded chin")
    mouth_lips: str = Field(default="Medium balanced lips, neutral expression")
    ears: str = Field(default="Normal proportioned ears close to head")
    facial_hair: str = Field(default="Clean-shaven")
    scars_marks_tattoos: str = Field(default="No visible scars, moles, or tattoos")
    accessories: str = Field(default="No glasses, hats, or jewelry")

class StateCompilationResult(BaseModel):
    updated_state: FacialStateJSON
    changed_traits: List[str] = Field(
        default_factory=list,
        description="List of anatomical keys modified in this turn, e.g. ['jawline_chin', 'eyes']",
    )
    delta_edit_instruction: str = Field(
        default="",
        description="Concise imperative instruction for the image editor describing only what to change while locking all other traits",
    )
    english_translation: Optional[str] = Field(
        default=None,
        description="English translation of regional witness input (Kannada, Hindi, Marathi, etc.)",
    )
    xai_explanations: List[str] = Field(
        default_factory=list,
        description="Quantitative Explainable AI delta badges, e.g. ['Eyebrow Density +35%', 'Jawline Taper +20%']",
    )
    contradiction_warning: Optional[str] = Field(
        default=None,
        description="Warning if statement contains logical/biological contradictions (e.g. age 18 with full white aged beard)",
    )
    is_safe_request: bool = Field(
        default=True,
        description="Whether the request is safe and free of celebrity/public figure generation attempts",
    )
    safety_block_reason: Optional[str] = Field(
        default=None,
        description="Explanation if the request was flagged as unsafe (e.g. celebrity name blocked)",
    )

class SimulateDisguiseRequest(BaseModel):
    disguise_type: str = Field(
        default="cap",
        description="One of 'cap', 'sunglasses', 'beard', 'hoodie'",
    )
    officer_id: Optional[str] = None

class DisguiseResultSchema(BaseModel):
    disguise_type: str
    image_url: str
    ai_provider_used: str
    generation_latency_ms: int

class GenerateVariationsRequest(BaseModel):
    uncertain_trait: str = Field(
        default="jawline_chin",
        description="Feature category where witness is uncertain, e.g. 'jawline_chin', 'eyes', 'nose'",
    )
    officer_id: Optional[str] = None

class VariationResultSchema(BaseModel):
    label: str  # "A", "B", "C"
    description: str
    image_url: str
    ai_provider_used: str
    generation_latency_ms: int

class OfficerSchema(BaseModel):
    id: str
    badge_number: str
    full_name: str
    rank: str
    department: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class CreateCaseRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    location: str = Field(..., min_length=2, max_length=200)
    witness_alias: str = Field(..., min_length=2, max_length=100)
    render_style: RenderStyle = "forensic_graphite"
    lead_officer_id: Optional[str] = None

class SketchIterationSchema(BaseModel):
    id: str
    case_id: str
    iteration_number: int
    parent_iteration_id: Optional[str] = None
    witness_prompt: str
    compiled_diffusion_prompt: str
    facial_state_snapshot: Dict[str, Any]
    changed_traits: List[str]
    image_url: str
    high_res_image_url: Optional[str] = None
    ai_provider_used: str
    generation_latency_ms: int
    witness_likeness_score: Optional[int] = None
    created_by_officer_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class CaseDetailSchema(BaseModel):
    id: str
    case_number: str
    title: str
    incident_date: datetime
    location: str
    witness_alias: str
    status: str
    render_style: RenderStyle
    case_seed: int
    current_facial_state: Dict[str, Any]
    current_iteration_id: Optional[str] = None
    lead_officer_id: str
    created_at: datetime
    updated_at: datetime
    iterations: List[SketchIterationSchema] = Field(default_factory=list)

    class Config:
        from_attributes = True

class CaseSummarySchema(BaseModel):
    id: str
    case_number: str
    title: str
    incident_date: datetime
    location: str
    witness_alias: str
    status: str
    render_style: RenderStyle
    case_seed: int
    current_iteration_id: Optional[str] = None
    latest_image_url: Optional[str] = None
    iteration_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True

class GenerateSketchRequest(BaseModel):
    witness_prompt: str = Field(..., min_length=2, max_length=2000)
    quick_chips: List[str] = Field(default_factory=list)
    parent_iteration_id: Optional[str] = None
    render_style_override: Optional[RenderStyle] = None
    officer_id: Optional[str] = None

class UpdateLikenessRequest(BaseModel):
    witness_likeness_score: int = Field(..., ge=1, le=10)
    officer_id: Optional[str] = None

class AuditLogItemSchema(BaseModel):
    seq_id: int
    id: str
    officer_id: str
    badge_number: str
    officer_name: str
    case_id: Optional[str] = None
    case_number: Optional[str] = None
    action_type: str
    resource_target: str
    ip_address: str
    user_agent: str
    details_json: Dict[str, Any]
    prev_hash: str
    row_hash: str
    created_at: datetime

    class Config:
        from_attributes = True

class VerifyAuditChainResponse(BaseModel):
    is_valid: bool
    total_records_verified: int
    genesis_hash: str
    latest_chain_hash: str
    tampered_seq_ids: List[int]
    verified_at: datetime


class MugshotRecordSchema(BaseModel):
    id: str
    record_code: str
    full_name: str
    age: int
    gender: str
    height_cm: int
    prior_offenses: List[str] = Field(default_factory=list)
    last_known_area: str
    image_url: str
    matched_attributes: List[str] = Field(default_factory=list)
    similarity_score: float = 0.85
    is_flagged: bool = False

    class Config:
        from_attributes = True


class MugshotMatchRequest(BaseModel):
    iteration_id: str
    officer_id: Optional[str] = None


class FlagSuspectRequest(BaseModel):
    suspect_id: str
    reason: str = "Witness similarity match"
    officer_id: Optional[str] = None

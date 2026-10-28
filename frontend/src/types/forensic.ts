export interface FacialStateJSON {
  age_gender_ethnicity: string;
  head_face_shape: string;
  hair_style_texture: string;
  forehead: string;
  eyebrows: string;
  eyes: string;
  nose: string;
  cheeks: string;
  jawline_chin: string;
  mouth_lips: string;
  ears: string;
  facial_hair: string;
  scars_marks_tattoos: string;
  accessories: string;
}

export type RenderStyle = 'forensic_graphite' | 'charcoal_shaded' | 'photorealistic_id';

export type OfficerRole = 'investigator' | 'forensic_specialist' | 'supervisor';

export interface OfficerProfile {
  officer_id: string;
  badge_number: string;
  full_name: string;
  rank: string;
  department: string;
  role: OfficerRole;
  avatar_initials: string;
}

export type AuditActionType =
  | 'USER_LOGIN'
  | 'CREATED_CASE_FILE'
  | 'OPENED_CASE_FILE'
  | 'GENERATED_INITIAL_SKETCH'
  | 'REFINED_FACIAL_FEATURE'
  | 'REVERTED_ITERATION'
  | 'UPDATED_LIKENESS_SCORE'
  | 'EXECUTED_MUGSHOT_SEARCH'
  | 'FLAGGED_SUSPECT_MATCH'
  | 'EXPORTED_HIGH_RES_SKETCH'
  | 'EXPORTED_CASE_DOSSIER_PDF'
  | 'VERIFIED_AUDIT_CHAIN'
  | 'TRIGGERED_SAFETY_SHIELD'
  | 'DISGUISE_SIMULATED'
  | 'WITNESS_CONSENSUS_MERGED';

export interface AuditLogEntry {
  seq_id: number;
  timestamp: string;
  officer_id: string;
  officer_name: string;
  badge_number: string;
  officer_role: OfficerRole;
  case_id: string;
  action_type: AuditActionType;
  resource_target: string;
  prev_hash: string;
  row_hash: string;
  ip_address: string;
  details_json: Record<string, any>;
}

export interface SketchIteration {
  id: string;
  case_id: string;
  iteration_number: number;
  parent_iteration_id: string | null;
  image_url: string;
  witness_prompt: string;
  witness_likeness_score: number;
  ai_provider: 'gemini-2.5-flash-image' | 'pollinations-flux' | 'local-procedural';
  latency_ms: number;
  created_at: string;
  facial_state: FacialStateJSON;
  changed_fields: (keyof FacialStateJSON)[];
  confidence_rating: 'certain' | 'likely' | 'maybe' | 'speculative';
  is_variation?: boolean;
  variation_label?: 'A' | 'B' | 'C';
}

export type SupportedLanguage = 'en' | 'kn' | 'hi' | 'mr';

export interface ChatMessage {
  id: string;
  sender: 'witness' | 'officer' | 'system' | 'interviewer_ai';
  text: string;
  original_text?: string;
  language?: SupportedLanguage;
  timestamp: string;
  changed_traits?: string[];
  confidence?: 'certain' | 'likely' | 'maybe' | 'not_sure';
  is_audio?: boolean;
}

export interface CaseFile {
  id: string;
  case_number: string;
  title: string;
  incident_type: string;
  incident_location: string;
  incident_date: string;
  witness_alias: string;
  case_seed: number;
  render_style: RenderStyle;
  current_iteration_id: string;
  status: 'active_interview' | 'lead_flagged' | 'closed';
  lead_officer_id: string;
  created_at: string;
}

export interface MugshotRecord {
  id: string;
  record_code: string;
  full_name: string;
  age: number;
  gender: string;
  height_cm: number;
  prior_offenses: string[];
  last_known_area: string;
  image_url: string;
  similarity_score: number;
  matched_attributes: string[];
  is_flagged_lead?: boolean;
}

export interface DisguiseOption {
  id: string;
  name: string;
  category: 'headwear' | 'eyewear' | 'facial_hair' | 'clothing';
  effectDescription: string;
  overlaySvgPath?: string;
}

export interface WitnessSession {
  witness_id: string;
  alias: string;
  relation_to_crime: string;
  statements_count: number;
  likeness_score: number;
  last_active: string;
  agreement_rate: number;
}

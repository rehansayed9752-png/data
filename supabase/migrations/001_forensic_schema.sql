-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Officers Table (Law Enforcement Personnel)
CREATE TABLE IF NOT EXISTS officers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    badge_number VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    rank VARCHAR(80) NOT NULL,
    department VARCHAR(120) NOT NULL DEFAULT 'Bengaluru City Police - Cyber & Forensic Division',
    role VARCHAR(40) NOT NULL DEFAULT 'investigator'
        CHECK (role IN ('investigator', 'forensic_specialist', 'supervisor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Investigation Case Files
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(64) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    incident_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    location VARCHAR(200) NOT NULL,
    witness_alias VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspect_identified', 'closed', 'archived')),
    render_style VARCHAR(40) NOT NULL DEFAULT 'forensic_graphite'
        CHECK (render_style IN ('forensic_graphite', 'charcoal_shaded', 'photorealistic_id')),
    case_seed BIGINT NOT NULL,
    current_facial_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    current_iteration_id UUID,
    lead_officer_id UUID NOT NULL REFERENCES officers(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cases_number ON cases (case_number);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases (status, created_at DESC);

-- 3. Sketch Iterations (Non-Destructive Version History)
CREATE TABLE IF NOT EXISTS sketch_iterations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    iteration_number INTEGER NOT NULL CHECK (iteration_number >= 1),
    parent_iteration_id UUID REFERENCES sketch_iterations(id),
    witness_prompt TEXT NOT NULL,
    compiled_diffusion_prompt TEXT NOT NULL,
    facial_state_snapshot JSONB NOT NULL,
    changed_traits JSONB NOT NULL DEFAULT '[]'::jsonb,
    image_url TEXT NOT NULL,
    high_res_image_url TEXT,
    ai_provider_used VARCHAR(60) NOT NULL DEFAULT 'gemini-2.5-flash-image',
    generation_latency_ms INTEGER NOT NULL DEFAULT 0,
    witness_likeness_score INTEGER CHECK (witness_likeness_score BETWEEN 1 AND 10),
    created_by_officer_id UUID NOT NULL REFERENCES officers(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (case_id, iteration_number)
);

CREATE INDEX IF NOT EXISTS idx_iterations_case ON sketch_iterations (case_id, iteration_number ASC);

-- 4. Authorized Law Enforcement Mugshot Database (Mock CUFS / LFW Records)
CREATE TABLE IF NOT EXISTS mugshot_database (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    age INTEGER NOT NULL,
    gender VARCHAR(20) NOT NULL,
    height_cm INTEGER NOT NULL,
    prior_offenses TEXT[] NOT NULL DEFAULT '{}',
    last_known_area VARCHAR(150) NOT NULL,
    image_path TEXT NOT NULL,
    facial_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Strict Tamper-Evident Access Audit Log
CREATE TABLE IF NOT EXISTS access_audit_logs (
    seq_id BIGSERIAL PRIMARY KEY,
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    officer_id UUID NOT NULL REFERENCES officers(id),
    badge_number VARCHAR(50) NOT NULL,
    officer_name VARCHAR(120) NOT NULL,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    case_number VARCHAR(64),
    action_type VARCHAR(60) NOT NULL,
    resource_target VARCHAR(200) NOT NULL,
    ip_address VARCHAR(64) NOT NULL DEFAULT '127.0.0.1',
    user_agent TEXT NOT NULL DEFAULT 'ForensicTerminal/1.0',
    details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    prev_hash VARCHAR(64) NOT NULL,
    row_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_case ON access_audit_logs (case_id, seq_id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_officer ON access_audit_logs (officer_id, seq_id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON access_audit_logs (action_type, seq_id DESC);

-- Seed 3 Demo Officers for Instant Testing
INSERT INTO officers (id, badge_number, full_name, rank, department, role) VALUES
    ('11111111-1111-1111-1111-111111111111', 'KA-4091', 'Det. Vikram Rao', 'Senior Inspector', 'Bengaluru Central Crime Branch', 'investigator'),
    ('22222222-2222-2222-2222-222222222222', 'KA-1182', 'Priya Nair', 'Lead Forensic Composite Specialist', 'State Forensic Science Laboratory', 'forensic_specialist'),
    ('33333333-3333-3333-3333-333333333333', 'KA-0045', 'Supt. Arjun Mehta', 'Deputy Commissioner (Audit & Compliance)', 'Internal Security & Evidence Audit', 'supervisor')
ON CONFLICT (badge_number) DO NOTHING;

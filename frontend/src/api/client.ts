/**
 * REST API Client for ForensicSketch AI.
 * Communicates with FastAPI backend (`http://localhost:8000/api`)
 * when running live, with automatic graceful fallback.
 */

import {
  CaseFile,
  SketchIteration,
  FacialStateJSON,
  RenderStyle,
  MugshotRecord,
  AuditLogEntry,
  OfficerProfile,
} from '../types/forensic';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API Error [${res.status}]: ${errText}`);
    }

    return res.json();
  }

  // Case Operations
  async getCases(): Promise<CaseFile[]> {
    return this.request<CaseFile[]>('/cases');
  }

  async getCase(caseId: string): Promise<CaseFile> {
    return this.request<CaseFile>(`/cases/${caseId}`);
  }

  async createCase(caseData: Partial<CaseFile> & { location?: string }): Promise<CaseFile> {
    const payload = {
      title: caseData.title,
      location: caseData.location || caseData.incident_location,
      witness_alias: caseData.witness_alias,
      render_style: caseData.render_style || 'forensic_graphite',
      lead_officer_id: caseData.lead_officer_id,
    };
    return this.request<CaseFile>('/cases', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Sketch Generation & Refinement
  async generateOrRefineSketch(
    caseId: string,
    payload: {
      parent_iteration_id?: string | null;
      witness_prompt: string;
      render_style: RenderStyle;
      confidence?: string;
      language?: string;
    }
  ): Promise<SketchIteration> {
    return this.request<SketchIteration>(`/cases/${caseId}/sketches/generate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async exportHighRes(caseId: string, iterationId: string): Promise<{ high_res_url: string; audit_hash: string }> {
    return this.request<{ high_res_url: string; audit_hash: string }>(
      `/cases/${caseId}/sketches/${iterationId}/export-highres`,
      { method: 'POST' }
    );
  }

  // Law Enforcement Database Matching
  async runMugshotMatch(caseId: string, iterationId: string): Promise<MugshotRecord[]> {
    return this.request<MugshotRecord[]>(`/cases/${caseId}/match`, {
      method: 'POST',
      body: JSON.stringify({ iteration_id: iterationId }),
    });
  }

  async flagSuspectLead(caseId: string, suspectId: string, reason: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/cases/${caseId}/flag-suspect`, {
      method: 'POST',
      body: JSON.stringify({ suspect_id: suspectId, reason }),
    });
  }

  // Audit Log & Verification
  async getAuditLogs(caseId?: string): Promise<AuditLogEntry[]> {
    const q = caseId ? `?case_id=${caseId}` : '';
    return this.request<AuditLogEntry[]>(`/audit-logs${q}`);
  }

  async verifyChainIntegrity(): Promise<{
    is_valid: boolean;
    total_records_verified: number;
    genesis_hash: string;
    latest_chain_hash: string;
    tampered_seq_ids: number[];
  }> {
    return this.request('/audit-logs/verify-chain');
  }

  // Multi-Key Rotating Gemini Cluster Status
  async getKeyPoolStatus(): Promise<{
    cluster_status: string;
    total_keys: number;
    active_healthy_keys: number;
    cooldown_keys: number;
    cooldown_duration_seconds: number;
    keys: Array<{
      slot_id: string;
      masked_key: string;
      status: string;
      cooldown_remaining_seconds: number;
      total_requests: number;
      total_successes: number;
      rate_limit_hits: number;
      last_error: string | null;
    }>;
  }> {
    return this.request('/system/key-pool-status');
  }
}

export const apiClient = new ApiClient();

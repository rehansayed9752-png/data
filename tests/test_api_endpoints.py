import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.audit_service import log_audit_event, compute_audit_hash, format_canonical_iso
from datetime import datetime, timezone

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "database" in data
    assert "cloudflare_worker" in data
    assert data["cloudflare_worker"]["total_workers"] >= 2

def test_audit_log_chain_verification():
    response = client.get("/api/audit-logs/verify-chain")
    assert response.status_code == 200
    data = response.json()
    assert "is_valid" in data
    assert data["is_valid"] is True
    assert "tampered_seq_ids" in data
    assert len(data["tampered_seq_ids"]) == 0

def test_cases_list():
    response = client.get("/api/cases/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

def test_mugshot_match_and_flag_endpoints():
    cases_resp = client.get("/api/cases/")
    assert cases_resp.status_code == 200
    cases = cases_resp.json()
    assert len(cases) > 0
    case_id = cases[0]["id"]
    iteration_id = cases[0]["iterations"][0]["id"] if cases[0].get("iterations") else "iter-001"

    # Test match endpoint
    match_resp = client.post(
        f"/api/cases/{case_id}/match",
        json={"iteration_id": iteration_id, "officer_id": "KA-4091"}
    )
    assert match_resp.status_code == 200
    matches = match_resp.json()
    assert isinstance(matches, list)
    assert len(matches) > 0
    assert "record_code" in matches[0]

    # Test flag endpoint
    flag_resp = client.post(
        f"/api/cases/{case_id}/flag-suspect",
        json={
            "suspect_id": matches[0]["id"],
            "reason": "Automated verification test note",
            "officer_id": "KA-4091"
        }
    )
    assert flag_resp.status_code == 200
    flag_data = flag_resp.json()
    assert flag_data["success"] is True
    assert flag_data["suspect_id"] == matches[0]["id"]

def test_sketch_missing_file_404():
    response = client.post("/api/cases/nonexistent_case/sketches/nonexistent_iter/export-highres")
    assert response.status_code == 404

def test_format_canonical_iso_deterministic():
    dt_naive = datetime(2026, 10, 29, 5, 0, 0)
    iso_str = format_canonical_iso(dt_naive)
    assert iso_str.endswith("+00:00") or iso_str.endswith("Z")

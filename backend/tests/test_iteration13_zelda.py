"""Iteration 13 — Zelda the All-Knowing crystal-vision reading endpoint."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to reading from frontend .env directly
    with open("/app/frontend/.env") as fh:
        for line in fh:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")


ACCEPTABLE_ERRORS = {402}  # out of credits is expected/acceptable per spec


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def test_zelda_love_topic(api):
    r = api.post(f"{BASE_URL}/api/programs/zelda", json={"topic": "Love"}, timeout=60)
    if r.status_code in ACCEPTABLE_ERRORS:
        pytest.skip(f"LLM out of credits (HTTP {r.status_code}) — acceptable per spec")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["persona_name"] == "Zelda the All-Knowing"
    assert data["voice"] == "shimmer"
    assert isinstance(data.get("text"), str) and len(data["text"]) > 20
    assert isinstance(data.get("sign_off"), str) and "crystal" in data["sign_off"].lower()
    assert data.get("persona") == "zelda"


def test_zelda_default_topic(api):
    r = api.post(f"{BASE_URL}/api/programs/zelda", json={}, timeout=60)
    if r.status_code in ACCEPTABLE_ERRORS:
        pytest.skip("out of credits — acceptable")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["persona_name"] == "Zelda the All-Knowing"
    assert data["voice"] == "shimmer"
    assert data["sign_off"]


def test_personas_include_zelda_at_slot_6(api):
    r = api.get(f"{BASE_URL}/api/personas", timeout=15)
    assert r.status_code == 200
    ps = r.json()
    # position 6 in 1-indexed keypad => index 5
    assert len(ps) >= 6
    assert ps[5]["slug"] == "zelda"
    assert "Zelda" in ps[5]["name"]

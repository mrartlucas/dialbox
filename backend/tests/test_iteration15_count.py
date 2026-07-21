"""Iteration 15 - Count Clairvoyant number reading + roster."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://fortune-caller-dev.preview.emergentagent.com").rstrip("/")


def _post(path, payload):
    return requests.post(f"{BASE_URL}{path}", json=payload, timeout=90)


def test_count_reading_love_1988():
    r = _post("/api/programs/count", {"category": "Love", "number": "1988"})
    if r.status_code == 402:
        pytest.skip("LLM out of credits (402 acceptable)")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["persona_name"] == "Count Clairvoyant"
    assert d["voice"] == "echo"
    assert d["sum"] == 26  # 1+9+8+8
    assert d["root"] == 8  # 26 -> 8
    assert isinstance(d["text"], str) and len(d["text"]) > 20
    assert "Count Clairvoyant" in d["sign_off"]


def test_count_empty_number_defaults():
    r = _post("/api/programs/count", {"category": "General", "number": ""})
    if r.status_code == 402:
        pytest.skip("LLM out of credits")
    assert r.status_code == 200, r.text
    d = r.json()
    # default number "7": sum=7 root=7
    assert d["sum"] == 7
    assert d["root"] == 7
    assert d["persona_name"] == "Count Clairvoyant"


def test_count_missing_fields_ok():
    r = _post("/api/programs/count", {})
    if r.status_code == 402:
        pytest.skip("LLM out of credits")
    assert r.status_code == 200, r.text


def test_personas_roster_includes_count_at_key_7():
    r = requests.get(f"{BASE_URL}/api/personas", timeout=30)
    assert r.status_code == 200
    slugs = [p["slug"] for p in r.json()]
    assert "count" in slugs
    # slot 7 (1-indexed) since dial 7 -> count in oracle list
    idx = slugs.index("count")
    assert idx == 6, f"Expected count at position 7 (idx 6), got {idx}, roster={slugs}"

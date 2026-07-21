import os
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fortune-caller-dev.preview.emergentagent.com').rstrip('/')
SPHINX_URL = f"{BASE_URL}/api/programs/sphinx"

ACCEPT = (200, 402)  # 402 acceptable if LLM budget exceeded


def _post(payload):
    return requests.post(SPHINX_URL, json=payload, timeout=90)


class TestSphinx:
    def test_gates_mode_full_payload(self):
        r = _post({"mode": "gates", "mind": "a Lantern", "heart": "a Whisper", "path": "the River"})
        assert r.status_code in ACCEPT, r.text
        if r.status_code == 200:
            d = r.json()
            assert d["persona_name"] == "The Sphinx"
            assert d["voice"] == "ash"
            assert isinstance(d.get("text"), str) and len(d["text"]) > 10
            assert "sign_off" in d and d["sign_off"]
            assert d.get("fourth_gate") is False

    def test_fourth_gate_mode(self):
        r = _post({"mode": "fourth_gate"})
        assert r.status_code in ACCEPT, r.text
        if r.status_code == 200:
            d = r.json()
            assert d["persona_name"] == "The Sphinx"
            assert d["voice"] == "ash"
            assert d.get("fourth_gate") is True
            assert isinstance(d.get("text"), str) and len(d["text"]) > 10

    def test_gates_empty_body_defaults(self):
        r = _post({})
        assert r.status_code in ACCEPT, r.text
        if r.status_code == 200:
            d = r.json()
            assert d["persona_name"] == "The Sphinx"
            assert d["voice"] == "ash"

    def test_personas_sphinx_slot8(self):
        r = requests.get(f"{BASE_URL}/api/personas", timeout=30)
        assert r.status_code == 200
        personas = r.json()
        slugs = [p["slug"] for p in personas]
        assert "sphinx" in slugs, f"Missing sphinx in {slugs}"
        # slot 8 -> index 7 in the ordered list
        assert slugs.index("sphinx") == 7, f"Sphinx at wrong slot: {slugs}"

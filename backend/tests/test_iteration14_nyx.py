import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://fortune-caller-dev.preview.emergentagent.com"

ACCEPTED = (200, 402)


def _post_nyx(stars):
    return requests.post(f"{BASE_URL}/api/programs/nyx", json={"stars": stars}, timeout=90)


class TestNyx:
    def test_nyx_with_stars(self):
        r = _post_nyx([1, 5, 9, 5])
        assert r.status_code in ACCEPTED, r.text
        if r.status_code == 402:
            pytest.skip("LLM out of credits (402)")
        data = r.json()
        assert data["persona_name"] == "Nyx of the Nine Stars"
        assert data["voice"] == "alloy"
        assert isinstance(data.get("text"), str) and len(data["text"]) > 20
        assert isinstance(data.get("moon_phase"), str) and len(data["moon_phase"]) > 0
        assert isinstance(data.get("illumination"), (int, float))
        assert isinstance(data.get("stars"), list) and len(data["stars"]) == 4
        assert data["stars"] == ["Origin", "Crossroads", "Becoming", "Crossroads"]
        assert "stars have returned to silence" in data.get("sign_off", "")

    def test_nyx_empty_stars(self):
        r = _post_nyx([])
        assert r.status_code in ACCEPTED, r.text
        if r.status_code == 402:
            pytest.skip("LLM out of credits (402)")
        data = r.json()
        assert data["persona_name"] == "Nyx of the Nine Stars"
        # Should default gracefully -- backend uses [1] default
        assert isinstance(data.get("stars"), list) and len(data["stars"]) >= 1

    def test_personas_has_nyx_slot9(self):
        r = requests.get(f"{BASE_URL}/api/personas", timeout=30)
        assert r.status_code == 200
        body = r.json()
        personas = body.get("personas", body) if isinstance(body, dict) else body
        # find nyx
        slugs = [p.get("slug") for p in personas]
        assert "nyx" in slugs

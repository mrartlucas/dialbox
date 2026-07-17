"""Backend tests for Old-School Phone Revival Platform."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://dial-box.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------------- Menu & Programs ----------------
class TestMenu:
    def test_menu_returns_greeting_and_fortune_and_voicemail(self, s):
        r = s.get(f"{API}/menu")
        assert r.status_code == 200
        data = r.json()
        assert "greeting" in data and data["greeting"]
        assert data["voicemail_key"] == "*"
        # Fortune Teller should be enabled at key 1
        fortune_items = [i for i in data["items"] if i["slug"] == "fortune"]
        assert fortune_items, f"Fortune Teller missing from menu: {data['items']}"
        assert fortune_items[0]["key"] == "1"


class TestPrograms:
    def test_list_programs_seeded(self, s):
        r = s.get(f"{API}/programs")
        assert r.status_code == 200
        progs = r.json()
        assert len(progs) == 7, f"expected 7 programs, got {len(progs)}"
        slugs = {p["slug"] for p in progs}
        expected = {"fortune", "adventure", "therapy", "loveline", "pickup", "haunted", "santa"}
        assert expected.issubset(slugs)
        enabled = [p for p in progs if p["enabled"]]
        assert len(enabled) == 1 and enabled[0]["slug"] == "fortune"

    def test_patch_program_toggle_and_menu_key(self, s):
        # Enable dial-a-adventure at menu key 8
        r = s.patch(f"{API}/programs/adventure", json={"enabled": True, "menu_key": "8"})
        assert r.status_code == 200
        assert r.json()["enabled"] is True
        assert r.json()["menu_key"] == "8"
        # Revert
        r2 = s.patch(f"{API}/programs/adventure", json={"enabled": False, "menu_key": "2"})
        assert r2.status_code == 200
        assert r2.json()["enabled"] is False
        assert r2.json()["menu_key"] == "2"

    def test_patch_unknown_program_404(self, s):
        r = s.patch(f"{API}/programs/nope-xyz", json={"enabled": True})
        assert r.status_code == 404


# ---------------- Dial routing ----------------
class TestDial:
    def test_dial_program_fortune(self, s):
        r = s.post(f"{API}/session/dial", json={"digits": "1"})
        assert r.status_code == 200
        d = r.json()
        assert d["type"] == "program"
        assert d["slug"] == "fortune"
        assert d.get("has_personas") is True
        assert isinstance(d.get("personas"), list) and len(d["personas"]) >= 4

    @pytest.mark.parametrize("code", ["666", "42", "007", "13", "101"])
    def test_dial_secret_codes(self, s, code):
        r = s.post(f"{API}/session/dial", json={"digits": code})
        assert r.status_code == 200
        d = r.json()
        assert d["type"] == "secret", f"got {d} for {code}"
        assert d["code"] == code
        assert d["response_text"]
        assert d["voice"]

    def test_dial_voicemail(self, s):
        r = s.post(f"{API}/session/dial", json={"digits": "*"})
        assert r.status_code == 200
        assert r.json()["type"] == "voicemail"

    def test_dial_invalid(self, s):
        r = s.post(f"{API}/session/dial", json={"digits": "9999"})
        assert r.status_code == 200
        assert r.json()["type"] == "invalid"

    def test_dial_coming_soon(self, s):
        # Enable adventure temporarily so coming_soon path is exercised
        s.patch(f"{API}/programs/adventure", json={"enabled": True})
        try:
            r = s.post(f"{API}/session/dial", json={"digits": "2"})
            assert r.status_code == 200
            assert r.json()["type"] == "coming_soon"
        finally:
            s.patch(f"{API}/programs/adventure", json={"enabled": False})


# ---------------- Fortune (LLM) ----------------
class TestFortune:
    @pytest.mark.parametrize("persona", ["zoltan", "oz", "gypsy", "cookie"])
    def test_fortune_generates_text(self, s, persona):
        r = s.post(f"{API}/programs/fortune", json={"persona": persona, "question": "What awaits me?"}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["persona"] == persona
        assert d["text"] and len(d["text"]) > 10
        assert d["voice"]

    def test_fortune_unknown_persona(self, s):
        r = s.post(f"{API}/programs/fortune", json={"persona": "nobody"})
        assert r.status_code == 404


# ---------------- TTS ----------------
class TestTTS:
    def test_tts_persona(self, s):
        r = s.post(f"{API}/tts", json={"text": "Hello caller.", "persona": "zoltan"}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["audio_base64"] and len(d["audio_base64"]) > 100
        assert d["format"] == "mp3"


# ---------------- Secret codes CRUD ----------------
class TestSecretCodes:
    def test_list_seeded(self, s):
        r = s.get(f"{API}/secret-codes")
        assert r.status_code == 200
        codes = {c["code"] for c in r.json()}
        for expected in ["666", "42", "007", "13", "101"]:
            assert expected in codes

    def test_crud_flow(self, s):
        payload = {"code": "TEST_9123", "title": "TEST_line", "response_text": "TEST payload", "voice": "onyx", "enabled": True}
        r = s.post(f"{API}/secret-codes", json=payload)
        assert r.status_code == 200
        created = r.json()
        code_id = created["id"]

        # verify via list
        r2 = s.get(f"{API}/secret-codes")
        assert any(c["id"] == code_id for c in r2.json())

        # patch (toggle)
        r3 = s.patch(f"{API}/secret-codes/{code_id}", json={"enabled": False})
        assert r3.status_code == 200
        assert r3.json()["enabled"] is False

        # delete
        r4 = s.delete(f"{API}/secret-codes/{code_id}")
        assert r4.status_code == 200
        # verify gone
        r5 = s.get(f"{API}/secret-codes")
        assert not any(c["id"] == code_id for c in r5.json())


# ---------------- Schedules CRUD ----------------
class TestSchedules:
    def test_crud_flow(self, s):
        r = s.post(f"{API}/schedules", json={"program_slug": "fortune", "label": "TEST_evening"})
        assert r.status_code == 200
        sched = r.json()
        sid = sched["id"]

        r2 = s.get(f"{API}/schedules")
        assert any(x["id"] == sid for x in r2.json())

        r3 = s.patch(f"{API}/schedules/{sid}", json={"enabled": False, "label": "TEST_evening_updated"})
        assert r3.status_code == 200
        assert r3.json()["enabled"] is False
        assert r3.json()["label"] == "TEST_evening_updated"

        r4 = s.delete(f"{API}/schedules/{sid}")
        assert r4.status_code == 200

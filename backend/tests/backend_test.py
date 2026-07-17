"""Backend tests for Old-School Phone Revival — iteration 2 (Fortune Caller + Oracles CRUD)."""
import os
import pytest
import requests

def _load_backend_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        env_path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", ".env")
        try:
            with open(env_path) as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip()
                        break
        except FileNotFoundError:
            pass
    if not url:
        raise RuntimeError("REACT_APP_BACKEND_URL not set")
    return url.rstrip("/")

BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"

EXPECTED_ORACLE_SLUGS = {"zoltan", "az", "ruby", "goy", "calypso", "zelda", "count", "sphinx", "nyx"}


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------------- Menu & Programs ----------------
class TestMenu:
    def test_menu_has_fortune_caller(self, s):
        r = s.get(f"{API}/menu")
        assert r.status_code == 200
        data = r.json()
        assert data["voicemail_key"] == "*"
        fortune = [i for i in data["items"] if i["slug"] == "fortune"]
        assert fortune and fortune[0]["key"] == "1"


class TestPrograms:
    def test_fortune_program_renamed(self, s):
        r = s.get(f"{API}/programs")
        assert r.status_code == 200
        prog = next(p for p in r.json() if p["slug"] == "fortune")
        assert prog["name"] == "Fortune Caller", prog


# ---------------- Oracles (personas) ----------------
class TestOracles:
    def test_list_oracles_9_seeded(self, s):
        r = s.get(f"{API}/oracles")
        assert r.status_code == 200
        data = r.json()
        slugs = {o["slug"] for o in data}
        assert EXPECTED_ORACLE_SLUGS.issubset(slugs), f"missing: {EXPECTED_ORACLE_SLUGS - slugs}"
        z = next(o for o in data if o["slug"] == "zoltan")
        for field in ("name", "voice", "type", "season", "enabled", "order"):
            assert field in z, f"missing field {field}"
        assert z["name"] == "Zartan Speaks"

    def test_personas_endpoint_returns_active(self, s):
        r = s.get(f"{API}/personas")
        assert r.status_code == 200
        pers = r.json()
        slugs = {p["slug"] for p in pers}
        # All 9 seeded are resident/all_year -> all should show
        assert EXPECTED_ORACLE_SLUGS.issubset(slugs)
        for p in pers:
            assert "slug" in p and "name" in p and "voice" in p

    def test_oracle_crud_flow(self, s):
        payload = {
            "slug": "TEST_oracle_x",
            "name": "TEST Oracle X",
            "blurb": "test",
            "voice": "onyx",
            "system_prompt": "Test prompt.",
            "sign_off": "bye",
            "type": "resident",
            "season": "all_year",
            "enabled": True,
            "order": 99,
        }
        r = s.post(f"{API}/oracles", json=payload)
        assert r.status_code == 200, r.text
        # duplicate slug -> 400
        r_dup = s.post(f"{API}/oracles", json=payload)
        assert r_dup.status_code == 400
        # patch
        r2 = s.patch(f"{API}/oracles/TEST_oracle_x", json={"name": "TEST Renamed", "enabled": False})
        assert r2.status_code == 200
        assert r2.json()["name"] == "TEST Renamed"
        assert r2.json()["enabled"] is False
        # delete
        r3 = s.delete(f"{API}/oracles/TEST_oracle_x")
        assert r3.status_code == 200
        # verify gone
        r4 = s.get(f"{API}/oracles")
        assert not any(o["slug"] == "TEST_oracle_x" for o in r4.json())

    def test_traveling_out_of_season_excluded(self, s):
        payload = {
            "slug": "TEST_traveler_halloween",
            "name": "TEST Traveler",
            "blurb": "seasonal",
            "voice": "onyx",
            "system_prompt": "Seasonal prompt.",
            "sign_off": "",
            "type": "traveling",
            "season": "halloween",
            "enabled": True,
            "order": 50,
        }
        r = s.post(f"{API}/oracles", json=payload)
        assert r.status_code == 200
        try:
            r2 = s.get(f"{API}/personas")
            slugs = {p["slug"] for p in r2.json()}
            # Current month should NOT be October, so this must be excluded
            import datetime
            if datetime.datetime.utcnow().month != 10:
                assert "TEST_traveler_halloween" not in slugs
        finally:
            s.delete(f"{API}/oracles/TEST_traveler_halloween")


# ---------------- Dial routing ----------------
class TestDial:
    def test_dial_program_fortune_slug_personas(self, s):
        r = s.post(f"{API}/session/dial", json={"digits": "1"})
        assert r.status_code == 200
        d = r.json()
        assert d["type"] == "program"
        assert d["name"] == "Fortune Caller"
        assert d.get("has_personas") is True
        pslugs = {p["slug"] for p in d["personas"]}
        assert EXPECTED_ORACLE_SLUGS.issubset(pslugs)

    @pytest.mark.parametrize("code", ["666", "42", "007", "411", "900", "789", "88", "321", "1955", "2015", "000", "13", "101", "1313"])
    def test_dial_secret_codes(self, s, code):
        r = s.post(f"{API}/session/dial", json={"digits": code})
        assert r.status_code == 200
        d = r.json()
        assert d["type"] == "secret", f"got {d} for {code}"
        assert d["code"] == code
        assert d["response_text"]
        assert d["voice"]

    def test_dial_411_has_branches(self, s):
        r = s.post(f"{API}/session/dial", json={"digits": "411"})
        d = r.json()
        assert d["type"] == "secret"
        assert isinstance(d.get("branches"), dict)
        assert set(d["branches"].keys()) >= {"1", "2", "3"}
        for k, v in d["branches"].items():
            assert v.get("text")

    def test_dial_900_has_branches(self, s):
        r = s.post(f"{API}/session/dial", json={"digits": "900"})
        d = r.json()
        assert d["type"] == "secret"
        assert isinstance(d.get("branches"), dict)
        assert set(d["branches"].keys()) >= {"1", "2"}

    @pytest.mark.parametrize("code", ["007", "1955", "101"])
    def test_dial_secret_has_clue(self, s, code):
        r = s.post(f"{API}/session/dial", json={"digits": code})
        d = r.json()
        assert d.get("clue"), f"expected clue on {code}, got {d}"

    def test_dial_555_wildcard(self, s):
        r = s.post(f"{API}/session/dial", json={"digits": "5551234"})
        d = r.json()
        assert d["type"] == "secret"
        assert d["title"] == "The 555 Exchange"
        assert "five" in d["response_text"].lower() or "555" in d["response_text"]

    def test_dial_voicemail(self, s):
        r = s.post(f"{API}/session/dial", json={"digits": "*"})
        assert r.json()["type"] == "voicemail"

    def test_dial_invalid(self, s):
        r = s.post(f"{API}/session/dial", json={"digits": "9999"})
        assert r.json()["type"] == "invalid"


# ---------------- Fortune (LLM) ----------------
class TestFortune:
    @pytest.mark.parametrize("persona", ["zoltan", "sphinx", "goy"])
    def test_fortune_generates_text(self, s, persona):
        r = s.post(f"{API}/programs/fortune",
                   json={"persona": persona, "question": "What awaits me?"},
                   timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["persona"] == persona
        assert d["text"] and len(d["text"]) > 10
        assert d["voice"]
        assert d.get("sign_off"), "sign_off should be present"
        if persona == "goy":
            assert "Lucky numbers" in d["text"] or "lucky numbers" in d["text"].lower(), d["text"]

    def test_fortune_unknown_persona_404(self, s):
        r = s.post(f"{API}/programs/fortune", json={"persona": "nobody"})
        assert r.status_code == 404


# ---------------- TTS ----------------
class TestTTS:
    def test_tts_persona_voice(self, s):
        r = s.post(f"{API}/tts", json={"text": "Hello caller.", "persona": "zoltan"}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["audio_base64"] and len(d["audio_base64"]) > 100
        assert d["format"] == "mp3"


# ---------------- Secret codes CRUD (branches + clue) ----------------
class TestSecretCodesCRUD:
    def test_create_with_branches_and_clue(self, s):
        payload = {
            "code": "TEST_919",
            "title": "TEST Line",
            "response_text": "TEST resp",
            "voice": "onyx",
            "enabled": True,
            "branches": {"1": {"text": "branch one", "voice": "sage"}},
            "clue": "TEST clue",
        }
        r = s.post(f"{API}/secret-codes", json=payload)
        assert r.status_code == 200, r.text
        code_id = r.json()["id"]
        try:
            # PATCH update branches + clue
            r2 = s.patch(f"{API}/secret-codes/{code_id}",
                         json={"branches": {"1": {"text": "b1", "voice": "onyx"}, "2": {"text": "b2", "voice": "nova"}},
                               "clue": "updated clue"})
            assert r2.status_code == 200
            body = r2.json()
            assert body["clue"] == "updated clue"
            assert "2" in body["branches"]
        finally:
            s.delete(f"{API}/secret-codes/{code_id}")

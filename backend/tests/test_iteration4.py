"""Iteration 4 backend tests: DialBox rebrand, Magic 8 Dial (key 8)."""
import os
import pytest
import requests


def _load_backend_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        env_path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", ".env")
        with open(env_path) as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    url = line.split("=", 1)[1].strip()
                    break
    return url.rstrip("/")


BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"

MAGIC8_ANSWERS = {
    "It is certain.", "It is decidedly so.", "Without a doubt.", "Yes, definitely.",
    "You may rely on it.", "As I see it, yes.", "Most likely.", "Outlook good.",
    "Yes.", "Signs point to yes.", "Reply hazy, try again.", "Ask again later.",
    "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.",
    "Don't count on it.", "My reply is no.", "My sources say no.",
    "Outlook not so good.", "Very doubtful.",
}


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


class TestDialBoxRebrand:
    def test_menu_greeting_mentions_dialbox(self, s):
        r = s.get(f"{API}/menu")
        assert r.status_code == 200
        greeting = r.json().get("greeting", "")
        assert "DialBox" in greeting or "dialbox" in greeting.lower()

    def test_root_api_ok(self, s):
        r = s.get(f"{API}/")
        assert r.status_code == 200


class TestMagic8Dial:
    def test_dial_8_routes_to_magic8(self, s):
        r = s.post(f"{API}/session/dial", json={"digits": "8"})
        assert r.status_code == 200
        d = r.json()
        assert d["type"] == "program"
        assert d["slug"] == "magic8"
        assert d.get("interaction") == "magic8"

    def test_magic8_endpoint_with_question(self, s):
        r = s.post(f"{API}/programs/magic8", json={"question": "Will it rain?"})
        assert r.status_code == 200
        d = r.json()
        assert d["answer"] in MAGIC8_ANSWERS
        assert d["voice"]

    def test_magic8_endpoint_no_question(self, s):
        r = s.post(f"{API}/programs/magic8", json={})
        assert r.status_code == 200
        assert r.json()["answer"] in MAGIC8_ANSWERS

    def test_magic8_program_in_menu_key_8(self, s):
        r = s.get(f"{API}/menu")
        items = r.json()["items"]
        m8 = [i for i in items if i.get("slug") == "magic8"]
        assert m8, "magic8 program missing"
        assert m8[0]["key"] == "8"

    def test_magic8_variety(self, s):
        """Confirm random selection – expect >1 unique answer in 15 calls."""
        answers = set()
        for _ in range(15):
            r = s.post(f"{API}/programs/magic8", json={"question": "?"})
            answers.add(r.json()["answer"])
        assert len(answers) >= 2


class TestRegressionCore:
    def test_dial_1_still_fortune(self, s):
        d = s.post(f"{API}/session/dial", json={"digits": "1"}).json()
        assert d["type"] == "program" and d["slug"] == "fortune"

    def test_dial_3_still_mindline(self, s):
        d = s.post(f"{API}/session/dial", json={"digits": "3"}).json()
        assert d["type"] == "program"
        assert d.get("interaction") == "mindline"

    def test_dial_star_voicemail(self, s):
        d = s.post(f"{API}/session/dial", json={"digits": "*"}).json()
        assert d["type"] == "voicemail"

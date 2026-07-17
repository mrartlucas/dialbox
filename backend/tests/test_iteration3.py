"""Iteration 3 tests: MindLine (ELIZA), Voicemails, Scheduler, dial routing."""
import os
import time
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


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------------- MindLine (deterministic ELIZA) ----------------
class TestMindLine:
    def test_intro(self, s):
        r = s.get(f"{API}/mindline/intro")
        assert r.status_code == 200
        d = r.json()
        assert "disclaimer" in d and len(d["disclaimer"]) > 100
        assert "not a real doctor" in d["disclaimer"].lower()
        assert "name_prompt" in d and d["name_prompt"]
        assert d["voice"] == "echo"

    def test_greeting_contains_name(self, s):
        r = s.post(f"{API}/mindline/greeting", json={"name": "Alice"})
        assert r.status_code == 200
        d = r.json()
        assert "Alice" in d["text"]
        assert "Doctor Dialtone" in d["text"]
        assert d["voice"] == "echo"

    def test_greeting_default_caller(self, s):
        r = s.post(f"{API}/mindline/greeting", json={"name": ""})
        assert r.status_code == 200
        assert "Caller" in r.json()["text"]

    def test_reply_family_keyword(self, s):
        r = s.post(f"{API}/mindline/reply", json={"message": "my mother is difficult"})
        assert r.status_code == 200
        reply = r.json()["reply"].lower()
        assert "family" in reply or "beep" in reply

    def test_reply_feel_reflective(self, s):
        r = s.post(f"{API}/mindline/reply", json={"message": "I feel anxious today"})
        assert r.status_code == 200
        reply = r.json()["reply"].lower()
        # ELIZA rule: "Tell me more about feeling %1" or "Do you often feel %1..."
        assert "anxious" in reply or "feel" in reply

    def test_reply_empty(self, s):
        r = s.post(f"{API}/mindline/reply", json={"message": ""})
        assert r.status_code == 200
        assert "silence" in r.json()["reply"].lower()

    def test_reply_fallback(self, s):
        r = s.post(f"{API}/mindline/reply", json={"message": "asdfghjkl"})
        assert r.status_code == 200
        assert r.json()["reply"]  # some fallback

    def test_signoff(self, s):
        r = s.get(f"{API}/mindline/signoff")
        assert r.status_code == 200
        d = r.json()
        assert "goodbye" in d["text"].lower() or "Goodbye" in d["text"]
        assert d["voice"] == "echo"


# ---------------- Dial routing to MindLine ----------------
class TestDialMindline:
    def test_menu_has_mindline_on_3(self, s):
        r = s.get(f"{API}/menu")
        assert r.status_code == 200
        items = r.json()["items"]
        mindline_items = [i for i in items if i["slug"] == "therapy"]
        # If not in menu, patch it (per note: therapy was patched live)
        if not mindline_items:
            s.patch(f"{API}/programs/therapy",
                    json={"enabled": True, "coming_soon": False,
                          "interaction": "mindline", "name": "MindLine"})
            r = s.get(f"{API}/menu")
            mindline_items = [i for i in r.json()["items"] if i["slug"] == "therapy"]
        assert mindline_items, "MindLine not enabled in menu"
        assert mindline_items[0]["key"] == "3"
        assert mindline_items[0]["name"] == "MindLine"

    def test_dial_3_returns_mindline(self, s):
        # Ensure enabled
        s.patch(f"{API}/programs/therapy",
                json={"enabled": True, "coming_soon": False,
                      "interaction": "mindline", "name": "MindLine"})
        r = s.post(f"{API}/session/dial", json={"digits": "3"})
        assert r.status_code == 200
        d = r.json()
        assert d["type"] == "program"
        assert d["name"] == "MindLine"
        assert d["interaction"] == "mindline"


# ---------------- Voicemails ----------------
class TestVoicemails:
    def test_voicemail_crud(self, s):
        # create fortune voicemail
        r = s.post(f"{API}/voicemails", json={"program_slug": "fortune"})
        assert r.status_code == 200
        vm = r.json()
        assert vm["from_name"] == "The Fortune Caller"
        assert vm["text"]
        assert "expires_at" in vm and "created_at" in vm
        assert vm["heard"] is False
        vm_id = vm["id"]

        try:
            # therapy voicemail (Dr. Dialtone)
            r2 = s.post(f"{API}/voicemails", json={"program_slug": "therapy"})
            assert r2.status_code == 200
            assert "Dialtone" in r2.json()["from_name"]
            vm2_id = r2.json()["id"]

            # list contains both
            r_list = s.get(f"{API}/voicemails")
            assert r_list.status_code == 200
            ids = {v["id"] for v in r_list.json()}
            assert vm_id in ids and vm2_id in ids

            # mark heard
            r_mark = s.patch(f"{API}/voicemails/{vm_id}")
            assert r_mark.status_code == 200
            assert r_mark.json()["heard"] is True

            # delete both
            assert s.delete(f"{API}/voicemails/{vm_id}").status_code == 200
            assert s.delete(f"{API}/voicemails/{vm2_id}").status_code == 200
            r_list2 = s.get(f"{API}/voicemails")
            ids2 = {v["id"] for v in r_list2.json()}
            assert vm_id not in ids2 and vm2_id not in ids2
        finally:
            s.delete(f"{API}/voicemails/{vm_id}")

    def test_mark_missing_404(self, s):
        r = s.patch(f"{API}/voicemails/does-not-exist")
        assert r.status_code == 404


# ---------------- Scheduler ----------------
class TestScheduler:
    def test_schedule_due_and_fired_flow(self, s):
        # Create a schedule with wide window (all day)
        payload = {
            "program_slug": "fortune",
            "label": "TEST_all_day",
            "window_start": "00:00",
            "window_end": "23:59",
            "frequency": "daily",
            "enabled": True,
        }
        r = s.post(f"{API}/schedules", json=payload)
        assert r.status_code == 200, r.text
        sched_id = r.json()["id"]
        try:
            r_due = s.get(f"{API}/schedules/due")
            assert r_due.status_code == 200
            due = r_due.json()
            mine = [d for d in due if d["id"] == sched_id]
            assert mine, f"schedule not in due list: {due}"
            d = mine[0]
            assert d.get("program_name") == "Fortune Caller"
            assert "interaction" in d

            # Mark fired
            r_fire = s.post(f"{API}/schedules/{sched_id}/fired")
            assert r_fire.status_code == 200

            # Should drop from due (daily = once per 20h)
            r_due2 = s.get(f"{API}/schedules/due")
            mine2 = [d for d in r_due2.json() if d["id"] == sched_id]
            assert not mine2, "schedule still due after firing (should be daily-suppressed)"
        finally:
            s.delete(f"{API}/schedules/{sched_id}")

    def test_schedule_out_of_window_not_due(self, s):
        # narrow window that excludes now (00:00-00:01)
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        # pick window 2-3 hours in the future (both start/end)
        fut = now + timedelta(hours=2)
        end = now + timedelta(hours=3)
        payload = {
            "program_slug": "fortune",
            "label": "TEST_future_window",
            "window_start": f"{fut.hour:02d}:{fut.minute:02d}",
            "window_end": f"{end.hour:02d}:{end.minute:02d}",
            "frequency": "daily",
            "enabled": True,
        }
        # ensure window doesn't wrap through now — if it would, skip
        if payload["window_start"] > payload["window_end"]:
            pytest.skip("window would wrap midnight through now")
        r = s.post(f"{API}/schedules", json=payload)
        sched_id = r.json()["id"]
        try:
            due = s.get(f"{API}/schedules/due").json()
            assert not any(d["id"] == sched_id for d in due)
        finally:
            s.delete(f"{API}/schedules/{sched_id}")

    def test_schedule_fired_404(self, s):
        r = s.post(f"{API}/schedules/no-such-id/fired")
        assert r.status_code == 404

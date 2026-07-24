import re
from pathlib import Path

from playwright.sync_api import Page, Route, expect, sync_playwright


ARTIFACT_DIR = Path("e2e/artifacts")
APP_URL = "http://127.0.0.1:3000"
KEYPAD_TEST_IDS = {"*": "star", "#": "hash"}


def _stub_tts(route: Route) -> None:
    """Keep browser E2E deterministic and free of paid external speech calls."""
    route.fulfill(
        status=200,
        content_type="application/json",
        body='{"audio_base64":"","format":"mp3","voice":"nova"}',
    )


def _keypad_button(page: Page, key: str):
    return page.get_by_test_id(f"keypad-button-{KEYPAD_TEST_IDS.get(key, key)}")


def _message_light_lamp(page: Page):
    return page.get_by_test_id("message-light").locator("span").first


def _assert_live_menu(page: Page) -> None:
    page.get_by_test_id("lift-handset-btn").click()
    console = page.get_by_test_id("crt-console")
    console.get_by_text("Welcome to DialBox.", exact=False).wait_for(timeout=15_000)
    console.get_by_text("3  MindLine", exact=False).wait_for(timeout=15_000)


def _dial_mindline(page: Page) -> None:
    with page.expect_response(
        lambda response: response.url.endswith("/api/session/dial")
        and response.request.method == "POST",
        timeout=15_000,
    ) as response_info:
        _keypad_button(page, "3").click()

    response = response_info.value
    assert response.ok, f"Dial route returned HTTP {response.status}"
    payload = response.json()
    assert payload["type"] == "program"
    assert payload["interaction"] == "mindline"
    assert payload["slug"] == "therapy"

    console = page.get_by_test_id("crt-console")
    console.get_by_text("Connecting to MindLine", exact=False).wait_for(timeout=15_000)
    console.get_by_text(
        "Welcome to MindLine. Before we begin, please tell me your name.",
        exact=False,
    ).wait_for(timeout=15_000)

    expect(page.get_by_test_id("mindline-input")).to_be_visible(timeout=15_000)


def _dial_directory_assistance(page: Page) -> None:
    with page.expect_response(
        lambda response: response.url.endswith("/api/session/dial")
        and response.request.method == "POST",
        timeout=15_000,
    ) as response_info:
        for key in ("*", "4", "1", "1", "#"):
            _keypad_button(page, key).click()

    response = response_info.value
    assert response.ok, f"Secret-code route returned HTTP {response.status}"
    payload = response.json()
    assert payload["type"] == "secret", payload
    assert payload["code"] == "411", payload
    assert payload["title"] == "Directory Assistance", payload
    assert set(payload["branches"]) == {"1", "2", "3"}, payload

    console = page.get_by_test_id("crt-console")
    opening_text = "Directory assistance for the impossible. For the forecast of your soul, press 1."
    console.get_by_text(opening_text, exact=False).wait_for(timeout=15_000)

    _keypad_button(page, "2").click()
    branch_text = "Your lost item is precisely where you last had faith it would be"
    console.get_by_text(branch_text, exact=False).wait_for(timeout=15_000)

    _keypad_button(page, "#").click()
    _keypad_button(page, "#").click()
    exit_prompt = "Are you sure you want to end this call? Press 1 to continue, press 2 to end."
    console.get_by_text(exit_prompt, exact=False).wait_for(timeout=15_000)

    _keypad_button(page, "1").click()
    expect(console.get_by_text(exit_prompt, exact=False)).to_have_count(0)
    console.get_by_text(branch_text, exact=False).wait_for(timeout=15_000)


def _end_mindline_call_and_return_to_network(page: Page) -> None:
    _dial_mindline(page)
    console = page.get_by_test_id("crt-console")

    _keypad_button(page, "#").click()
    _keypad_button(page, "#").click()
    exit_prompt = "Are you sure you want to end this call? Press 1 to continue, press 2 to end."
    console.get_by_text(exit_prompt, exact=False).wait_for(timeout=15_000)

    _keypad_button(page, "2").click()
    console.get_by_text("Call ended.", exact=True).wait_for(timeout=15_000)
    ended_options = "1 try again · 2 explore this Line · 3 the DialBox Network · 4 end session."
    console.get_by_text(ended_options, exact=True).wait_for(timeout=15_000)

    _keypad_button(page, "3").click()
    console.get_by_text("Welcome to DialBox.", exact=False).wait_for(timeout=15_000)
    console.get_by_text("3  MindLine", exact=False).wait_for(timeout=15_000)
    expect(page.get_by_test_id("mindline-input")).to_have_count(0)


def _answer_simulated_scheduled_call(page: Page) -> None:
    console = page.get_by_test_id("crt-console")
    simulate_button = page.get_by_test_id("simulate-call-btn")
    answer_button = page.get_by_test_id("lift-handset-btn")

    expect(simulate_button).to_be_enabled()
    simulate_button.click()

    # The production Answer control shakes for the entire nine-second ring window.
    # Verify its real ring state, then force the click so Playwright does not wait
    # for the animation to stop and accidentally answer after voicemail takes over.
    expect(answer_button).to_contain_text("Answer", timeout=3_000)
    expect(console.get_by_text("RINGING", exact=True)).to_be_visible(timeout=3_000)

    with page.expect_response(
        lambda response: response.url.endswith("/api/personas")
        and response.request.method == "GET",
        timeout=15_000,
    ) as response_info:
        answer_button.click(force=True)

    response = response_info.value
    assert response.ok, f"Persona route returned HTTP {response.status}"

    console.get_by_text(
        "The Fortune Caller is calling YOU. The line was scheduled to ring.",
        exact=True,
    ).wait_for(timeout=15_000)
    console.get_by_text("FORTUNE TELLER: CHOOSE YOUR ORACLE", exact=False).wait_for(timeout=15_000)
    console.get_by_text("Dial 1-9 to choose", exact=False).wait_for(timeout=15_000)
    console.get_by_text("SELECT VOICE", exact=True).wait_for(timeout=15_000)

    expect(page.get_by_test_id("fortune-question-input")).to_be_visible(timeout=15_000)
    expect(page.get_by_test_id("hangup-btn")).to_be_visible(timeout=15_000)
    expect(page.get_by_test_id("lift-handset-btn")).to_have_count(0)


def _miss_scheduled_call_and_play_voicemail(page: Page) -> None:
    console = page.get_by_test_id("crt-console")
    simulate_button = page.get_by_test_id("simulate-call-btn")
    handset_button = page.get_by_test_id("lift-handset-btn")
    message_lamp = _message_light_lamp(page)

    # Rotating network samples are archive messages and must not light a fresh box.
    expect(message_lamp).not_to_have_class(re.compile(r"\bbg-red-500\b"), timeout=5_000)

    with page.expect_response(
        lambda response: response.url.endswith("/api/voicemails")
        and response.request.method == "POST",
        timeout=15_000,
    ) as create_info:
        simulate_button.click()
        expect(handset_button).to_contain_text("Answer", timeout=3_000)
        expect(console.get_by_text("RINGING", exact=True)).to_be_visible(timeout=3_000)

    created_response = create_info.value
    assert created_response.ok, f"Voicemail create returned HTTP {created_response.status}"
    created = created_response.json()
    assert created["program_slug"] == "fortune", created
    assert created["from_name"] == "The Fortune Caller", created
    assert created["heard"] is False, created

    expect(handset_button).to_contain_text("Lift Handset", timeout=5_000)
    expect(message_lamp).to_have_class(re.compile(r"\bbg-red-500\b"), timeout=5_000)

    _assert_live_menu(page)

    with page.expect_response(
        lambda response: "/api/voicemails/" in response.url
        and response.request.method == "PATCH",
        timeout=15_000,
    ) as mark_info:
        with page.expect_response(
            lambda response: response.url.endswith("/api/voicemails")
            and response.request.method == "GET",
            timeout=15_000,
        ) as list_info:
            _keypad_button(page, "*").click()

    listed_response = list_info.value
    assert listed_response.ok, f"Voicemail list returned HTTP {listed_response.status}"
    listed = listed_response.json()
    missed = [vm for vm in listed if not str(vm["id"]).startswith("pool_")]
    assert len(missed) == 1, missed
    assert missed[0]["id"] == created["id"], missed
    assert missed[0]["heard"] is False, missed

    marked_response = mark_info.value
    assert marked_response.ok, f"Voicemail mark returned HTTP {marked_response.status}"
    marked = marked_response.json()
    assert marked["id"] == created["id"], marked
    assert marked["heard"] is True, marked

    # The CRT decorates this heading as "── VOICEMAIL ──", so match its text
    # rather than requiring a standalone exact node.
    console.get_by_text("VOICEMAIL", exact=False).wait_for(timeout=15_000)
    console.get_by_text("You have 1 message.", exact=True).wait_for(timeout=15_000)
    console.get_by_text("The Fortune Caller", exact=False).wait_for(timeout=15_000)
    console.get_by_text("End of messages.", exact=False).wait_for(timeout=15_000)
    expect(message_lamp).not_to_have_class(re.compile(r"\bbg-red-500\b"), timeout=15_000)


def test_real_browser_reaches_real_backend_mindline() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1100})
        page.route("**/api/tts", _stub_tts)

        try:
            page.goto(APP_URL, wait_until="networkidle", timeout=30_000)
            _assert_live_menu(page)
            _dial_mindline(page)
            page.screenshot(path=str(ARTIFACT_DIR / "mindline-smoke-passed.png"), full_page=True)
        except Exception:
            page.screenshot(path=str(ARTIFACT_DIR / "mindline-smoke-failed.png"), full_page=True)
            raise
        finally:
            browser.close()


def test_real_browser_secret_code_branch_and_universal_exit_restore() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1100})
        page.route("**/api/tts", _stub_tts)

        try:
            page.goto(APP_URL, wait_until="networkidle", timeout=30_000)
            _assert_live_menu(page)
            _dial_directory_assistance(page)
            page.screenshot(path=str(ARTIFACT_DIR / "secret-exit-smoke-passed.png"), full_page=True)
        except Exception:
            page.screenshot(path=str(ARTIFACT_DIR / "secret-exit-smoke-failed.png"), full_page=True)
            raise
        finally:
            browser.close()


def test_real_browser_ends_call_and_returns_to_dialbox_network() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1100})
        page.route("**/api/tts", _stub_tts)

        try:
            page.goto(APP_URL, wait_until="networkidle", timeout=30_000)
            _assert_live_menu(page)
            _end_mindline_call_and_return_to_network(page)
            page.screenshot(path=str(ARTIFACT_DIR / "call-ended-network-passed.png"), full_page=True)
        except Exception:
            page.screenshot(path=str(ARTIFACT_DIR / "call-ended-network-failed.png"), full_page=True)
            raise
        finally:
            browser.close()


def test_real_browser_answers_simulated_scheduled_incoming_call() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1100})
        page.route("**/api/tts", _stub_tts)

        try:
            page.goto(APP_URL, wait_until="networkidle", timeout=30_000)
            _answer_simulated_scheduled_call(page)
            page.screenshot(path=str(ARTIFACT_DIR / "scheduled-call-answered-passed.png"), full_page=True)
        except Exception:
            page.screenshot(path=str(ARTIFACT_DIR / "scheduled-call-answered-failed.png"), full_page=True)
            raise
        finally:
            browser.close()


def test_real_browser_missed_call_creates_and_clears_voicemail() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1100})
        page.route("**/api/tts", _stub_tts)

        try:
            page.goto(APP_URL, wait_until="networkidle", timeout=30_000)
            _miss_scheduled_call_and_play_voicemail(page)
            page.screenshot(path=str(ARTIFACT_DIR / "missed-call-voicemail-passed.png"), full_page=True)
        except Exception:
            page.screenshot(path=str(ARTIFACT_DIR / "missed-call-voicemail-failed.png"), full_page=True)
            raise
        finally:
            browser.close()

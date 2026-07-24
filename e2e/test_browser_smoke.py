from pathlib import Path

from playwright.sync_api import Page, Route, expect, sync_playwright


ARTIFACT_DIR = Path("e2e/artifacts")
APP_URL = "http://127.0.0.1:3000"


def _stub_tts(route: Route) -> None:
    """Keep browser E2E deterministic and free of paid external speech calls."""
    route.fulfill(
        status=200,
        content_type="application/json",
        body='{"audio_base64":"","format":"mp3","voice":"nova"}',
    )


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
        page.get_by_test_id("keypad-button-3").click()

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
            page.get_by_test_id(f"keypad-button-{key}").click()

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

    page.get_by_test_id("keypad-button-2").click()
    branch_text = "Your lost item is precisely where you last had faith it would be"
    console.get_by_text(branch_text, exact=False).wait_for(timeout=15_000)

    page.get_by_test_id("keypad-button-#").click()
    page.get_by_test_id("keypad-button-#").click()
    exit_prompt = "Are you sure you want to end this call? Press 1 to continue, press 2 to end."
    console.get_by_text(exit_prompt, exact=False).wait_for(timeout=15_000)

    page.get_by_test_id("keypad-button-1").click()
    expect(console.get_by_text(exit_prompt, exact=False)).to_have_count(0)
    console.get_by_text(branch_text, exact=False).wait_for(timeout=15_000)


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

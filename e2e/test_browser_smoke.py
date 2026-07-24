from pathlib import Path

from playwright.sync_api import Page, Route, sync_playwright


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
    page.get_by_test_id("keypad-button-3").click()
    console = page.get_by_test_id("crt-console")
    console.get_by_text("Connecting to MindLine", exact=False).wait_for(timeout=15_000)
    console.get_by_text("MINDLINE", exact=False).wait_for(timeout=15_000)
    page.get_by_test_id("mindline-input").wait_for(timeout=15_000)


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

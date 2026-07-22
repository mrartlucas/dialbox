// Shared DialBox keypad-input contract. Every input source (on-screen keypad, computer
// keyboard, voice, DTMF audio, telephone, automated tests) funnels through the SAME set of
// keys and the SAME dispatcher so menu-navigation logic is never duplicated.

export const VALID_KEYS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "#"];

export const VALID_SOURCES = [
  "screen", // on-screen tactile keypad
  "computer-keyboard", // physical keyboard (development/testing)
  "voice", // spoken number/command
  "dtmf", // decoded DTMF audio tone (Cell2Jack / mic)
  "telephone", // future: real phone call via telephony provider
  "test", // automated tests / simulated input
];

export const isValidKey = (k) => VALID_KEYS.includes(k);
export const isValidSource = (s) => VALID_SOURCES.includes(s);

// CustomEvent names used to bridge decoupled components (e.g. the DTMF Test Lab) to the
// live DialBox dispatcher without prop-drilling or a router.
export const EXTERNAL_KEY_EVENT = "dialbox-external-key"; // detail: { key, source }
export const KEY_DISPATCHED_EVENT = "dialbox-key"; // detail: { key, source, ts } (observability/tests)
export const SETTINGS_CHANGED_EVENT = "dialbox-settings-changed";

const DEV_KEYBOARD_LS_KEY = "dialbox_dev_keyboard_enabled";

export const isDevBuild = () =>
  typeof process !== "undefined" && process.env && process.env.NODE_ENV === "development";

// Dev keyboard controls: default ON in development builds, OFF in production builds.
export function getDevKeyboardEnabled() {
  try {
    const v = localStorage.getItem(DEV_KEYBOARD_LS_KEY);
    if (v === null) return isDevBuild();
    return v === "1";
  } catch {
    return isDevBuild();
  }
}

export function setDevKeyboardEnabled(enabled) {
  try {
    localStorage.setItem(DEV_KEYBOARD_LS_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent(SETTINGS_CHANGED_EVENT, { detail: { devKeyboard: !!enabled } })
  );
}

// Map a raw KeyboardEvent to a DialBox key, or null. Supports top-row + numpad digits,
// Shift+8 / numpad-* for '*', Shift+3 for '#', and dev aliases P/S for '#'.
export function keyboardEventToDialKey(e) {
  const { key, code, shiftKey } = e;
  if (/^[0-9]$/.test(key)) return key; // top row + numpad digits both surface as key "0".."9"
  if (key === "*" || code === "NumpadMultiply") return "*";
  if (key === "#") return "#";
  if (shiftKey && (code === "Digit8" || key === "8")) return "*"; // Shift+8
  if (shiftKey && (code === "Digit3" || key === "3")) return "#"; // Shift+3 (layout dependent)
  const lower = (key || "").toLowerCase();
  if (lower === "p" || lower === "s") return "#"; // dev aliases
  return null;
}

// Should the dev keyboard ignore this event because the user is typing / a dialog owns focus?
export function isTypingContext() {
  const el = document.activeElement;
  if (el) {
    const tag = (el.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (el.isContentEditable) return true;
    if (el.closest && el.closest('[role="dialog"]')) return true;
  }
  return false;
}

// Helper for external components (DTMF lab, tests) to feed a key into the live DialBox.
export function emitExternalKey(key, source) {
  window.dispatchEvent(new CustomEvent(EXTERNAL_KEY_EVENT, { detail: { key, source } }));
}

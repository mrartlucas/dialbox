import { keyboardEventToDialKey } from "./dialboxKeys";

const ev = (opts) => ({ key: "", code: "", shiftKey: false, ...opts });

describe("keyboardEventToDialKey — Shift combos take priority over the digit fallback", () => {
  test("Shift+8 -> '*'", () => {
    expect(keyboardEventToDialKey(ev({ key: "8", code: "Digit8", shiftKey: true }))).toBe("*");
    // Some layouts already report key '*' with Shift+8 — still '*'.
    expect(keyboardEventToDialKey(ev({ key: "*", code: "Digit8", shiftKey: true }))).toBe("*");
  });

  test("Shift+3 -> '#'", () => {
    expect(keyboardEventToDialKey(ev({ key: "3", code: "Digit3", shiftKey: true }))).toBe("#");
    // US layout reports key '#' directly with Shift+3.
    expect(keyboardEventToDialKey(ev({ key: "#", code: "Digit3", shiftKey: true }))).toBe("#");
  });

  test("unshifted 8 -> '8'", () => {
    expect(keyboardEventToDialKey(ev({ key: "8", code: "Digit8" }))).toBe("8");
  });

  test("unshifted 3 -> '3'", () => {
    expect(keyboardEventToDialKey(ev({ key: "3", code: "Digit3" }))).toBe("3");
  });

  test("NumpadMultiply -> '*'", () => {
    expect(keyboardEventToDialKey(ev({ key: "*", code: "NumpadMultiply" }))).toBe("*");
    // Even if key differs, the code alone maps to '*'.
    expect(keyboardEventToDialKey(ev({ key: "Multiply", code: "NumpadMultiply" }))).toBe("*");
  });

  test("P and S dev aliases -> '#'", () => {
    expect(keyboardEventToDialKey(ev({ key: "p", code: "KeyP" }))).toBe("#");
    expect(keyboardEventToDialKey(ev({ key: "P", code: "KeyP", shiftKey: true }))).toBe("#");
    expect(keyboardEventToDialKey(ev({ key: "s", code: "KeyS" }))).toBe("#");
    expect(keyboardEventToDialKey(ev({ key: "S", code: "KeyS", shiftKey: true }))).toBe("#");
  });

  test("numpad digits 0-9 -> matching digit", () => {
    for (let d = 0; d <= 9; d++) {
      expect(
        keyboardEventToDialKey(ev({ key: String(d), code: `Numpad${d}` }))
      ).toBe(String(d));
    }
  });

  test("top-row digits 0-9 -> matching digit", () => {
    for (let d = 0; d <= 9; d++) {
      expect(keyboardEventToDialKey(ev({ key: String(d), code: `Digit${d}` }))).toBe(String(d));
    }
  });

  test("unrelated keys -> null", () => {
    expect(keyboardEventToDialKey(ev({ key: "a", code: "KeyA" }))).toBeNull();
    expect(keyboardEventToDialKey(ev({ key: "Enter", code: "Enter" }))).toBeNull();
    expect(keyboardEventToDialKey(ev({ key: "Shift", code: "ShiftLeft", shiftKey: true }))).toBeNull();
  });
});

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import {
  EXTERNAL_KEY_EVENT,
  KEY_DISPATCHED_EVENT,
  SETTINGS_CHANGED_EVENT,
} from "../lib/dialboxKeys";

const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockSpeechControls = {
  supported: true,
  listening: false,
  start: jest.fn(),
  stop: jest.fn(),
  error: null,
};

const mockApi = {
  getMenu: jest.fn(), tts: jest.fn(), getPersonas: jest.fn(), dial: jest.fn(), fortune: jest.fn(),
  getVoicemails: jest.fn(), markVoicemail: jest.fn(), createVoicemail: jest.fn(), scheduleFired: jest.fn(), schedulesDue: jest.fn(),
  mindlineStart: jest.fn(), mindlineTurn: jest.fn(), mindlineLeaderboard: jest.fn(), magic8: jest.fn(), knockknock: jest.fn(),
  adventureStories: jest.fn(), adventureStart: jest.fn(), adventureChoose: jest.fn(), adventureAiStart: jest.fn(), adventureAiChoose: jest.fn(),
  rubyReading: jest.fn(), cyndiReading: jest.fn(), zeldaReading: jest.fn(), nyxReading: jest.fn(), countReading: jest.fn(),
  sphinxGates: jest.fn(), sphinxFourthGate: jest.fn(), triviaStart: jest.fn(), triviaAnswer: jest.fn(), triviaHint: jest.fn(),
};

jest.mock("framer-motion", () => {
  const mockReact = require("react");
  return { motion: { div: (props) => mockReact.createElement("div", props) } };
});
jest.mock("lucide-react", () => {
  const mockReact = require("react");
  return {
    Phone: () => mockReact.createElement("span"),
    PhoneOff: () => mockReact.createElement("span"),
    PhoneCall: () => mockReact.createElement("span"),
    Volume2: () => mockReact.createElement("span"),
    Bell: () => mockReact.createElement("span"),
    Mic: () => mockReact.createElement("span"),
  };
});
jest.mock("../lib/useSpeechInput", () => ({ useSpeechInput: () => mockSpeechControls }));
jest.mock("../lib/phoneApi", () => ({
  api: mockApi,
  playTone: jest.fn(), playDialTone: jest.fn(), playBeep: jest.fn(), playStartup: jest.fn(), playParity: jest.fn(),
  playReboot: jest.fn(), playDisconnect: jest.fn(), playWin: jest.fn(), playLose: jest.fn(), resumeAudioCtx: jest.fn(),
  SILENT_CLIP: "silent", isOutOfCredits: (e) => Boolean(e && e.outOfCredits),
}));

const PhoneSimulator = require("./PhoneSimulator").default;

const rendered = [];
const windowListeners = [];
let originalAudio;
let mockAudioInstances = [];

const menu = { greeting: "Welcome to DialBox", items: [{ key: "1", name: "Fortune Caller", description: "oracles", has_personas: true }] };
const personas = [
  { slug: "ruby", name: "Madame Ruby", blurb: "cards" },
  { slug: "cyndi", name: "Cyndi & Louise", blurb: "two voices" },
  { slug: "zelda", name: "Zelda", blurb: "crystal" },
  { slug: "nyx", name: "Nyx", blurb: "stars" },
  { slug: "count", name: "Count", blurb: "numbers" },
  { slug: "sphinx", name: "Sphinx", blurb: "riddles" },
];

class MockAudio {
  constructor() {
    this.play = jest.fn(() => Promise.resolve());
    this.pause = jest.fn();
    this.preload = "";
    this.muted = false;
    this.src = "";
    this.onended = null;
    mockAudioInstances.push(this);
  }
}

function mockBrowserAudio() {
  originalAudio = window.Audio;
  mockAudioInstances = [];
  window.Audio = jest.fn(() => new MockAudio());
}

async function completeCurrentAudio() {
  const audio = mockAudioInstances[mockAudioInstances.length - 1];
  if (audio && typeof audio.onended === "function") {
    await act(async () => { audio.onended(); });
  }
}

function renderPhone() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(React.createElement(PhoneSimulator)); });
  const entry = {
    container,
    root,
    unmount() {
      act(() => { root.unmount(); });
      container.remove();
    },
  };
  rendered.push(entry);
  return entry;
}

function addWindowListener(type, listener) {
  window.addEventListener(type, listener);
  windowListeners.push([type, listener]);
}

function byTestId(container, id) { return container.querySelector(`[data-testid="${id}"]`); }
function click(container, id) { act(() => { byTestId(container, id).dispatchEvent(new MouseEvent("click", { bubbles: true })); }); }
function changeInput(input, value) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  ).set;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
function submitForm(input) { act(() => { input.closest("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); }); }
function text(container) { return container.textContent; }
function expectText(container, pattern) { expect(text(container)).toMatch(pattern); }
function status(container) { return byTestId(container, "crt-console").querySelector(".crt-glow").textContent; }
function keyId(key) { return key === "*" ? "star" : key === "#" ? "hash" : key; }
async function flushPromises() { await act(async () => { await Promise.resolve(); }); }
async function advance(ms) { await act(async () => { jest.advanceTimersByTime(ms); await Promise.resolve(); }); }
async function press(container, key) { click(container, `keypad-button-${keyId(key)}`); await flushPromises(); }
async function lift(container) { click(container, "lift-handset-btn"); await flushPromises(); expectText(container, /Welcome to DialBox/); }
async function waitDialPause() { await advance(1300); }
async function waitPoundPause() { await advance(650); }
async function waitStarHold() { await advance(850); }
async function waitSpokenGoodbye() { await advance(130); }
async function waitRingTimeout() { await advance(9000); }

async function enterFortuneResult(container) {
  mockApi.rubyReading.mockResolvedValue({
    persona_name: "Madame Ruby",
    cards: ["The Lantern"],
    text: "Ruby says yes",
    voice: "shimmer",
    sign_off: "Goodbye.",
  });
  await press(container, "1");
  await waitDialPause();
  expectText(container, /CHOOSE YOUR ORACLE/);
  await press(container, "1");
  changeInput(byTestId(container, "ruby-name-input"), "Ava");
  submitForm(byTestId(container, "ruby-name-input"));
  changeInput(byTestId(container, "ruby-situation-input"), "future");
  submitForm(byTestId(container, "ruby-situation-input"));
  await press(container, "2");
  await flushPromises();
  expectText(container, /Ruby says yes/);
}

async function enterCallEnded(container) {
  await enterFortuneResult(container);
  await press(container, "#");
  await press(container, "#");
  expect(status(container)).toBe("END CALL?");
  await press(container, "2");
  expect(status(container)).toBe("CALL ENDED");
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  localStorage.clear();
  localStorage.setItem("dialbox_dev_keyboard_enabled", "1");
  mockBrowserAudio();
  mockSpeechControls.supported = true;
  mockSpeechControls.listening = false;
  mockSpeechControls.error = null;
  mockApi.getMenu.mockResolvedValue(menu);
  mockApi.tts.mockResolvedValue({ audio_base64: "abc" });
  mockApi.getPersonas.mockResolvedValue(personas);
  mockApi.getVoicemails.mockResolvedValue([]);
  mockApi.schedulesDue.mockResolvedValue([]);
  mockApi.dial.mockResolvedValue({ type: "program", name: "Fortune Caller", has_personas: true, personas });
  mockApi.fortune.mockResolvedValue({ persona_name: "Oracle", text: "Current fortune", voice: "nova", sign_off: "Goodbye." });
  mockApi.nyxReading.mockResolvedValue({ text: "Nyx reading", voice: "alloy" });
  mockApi.countReading.mockResolvedValue({ text: "Count reading", voice: "echo" });
  mockApi.sphinxGates.mockResolvedValue({ text: "Sphinx gate reading", voice: "ash" });
});

afterEach(() => {
  while (windowListeners.length) {
    const [type, listener] = windowListeners.pop();
    window.removeEventListener(type, listener);
  }
  while (rendered.length) rendered.pop().unmount();
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
  localStorage.clear();
  if (originalAudio === undefined) delete window.Audio;
  else window.Audio = originalAudio;
  mockAudioInstances = [];
  document.body.replaceChildren();
});

afterAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
});

describe("PhoneSimulator Phase 1A characterization", () => {
  test("lift handset opens the DialBox menu", async () => {
    const { container } = renderPhone();
    await lift(container);
    expect(status(container)).toBe("DIAL TONE");
  });

  test("main-menu keypad input dispatches through the shared key event and dials after the inter-digit timer", async () => {
    const { container } = renderPhone();
    await lift(container);
    const seen = jest.fn();
    addWindowListener(KEY_DISPATCHED_EVENT, seen);
    await press(container, "1");
    expect(seen).toHaveBeenCalledWith(expect.objectContaining({ detail: expect.objectContaining({ key: "1", source: "screen" }) }));
    await waitDialPause();
    expect(mockApi.dial).toHaveBeenCalledWith("1");
  });

  test("computer keyboard input is ignored on-hook, accepted off-hook, and disabled by settings", async () => {
    const { container } = renderPhone();
    const seen = jest.fn();
    addWindowListener(KEY_DISPATCHED_EVENT, seen);
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "1", code: "Digit1", bubbles: true })); });
    expect(seen).not.toHaveBeenCalled();
    await lift(container);
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "2", code: "Digit2", bubbles: true })); });
    expect(seen).toHaveBeenLastCalledWith(expect.objectContaining({ detail: expect.objectContaining({ key: "2", source: "computer-keyboard" }) }));
    localStorage.setItem("dialbox_dev_keyboard_enabled", "0");
    act(() => { window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT)); });
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "3", code: "Digit3", bubbles: true })); });
    expect(seen).not.toHaveBeenLastCalledWith(expect.objectContaining({ detail: expect.objectContaining({ key: "3" }) }));
  });

  test("computer keyboard input is ignored while an input or textarea has focus", async () => {
    const { container } = renderPhone();
    await lift(container);
    const seen = jest.fn();
    addWindowListener(KEY_DISPATCHED_EVENT, seen);
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "4", code: "Digit4", bubbles: true })); });
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "5", code: "Digit5", bubbles: true })); });
    expect(seen).not.toHaveBeenCalled();
    input.remove();
    textarea.remove();
  });

  test("external input with source dtmf reaches the shared dispatcher and dials after the inter-digit timer", async () => {
    const { container } = renderPhone();
    await lift(container);
    const seen = jest.fn();
    addWindowListener(KEY_DISPATCHED_EVENT, seen);
    await act(async () => { window.dispatchEvent(new CustomEvent(EXTERNAL_KEY_EVENT, { detail: { key: "4", source: "dtmf" } })); });
    expect(seen).toHaveBeenCalledWith(expect.objectContaining({ detail: expect.objectContaining({ key: "4", source: "dtmf" }) }));
    await waitDialPause();
    expect(mockApi.dial).toHaveBeenCalledWith("4");
  });

  test("external input defaults to source test when source is omitted", async () => {
    const { container } = renderPhone();
    await lift(container);
    const seen = jest.fn();
    addWindowListener(KEY_DISPATCHED_EVENT, seen);
    await act(async () => { window.dispatchEvent(new CustomEvent(EXTERNAL_KEY_EVENT, { detail: { key: "5" } })); });
    expect(seen).toHaveBeenCalledWith(expect.objectContaining({ detail: expect.objectContaining({ key: "5", source: "test" }) }));
  });

  test("physical hang-up returns to on-hook and clears visible call state", async () => {
    const { container } = renderPhone();
    await lift(container);
    click(container, "hangup-btn");
    expect(status(container)).toBe("ON HOOK");
    expectText(container, /handset on hook/);
  });

  test("double-pound enters exit confirmation in result mode", async () => {
    const { container } = renderPhone();
    await lift(container);
    await enterFortuneResult(container);
    await press(container, "#");
    await press(container, "#");
    expect(status(container)).toBe("END CALL?");
  });

  test("exit confirmation option 1 currently restarts the Fortune Line", async () => {
    const { container } = renderPhone();
    await lift(container);
    await enterFortuneResult(container);
    await press(container, "#");
    await press(container, "#");
    await press(container, "1");
    await flushPromises();
    expect(status(container)).toBe("SELECT VOICE");
    expectText(container, /FORTUNE TELLER|CHOOSE YOUR ORACLE/);
  });

  test("exit confirmation option 2 enters call-ended routing", async () => {
    const { container } = renderPhone();
    await lift(container);
    await enterFortuneResult(container);
    await press(container, "#");
    await press(container, "#");
    await press(container, "2");
    expect(status(container)).toBe("CALL ENDED");
  });

  test("call-ended option 1 currently restarts the current Line", async () => {
    const { container } = renderPhone();
    await lift(container);
    await enterCallEnded(container);
    await press(container, "1");
    await flushPromises();
    expect(status(container)).toBe("SELECT VOICE");
  });

  test("call-ended option 2 currently explores the current Line", async () => {
    const { container } = renderPhone();
    await lift(container);
    await enterCallEnded(container);
    await press(container, "2");
    await flushPromises();
    expect(status(container)).toBe("SELECT VOICE");
  });

  test("call-ended option 3 returns to the DialBox Network", async () => {
    const { container } = renderPhone();
    await lift(container);
    await enterCallEnded(container);
    await press(container, "3");
    await flushPromises();
    expect(status(container)).toBe("DIAL TONE");
    expectText(container, /DIALBOX NETWORK/);
  });

  test("call-ended option 4 returns to physical on-hook termination", async () => {
    const { container } = renderPhone();
    await lift(container);
    await enterCallEnded(container);
    await press(container, "4");
    expect(status(container)).toBe("ON HOOK");
  });

  test("star replay appends a replay message in result mode", async () => {
    const { container } = renderPhone();
    await lift(container);
    await enterFortuneResult(container);
    await press(container, "*");
    await waitStarHold();
    expectText(container, /replaying/);
  });

  test("star at dial tone opens voicemail", async () => {
    const { container } = renderPhone();
    await lift(container);
    await press(container, "*");
    await waitStarHold();
    expectText(container, /VOICEMAIL/);
  });

  test("single-pound in result mode opens another-oracle selection after the pound delay", async () => {
    const { container } = renderPhone();
    await lift(container);
    await enterFortuneResult(container);
    await press(container, "#");
    await waitPoundPause();
    expectText(container, /CHOOSE ANOTHER ORACLE/);
  });

  test("single-pound in Nyx constellation entry submits the constellation", async () => {
    const { container } = renderPhone();
    await lift(container);
    await press(container, "1");
    await waitDialPause();
    await press(container, "4");
    await press(container, "1");
    await press(container, "#");
    await flushPromises();
    expectText(container, /Nyx reading/);
  });

  test("single-pound in Count number entry submits the keyed number", async () => {
    const { container } = renderPhone();
    await lift(container);
    await press(container, "1");
    await waitDialPause();
    await press(container, "5");
    await press(container, "1");
    await press(container, "1");
    await press(container, "2");
    await press(container, "#");
    await flushPromises();
    expect(mockApi.countReading).toHaveBeenCalledWith("Love", "12");
    expectText(container, /Count reading/);
  });

  test("Sphinx riddle mode is entered only after completing the required audio callback", async () => {
    const { container } = renderPhone();
    await lift(container);
    await press(container, "1");
    await waitDialPause();
    await press(container, "6");
    await press(container, "2");
    expect(byTestId(container, "sphinx-riddle-input")).toBeNull();
    await completeCurrentAudio();
    expect(byTestId(container, "sphinx-riddle-input")).not.toBeNull();
  });

  test("single-pound in Sphinx riddle entry submits the typed answer", async () => {
    const { container } = renderPhone();
    await lift(container);
    await press(container, "1");
    await waitDialPause();
    await press(container, "6");
    await press(container, "2");
    await completeCurrentAudio();
    changeInput(byTestId(container, "sphinx-riddle-input"), "egg");
    await press(container, "#");
    expectText(container, />\s*egg/);
    expect(status(container)).toBe("CONNECTING");
  });

  test("spoken goodbye invokes the speech callback and enters exit confirmation", async () => {
    const { container } = renderPhone();
    await lift(container);
    await enterFortuneResult(container);
    click(container, "hold-to-talk-btn");
    expect(mockSpeechControls.start).toHaveBeenCalled();
    const callback = mockSpeechControls.start.mock.calls[0][0];
    expect(typeof callback).toBe("function");
    act(() => { callback("goodbye"); });
    await waitSpokenGoodbye();
    expect(status(container)).toBe("END CALL?");
  });

  test("menu-load API failure displays the current menu recovery message", async () => {
    mockApi.getMenu.mockRejectedValueOnce(new Error("down"));
    const { container } = renderPhone();
    click(container, "lift-handset-btn");
    await flushPromises();
    expectText(container, /could not reach the DialBox Network/);
  });

  test("scheduled ring answer opens the scheduled Fortune Line", async () => {
    const { container } = renderPhone();
    click(container, "simulate-call-btn");
    expect(status(container)).toBe("RINGING");
    click(container, "lift-handset-btn");
    await flushPromises();
    expectText(container, /is calling YOU/);
    expect(status(container)).toBe("SELECT VOICE");
  });

  test("scheduled missed call creates voicemail and turns on the visible message light", async () => {
    const { container } = renderPhone();
    click(container, "simulate-call-btn");
    expect(status(container)).toBe("RINGING");
    await waitRingTimeout();
    expect(mockApi.createVoicemail).toHaveBeenCalledWith("fortune");
    expect(byTestId(container, "message-light").textContent).toContain("Msg");
    expect(byTestId(container, "message-light").querySelector("span").className).toMatch(/bg-red-500/);
  });
});

describe("PhoneSimulator future Phase 1B regression TODOs", () => {
  test.todo("delayed TTS does not play after hang-up");
  test.todo("delayed API response cannot mutate state after hang-up");
  test.todo("microphone stops after hang-up");
  test.todo("every timer is cleared or invalidated");
  test.todo("stale callbacks from an old call cannot affect a new call");
  test.todo("Continue restores the interrupted state instead of restarting");
  test.todo("universal ## works in every submit mode");
});

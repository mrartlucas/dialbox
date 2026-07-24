from pathlib import Path

path = Path("frontend/src/components/PhoneSimulator.test.jsx")
code = path.read_text()


def replace_once(old, new, label):
    global code
    if old not in code:
        raise SystemExit(f"Expected block not found: {label}")
    code = code.replace(old, new, 1)


replace_once(
'''async function completeCurrentAudio() {
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
''',
'''function currentAudio() {
  return mockAudioInstances[mockAudioInstances.length - 1] || null;
}

async function waitForCondition(check, label, attempts = 20) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const value = check();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await flushPromises();
  }
  if (lastError) throw lastError;
  throw new Error(`Timed out waiting for ${label}`);
}

async function completeCurrentAudio() {
  const audio = await waitForCondition(
    () => {
      const candidate = currentAudio();
      return candidate && typeof candidate.onended === "function" ? candidate : null;
    },
    "the current audio callback"
  );
  await act(async () => {
    audio.onended();
    await Promise.resolve();
  });
  await flushPromises();
}

async function renderPhone() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(React.createElement(PhoneSimulator));
    await Promise.resolve();
    await Promise.resolve();
  });
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
''',
"audio/render helpers",
)

replace_once(
'''function byTestId(container, id) { return container.querySelector(`[data-testid="${id}"]`); }
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
''',
'''function byTestId(container, id) { return container.querySelector(`[data-testid="${id}"]`); }
function click(container, id) {
  const element = byTestId(container, id);
  if (!element) throw new Error(`Missing element: ${id}`);
  act(() => { element.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
}
function changeInput(input, value) {
  if (!input) throw new Error("Missing input element");
  const prototype = Object.getPrototypeOf(input);
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (!setter) throw new Error("Input value setter is unavailable");
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
function submitForm(input) {
  if (!input) throw new Error("Missing form input");
  const form = input.closest("form");
  if (!form) throw new Error("Input is not inside a form");
  act(() => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}
function text(container) { return container.textContent; }
function expectText(container, pattern) { expect(text(container)).toMatch(pattern); }
function status(container) { return byTestId(container, "crt-console").querySelector(".crt-glow").textContent; }
function keyId(key) { return key === "*" ? "star" : key === "#" ? "hash" : key; }
async function flushPromises(cycles = 5) {
  await act(async () => {
    for (let i = 0; i < cycles; i += 1) await Promise.resolve();
  });
}
async function advance(ms) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
  });
}
async function waitForText(container, pattern) {
  return waitForCondition(() => pattern.test(text(container)), `text ${pattern}`);
}
async function waitForStatus(container, expected) {
  return waitForCondition(() => status(container) === expected, `status ${expected}`);
}
async function waitForTestId(container, id) {
  return waitForCondition(() => byTestId(container, id), `element ${id}`);
}
async function press(container, key) {
  click(container, `keypad-button-${keyId(key)}`);
  await flushPromises();
}
async function lift(container) {
  click(container, "lift-handset-btn");
  await waitForText(container, /Welcome to DialBox/);
}
''',
"DOM and async helpers",
)

code = code.replace('const { container } = renderPhone();', 'const { container } = await renderPhone();')

replace_once(
'''  await press(container, "1");
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
''',
'''  await press(container, "1");
  await waitDialPause();
  await waitForText(container, /CHOOSE YOUR ORACLE/);
  await press(container, "1");
  const nameInput = await waitForTestId(container, "ruby-name-input");
  changeInput(nameInput, "Ava");
  submitForm(nameInput);
  const situationInput = await waitForTestId(container, "ruby-situation-input");
  changeInput(situationInput, "future");
  submitForm(situationInput);
  await waitForText(container, /Press 1 \\(predict\\) or 2 \\(reflect\\)/);
  await press(container, "2");
  await waitForText(container, /Ruby says yes/);
''',
"Ruby flow",
)

replace_once(
'''  expect(status(container)).toBe("END CALL?");
  await press(container, "2");
  expect(status(container)).toBe("CALL ENDED");
''',
'''  await waitForStatus(container, "END CALL?");
  await press(container, "2");
  await waitForStatus(container, "CALL ENDED");
''',
"call-ended helper",
)

replace_once(
'''    await press(container, "1");
    await waitDialPause();
    await press(container, "4");
    await press(container, "1");
    await press(container, "#");
    await flushPromises();
    expectText(container, /Nyx reading/);
''',
'''    await press(container, "1");
    await waitDialPause();
    await waitForText(container, /CHOOSE YOUR ORACLE/);
    await press(container, "4");
    await waitForStatus(container, "NYX · STARS");
    await press(container, "1");
    await press(container, "#");
    await waitForText(container, /Nyx reading/);
''',
"Nyx flow",
)

replace_once(
'''    await press(container, "1");
    await waitDialPause();
    await press(container, "5");
    await press(container, "1");
    await press(container, "1");
    await press(container, "1");
    await press(container, "2");
    await press(container, "#");
    await flushPromises();
    expect(mockApi.countReading).toHaveBeenCalledWith("Love", "12");
    expectText(container, /Count reading/);
''',
'''    await press(container, "1");
    await waitDialPause();
    await waitForText(container, /CHOOSE YOUR ORACLE/);
    await press(container, "5");
    await waitForStatus(container, "COUNT");
    await press(container, "1");
    await waitForText(container, /Which corner of your fate/);
    await press(container, "1");
    await waitForTestId(container, "count-number-input");
    await press(container, "1");
    await press(container, "2");
    await press(container, "#");
    await waitForCondition(
      () => mockApi.countReading.mock.calls.some(([category, number]) => category === "Love" && number === "12"),
      "Count reading API call"
    );
    await waitForText(container, /Count reading/);
''',
"Count flow",
)

sphinx_old = '''    await press(container, "1");
    await waitDialPause();
    await press(container, "6");
    await press(container, "2");
'''
sphinx_new = '''    await press(container, "1");
    await waitDialPause();
    await waitForText(container, /CHOOSE YOUR ORACLE/);
    await press(container, "6");
    await waitForStatus(container, "THE SPHINX");
    await press(container, "2");
    await waitForStatus(container, "CONNECTING");
'''
if code.count(sphinx_old) != 2:
    raise SystemExit("Expected two Sphinx setup blocks")
code = code.replace(sphinx_old, sphinx_new)
code = code.replace(
'''    await completeCurrentAudio();
    expect(byTestId(container, "sphinx-riddle-input")).not.toBeNull();
''',
'''    await completeCurrentAudio();
    await waitForTestId(container, "sphinx-riddle-input");
''',
1,
)
code = code.replace(
'''    await completeCurrentAudio();
    changeInput(byTestId(container, "sphinx-riddle-input"), "egg");
''',
'''    await completeCurrentAudio();
    const riddleInput = await waitForTestId(container, "sphinx-riddle-input");
    changeInput(riddleInput, "egg");
''',
1,
)

replace_once(
'''    click(container, "lift-handset-btn");
    await flushPromises();
    expectText(container, /could not reach the DialBox Network/);
''',
'''    click(container, "lift-handset-btn");
    await waitForText(container, /could not reach the DialBox Network/);
''',
"menu failure",
)

replace_once(
'''    click(container, "lift-handset-btn");
    await flushPromises();
    expectText(container, /is calling YOU/);
    expect(status(container)).toBe("SELECT VOICE");
''',
'''    click(container, "lift-handset-btn");
    await waitForText(container, /is calling YOU/);
    await waitForStatus(container, "SELECT VOICE");
''',
"scheduled answer",
)

replace_once(
'''    await waitRingTimeout();
    expect(mockApi.createVoicemail).toHaveBeenCalledWith("fortune");
    expect(byTestId(container, "message-light").textContent).toContain("Msg");
    expect(byTestId(container, "message-light").querySelector("span").className).toMatch(/bg-red-500/);
''',
'''    await waitRingTimeout();
    await waitForCondition(
      () => mockApi.createVoicemail.mock.calls.some(([slug]) => slug === "fortune"),
      "scheduled voicemail creation"
    );
    await waitForCondition(
      () => byTestId(container, "message-light").querySelector("span").className.includes("bg-red-500"),
      "visible message light"
    );
    expect(byTestId(container, "message-light").textContent).toContain("Msg");
''',
"scheduled missed call",
)

path.write_text(code)
print(f"Repaired {path} ({len(code.splitlines())} lines)")

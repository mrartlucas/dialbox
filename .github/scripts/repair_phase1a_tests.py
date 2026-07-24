from pathlib import Path

path = Path("frontend/src/components/PhoneSimulator.test.jsx")
code = path.read_text()


def replace_once(old, new, label):
    global code
    if old not in code:
        raise SystemExit(f"Expected block not found: {label}")
    code = code.replace(old, new, 1)


replace_once(
'''async function waitForCondition(check, label, attempts = 20) {
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
''',
'''async function waitForCondition(check, label, attempts = 20) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    await flushPromises();
    try {
      const value = check();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  throw new Error(`Timed out waiting for ${label}`);
}
''',
"wait helper synchronization",
)

replace_once(
'''  await act(async () => {
    root.render(React.createElement(PhoneSimulator));
    await Promise.resolve();
    await Promise.resolve();
  });
  const entry = {
''',
'''  await act(async () => {
    root.render(React.createElement(PhoneSimulator));
  });
  await flushPromises(10);
  const entry = {
''',
"initial effect flushing",
)

replace_once(
'''async function waitForTestId(container, id) {
  return waitForCondition(() => byTestId(container, id), `element ${id}`);
}
async function press(container, key) {
''',
'''async function waitForTestId(container, id) {
  return waitForCondition(() => byTestId(container, id), `element ${id}`);
}
async function waitForFortuneMenu(container) {
  await waitForText(container, /CHOOSE YOUR ORACLE/);
  await waitForTestId(container, "fortune-question-input");
  await waitForCondition(
    () => mockApi.dial.mock.calls.length > 0,
    "Fortune Caller dial completion"
  );
  await flushPromises(10);
}
async function press(container, key) {
''',
"Fortune menu synchronization helper",
)

needle = 'await waitForText(container, /CHOOSE YOUR ORACLE/);'
if code.count(needle) != 5:
    raise SystemExit(f"Expected five Fortune menu waits, found {code.count(needle)}")
code = code.replace(needle, 'await waitForFortuneMenu(container);')

path.write_text(code)
print(f"Finalized {path} ({len(code.splitlines())} lines)")

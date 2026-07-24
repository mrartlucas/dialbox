from pathlib import Path

TEST = Path("frontend/src/components/PhoneSimulator.test.jsx")
text = TEST.read_text()
start_marker = '  test("every handset timer is cleared or invalidated on hang-up", async () => {'
end_marker = '  test("stale microphone callbacks from an old call cannot affect a new call", async () => {'

start = text.find(start_marker)
end = text.find(end_marker)
if start < 0 or end < 0 or end <= start:
    raise SystemExit("Could not locate the round-two timer regression block")

replacement = '''  test("every handset timer is cleared or invalidated on hang-up", async () => {
    const { container } = await renderPhone();

    // Inter-digit timer cannot dial after hang-up.
    await lift(container);
    await press(container, "1");
    click(container, "hangup-btn");
    await waitDialPause();
    expect(mockApi.dial).not.toHaveBeenCalled();
    expect(status(container)).toBe("ON HOOK");

    // Lone-star timer cannot open voicemail after hang-up.
    await lift(container);
    await press(container, "*");
    click(container, "hangup-btn");
    await waitStarHold();
    expect(mockApi.getVoicemails).not.toHaveBeenCalled();
    expect(status(container)).toBe("ON HOOK");

    // Single-pound timer cannot reopen an oracle after hang-up.
    await lift(container);
    await enterFortuneResult(container);
    await press(container, "#");
    click(container, "hangup-btn");
    await waitPoundPause();
    expect(status(container)).toBe("ON HOOK");

    // The delayed second pound from spoken goodbye cannot leak into a new call.
    await lift(container);
    await enterFortuneResult(container);
    const dispatched = [];
    addWindowListener(KEY_DISPATCHED_EVENT, (event) => dispatched.push(event.detail));
    click(container, "hold-to-talk-btn");
    const goodbyeCallback = mockSpeechControls.start.mock.calls.at(-1)[0];
    act(() => { goodbyeCallback("goodbye"); });
    const dispatchedBeforeHangup = dispatched.length;
    click(container, "hangup-btn");
    await lift(container);
    await waitSpokenGoodbye();
    expect(dispatched).toHaveLength(dispatchedBeforeHangup);
    expect(status(container)).toBe("DIAL TONE");

    // A cancelled scheduled ring cannot create a missed-call voicemail later.
    click(container, "hangup-btn");
    click(container, "simulate-call-btn");
    expect(status(container)).toBe("RINGING");
    click(container, "lift-handset-btn");
    click(container, "hangup-btn");
    await waitRingTimeout();
    expect(mockApi.createVoicemail).not.toHaveBeenCalled();
    expect(status(container)).toBe("ON HOOK");
  });

'''

text = text[:start] + replacement + text[end:]
TEST.write_text(text)
print("Replaced brittle timer-count assertion with direct timer behavior checks.")

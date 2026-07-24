from pathlib import Path

PHONE = Path("frontend/src/components/PhoneSimulator.jsx")
TEST = Path("frontend/src/components/PhoneSimulator.test.jsx")


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f"Expected block not found: {label}")
    return text.replace(old, new, 1)


phone = PHONE.read_text()

phone = replace_once(
    phone,
    '''  const lastSpoken = useRef(null);
  const currentEgg = useRef(null);''',
    '''  const lastSpoken = useRef(null);
  const activeSpeech = useRef(null);
  const interruptedSession = useRef(null);
  const currentEgg = useRef(null);''',
    "interrupted session refs",
)

phone = replace_once(
    phone,
    '''  const speak = useCallback(async (text, opts, onDone) => {
    const generation = sessionGeneration.current;
    try {
      setPlaying(true);''',
    '''  const speak = useCallback(async (text, opts, onDone) => {
    const generation = sessionGeneration.current;
    const speech = { text, opts, onDone };
    activeSpeech.current = speech;
    try {
      setPlaying(true);''',
    "track active speech",
)

phone = replace_once(
    phone,
    '''      p.onended = () => {
        if (generation !== sessionGeneration.current) return;
        setPlaying(false);
        if (onDone) onDone();
      };''',
    '''      p.onended = () => {
        if (generation !== sessionGeneration.current) return;
        if (activeSpeech.current === speech) activeSpeech.current = null;
        setPlaying(false);
        if (onDone) onDone();
      };''',
    "clear completed active speech",
)

phone = replace_once(
    phone,
    '''    } catch (e) {
      if (generation !== sessionGeneration.current) return;
      setPlaying(false);''',
    '''    } catch (e) {
      if (generation !== sessionGeneration.current) return;
      if (activeSpeech.current === speech) activeSpeech.current = null;
      setPlaying(false);''',
    "clear failed active speech",
)

phone = replace_once(
    phone,
    '''  const resetLine = useCallback(() => {
    sessionGeneration.current += 1;
    clearSessionTimers();''',
    '''  const resetLine = useCallback(() => {
    sessionGeneration.current += 1;
    interruptedSession.current = null;
    activeSpeech.current = null;
    clearSessionTimers();''',
    "discard snapshot on physical hang-up",
)

phone = replace_once(
    phone,
    '''  const triggerExitConfirm = useCallback(() => {
    stopAudio();
    clearTimeout(digitTimer.current);
    setModeSafe("exit_confirm");
    push("system", "── END CALL? ──");
    push("program", "Are you sure you want to end this call? Press 1 to continue, press 2 to end.");
    speak("Are you sure you want to end this call? Press 1 to continue. Press 2 to end.",
      { voice: OPERATOR_VOICE });
  }, [push, speak, setModeSafe]);''',
    '''  const triggerExitConfirm = useCallback(() => {
    interruptedSession.current = {
      mode: modeRef.current,
      buffer: bufferRef.current,
      lines,
      program,
      personas,
      question,
      mindlineInput: mindlineInputRef.current,
      speech: activeSpeech.current,
    };
    stopAudio();
    activeSpeech.current = null;
    clearTimeout(digitTimer.current);
    setModeSafe("exit_confirm");
    push("system", "── END CALL? ──");
    push("program", "Are you sure you want to end this call? Press 1 to continue, press 2 to end.");
    speak("Are you sure you want to end this call? Press 1 to continue. Press 2 to end.",
      { voice: OPERATOR_VOICE });
  }, [lines, program, personas, question, push, speak, setModeSafe]);

  const restoreInterruptedSession = useCallback(() => {
    const snapshot = interruptedSession.current;
    if (!snapshot) {
      enterLine(currentLine.current);
      return;
    }
    interruptedSession.current = null;
    stopAudio();
    activeSpeech.current = null;
    setLines(snapshot.lines);
    setProgram(snapshot.program);
    setPersonas(snapshot.personas);
    setQuestion(snapshot.question);
    mindlineInputRef.current = snapshot.mindlineInput;
    setMindlineInput(snapshot.mindlineInput);
    setBuf(snapshot.buffer);
    setModeSafe(snapshot.mode);
    if (snapshot.speech) {
      speak(snapshot.speech.text, snapshot.speech.opts, snapshot.speech.onDone);
    }
  }, [enterLine, setBuf, setModeSafe, speak]);''',
    "snapshot and restore exit confirmation",
)

phone = replace_once(
    phone,
    '''  const callEnded = useCallback(() => {
    stopAudio();
    setModeSafe("call_ended");''',
    '''  const callEnded = useCallback(() => {
    interruptedSession.current = null;
    stopAudio();
    activeSpeech.current = null;
    setModeSafe("call_ended");''',
    "discard snapshot when call ends",
)

phone = replace_once(
    phone,
    '''    if (m === "exit_confirm") {
      if (d === "1") enterLine(currentLine.current);
      else if (d === "2") callEnded();
      return;
    }''',
    '''    if (m === "exit_confirm") {
      if (d === "1") restoreInterruptedSession();
      else if (d === "2") callEnded();
      return;
    }''',
    "continue restores interrupted session",
)

phone = replace_once(
    phone,
    '''enterTrivia, enterLine, triggerExitConfirm, callEnded, resetLine, openMenu, setBuf]);''',
    '''enterTrivia, enterLine, triggerExitConfirm, restoreInterruptedSession, callEnded, resetLine, openMenu, setBuf]);''',
    "onKey restore dependency",
)

PHONE.write_text(phone)

test = TEST.read_text()

test = replace_once(
    test,
    '''  test("exit confirmation option 1 currently restarts the Fortune Line", async () => {
    const { container } = await renderPhone();
    await lift(container);
    await enterFortuneResult(container);
    await press(container, "#");
    await press(container, "#");
    await press(container, "1");
    await flushPromises();
    expect(status(container)).toBe("SELECT VOICE");
    expectText(container, /FORTUNE TELLER|CHOOSE YOUR ORACLE/);
  });''',
    '''  test("exit confirmation option 1 restores the exact interrupted Fortune result", async () => {
    const { container } = await renderPhone();
    await lift(container);
    await enterFortuneResult(container);
    const resultText = text(container);
    const ttsCallsBeforeExit = mockApi.tts.mock.calls.length;
    await press(container, "#");
    await press(container, "#");
    expect(status(container)).toBe("END CALL?");
    await press(container, "1");
    await flushPromises();
    expect(status(container)).toBe("IN CALL");
    expect(text(container)).toBe(resultText);
    expect(mockApi.tts.mock.calls.length).toBeGreaterThan(ttsCallsBeforeExit + 1);
    expect(mockApi.rubyReading).toHaveBeenCalledTimes(1);
  });''',
    "update Continue characterization",
)

test = replace_once(
    test,
    '''  test.todo("Continue restores the interrupted state instead of restarting");''',
    '''  test("Continue restores interrupted mode, input, progress, and audio without restarting", async () => {
    const { container } = await renderPhone();
    await lift(container);
    await press(container, "1");
    await waitDialPause();
    await waitForFortuneMenu(container);
    await press(container, "1");
    await waitDialPause();

    const nameInput = await waitForTestId(container, "ruby-name-input");
    changeInput(nameInput, "Ava");
    const ttsCallsBeforeExit = mockApi.tts.mock.calls.length;

    await press(container, "#");
    await press(container, "#");
    expect(status(container)).toBe("END CALL?");
    await press(container, "1");
    await flushPromises();

    const restoredInput = await waitForTestId(container, "ruby-name-input");
    expect(status(container)).toBe("MADAME RUBY");
    expect(restoredInput.value).toBe("Ava");
    expect(mockApi.rubyReading).not.toHaveBeenCalled();
    expect(mockApi.tts.mock.calls.length).toBeGreaterThan(ttsCallsBeforeExit + 1);
  });''',
    "activate Continue regression",
)

TEST.write_text(test)
print("Applied Phase 1B round-three exact Continue restoration.")

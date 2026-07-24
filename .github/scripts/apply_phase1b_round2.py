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
    '''  const ringTimer = useRef(null);
  const digitTimer = useRef(null);
  const starTimer = useRef(null);''',
    '''  const ringTimer = useRef(null);
  const digitTimer = useRef(null);
  const starTimer = useRef(null);
  const goodbyeTimer = useRef(null);''',
    "goodbye timer ref",
)

phone = replace_once(
    phone,
    '''  const push = useCallback((role, text) => {
    setLines((prev) => [...prev, { role, text }]);
  }, []);

  const stopAudio = () => {''',
    '''  const push = useCallback((role, text) => {
    setLines((prev) => [...prev, { role, text }]);
  }, []);

  const clearSessionTimers = useCallback(() => {
    [ringTimer, digitTimer, starTimer, hashPending, goodbyeTimer].forEach((timerRef) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    });
  }, []);

  const stopAudio = () => {''',
    "session timer cleanup helper",
)

phone = replace_once(
    phone,
    '''  const resetLine = useCallback(() => {
    sessionGeneration.current += 1;
    clearTimeout(digitTimer.current);
    stopAudio();
    setModeSafe("onhook");
    setBuf("");
    setProgram(null);
    setQuestion("");
    setLines([]);
  }, [setBuf, setModeSafe]);''',
    '''  const resetLine = useCallback(() => {
    sessionGeneration.current += 1;
    clearSessionTimers();
    stopListening();
    stopAudio();
    incomingRef.current = false;
    incomingSched.current = null;
    setIncoming(false);
    setModeSafe("onhook");
    setBuf("");
    setMindlineInput("");
    setProgram(null);
    setQuestion("");
    setLines([]);
  }, [clearSessionTimers, setBuf, setModeSafe, stopListening]);''',
    "complete hang-up cleanup",
)

phone = replace_once(
    phone,
    '''  const micStart = useCallback(() => {
    if (listening) return;
    startListening(
      (text) => {
        if (holdTalkRef.current) holdTalkRef.current(text);
      },
      (err) => {
        if (err === "not-allowed" || err === "service-not-allowed" || err === "audio-capture") {
          setVoiceBlocked(true);
        }
      }
    );
  }, [listening, startListening]);''',
    '''  const micStart = useCallback(() => {
    if (listening) return;
    const generation = sessionGeneration.current;
    startListening(
      (text) => {
        if (generation !== sessionGeneration.current || modeRef.current === "onhook") return;
        if (holdTalkRef.current) holdTalkRef.current(text);
      },
      (err) => {
        if (generation !== sessionGeneration.current || modeRef.current === "onhook") return;
        if (err === "not-allowed" || err === "service-not-allowed" || err === "audio-capture") {
          setVoiceBlocked(true);
        }
      }
    );
  }, [listening, startListening]);''',
    "stale microphone callback guard",
)

phone = replace_once(
    phone,
    '''  const triggerScheduledRing = useCallback((sched) => {
    if (offHook || incomingRef.current) return;''',
    '''  const triggerScheduledRing = useCallback((sched) => {
    if (offHook || incomingRef.current) return;
    const generation = sessionGeneration.current;''',
    "ring timer generation capture",
)
phone = replace_once(
    phone,
    '''    ringTimer.current = setTimeout(async () => {
      setIncoming(false);''',
    '''    ringTimer.current = setTimeout(async () => {
      ringTimer.current = null;
      if (generation !== sessionGeneration.current) return;
      setIncoming(false);''',
    "ring timer invalidation",
)

phone = replace_once(
    phone,
    '''  const onKey = useCallback((d) => {
    if (!offHook || modeRef.current === "busy") return;
    playTone(d);
    clearTimeout(digitTimer.current);''',
    '''  const onKey = useCallback((d) => {
    if (!offHook || modeRef.current === "busy") return;
    const generation = sessionGeneration.current;
    playTone(d);
    clearTimeout(digitTimer.current);''',
    "key timer generation capture",
)

phone = replace_once(
    phone,
    '''      starTimer.current = setTimeout(() => {
        // No digits followed a lone ✱ -> fall back to the classic meaning
        if (bufferRef.current === "*") {''',
    '''      starTimer.current = setTimeout(() => {
        starTimer.current = null;
        if (generation !== sessionGeneration.current) return;
        // No digits followed a lone ✱ -> fall back to the classic meaning
        if (bufferRef.current === "*") {''',
    "star timer invalidation",
)

phone = replace_once(
    phone,
    '''      digitTimer.current = setTimeout(() => {
        const code = nb.slice(1);
        setBuf("");''',
    '''      digitTimer.current = setTimeout(() => {
        digitTimer.current = null;
        if (generation !== sessionGeneration.current) return;
        const code = nb.slice(1);
        setBuf("");''',
    "secret-code digit timer invalidation",
)

phone = replace_once(
    phone,
    '''      hashPending.current = setTimeout(() => {
        hashPending.current = null;
        if (modeRef.current === "result") chooseAnotherOracle();''',
    '''      hashPending.current = setTimeout(() => {
        hashPending.current = null;
        if (generation !== sessionGeneration.current) return;
        if (modeRef.current === "result") chooseAnotherOracle();''',
    "hash timer invalidation",
)

phone = replace_once(
    phone,
    '''    digitTimer.current = setTimeout(() => {
      setBuf("");
      processDial(nb);''',
    '''    digitTimer.current = setTimeout(() => {
      digitTimer.current = null;
      if (generation !== sessionGeneration.current) return;
      setBuf("");
      processDial(nb);''',
    "dial timer invalidation",
)

phone = replace_once(
    phone,
    '''    if (/\\b(good\\s?bye|hang up)\\b/i.test(text)) {
      dispatchDialBoxKey("#", "voice");
      setTimeout(() => dispatchDialBoxKey("#", "voice"), 130);
      return;
    }''',
    '''    if (/\\b(good\\s?bye|hang up)\\b/i.test(text)) {
      const generation = sessionGeneration.current;
      dispatchDialBoxKey("#", "voice");
      clearTimeout(goodbyeTimer.current);
      goodbyeTimer.current = setTimeout(() => {
        goodbyeTimer.current = null;
        if (generation !== sessionGeneration.current) return;
        dispatchDialBoxKey("#", "voice");
      }, 130);
      return;
    }''',
    "spoken-goodbye timer tracking",
)

phone = replace_once(
    phone,
    '''  useEffect(() => () => {
    clearTimeout(ringTimer.current);
    clearTimeout(digitTimer.current);
  }, []);''',
    '''  useEffect(() => () => {
    sessionGeneration.current += 1;
    clearSessionTimers();
    stopListening();
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch (e) {}
      audioRef.current.onended = null;
    }
  }, [clearSessionTimers, stopListening]);''',
    "unmount cleanup",
)

PHONE.write_text(phone)

test = TEST.read_text()

test = replace_once(
    test,
    '''  test.todo("microphone stops after hang-up");
  test.todo("every timer is cleared or invalidated");
  test.todo("stale callbacks from an old call cannot affect a new call");''',
    '''  test("microphone stops after hang-up", async () => {
    const { container } = await renderPhone();
    await lift(container);
    click(container, "hold-to-talk-btn");
    expect(mockSpeechControls.start).toHaveBeenCalledTimes(1);
    click(container, "hangup-btn");
    expect(mockSpeechControls.stop).toHaveBeenCalledTimes(1);
    expect(status(container)).toBe("ON HOOK");
  });

  test("every handset timer is cleared or invalidated on hang-up", async () => {
    const { container } = await renderPhone();
    await lift(container);
    const baselineTimers = jest.getTimerCount();

    await press(container, "1");
    expect(jest.getTimerCount()).toBeGreaterThan(baselineTimers);
    click(container, "hangup-btn");
    expect(jest.getTimerCount()).toBe(baselineTimers);
    await waitDialPause();
    expect(mockApi.dial).not.toHaveBeenCalled();

    await lift(container);
    await press(container, "*");
    expect(jest.getTimerCount()).toBeGreaterThan(baselineTimers);
    click(container, "hangup-btn");
    expect(jest.getTimerCount()).toBe(baselineTimers);
    await waitStarHold();
    expect(mockApi.getVoicemails).not.toHaveBeenCalled();
  });

  test("stale microphone callbacks from an old call cannot affect a new call", async () => {
    const { container } = await renderPhone();
    await lift(container);
    click(container, "hold-to-talk-btn");
    const oldCallback = mockSpeechControls.start.mock.calls[0][0];
    expect(typeof oldCallback).toBe("function");

    click(container, "hangup-btn");
    await lift(container);
    act(() => { oldCallback("1"); });
    await waitDialPause();

    expect(mockApi.dial).not.toHaveBeenCalled();
    expect(status(container)).toBe("DIAL TONE");
  });''',
    "Phase 1B round-two regression tests",
)

TEST.write_text(test)
print("Applied Phase 1B round-two microphone and timer cleanup.")

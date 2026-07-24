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
    '  const modeRef = useRef("onhook");\n  const lastSpoken = useRef(null);',
    '  const modeRef = useRef("onhook");\n  const sessionGeneration = useRef(0);\n  const lastSpoken = useRef(null);',
    "session generation ref",
)

phone = replace_once(
    phone,
    '''  const speak = useCallback(async (text, opts, onDone) => {
    try {
      setPlaying(true);
      const res = await api.tts(sayable(text), opts);
      const p = getPlayer();
      try { p.pause(); } catch (e) {}
      p.onended = null;
      p.muted = false;
      p.src = `data:audio/mp3;base64,${res.audio_base64}`;
      p.onended = () => {
        setPlaying(false);
        if (onDone) onDone();
      };
      await p.play();
    } catch (e) {
      setPlaying(false);
      // Rapid successive speak() calls (barge-in) abort the previous play() — benign, ignore.
      const name = e && e.name;
      if (name === "AbortError") return;
      push("error", "// audio channel unavailable");
      // Audio failed (blocked/unsupported) — still advance any chained step so flows never stall.
      if (onDone) onDone();
    }
  }, [push, getPlayer]);''',
    '''  const speak = useCallback(async (text, opts, onDone) => {
    const generation = sessionGeneration.current;
    try {
      setPlaying(true);
      const res = await api.tts(sayable(text), opts);
      if (generation !== sessionGeneration.current) return;
      const p = getPlayer();
      try { p.pause(); } catch (e) {}
      p.onended = null;
      p.muted = false;
      p.src = `data:audio/mp3;base64,${res.audio_base64}`;
      p.onended = () => {
        if (generation !== sessionGeneration.current) return;
        setPlaying(false);
        if (onDone) onDone();
      };
      await p.play();
    } catch (e) {
      if (generation !== sessionGeneration.current) return;
      setPlaying(false);
      // Rapid successive speak() calls (barge-in) abort the previous play() — benign, ignore.
      const name = e && e.name;
      if (name === "AbortError") return;
      push("error", "// audio channel unavailable");
      // Audio failed (blocked/unsupported) — still advance any chained step so flows never stall.
      if (onDone) onDone();
    }
  }, [push, getPlayer]);''',
    "TTS session guard",
)

phone = replace_once(
    phone,
    '''  const resetLine = useCallback(() => {
    clearTimeout(digitTimer.current);
    stopAudio();''',
    '''  const resetLine = useCallback(() => {
    sessionGeneration.current += 1;
    clearTimeout(digitTimer.current);
    stopAudio();''',
    "hang-up invalidation",
)

phone = replace_once(
    phone,
    '''  const openMenu = useCallback(async () => {
    playDialTone();''',
    '''  const openMenu = useCallback(async () => {
    const generation = sessionGeneration.current;
    playDialTone();''',
    "menu generation capture",
)
phone = replace_once(
    phone,
    '''      const menu = await api.getMenu();
      push("line", menu.greeting);''',
    '''      const menu = await api.getMenu();
      if (generation !== sessionGeneration.current) return;
      push("line", menu.greeting);''',
    "menu response guard",
)
phone = replace_once(
    phone,
    '''    } catch (e) {
      push("error", "// could not reach the DialBox Network");
    }
  }, [push, speak]);''',
    '''    } catch (e) {
      if (generation !== sessionGeneration.current) return;
      push("error", "// could not reach the DialBox Network");
    }
  }, [push, speak]);''',
    "menu error guard",
)

phone = replace_once(
    phone,
    '''  const loadFortunePersonas = useCallback(async (intro) => {
    try {''',
    '''  const loadFortunePersonas = useCallback(async (intro) => {
    const generation = sessionGeneration.current;
    try {''',
    "persona generation capture",
)
phone = replace_once(
    phone,
    '''      const ps = await api.getPersonas();
      const labeled = relabelForToday(ps);''',
    '''      const ps = await api.getPersonas();
      if (generation !== sessionGeneration.current) return;
      const labeled = relabelForToday(ps);''',
    "persona response guard",
)
phone = replace_once(
    phone,
    '''    } catch (e) {
      push("error", "// personas unavailable");
    }
  }, [push, speak]);''',
    '''    } catch (e) {
      if (generation !== sessionGeneration.current) return;
      push("error", "// personas unavailable");
    }
  }, [push, speak]);''',
    "persona error guard",
)

phone = replace_once(
    phone,
    '''  const generateFortune = useCallback(async (personaId) => {
    setModeSafe("busy");''',
    '''  const generateFortune = useCallback(async (personaId) => {
    const generation = sessionGeneration.current;
    setModeSafe("busy");''',
    "fortune generation capture",
)
phone = replace_once(
    phone,
    '''      const res = await api.fortune(personaId, question);
      const signOff = res.sign_off ? ` ${res.sign_off}` : "";''',
    '''      const res = await api.fortune(personaId, question);
      if (generation !== sessionGeneration.current) return;
      const signOff = res.sign_off ? ` ${res.sign_off}` : "";''',
    "fortune response guard",
)
phone = replace_once(
    phone,
    '''    } catch (e) {
      setModeSafe("result");
      if (isOutOfCredits(e)) {''',
    '''    } catch (e) {
      if (generation !== sessionGeneration.current) return;
      setModeSafe("result");
      if (isOutOfCredits(e)) {''',
    "fortune error guard",
)

phone = replace_once(
    phone,
    '''  const processDial = useCallback(async (digits) => {
    if (!digits) return;
    const curMode = modeRef.current;''',
    '''  const processDial = useCallback(async (digits) => {
    if (!digits) return;
    const generation = sessionGeneration.current;
    const curMode = modeRef.current;''',
    "dial generation capture",
)
phone = replace_once(
    phone,
    '''      const res = await api.dial(digits);
      if (res.type === "program" && res.interaction === "mindline") {''',
    '''      const res = await api.dial(digits);
      if (generation !== sessionGeneration.current) return;
      if (res.type === "program" && res.interaction === "mindline") {''',
    "dial response guard",
)
phone = replace_once(
    phone,
    '''    } catch (e) {
      setModeSafe("message");
      push("error", "// exchange error — try another number");''',
    '''    } catch (e) {
      if (generation !== sessionGeneration.current) return;
      setModeSafe("message");
      push("error", "// exchange error — try another number");''',
    "dial error guard",
)

PHONE.write_text(phone)

test = TEST.read_text()
test = replace_once(
    test,
    '''function currentAudio() {
  return mockAudioInstances[mockAudioInstances.length - 1] || null;
}

async function waitForCondition''',
    '''function currentAudio() {
  return mockAudioInstances[mockAudioInstances.length - 1] || null;
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function waitForCondition''',
    "deferred test helper",
)

test = replace_once(
    test,
    '''  test.todo("delayed TTS does not play after hang-up");
  test.todo("delayed API response cannot mutate state after hang-up");''',
    '''  test("delayed TTS does not play after hang-up", async () => {
    const delayedTts = createDeferred();
    mockApi.tts.mockReturnValueOnce(delayedTts.promise);
    const { container } = await renderPhone();
    click(container, "lift-handset-btn");
    await waitForCondition(
      () => mockApi.tts.mock.calls.length === 1,
      "delayed TTS request"
    );
    const player = currentAudio();
    const playCount = player.play.mock.calls.length;
    click(container, "hangup-btn");
    expect(status(container)).toBe("ON HOOK");
    await act(async () => {
      delayedTts.resolve({ audio_base64: "late-audio" });
      await Promise.resolve();
    });
    await flushPromises(10);
    expect(player.play).toHaveBeenCalledTimes(playCount);
    expect(player.src).not.toContain("late-audio");
  });

  test("delayed API response cannot mutate state after hang-up", async () => {
    const delayedDial = createDeferred();
    mockApi.dial.mockReturnValueOnce(delayedDial.promise);
    const { container } = await renderPhone();
    await lift(container);
    await press(container, "1");
    await waitDialPause();
    await waitForCondition(
      () => mockApi.dial.mock.calls.length === 1,
      "delayed dial request"
    );
    click(container, "hangup-btn");
    expect(status(container)).toBe("ON HOOK");
    await act(async () => {
      delayedDial.resolve({
        type: "secret",
        title: "Late Line",
        response_text: "This response arrived after hang-up.",
        voice: "nova",
      });
      await Promise.resolve();
    });
    await flushPromises(10);
    expect(status(container)).toBe("ON HOOK");
    expect(text(container)).not.toMatch(/Late Line|arrived after hang-up/);
  });''',
    "Phase 1B active regression tests",
)

TEST.write_text(test)
print("Applied Phase 1B round-one session invalidation and tests.")

from pathlib import Path

PHONE = Path("frontend/src/components/PhoneSimulator.jsx")


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f"Expected block not found: {label}")
    return text.replace(old, new, 1)


phone = PHONE.read_text()

phone = replace_once(
    phone,
    'import { useSpeechInput } from "../lib/useSpeechInput";\n',
    'import { useSpeechInput } from "../lib/useSpeechInput";\nimport { useDialBoxSessionLifecycle } from "../lib/useDialBoxSessionLifecycle";\n',
    "lifecycle hook import",
)

old_refs = '''  const audioRef = useRef(null);
  const ringTimer = useRef(null);
  const digitTimer = useRef(null);
  const starTimer = useRef(null);
  const goodbyeTimer = useRef(null);
  const bufferRef = useRef("");
  const modeRef = useRef("onhook");
  const sessionGeneration = useRef(0);
  const lastSpoken = useRef(null);
  const activeSpeech = useRef(null);
  const interruptedSession = useRef(null);
  const currentEgg = useRef(null);
  const currentLine = useRef(null);
  const hashPending = useRef(null);
  const incomingRef = useRef(false);
  const incomingSched = useRef(null);
'''

new_refs = '''  const {
    audioRef,
    ringTimer,
    digitTimer,
    starTimer,
    goodbyeTimer,
    bufferRef,
    modeRef,
    sessionGeneration,
    activeSpeech,
    interruptedSession,
    currentLine,
    hashPending,
    incomingRef,
    incomingSched,
    clearSessionTimers,
    stopAudio,
    resetLine,
  } = useDialBoxSessionLifecycle({
    stopListening,
    setPlaying,
    setIncoming,
    setModeSafe: (nextMode) => {
      modeRef.current = nextMode;
      setMode(nextMode);
    },
    setBuf: (nextBuffer) => {
      bufferRef.current = nextBuffer;
      setBuffer(nextBuffer);
    },
    setMindlineInput,
    setProgram,
    setQuestion,
    setLines,
  });
  const lastSpoken = useRef(null);
  const currentEgg = useRef(null);
'''
phone = replace_once(phone, old_refs, new_refs, "session refs extraction")

old_helpers = '''  const clearSessionTimers = useCallback(() => {
    [ringTimer, digitTimer, starTimer, hashPending, goodbyeTimer].forEach((timerRef) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    });
  }, []);

  const stopAudio = () => {
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch (e) {}
      audioRef.current.onended = null;
    }
    setPlaying(false);
  };

'''
phone = replace_once(phone, old_helpers, "", "timer and audio helpers")

old_reset = '''  const resetLine = useCallback(() => {
    sessionGeneration.current += 1;
    interruptedSession.current = null;
    activeSpeech.current = null;
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
  }, [clearSessionTimers, setBuf, setModeSafe, stopListening]);

'''
phone = replace_once(phone, old_reset, "", "physical reset extraction")

old_cleanup = '''  useEffect(() => () => {
    sessionGeneration.current += 1;
    clearSessionTimers();
    stopListening();
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch (e) {}
      audioRef.current.onended = null;
    }
  }, [clearSessionTimers, stopListening]);

'''
phone = replace_once(phone, old_cleanup, "", "unmount cleanup extraction")

PHONE.write_text(phone)
print("Applied Phase 1C round-one session lifecycle extraction.")

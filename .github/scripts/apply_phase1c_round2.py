from pathlib import Path

PHONE = Path("frontend/src/components/PhoneSimulator.jsx")


def replace_once(text, old, new, label):
    if new and new in text:
        return text
    if old not in text:
        raise SystemExit(f"Expected block not found: {label}")
    return text.replace(old, new, 1)


phone = PHONE.read_text()

phone = replace_once(
    phone,
    'import { useDialBoxSessionLifecycle } from "../lib/useDialBoxSessionLifecycle";\n',
    'import { useDialBoxSessionLifecycle } from "../lib/useDialBoxSessionLifecycle";\nimport { useDialBoxAudioSpeech } from "../lib/useDialBoxAudioSpeech";\n',
    "audio speech hook import",
)

phone = replace_once(
    phone,
    '  const lastSpoken = useRef(null);\n',
    '',
    "last spoken ref extraction",
)

push_block = '''  const push = useCallback((role, text) => {
    setLines((prev) => [...prev, { role, text }]);
  }, []);
'''

hook_block = '''  const push = useCallback((role, text) => {
    setLines((prev) => [...prev, { role, text }]);
  }, []);

  const {
    getPlayer,
    unlockAudio,
    speak,
    deliver,
    replayLast,
  } = useDialBoxAudioSpeech({
    audioRef,
    sessionGeneration,
    activeSpeech,
    setPlaying,
    push,
    tts: api.tts,
    sayable,
    resumeAudioCtx,
    silentClip: SILENT_CLIP,
    operatorVoice: OPERATOR_VOICE,
  });
'''
phone = replace_once(phone, push_block, hook_block, "audio speech hook setup")

old_audio = '''  // One persistent <audio> element, reused for every TTS clip. Unlocking it during a
  // user gesture (lift handset) keeps mobile/iOS playback working after async TTS fetches.
  const getPlayer = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }
    return audioRef.current;
  }, []);

  const unlockAudio = useCallback(() => {
    resumeAudioCtx();
    try {
      const p = getPlayer();
      p.muted = true;
      p.src = SILENT_CLIP;
      const pr = p.play();
      if (pr && pr.then) {
        pr.then(() => { try { p.pause(); } catch (e) {} p.muted = false; })
          .catch(() => { p.muted = false; });
      } else {
        p.muted = false;
      }
    } catch (e) {}
  }, [getPlayer]);

  const speak = useCallback(async (text, opts, onDone) => {
    const generation = sessionGeneration.current;
    const speech = { text, opts, onDone };
    activeSpeech.current = speech;
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
        if (activeSpeech.current === speech) activeSpeech.current = null;
        setPlaying(false);
        if (onDone) onDone();
      };
      await p.play();
    } catch (e) {
      if (generation !== sessionGeneration.current) return;
      if (activeSpeech.current === speech) activeSpeech.current = null;
      setPlaying(false);
      // Rapid successive speak() calls (barge-in) abort the previous play() — benign, ignore.
      const name = e && e.name;
      if (name === "AbortError") return;
      push("error", "// audio channel unavailable");
      // Audio failed (blocked/unsupported) — still advance any chained step so flows never stall.
      if (onDone) onDone();
    }
  }, [push, getPlayer]);

  // Speak a program/egg line, remember it for replay, then read the options prompt.
  const deliver = useCallback((text, opts, optionsText) => {
    lastSpoken.current = { text, opts, optionsText };
    speak(text, opts, () => {
      speak(
        optionsText ||
          "To hear that again, press star. To return to the main menu, dial 0. Or hang up to call again.",
        { voice: OPERATOR_VOICE }
      );
    });
  }, [speak]);

  const replayLast = useCallback(() => {
    if (!lastSpoken.current) return;
    push("system", "↺ replaying…");
    deliver(lastSpoken.current.text, lastSpoken.current.opts, lastSpoken.current.optionsText);
  }, [deliver, push]);

'''
phone = replace_once(phone, old_audio, '', "audio speech helpers extraction")

PHONE.write_text(phone)
print("Applied Phase 1C round-two audio and speech extraction.")

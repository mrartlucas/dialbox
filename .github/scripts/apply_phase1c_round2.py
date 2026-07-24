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

start_marker = "  // One persistent <audio> element, reused for every TTS clip."
end_marker = "  const openMenu = useCallback(async () => {"
if start_marker in phone:
    start = phone.index(start_marker)
    end = phone.index(end_marker, start)
    phone = phone[:start] + phone[end:]
elif "useDialBoxAudioSpeech({" not in phone:
    raise SystemExit("Expected audio helper markers were not found")

PHONE.write_text(phone)
print("Applied Phase 1C round-two audio and speech extraction.")

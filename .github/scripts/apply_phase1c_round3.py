from pathlib import Path

PHONE = Path("frontend/src/components/PhoneSimulator.jsx")

phone = PHONE.read_text()

import_old = 'import { useDialBoxAudioSpeech } from "../lib/useDialBoxAudioSpeech";\n'
import_new = import_old + 'import { useDialBoxKeypadControls } from "../lib/useDialBoxKeypadControls";\n'
if import_new not in phone:
    if import_old not in phone:
        raise SystemExit("Expected audio hook import was not found")
    phone = phone.replace(import_old, import_new, 1)

onkey_marker = '  const onKey = useCallback((d) => {\n'
if 'const { handleUniversalKey } = useDialBoxKeypadControls({' not in phone:
    if onkey_marker not in phone:
        raise SystemExit("Expected onKey marker was not found")
    hook_setup = '''  const { handleUniversalKey } = useDialBoxKeypadControls({
    bufferRef,
    modeRef,
    sessionGeneration,
    digitTimer,
    starTimer,
    hashPending,
    setBuf,
    stopAudio,
    processDial,
    playVoicemails,
    replayLast,
    triggerExitConfirm,
    generateNyxReading,
    nyxStars,
    submitCurrent,
    chooseAnotherOracle,
    push,
    playTone,
    replayModes: REPLAY_MODES,
    interDigitMs: INTER_DIGIT_MS,
    starHoldMs: STAR_HOLD_MS,
  });

'''
    phone = phone.replace(onkey_marker, hook_setup + onkey_marker, 1)

start_marker = '    const generation = sessionGeneration.current;\n'
end_marker = '    // Exit confirmation flow\n'
if start_marker in phone:
    start = phone.index(start_marker, phone.index(onkey_marker))
    end = phone.index(end_marker, start)
    replacement = '''    const m = modeRef.current;
    const inCall = m === "result" || m === "secret" || m === "message";
    const inMindline = m === "mindline_name" || m === "mindline_confirm" || m === "mindline_talk";
    const inMagic8 = m === "magic8_ask" || m === "magic8_answer";
    const inKnock = m === "kk_whos_there" || m === "kk_who" || m === "kk_done";
    const inAdventure = m === "adventure_play" || m === "adventure_end" || m === "adventure_select" || m === "adventure_ai_theme";
    const inRuby = m === "ruby_name" || m === "ruby_situation" || m === "ruby_style";
    const inCyndi = m === "cyndi_topic" || m === "cyndi_name" || m === "cyndi_question";
    const inZelda = m === "zelda_topic";
    const inNyx = m === "nyx_build";
    const inCount = m === "count_menu" || m === "count_category" || m === "count_number" || m === "count_magic" || m === "count_magic_menu" || m === "count_magic_37" || m === "count_magic_kaprekar";
    const inSphinx = m === "sphinx_menu" || m === "sphinx_gate" || m === "sphinx_riddle";
    const inTrivia = m === "trivia_play" || m === "trivia_end";
    const inExperience = inCall || inMindline || inMagic8 || inKnock || inAdventure || inRuby || inCyndi || inZelda || inNyx || inCount || inSphinx || inTrivia || m === "fortune_persona";

    if (handleUniversalKey(d, { mode: m, inExperience })) return;

'''
    phone = phone[:start] + replacement + phone[end:]
elif 'handleUniversalKey(d, { mode: m, inExperience })' not in phone:
    raise SystemExit("Expected universal keypad block was not found")

PHONE.write_text(phone)
print("Applied Phase 1C round-three universal keypad extraction.")

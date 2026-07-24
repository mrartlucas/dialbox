import { useCallback } from "react";

export function useDialBoxKeypadControls({
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
  replayModes,
  interDigitMs,
  starHoldMs,
  hashGraceMs = 650,
}) {
  const handleUniversalKey = useCallback((key, { mode, inExperience }) => {
    const generation = sessionGeneration.current;
    playTone(key);
    clearTimeout(digitTimer.current);

    // Secret-code dialing: star, digits, pound. This works from every mode.
    if (key === "#" && bufferRef.current.startsWith("*")) {
      clearTimeout(starTimer.current);
      clearTimeout(digitTimer.current);
      const code = bufferRef.current.slice(1);
      setBuf("");
      if (code) processDial(code);
      else playVoicemails();
      return true;
    }

    // A lone star retains its classic replay or voicemail meaning after the grace period.
    if (key === "*") {
      clearTimeout(starTimer.current);
      clearTimeout(digitTimer.current);
      stopAudio();
      const modeAtStar = mode;
      setBuf("*");
      starTimer.current = setTimeout(() => {
        starTimer.current = null;
        if (generation !== sessionGeneration.current) return;
        if (bufferRef.current === "*") {
          setBuf("");
          if (modeAtStar === "dialtone") playVoicemails();
          else if (replayModes.has(modeAtStar)) replayLast();
        }
      }, starHoldMs);
      return true;
    }

    // Digits following star form a secret code and auto-connect after a pause.
    if (bufferRef.current.startsWith("*") && /^[0-9]$/.test(key)) {
      clearTimeout(starTimer.current);
      clearTimeout(digitTimer.current);
      const nextBuffer = bufferRef.current.length < 14 ? bufferRef.current + key : bufferRef.current;
      setBuf(nextBuffer);
      digitTimer.current = setTimeout(() => {
        digitTimer.current = null;
        if (generation !== sessionGeneration.current) return;
        const code = nextBuffer.slice(1);
        setBuf("");
        if (code) processDial(code);
      }, interDigitMs);
      return true;
    }

    // Double pound is the universal exit. A lone pound waits briefly so every submit
    // mode has the same opportunity to receive the second pound.
    if (key === "#") {
      if (hashPending.current) {
        clearTimeout(hashPending.current);
        hashPending.current = null;
        if (inExperience) triggerExitConfirm();
        return true;
      }

      const modeAtHash = mode;
      hashPending.current = setTimeout(() => {
        hashPending.current = null;
        if (generation !== sessionGeneration.current || modeRef.current !== modeAtHash) return;
        if (modeAtHash === "nyx_build") {
          if (nyxStars.current.length >= 1) generateNyxReading(nyxStars.current.slice());
          else push("system", "Place at least one star (press 1-9), then press #.");
        } else if (["count_number", "count_magic", "count_magic_37", "count_magic_kaprekar", "sphinx_riddle"].includes(modeAtHash)) {
          submitCurrent();
        } else if (modeAtHash === "result") {
          chooseAnotherOracle();
        }
      }, hashGraceMs);
      return true;
    }

    // Main-menu and oracle-selection digits share the same buffered auto-dial behavior.
    // Keeping the session snapshot here prevents stale timers from dialing after hang-up.
    if (/^[0-9]$/.test(key) && (mode === "dialtone" || mode === "fortune_persona")) {
      stopAudio();
      const nextBuffer = bufferRef.current.length < 14 ? bufferRef.current + key : bufferRef.current;
      setBuf(nextBuffer);
      digitTimer.current = setTimeout(() => {
        digitTimer.current = null;
        if (generation !== sessionGeneration.current) return;
        setBuf("");
        processDial(nextBuffer);
      }, interDigitMs);
      return true;
    }

    return false;
  }, [
    bufferRef,
    chooseAnotherOracle,
    digitTimer,
    generateNyxReading,
    hashGraceMs,
    hashPending,
    interDigitMs,
    modeRef,
    nyxStars,
    playTone,
    playVoicemails,
    processDial,
    push,
    replayLast,
    replayModes,
    sessionGeneration,
    setBuf,
    starHoldMs,
    starTimer,
    stopAudio,
    submitCurrent,
    triggerExitConfirm,
  ]);

  return { handleUniversalKey };
}

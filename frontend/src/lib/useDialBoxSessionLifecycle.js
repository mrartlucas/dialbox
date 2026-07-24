import { useCallback, useEffect, useRef } from "react";

export function useDialBoxSessionLifecycle({
  stopListening,
  setPlaying,
  setIncoming,
  setModeSafe,
  setBuf,
  setMindlineInput,
  setProgram,
  setQuestion,
  setLines,
}) {
  const audioRef = useRef(null);
  const ringTimer = useRef(null);
  const digitTimer = useRef(null);
  const starTimer = useRef(null);
  const goodbyeTimer = useRef(null);
  const bufferRef = useRef("");
  const modeRef = useRef("onhook");
  const sessionGeneration = useRef(0);
  const activeSpeech = useRef(null);
  const interruptedSession = useRef(null);
  const currentLine = useRef(null);
  const hashPending = useRef(null);
  const incomingRef = useRef(false);
  const incomingSched = useRef(null);

  const clearSessionTimers = useCallback(() => {
    [ringTimer, digitTimer, starTimer, hashPending, goodbyeTimer].forEach((timerRef) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    });
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch (e) {}
      audioRef.current.onended = null;
    }
    setPlaying(false);
  }, [setPlaying]);

  const resetLine = useCallback(() => {
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
  }, [
    clearSessionTimers,
    setBuf,
    setIncoming,
    setLines,
    setMindlineInput,
    setModeSafe,
    setProgram,
    setQuestion,
    stopAudio,
    stopListening,
  ]);

  useEffect(() => () => {
    sessionGeneration.current += 1;
    clearSessionTimers();
    stopListening();
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch (e) {}
      audioRef.current.onended = null;
    }
  }, [clearSessionTimers, stopListening]);

  return {
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
  };
}

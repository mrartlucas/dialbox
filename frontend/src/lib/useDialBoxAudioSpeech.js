import { useCallback, useRef } from "react";

export function useDialBoxAudioSpeech({
  audioRef,
  sessionGeneration,
  activeSpeech,
  setPlaying,
  push,
  tts,
  sayable,
  resumeAudioCtx,
  silentClip,
  operatorVoice,
}) {
  const lastSpoken = useRef(null);

  const getPlayer = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }
    return audioRef.current;
  }, [audioRef]);

  const unlockAudio = useCallback(() => {
    resumeAudioCtx();
    try {
      const player = getPlayer();
      player.muted = true;
      player.src = silentClip;
      const playResult = player.play();
      if (playResult && playResult.then) {
        playResult
          .then(() => {
            try { player.pause(); } catch (error) {}
            player.muted = false;
          })
          .catch(() => { player.muted = false; });
      } else {
        player.muted = false;
      }
    } catch (error) {}
  }, [getPlayer, resumeAudioCtx, silentClip]);

  const speak = useCallback(async (text, opts, onDone) => {
    const generation = sessionGeneration.current;
    const speech = { text, opts, onDone };
    activeSpeech.current = speech;
    try {
      setPlaying(true);
      const result = await tts(sayable(text), opts);
      if (generation !== sessionGeneration.current) return;
      const player = getPlayer();
      try { player.pause(); } catch (error) {}
      player.onended = null;
      player.muted = false;
      player.src = `data:audio/mp3;base64,${result.audio_base64}`;
      player.onended = () => {
        if (generation !== sessionGeneration.current) return;
        if (activeSpeech.current === speech) activeSpeech.current = null;
        setPlaying(false);
        if (onDone) onDone();
      };
      await player.play();
    } catch (error) {
      if (generation !== sessionGeneration.current) return;
      if (activeSpeech.current === speech) activeSpeech.current = null;
      setPlaying(false);
      if (error && error.name === "AbortError") return;
      push("error", "// audio channel unavailable");
      if (onDone) onDone();
    }
  }, [activeSpeech, getPlayer, push, sayable, sessionGeneration, setPlaying, tts]);

  const deliver = useCallback((text, opts, optionsText) => {
    lastSpoken.current = { text, opts, optionsText };
    speak(text, opts, () => {
      speak(
        optionsText ||
          "To hear that again, press star. To return to the main menu, dial 0. Or hang up to call again.",
        { voice: operatorVoice }
      );
    });
  }, [operatorVoice, speak]);

  const replayLast = useCallback(() => {
    if (!lastSpoken.current) return;
    push("system", "↺ replaying…");
    deliver(lastSpoken.current.text, lastSpoken.current.opts, lastSpoken.current.optionsText);
  }, [deliver, push]);

  return {
    getPlayer,
    unlockAudio,
    speak,
    deliver,
    replayLast,
  };
}

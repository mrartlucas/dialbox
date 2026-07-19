import { useCallback, useRef, useState } from "react";

// Laptop/phone-mic voice input via the browser Web Speech API (Chrome/Edge, iOS Safari).
// Mode-agnostic: start(onResult, onError) begins listening and keeps the mic open
// (Chrome tends to end on the first silence, so we auto-restart while active); stop()
// ends the session and submits the accumulated transcript once. The UI decides whether
// start/stop is driven by hold (press & release) or tap (tap on / tap off).
// Returns { supported, listening, start(onResult, onError), stop() }.
export function useSpeechInput() {
  const SR =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);
  const supported = !!SR;
  const [listening, setListening] = useState(false);
  const activeRef = useRef(false);
  const finalRef = useRef("");
  const cbRef = useRef(null);
  const errRef = useRef(null);
  const recRef = useRef(null);

  const build = useCallback(() => {
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e) => {
      let f = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) f += e.results[i][0].transcript + " ";
      }
      if (f.trim()) finalRef.current = (finalRef.current + " " + f).trim();
    };
    rec.onerror = (e) => {
      if (errRef.current) errRef.current(e.error);
    };
    rec.onend = () => {
      // still active -> keep listening by starting a fresh recogniser
      if (activeRef.current) {
        const nr = build();
        recRef.current = nr;
        try {
          nr.start();
        } catch (e) {}
        return;
      }
      setListening(false);
      const text = (finalRef.current || "").trim();
      const cb = cbRef.current;
      cbRef.current = null;
      if (text && cb) cb(text);
    };
    return rec;
  }, [SR]);

  const start = useCallback(
    (onResult, onError) => {
      if (!SR || activeRef.current) return;
      activeRef.current = true;
      finalRef.current = "";
      cbRef.current = onResult;
      errRef.current = onError;
      setListening(true);
      const rec = build();
      recRef.current = rec;
      try {
        rec.start();
      } catch (e) {
        activeRef.current = false;
        setListening(false);
      }
    },
    [SR, build]
  );

  // Stop listening -> onend fires and submits the accumulated transcript.
  const stop = useCallback(() => {
    activeRef.current = false;
    try {
      if (recRef.current) recRef.current.stop();
    } catch (e) {}
  }, []);

  return { supported, listening, start, stop };
}

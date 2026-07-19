import { useCallback, useRef, useState } from "react";

// Push-to-talk laptop-mic input via the browser Web Speech API (Chrome/Edge).
// Hold to record (like a phone/walkie-talkie): recognition auto-restarts while the
// button is held (Chrome tends to end on the first silence), and the accumulated
// transcript is submitted once on release.
// Returns { supported, listening, listen(onResult), stop() }.
export function useSpeechInput() {
  const SR =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);
  const supported = !!SR;
  const [listening, setListening] = useState(false);
  const holdingRef = useRef(false);
  const finalRef = useRef("");
  const cbRef = useRef(null);
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
    rec.onerror = () => {};
    rec.onend = () => {
      // still held -> keep listening by starting a fresh recogniser
      if (holdingRef.current) {
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

  const listen = useCallback(
    (onResult) => {
      if (!SR || holdingRef.current) return;
      holdingRef.current = true;
      finalRef.current = "";
      cbRef.current = onResult;
      setListening(true);
      const rec = build();
      recRef.current = rec;
      try {
        rec.start();
      } catch (e) {
        holdingRef.current = false;
        setListening(false);
      }
    },
    [SR, build]
  );

  // Release the button -> stop holding -> onend fires and submits the transcript.
  const stop = useCallback(() => {
    holdingRef.current = false;
    try {
      if (recRef.current) recRef.current.stop();
    } catch (e) {}
  }, []);

  return { supported, listening, listen, stop };
}

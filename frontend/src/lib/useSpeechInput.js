import { useCallback, useRef, useState } from "react";

// Push-to-talk laptop-mic input via the browser Web Speech API (Chrome/Edge).
// Hold to record (like a real phone/walkie-talkie), release to submit.
// Returns { supported, listening, listen(onResult), stop() }.
export function useSpeechInput() {
  const SR =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);
  const supported = !!SR;
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const finalRef = useRef("");
  const onResultRef = useRef(null);

  const listen = useCallback(
    (onResult) => {
      if (!SR) return;
      try {
        const rec = new SR();
        rec.lang = "en-US";
        rec.interimResults = true;
        rec.continuous = true; // keep capturing while the button is held
        recRef.current = rec;
        finalRef.current = "";
        onResultRef.current = onResult;
        setListening(true);
        rec.onresult = (e) => {
          let finalText = "";
          for (let i = 0; i < e.results.length; i++) {
            if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
          }
          if (finalText) finalRef.current = finalText;
        };
        rec.onerror = () => setListening(false);
        rec.onend = () => {
          setListening(false);
          const text = (finalRef.current || "").trim();
          if (text && onResultRef.current) onResultRef.current(text);
        };
        rec.start();
      } catch (e) {
        setListening(false);
      }
    },
    [SR]
  );

  // Release the button -> stop recording -> onend fires and submits the result.
  const stop = useCallback(() => {
    try {
      if (recRef.current) recRef.current.stop();
    } catch (e) {}
  }, []);

  return { supported, listening, listen, stop };
}

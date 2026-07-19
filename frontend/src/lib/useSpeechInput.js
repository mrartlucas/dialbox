import { useCallback, useRef, useState } from "react";

// Laptop-mic voice input via the browser Web Speech API (Chrome/Edge).
// Returns { supported, listening, listen(onResult), stop() }.
export function useSpeechInput() {
  const SR =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);
  const supported = !!SR;
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  const listen = useCallback(
    (onResult) => {
      if (!SR) return;
      try {
        const rec = new SR();
        rec.lang = "en-US";
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        recRef.current = rec;
        setListening(true);
        rec.onresult = (e) => {
          const text = e.results?.[0]?.[0]?.transcript || "";
          if (text && onResult) onResult(text.trim());
        };
        rec.onerror = () => setListening(false);
        rec.onend = () => setListening(false);
        rec.start();
      } catch (e) {
        setListening(false);
      }
    },
    [SR]
  );

  const stop = useCallback(() => {
    try {
      if (recRef.current) recRef.current.stop();
    } catch (e) {}
    setListening(false);
  }, []);

  return { supported, listening, listen, stop };
}

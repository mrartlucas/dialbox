import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, PhoneOff, PhoneCall, Volume2, Bell } from "lucide-react";
import Keypad from "./Keypad";
import CrtConsole from "./CrtConsole";
import { api, playTone, playDialTone } from "../lib/phoneApi";

const STATUS = {
  onhook: "ON HOOK",
  dialtone: "DIAL TONE",
  fortune_persona: "SELECT VOICE",
  busy: "CONNECTING",
  result: "IN CALL",
  secret: "IN CALL",
  message: "IN CALL",
  incoming: "RINGING",
};

const INTER_DIGIT_MS = 1300;
const OPERATOR_VOICE = "nova"; // spoken IVR menu / operator prompts
const ORACLE_VOICE = "shimmer"; // spoken Fortune Teller intro

const oraclePrompt = (ps) =>
  "Welcome to the Fortune Teller. Choose your oracle. " +
  ps.map((p, i) => `For ${p.name}, dial ${i + 1}. `).join("");

export default function PhoneSimulator() {
  const [mode, setMode] = useState("onhook");
  const [buffer, setBuffer] = useState("");
  const [lines, setLines] = useState([]);
  const [program, setProgram] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [question, setQuestion] = useState("");
  const [messageLight, setMessageLight] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [incoming, setIncoming] = useState(false);

  const audioRef = useRef(null);
  const ringTimer = useRef(null);
  const digitTimer = useRef(null);
  const bufferRef = useRef("");
  const modeRef = useRef("onhook");

  const offHook = mode !== "onhook";

  const setBuf = useCallback((v) => {
    bufferRef.current = v;
    setBuffer(v);
  }, []);

  const setModeSafe = useCallback((m) => {
    modeRef.current = m;
    setMode(m);
  }, []);

  const push = useCallback((role, text) => {
    setLines((prev) => [...prev, { role, text }]);
  }, []);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(false);
  };

  const speak = useCallback(async (text, opts) => {
    try {
      setPlaying(true);
      const res = await api.tts(text, opts);
      stopAudio();
      const audio = new Audio(`data:audio/mp3;base64,${res.audio_base64}`);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      await audio.play();
    } catch (e) {
      setPlaying(false);
      push("error", "// audio channel unavailable");
    }
  }, [push]);

  const resetLine = useCallback(() => {
    clearTimeout(digitTimer.current);
    stopAudio();
    setModeSafe("onhook");
    setBuf("");
    setProgram(null);
    setQuestion("");
    setLines([]);
  }, [setBuf, setModeSafe]);

  const openMenu = useCallback(async () => {
    playDialTone();
    push("system", "*click* — the line opens.");
    try {
      const menu = await api.getMenu();
      push("line", menu.greeting);
      push("system", "── DIAL MENU ──");
      menu.items.forEach((it) => push("line", `  ${it.key}  ${it.name}`));
      push("line", `  ${menu.voicemail_key}  Voicemail`);
      push("system", "Dial a number to select. For a secret number, dial it then press \u2731 to confirm.");
      const spoken =
        `${menu.greeting} ` +
        menu.items.map((it) => `For ${it.name}, dial ${it.key}. `).join("") +
        "For voicemail, press star.";
      speak(spoken, { voice: OPERATOR_VOICE });
    } catch (e) {
      push("error", "// could not reach the exchange");
    }
  }, [push, speak]);

  const loadFortunePersonas = useCallback(async (intro) => {
    try {
      const ps = await api.getPersonas();
      setPersonas(ps);
      setProgram({ slug: "fortune", name: "Fortune Teller", has_personas: true });
      if (intro) push("program", intro);
      push("system", "── FORTUNE TELLER: CHOOSE YOUR ORACLE ──");
      ps.forEach((p, i) => push("line", `  ${i + 1}  ${p.name} — ${p.blurb}`));
      push("system", "Dial 1-4 to choose. (Optionally whisper a question below first.)");
      speak(oraclePrompt(ps), { voice: ORACLE_VOICE });
    } catch (e) {
      push("error", "// personas unavailable");
    }
  }, [push, speak]);

  const backToMenu = useCallback(() => {
    clearTimeout(digitTimer.current);
    stopAudio();
    setBuf("");
    setLines([]);
    setModeSafe("dialtone");
    openMenu();
  }, [openMenu, setBuf, setModeSafe]);

  const generateFortune = useCallback(async (personaId) => {
    setModeSafe("busy");
    push("system", "…the connection hums with energy…");
    try {
      const res = await api.fortune(personaId, question);
      push("program", `${res.persona_name}: ${res.text}`);
      setModeSafe("result");
      push("system", "Press \u2731 to return to the menu, or hang up.");
      speak(res.text, { persona: personaId });
    } catch (e) {
      setModeSafe("result");
      push("error", "// the oracle went silent (engine error)");
      push("system", "Press \u2731 to return to the menu, or hang up.");
    }
  }, [question, push, speak, setModeSafe]);

  const processDial = useCallback(async (digits) => {
    if (!digits) return;
    const curMode = modeRef.current;

    if (curMode === "fortune_persona") {
      const idx = parseInt(digits, 10) - 1;
      if (personas[idx]) {
        push("caller", `dialed ${digits} — ${personas[idx].name}`);
        generateFortune(personas[idx].id);
      } else {
        push("error", "// no such voice on this line");
      }
      return;
    }

    setModeSafe("busy");
    push("caller", `dialed ${digits}`);
    try {
      const res = await api.dial(digits);
      if (res.type === "program" && res.has_personas) {
        setModeSafe("fortune_persona");
        setPersonas(res.personas || []);
        setProgram(res);
        push("program", `Connecting to ${res.name}...`);
        push("system", "── CHOOSE YOUR ORACLE ──");
        (res.personas || []).forEach((p, i) => push("line", `  ${i + 1}  ${p.name} — ${p.blurb}`));
        push("system", "Dial 1-4 to choose. (Optionally whisper a question below first.)");
        speak(oraclePrompt(res.personas || []), { voice: ORACLE_VOICE });
      } else if (res.type === "secret") {
        setModeSafe("secret");
        push("program", `\u260e ${res.title}`);
        push("program", res.response_text);
        push("system", "Press \u2731 to return to the menu, or hang up.");
        speak(res.response_text, { voice: res.voice });
      } else if (res.type === "voicemail" || res.type === "coming_soon") {
        setModeSafe("message");
        push("program", res.message);
        push("system", "Press \u2731 to return to the menu, or hang up.");
        speak(res.message, { voice: OPERATOR_VOICE });
      } else {
        setModeSafe("message");
        push("error", res.message || "// not in service");
        push("system", "Press \u2731 to return to the menu, or hang up.");
        speak(res.message || "We're sorry. The number you have dialed is not in service.", { voice: OPERATOR_VOICE });
      }
    } catch (e) {
      setModeSafe("message");
      push("error", "// exchange error — try another number");
      push("system", "Press \u2731 to return to the menu, or hang up.");
    }
  }, [personas, generateFortune, push, speak, setModeSafe]);

  const lift = useCallback(() => {
    if (incoming) {
      clearTimeout(ringTimer.current);
      setIncoming(false);
      setMessageLight(false);
      setModeSafe("fortune_persona");
      setBuf("");
      setLines([]);
      push("program", "The Fortune Teller is calling YOU. The line was scheduled to ring.");
      loadFortunePersonas();
      return;
    }
    setModeSafe("dialtone");
    setBuf("");
    setLines([]);
    openMenu();
  }, [incoming, openMenu, push, loadFortunePersonas, setBuf, setModeSafe]);

  const onKey = useCallback((d) => {
    if (!offHook || modeRef.current === "busy") return;
    playTone(d);
    clearTimeout(digitTimer.current);

    if (d === "*") {
      const b = bufferRef.current;
      if (b) {
        // confirm a longer dialed number
        setBuf("");
        processDial(b);
      } else if (modeRef.current === "dialtone") {
        // straight to voicemail from the menu
        processDial("*");
      } else if (["result", "secret", "message"].includes(modeRef.current)) {
        backToMenu();
      }
      return;
    }

    // append digit; single menu selections auto-dial after a short pause
    const nb = bufferRef.current.length < 14 ? bufferRef.current + d : bufferRef.current;
    setBuf(nb);
    digitTimer.current = setTimeout(() => {
      setBuf("");
      processDial(nb);
    }, INTER_DIGIT_MS);
  }, [offHook, processDial, backToMenu, setBuf]);

  const simulateScheduledCall = useCallback(() => {
    if (offHook || incoming) return;
    setIncoming(true);
    setMessageLight(false);
    ringTimer.current = setTimeout(() => {
      setIncoming(false);
      setMessageLight(true);
      setModeSafe("onhook");
    }, 9000);
  }, [offHook, incoming, setModeSafe]);

  useEffect(() => () => {
    clearTimeout(ringTimer.current);
    clearTimeout(digitTimer.current);
  }, []);

  return (
    <div className="relative">
      <div className="relative rounded-md border-2 border-neutral-800 bg-gradient-to-b from-neutral-900 to-black p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        {/* Handset bar */}
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={incoming ? { rotate: [0, -8, 8, -6, 6, 0] } : {}}
              transition={incoming ? { repeat: Infinity, duration: 0.5 } : {}}
              className={`flex h-12 w-12 items-center justify-center rounded-sm border-2 ${
                offHook ? "border-[#39ff14] bg-[#39ff14]/10" : "border-neutral-700 bg-neutral-950"
              }`}
            >
              {offHook ? (
                <PhoneCall className="h-6 w-6 crt-glow" />
              ) : (
                <Phone className="h-6 w-6 text-neutral-500" />
              )}
            </motion.div>
            <div>
              <p className="font-mono text-lg font-bold tracking-tight">THE LINE</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                model no. 1 · revival
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1" data-testid="ringer-indicator">
              <Bell className={`h-4 w-4 ${incoming ? "text-[#ffb000] animate-pulse" : "text-neutral-700"}`} />
              <span className="font-mono text-[8px] uppercase tracking-widest text-neutral-600">Ring</span>
            </div>
            <div className="flex flex-col items-center gap-1" data-testid="message-light">
              <span
                className={`h-4 w-4 rounded-full border ${
                  messageLight
                    ? "border-red-500 bg-red-500 shadow-[0_0_10px_rgba(230,57,70,0.9)] animate-pulse"
                    : "border-neutral-700 bg-neutral-900"
                }`}
              />
              <span className="font-mono text-[8px] uppercase tracking-widest text-neutral-600">Msg</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Volume2 className={`h-4 w-4 ${playing ? "crt-glow" : "text-neutral-700"}`} />
              <span className="font-mono text-[8px] uppercase tracking-widest text-neutral-600">Spk</span>
            </div>
          </div>
        </div>

        {/* CRT console */}
        <div className="mb-5 h-64">
          <CrtConsole lines={lines} statusLabel={incoming ? STATUS.incoming : STATUS[mode]} />
        </div>

        {/* Dialed buffer */}
        <div className="mb-4 flex items-center justify-between rounded-sm border-2 border-neutral-800 bg-black px-4 py-2">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-600">Dialing</span>
          <span className="font-mono text-2xl amber-glow tracking-[0.3em] min-h-[2rem]" data-testid="dialed-buffer">
            {buffer || (offHook ? "…" : "")}
          </span>
        </div>

        {/* Optional question during fortune */}
        {mode === "fortune_persona" && (
          <input
            data-testid="fortune-question-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="whisper a question into the handset (optional)…"
            className="mb-4 w-full rounded-sm border-2 border-neutral-800 bg-black px-3 py-2 font-mono text-sm text-cyan-300 placeholder:text-neutral-700 focus:border-[#39ff14] focus:outline-none"
          />
        )}

        {/* Keypad */}
        <Keypad onPress={onKey} disabled={!offHook || mode === "busy"} />

        {/* Hint */}
        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">
          {offHook ? "dial a number · press \u2731 to confirm a longer number" : "lift the handset to open the line"}
        </p>

        {/* Hook control */}
        <div className="mt-3">
          {!offHook ? (
            <button
              data-testid="lift-handset-btn"
              onClick={lift}
              className={`tactile flex w-full items-center justify-center gap-2 rounded-sm border-2 border-[#39ff14] bg-[#39ff14]/15 py-4 font-mono text-sm font-bold uppercase tracking-widest crt-glow hover:bg-[#39ff14]/25 ${
                incoming ? "ringing" : ""
              }`}
            >
              <PhoneCall className="h-5 w-5" /> {incoming ? "Answer" : "Lift Handset"}
            </button>
          ) : (
            <button
              data-testid="hangup-btn"
              onClick={resetLine}
              className="tactile flex w-full items-center justify-center gap-2 rounded-sm border-2 border-red-600 bg-red-600/15 py-4 font-mono text-sm font-bold uppercase tracking-widest text-red-400 hover:bg-red-600/25"
            >
              <PhoneOff className="h-5 w-5" /> Hang Up
            </button>
          )}
        </div>

        {/* Scheduled-call simulator */}
        <button
          data-testid="simulate-call-btn"
          onClick={simulateScheduledCall}
          disabled={offHook || incoming}
          className="mt-3 w-full rounded-sm border border-neutral-800 bg-neutral-950 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500 hover:text-[#ffb000] disabled:opacity-40"
        >
          <Bell className="mr-2 inline h-3 w-3" /> Simulate scheduled call (a program rings you)
        </button>
      </div>
    </div>
  );
}

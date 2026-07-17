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

export default function PhoneSimulator({ onDataChanged }) {
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

  const offHook = mode !== "onhook";

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
    stopAudio();
    setMode("onhook");
    setBuffer("");
    setProgram(null);
    setQuestion("");
    setLines([]);
  }, []);

  const openMenu = useCallback(async () => {
    playDialTone();
    push("system", "*click* — the line opens.");
    try {
      const menu = await api.getMenu();
      push("line", menu.greeting);
      push("system", "── DIAL MENU ──");
      menu.items.forEach((it) => push("line", `  ${it.key}  ${it.name}`));
      push("line", `  ${menu.voicemail_key}  Voicemail`);
      push("system", "Dial a number, then press the green CALL key. (Try a secret number too.)");
    } catch (e) {
      push("error", "// could not reach the exchange");
    }
  }, [push]);

  const lift = useCallback(() => {
    if (incoming) {
      // answering an incoming scheduled call
      clearTimeout(ringTimer.current);
      setIncoming(false);
      setMessageLight(false);
      setMode("fortune_persona");
      setBuffer("");
      setLines([]);
      push("program", "The Fortune Teller is calling YOU. The line was scheduled to ring.");
      loadFortunePersonas("The Fortune Teller reaches through the receiver...");
      return;
    }
    setMode("dialtone");
    setBuffer("");
    setLines([]);
    openMenu();
  }, [incoming, openMenu, push]);

  const loadFortunePersonas = useCallback(async (intro) => {
    try {
      const ps = await api.getPersonas();
      setPersonas(ps);
      setProgram({ slug: "fortune", name: "Fortune Teller", has_personas: true });
      if (intro) push("program", intro);
      push("system", "── FORTUNE TELLER: CHOOSE YOUR ORACLE ──");
      ps.forEach((p, i) => push("line", `  ${i + 1}  ${p.name} — ${p.blurb}`));
      push("system", "Dial 1-4 + CALL. Optionally whisper a question below first.");
    } catch (e) {
      push("error", "// personas unavailable");
    }
  }, [push]);

  const generateFortune = useCallback(async (personaId) => {
    setMode("busy");
    push("system", "…the connection hums with energy…");
    try {
      const res = await api.fortune(personaId, question);
      push("program", `${res.persona_name}: ${res.text}`);
      setMode("result");
      push("system", "Press * to return to the menu, or hang up.");
      speak(res.text, { persona: personaId });
    } catch (e) {
      setMode("result");
      push("error", "// the oracle went silent (engine error)");
    }
  }, [question, push, speak]);

  const submit = useCallback(async () => {
    const digits = buffer;
    if (!digits) return;

    if (mode === "fortune_persona") {
      const idx = parseInt(digits, 10) - 1;
      setBuffer("");
      if (personas[idx]) {
        push("caller", `dialed ${digits} — ${personas[idx].name}`);
        generateFortune(personas[idx].id);
      } else {
        push("error", "// no such voice on this line");
      }
      return;
    }

    if (mode === "result" || mode === "secret" || mode === "message") {
      if (digits === "*") {
        setBuffer("");
        stopAudio();
        setMode("dialtone");
        setLines([]);
        openMenu();
        return;
      }
    }

    // default: dial routing from the menu
    setMode("busy");
    push("caller", `dialed ${digits}`);
    setBuffer("");
    try {
      const res = await api.dial(digits);
      if (res.type === "program" && res.has_personas) {
        setMode("fortune_persona");
        setPersonas(res.personas || []);
        setProgram(res);
        push("program", `Connecting to ${res.name}...`);
        push("system", "── CHOOSE YOUR ORACLE ──");
        (res.personas || []).forEach((p, i) => push("line", `  ${i + 1}  ${p.name} — ${p.blurb}`));
        push("system", "Dial 1-4 + CALL. Optionally whisper a question below first.");
      } else if (res.type === "secret") {
        setMode("secret");
        push("program", `☎ ${res.title}`);
        push("program", res.response_text);
        push("system", "Press * for the menu, or hang up.");
        speak(res.response_text, { voice: res.voice });
      } else if (res.type === "voicemail") {
        setMode("message");
        push("program", res.message);
        push("system", "Press * for the menu, or hang up.");
      } else if (res.type === "coming_soon") {
        setMode("message");
        push("program", res.message);
        push("system", "Press * for the menu, or hang up.");
      } else {
        setMode("message");
        push("error", res.message || "// not in service");
        push("system", "Press * for the menu, or hang up.");
      }
    } catch (e) {
      setMode("message");
      push("error", "// exchange error — try another number");
    }
  }, [buffer, mode, personas, generateFortune, openMenu, push, speak]);

  const onKey = useCallback((d) => {
    if (!offHook) return;
    playTone(d);
    if (d === "*" && (mode === "result" || mode === "secret" || mode === "message")) {
      setBuffer("*");
      setTimeout(() => submit(), 0);
      return;
    }
    if (d === "#") {
      submit();
      return;
    }
    setBuffer((b) => (b.length < 12 ? b + d : b));
  }, [offHook, mode, submit]);

  const simulateScheduledCall = useCallback(() => {
    if (offHook || incoming) return;
    setIncoming(true);
    setMessageLight(false);
    // If not answered in 9s -> voicemail + message light
    ringTimer.current = setTimeout(() => {
      setIncoming(false);
      setMessageLight(true);
      setMode("onhook");
    }, 9000);
  }, [offHook, incoming]);

  useEffect(() => () => clearTimeout(ringTimer.current), []);

  return (
    <div className="relative">
      {/* Phone body */}
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
          {/* Indicator lights */}
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

        {/* Call control bar */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {!offHook ? (
            <button
              data-testid="lift-handset-btn"
              onClick={lift}
              className={`tactile col-span-2 flex items-center justify-center gap-2 rounded-sm border-2 border-[#39ff14] bg-[#39ff14]/15 py-4 font-mono text-sm font-bold uppercase tracking-widest crt-glow hover:bg-[#39ff14]/25 ${
                incoming ? "ringing" : ""
              }`}
            >
              <PhoneCall className="h-5 w-5" /> {incoming ? "Answer" : "Lift Handset"}
            </button>
          ) : (
            <button
              data-testid="call-btn"
              onClick={submit}
              disabled={mode === "busy"}
              className="tactile col-span-2 flex items-center justify-center gap-2 rounded-sm border-2 border-[#39ff14] bg-[#39ff14]/15 py-4 font-mono text-sm font-bold uppercase tracking-widest crt-glow hover:bg-[#39ff14]/25 disabled:opacity-40"
            >
              <PhoneCall className="h-5 w-5" /> Call
            </button>
          )}
          <button
            data-testid="hangup-btn"
            onClick={resetLine}
            disabled={!offHook}
            className="tactile flex items-center justify-center gap-2 rounded-sm border-2 border-red-600 bg-red-600/15 py-4 font-mono text-sm font-bold uppercase tracking-widest text-red-400 hover:bg-red-600/25 disabled:opacity-30"
          >
            <PhoneOff className="h-5 w-5" /> Hang Up
          </button>
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

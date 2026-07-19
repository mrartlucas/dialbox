import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, PhoneOff, PhoneCall, Volume2, Bell } from "lucide-react";
import Keypad from "./Keypad";
import CrtConsole from "./CrtConsole";
import { api, playTone, playDialTone, playBeep } from "../lib/phoneApi";

const STATUS = {
  onhook: "ON HOOK",
  dialtone: "DIAL TONE",
  fortune_persona: "SELECT VOICE",
  busy: "CONNECTING",
  result: "IN CALL",
  secret: "IN CALL",
  message: "IN CALL",
  mindline_name: "MINDLINE",
  mindline_talk: "IN SESSION",
  incoming: "RINGING",
};

const INTER_DIGIT_MS = 1300;
const OPERATOR_VOICE = "nova"; // spoken IVR menu / operator prompts
const ORACLE_VOICE = "shimmer"; // spoken Fortune Caller intro

// Force correct TTS pronunciation for stylized names.
const sayable = (t) =>
  (t || "").replace(/Zartan/g, "Zar-tan").replace(/\bAZ\b/g, "Oz");

const oraclePrompt = (ps) =>
  "Welcome to the Fortune Caller. Choose your oracle. " +
  ps.map((p, i) => `For ${p.name}, dial ${i + 1}. `).join("") +
  "Or dial 0 to return to the main menu.";

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
  const [mindlineInput, setMindlineInput] = useState("");

  const audioRef = useRef(null);
  const ringTimer = useRef(null);
  const digitTimer = useRef(null);
  const bufferRef = useRef("");
  const modeRef = useRef("onhook");
  const lastSpoken = useRef(null);
  const currentEgg = useRef(null);
  const currentLine = useRef(null);
  const hashPending = useRef(null);
  const incomingRef = useRef(false);
  const incomingSched = useRef(null);

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

  const speak = useCallback(async (text, opts, onDone) => {
    try {
      setPlaying(true);
      const res = await api.tts(sayable(text), opts);
      stopAudio();
      const audio = new Audio(`data:audio/mp3;base64,${res.audio_base64}`);
      audioRef.current = audio;
      audio.onended = () => {
        setPlaying(false);
        if (onDone) onDone();
      };
      await audio.play();
    } catch (e) {
      setPlaying(false);
      push("error", "// audio channel unavailable");
    }
  }, [push]);

  // Speak a program/egg line, remember it for replay, then read the options prompt.
  const deliver = useCallback((text, opts, optionsText) => {
    lastSpoken.current = { text, opts, optionsText };
    speak(text, opts, () => {
      speak(
        optionsText ||
          "To hear that again, press star. To return to the main menu, dial 0. Or hang up to call again.",
        { voice: OPERATOR_VOICE }
      );
    });
  }, [speak]);

  const replayLast = useCallback(() => {
    if (!lastSpoken.current) return;
    push("system", "\u21ba replaying…");
    deliver(lastSpoken.current.text, lastSpoken.current.opts, lastSpoken.current.optionsText);
  }, [deliver, push]);

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
    currentEgg.current = null;
    push("system", "*click* — DialBox connects.");
    try {
      const menu = await api.getMenu();
      push("line", menu.greeting);
      push("system", "── DIALBOX NETWORK ──");
      menu.items.forEach((it) =>
        push("line", `  ${it.key}  ${it.name}${it.coming_soon ? "  (soon)" : ""} — ${it.description}`)
      );
      push("line", "  0  Repeat the menu");
      push("line", "  *  Voicemail");
      push("system", "Press a number to begin. Dial ✱ for voicemail, 0 to repeat.");
      speak(
        "Welcome to DialBox. Your direct line to fortunes, adventures, strange callers and more. " +
          "Press a number to get started. Press zero to repeat the menu.",
        { voice: OPERATOR_VOICE }
      );
    } catch (e) {
      push("error", "// could not reach the DialBox Network");
    }
  }, [push, speak]);

  const loadFortunePersonas = useCallback(async (intro) => {
    try {
      const ps = await api.getPersonas();
      setPersonas(ps);
      setProgram({ slug: "fortune", name: "Fortune Caller", has_personas: true });
      if (intro) push("program", intro);
      push("system", "── FORTUNE TELLER: CHOOSE YOUR ORACLE ──");
      ps.forEach((p, i) => push("line", `  ${i + 1}  ${p.name} — ${p.blurb}`));
      push("system", "Dial 1-9 to choose, or 0 to return to the main menu. (Optionally whisper a question below first.)");
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

  // ---------------- MindLine (Dr. Dialtone) ----------------
  const enterMindline = useCallback(async () => {
    currentLine.current = "therapy";
    setModeSafe("mindline_name");
    setMindlineInput("");
    try {
      const intro = await api.mindlineIntro();
      push("system", "── MINDLINE ──");
      push("program", `⚠ ${intro.disclaimer}`);
      push("program", intro.name_prompt);
      // Speak a short disclaimer (the full text stays on-screen) + the name prompt.
      speak(
        "MindLine is a comedy and entertainment experience. Doctor Dialtone is not a real doctor. " +
          "For entertainment only. " + intro.name_prompt,
        { voice: intro.voice }
      );
    } catch (e) {
      push("error", "// MindLine is offline");
    }
  }, [push, speak, setModeSafe]);

  const submitMindlineName = useCallback(async () => {
    const name = mindlineInput.trim();
    if (!name) return;
    setMindlineInput("");
    push("caller", name);
    push("system", "…connecting to Dr. Dialtone…");
    try {
      const g = await api.mindlineGreeting(name);
      push("program", `Dr. Dialtone: ${g.text}`);
      setModeSafe("mindline_talk");
      speak(g.text, { voice: g.voice }, () => playBeep());
    } catch (e) {
      push("error", `// Dr. Dialtone error: ${e?.message || e}`);
    }
  }, [mindlineInput, push, speak, setModeSafe]);

  const sendMindline = useCallback(async () => {
    const msg = mindlineInput.trim();
    if (!msg) return;
    if (/\b(goodbye|good bye|hang up)\b/i.test(msg)) {
      setMindlineInput("");
      triggerExitConfirm();
      return;
    }
    setMindlineInput("");
    push("caller", msg);
    try {
      const r = await api.mindlineReply(msg);
      push("program", `Dr. Dialtone: ${r.reply}`);
      speak(r.reply, { voice: r.voice });
    } catch (e) {
      push("error", "// Dr. Dialtone is buffering emotionally");
    }
  }, [mindlineInput, push, speak]);

  const leaveMindline = useCallback(async () => {
    try {
      const s = await api.mindlineSignoff();
      push("program", `Dr. Dialtone: ${s.text}`);
      speak(s.text, { voice: s.voice }, () => backToMenu());
    } catch (e) {
      backToMenu();
    }
  }, [push, speak, backToMenu]);

  // ---------------- Voicemail ----------------
  const refreshMessageLight = useCallback(async () => {
    try {
      const vms = await api.getVoicemails();
      setMessageLight(vms.some((v) => !v.heard));
    } catch (e) {}
  }, []);

  const playVoicemails = useCallback(async () => {
    setModeSafe("message");
    setLines([]);
    push("system", "── VOICEMAIL ──");
    try {
      const vms = await api.getVoicemails();
      const unheard = vms.filter((v) => !v.heard);
      const queue = unheard.length ? unheard : vms;
      if (!queue.length) {
        push("program", "You have no new messages. The message light is dark.");
        speak("You have no new messages.", { voice: OPERATOR_VOICE });
        setMessageLight(false);
        return;
      }
      push("program", `You have ${queue.length} message${queue.length > 1 ? "s" : ""}.`);
      let i = 0;
      const playNext = () => {
        if (i >= queue.length) {
          setMessageLight(false);
          push("system", "End of messages. Dial 0 for the main menu, or hang up.");
          return;
        }
        const vm = queue[i++];
        push("program", `☎ ${vm.from_name}: ${vm.text}`);
        api.markVoicemail(vm.id).catch(() => {});
        speak(vm.text, { voice: OPERATOR_VOICE }, playNext);
      };
      playNext();
    } catch (e) {
      push("error", "// voicemail unavailable");
    }
  }, [push, speak, setModeSafe]);

  // ---------------- Magic 8 Dial ----------------
  const enterMagic8 = useCallback(() => {
    currentLine.current = "magic8";
    setModeSafe("magic8_ask");
    setMindlineInput("");
    push("system", "── MAGIC 8 DIAL ──");
    push("program", "Ask one question. Then press 8.");
    speak("Ask one question. Then press eight.", { voice: "onyx" });
  }, [push, speak, setModeSafe]);

  const askMagic8 = useCallback(async () => {
    const q = mindlineInput.trim();
    setMindlineInput("");
    if (q) push("caller", q);
    setModeSafe("busy");
    try {
      const r = await api.magic8(q);
      push("program", `\ud83c\udfb1 ${r.answer}`);
      setModeSafe("magic8_answer");
      push("system", "Press 8 to ask again · \u2731 to hear it again · 0 for the main menu.");
      deliver(r.answer, { voice: r.voice },
        "Press eight to ask again. Press star to hear it again. Press zero for the main menu.");
    } catch (e) {
      setModeSafe("magic8_answer");
      push("error", "// the 8-ball is cloudy");
    }
  }, [mindlineInput, push, deliver, setModeSafe]);

  // ---------------- Universal exit system (## / Goodbye) ----------------
  const enterLine = useCallback((slug) => {
    if (slug === "fortune") {
      setModeSafe("fortune_persona");
      loadFortunePersonas();
    } else if (slug === "therapy") {
      enterMindline();
    } else if (slug === "magic8") {
      enterMagic8();
    } else {
      backToMenu();
    }
  }, [loadFortunePersonas, enterMindline, enterMagic8, backToMenu, setModeSafe]);

  const triggerExitConfirm = useCallback(() => {
    stopAudio();
    clearTimeout(digitTimer.current);
    setModeSafe("exit_confirm");
    push("system", "── END CALL? ──");
    push("program", "Are you sure you want to end this call? Press 1 to continue, press 2 to end.");
    speak("Are you sure you want to end this call? Press 1 to continue. Press 2 to end.",
      { voice: OPERATOR_VOICE });
  }, [push, speak, setModeSafe]);

  const callEnded = useCallback(() => {
    stopAudio();
    setModeSafe("call_ended");
    push("program", "Call ended.");
    push("system", "1 try again · 2 explore this Line · 3 the DialBox Network · 4 end session.");
    speak("Call ended. Press 1 to try this experience again. Press 2 to explore more from this Line. "
      + "Press 3 to return to the DialBox Network. Press 4 to end your DialBox session.",
      { voice: OPERATOR_VOICE });
  }, [push, speak, setModeSafe]);

  // ---------------- Scheduled incoming calls ----------------
  const triggerScheduledRing = useCallback((sched) => {
    if (offHook || incomingRef.current) return;
    incomingSched.current = sched;
    incomingRef.current = true;
    setIncoming(true);
    setMessageLight(false);
    ringTimer.current = setTimeout(async () => {
      setIncoming(false);
      incomingRef.current = false;
      try {
        await api.createVoicemail(sched.program_slug);
        if (sched.id) await api.scheduleFired(sched.id);
      } catch (e) {}
      setMessageLight(true);
      incomingSched.current = null;
    }, 9000);
  }, [offHook]);


  const generateFortune = useCallback(async (personaId) => {
    setModeSafe("busy");
    push("system", "…the connection hums with energy…");
    try {
      const res = await api.fortune(personaId, question);
      const signOff = res.sign_off ? ` ${res.sign_off}` : "";
      push("program", `${res.persona_name}: ${res.text}`);
      if (res.sign_off) push("program", res.sign_off);
      setModeSafe("result");
      push("system", "Press \u2731 to hear it again · # for another oracle · 0 for the main menu · or hang up.");
      deliver(
        `${res.text}${signOff}`,
        { persona: personaId },
        "To hear your fortune again, press star. To speak with another oracle, press pound. To return to the main menu, dial 0. Or hang up to call again."
      );
    } catch (e) {
      setModeSafe("result");
      push("error", "// the oracle went silent (engine error)");
      push("system", "To try again, press \u2731. Dial 0 for the main menu, or hang up.");
    }
  }, [question, push, deliver, setModeSafe]);

  const processDial = useCallback(async (digits) => {
    if (!digits) return;
    const curMode = modeRef.current;

    if (curMode === "fortune_persona") {
      const idx = parseInt(digits, 10) - 1;
      if (personas[idx]) {
        push("caller", `dialed ${digits} — ${personas[idx].name}`);
        generateFortune(personas[idx].slug);
      } else {
        push("error", "// no such voice on this line");
      }
      return;
    }

    setModeSafe("busy");
    push("caller", `dialed ${digits}`);
    try {
      const res = await api.dial(digits);
      if (res.type === "program" && res.interaction === "mindline") {
        push("program", `Connecting to ${res.name}...`);
        enterMindline();
      } else if (res.type === "program" && res.interaction === "magic8") {
        push("program", `Connecting to ${res.name}...`);
        enterMagic8();
      } else if (res.type === "program" && res.has_personas) {
        currentLine.current = "fortune";
        setModeSafe("fortune_persona");
        setPersonas(res.personas || []);
        setProgram(res);
        push("program", `Connecting to ${res.name}...`);
        push("system", "── CHOOSE YOUR ORACLE ──");
        (res.personas || []).forEach((p, i) => push("line", `  ${i + 1}  ${p.name} — ${p.blurb}`));
        push("system", "Dial 1-9 to choose, or 0 to return to the main menu. (Optionally whisper a question below first.)");
        speak(oraclePrompt(res.personas || []), { voice: ORACLE_VOICE });
      } else if (res.type === "secret") {
        setModeSafe("secret");
        currentEgg.current = res;
        push("program", `\u260e ${res.title}`);
        push("program", res.response_text);
        if (res.clue) push("system", `\u203b clue: ${res.clue}`);
        const hasBranches = res.branches && Object.keys(res.branches).length > 0;
        push(
          "system",
          (hasBranches ? "Dial a listed option · " : "") +
            "press \u2731 to hear it again · 0 for the main menu · or hang up."
        );
        const spoken = res.response_text + (res.clue ? ` ${res.clue}` : "");
        const opts = hasBranches
          ? "Dial one of the options you heard. To hear that again, press star. To return to the main menu, dial 0. Or hang up."
          : undefined;
        deliver(spoken, { voice: res.voice }, opts);
      } else if (res.type === "voicemail" || res.type === "coming_soon") {
        setModeSafe("message");
        push("program", res.message);
        push("system", "To hear that again, press \u2731. Dial 0 for the main menu, or hang up.");
        deliver(res.message, { voice: OPERATOR_VOICE });
      } else {
        setModeSafe("message");
        push("error", res.message || "// not in service");
        push("system", "To hear that again, press \u2731. Dial 0 for the main menu, or hang up.");
        deliver(res.message || "We're sorry. The number you have dialed is not in service.", { voice: OPERATOR_VOICE });
      }
    } catch (e) {
      setModeSafe("message");
      push("error", "// exchange error — try another number");
      push("system", "Dial 0 to return to the main menu, or hang up.");
    }
  }, [personas, generateFortune, push, speak, deliver, enterMindline, enterMagic8, setModeSafe]);

  const lift = useCallback(() => {
    if (incoming) {
      clearTimeout(ringTimer.current);
      setIncoming(false);
      incomingRef.current = false;
      setMessageLight(false);
      const sched = incomingSched.current;
      incomingSched.current = null;
      setBuf("");
      setLines([]);
      if (sched && sched.id) api.scheduleFired(sched.id).catch(() => {});
      const label = sched ? sched.program_name : "The Fortune Caller";
      push("program", `${label} is calling YOU. The line was scheduled to ring.`);
      if (sched && sched.interaction === "mindline") {
        enterMindline();
      } else {
        setModeSafe("fortune_persona");
        loadFortunePersonas();
      }
      return;
    }
    setModeSafe("dialtone");
    setBuf("");
    setLines([]);
    openMenu();
  }, [incoming, openMenu, push, loadFortunePersonas, enterMindline, setBuf, setModeSafe]);

  const chooseAnotherOracle = useCallback(() => {
    clearTimeout(digitTimer.current);
    stopAudio();
    setBuf("");
    setModeSafe("fortune_persona");
    push("system", "── CHOOSE ANOTHER ORACLE ──");
    personas.forEach((p, i) => push("line", `  ${i + 1}  ${p.name} — ${p.blurb}`));
    push("system", "Dial 1-9 to choose, or 0 to return to the main menu.");
    speak(oraclePrompt(personas), { voice: ORACLE_VOICE });
  }, [personas, push, speak, setBuf, setModeSafe]);

  const playBranch = useCallback((d) => {
    const egg = currentEgg.current;
    const branch = egg && egg.branches ? egg.branches[d] : null;
    if (!branch) return;
    push("caller", `dialed ${d}`);
    push("program", branch.text);
    push("system", "Press \u2731 to hear it again · 0 for the main menu · or hang up.");
    deliver(branch.text, { voice: branch.voice || egg.voice });
  }, [push, deliver]);

  const onKey = useCallback((d) => {
    if (!offHook || modeRef.current === "busy") return;
    playTone(d);
    clearTimeout(digitTimer.current);
    const m = modeRef.current;
    const inCall = m === "result" || m === "secret" || m === "message";
    const inMindline = m === "mindline_name" || m === "mindline_talk";
    const inMagic8 = m === "magic8_ask" || m === "magic8_answer";
    const inExperience = inCall || inMindline || inMagic8 || m === "fortune_persona";

    // ## (double pound) = universal exit; opens the End Call? confirmation.
    if (d === "#") {
      if (hashPending.current) {
        clearTimeout(hashPending.current);
        hashPending.current = null;
        if (inExperience) triggerExitConfirm();
        return;
      }
      hashPending.current = setTimeout(() => {
        hashPending.current = null;
        if (modeRef.current === "result") chooseAnotherOracle(); // single # = another oracle
      }, 650);
      return;
    }

    // Exit confirmation flow
    if (m === "exit_confirm") {
      if (d === "1") enterLine(currentLine.current);
      else if (d === "2") callEnded();
      return;
    }
    if (m === "call_ended") {
      if (d === "1") enterLine(currentLine.current);
      else if (d === "2") currentLine.current === "fortune" ? enterLine("fortune") : backToMenu();
      else if (d === "3") backToMenu();
      else if (d === "4") resetLine();
      return;
    }

    if (inMindline) {
      if (d === "0") leaveMindline(); // type into the on-screen input to talk; 0 ends the session
      return;
    }

    if (inMagic8) {
      if (d === "8") m === "magic8_ask" ? askMagic8() : enterMagic8();
      else if (d === "0") backToMenu();
      return;
    }

    if (d === "*") {
      const b = bufferRef.current;
      if (b) {
        setBuf("");
        processDial(b); // confirm a longer dialed number
      } else if (m === "dialtone") {
        playVoicemails(); // * from the menu = check voicemail
      } else if (inCall) {
        replayLast(); // hear it again
      }
      return;
    }

    if (d === "0" && !bufferRef.current) {
      if (m === "dialtone") openMenu(); // repeat the menu
      else if (inCall || m === "fortune_persona") backToMenu();
      return;
    }

    if (inCall) {
      // while a message/fortune is playing, digits only pick egg sub-menu options
      if (m === "secret" && currentEgg.current && currentEgg.current.branches) {
        playBranch(d);
      }
      return;
    }

    // dialtone or oracle-select: accumulate digits; single selections auto-dial after a pause
    stopAudio(); // barge-in: cut the current prompt the moment the caller dials
    const nb = bufferRef.current.length < 14 ? bufferRef.current + d : bufferRef.current;
    setBuf(nb);
    digitTimer.current = setTimeout(() => {
      setBuf("");
      processDial(nb);
    }, INTER_DIGIT_MS);
  }, [offHook, processDial, backToMenu, replayLast, chooseAnotherOracle, playBranch, playVoicemails, leaveMindline, askMagic8, enterMagic8, enterLine, triggerExitConfirm, callEnded, resetLine, openMenu, setBuf]);

  const simulateScheduledCall = useCallback(() => {
    triggerScheduledRing({
      program_slug: "fortune",
      program_name: "The Fortune Caller",
      interaction: "menu",
      has_personas: true,
      id: null,
    });
  }, [triggerScheduledRing]);

  // poll the backend for scheduled calls that are due in their window
  useEffect(() => {
    refreshMessageLight();
    const iv = setInterval(async () => {
      if (modeRef.current !== "onhook" || incomingRef.current) return;
      try {
        const due = await api.schedulesDue();
        if (due && due.length) triggerScheduledRing(due[0]);
      } catch (e) {}
    }, 20000);
    return () => clearInterval(iv);
  }, [refreshMessageLight, triggerScheduledRing]);

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
              <p className="font-mono text-lg font-bold tracking-tight">DIALBOX</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                model no. 1 · network
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

        {/* MindLine voice-input simulation (typed here; real device uses Whisper STT) */}
        {(mode === "mindline_name" || mode === "mindline_talk") && (
          <form
            className="mb-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              mode === "mindline_name" ? submitMindlineName() : sendMindline();
            }}
          >
            <input
              data-testid="mindline-input"
              value={mindlineInput}
              onChange={(e) => setMindlineInput(e.target.value)}
              placeholder={mode === "mindline_name" ? "state your name…" : "speak to Dr. Dialtone…"}
              className="flex-1 rounded-sm border-2 border-neutral-800 bg-black px-3 py-2 font-mono text-sm text-cyan-300 placeholder:text-neutral-700 focus:border-[#39ff14] focus:outline-none"
            />
            <button
              type="submit"
              data-testid="mindline-send-btn"
              className="tactile shrink-0 rounded-sm border-2 border-[#39ff14] bg-[#39ff14]/15 px-4 font-mono text-xs font-bold uppercase tracking-widest crt-glow"
            >
              Send
            </button>
          </form>
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

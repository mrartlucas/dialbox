import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, PhoneOff, PhoneCall, Volume2, Bell, Mic } from "lucide-react";
import Keypad from "./Keypad";
import CrtConsole from "./CrtConsole";
import { api, playTone, playDialTone, playBeep, playStartup, playParity, playReboot, playDisconnect, playWin, playLose, resumeAudioCtx, SILENT_CLIP } from "../lib/phoneApi";
import { useSpeechInput } from "../lib/useSpeechInput";

const STATUS = {
  onhook: "ON HOOK",
  dialtone: "DIAL TONE",
  fortune_persona: "SELECT VOICE",
  busy: "CONNECTING",
  result: "IN CALL",
  secret: "IN CALL",
  message: "IN CALL",
  mindline_name: "MINDLINE",
  mindline_confirm: "MINDLINE",
  mindline_talk: "IN SESSION",
  magic8_ask: "MAGIC 8",
  magic8_answer: "MAGIC 8",
  kk_whos_there: "KNOCK KNOCK",
  kk_who: "KNOCK KNOCK",
  kk_done: "KNOCK KNOCK",
  adventure_play: "ADVENTURE",
  adventure_end: "THE END",
  adventure_select: "PICK A TALE",
  adventure_ai_theme: "NEW TALE",
  exit_confirm: "END CALL?",
  call_ended: "CALL ENDED",
  incoming: "RINGING",
};

// Interactive text modes that show the input + mic (typed or spoken).
const INPUT_MODES = {
  mindline_name: { testid: "mindline-input", ph: "state your name…" },
  mindline_confirm: { testid: "mindline-input", ph: "say yes… or your name again" },
  mindline_talk: { testid: "mindline-input", ph: "speak to Dr. Dialtone…" },
  magic8_ask: { testid: "magic8-input", ph: "ask your question, then press 8…" },
  kk_whos_there: { testid: "knock-input", ph: "say “who's there?”…" },
  kk_who: { testid: "knock-input", ph: "say “… who?”…" },
  adventure_ai_theme: { testid: "adventure-theme-input", ph: "name a theme… (pirates, ghosts, dragons, anything)" },
};

// MindLine server phase -> simulator mode.
const PHASE_MODE = { await_name: "mindline_name", confirm: "mindline_confirm", talking: "mindline_talk" };

// Spoken word -> keypad key, so callers can say a number instead of pressing it (hands-free).
const WORD_TO_KEY = {
  zero: "0", oh: "0", one: "1", won: "1", two: "2", to: "2", too: "2", three: "3",
  four: "4", for: "4", five: "5", six: "6", seven: "7", eight: "8", ate: "8", nine: "9",
};
function parseVoiceCommand(text) {
  const low = (text || "").toLowerCase();
  const dm = low.match(/(\d)/);
  if (dm) return dm[1];
  if (/\b(star|asterisk)\b/.test(low)) return "*";
  if (/\b(pound|hash|hashtag)\b/.test(low)) return "#";
  if (/\b(menu|repeat)\b/.test(low)) return "0";
  if (/\bvoice ?mail\b/.test(low)) return "*";
  for (const w in WORD_TO_KEY) {
    if (new RegExp(`\\b${w}\\b`).test(low)) return WORD_TO_KEY[w];
  }
  return null;
}

// Voice/mic is blocked inside cross-origin iframes without allow="microphone",
// so detect the embedded-preview case and guide the user to open a standalone tab.
const IN_IFRAME = typeof window !== "undefined" && window.self !== window.top;

// iOS restricts the Web Speech API to Safari only; guide users off iOS Chrome/etc.
const UA = typeof navigator !== "undefined" ? navigator.userAgent : "";
const IS_IOS = /iP(hone|ad|od)/.test(UA) ||
  (/Macintosh/.test(UA) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1);
const IS_SAFARI = /^((?!chrome|android|crios|fxios|edgios|opios).)*safari/i.test(UA);
const IOS_NEEDS_SAFARI = IS_IOS && !IS_SAFARI;

const VOICE_MODE_KEY = "dialbox_voice_mode"; // "tap" | "hold"

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
  const [voiceBlocked, setVoiceBlocked] = useState(false);
  const [voiceMode, setVoiceMode] = useState(
    () => (typeof localStorage !== "undefined" && localStorage.getItem(VOICE_MODE_KEY)) || "tap"
  );
  const { supported: speechSupported, listening, start: startListening, stop: stopListening } = useSpeechInput();

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
  const kkJoke = useRef(null);
  const kkTold = useRef([]);
  const mlSession = useRef({ id: null, phase: null });
  const advSession = useRef({ id: null, node: null });
  const advStories = useRef([]);
  const holdTalkRef = useRef(null);

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
      try { audioRef.current.pause(); } catch (e) {}
      audioRef.current.onended = null;
    }
    setPlaying(false);
  };

  // One persistent <audio> element, reused for every TTS clip. Unlocking it during a
  // user gesture (lift handset) keeps mobile/iOS playback working after async TTS fetches.
  const getPlayer = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }
    return audioRef.current;
  }, []);

  const unlockAudio = useCallback(() => {
    resumeAudioCtx();
    try {
      const p = getPlayer();
      p.muted = true;
      p.src = SILENT_CLIP;
      const pr = p.play();
      if (pr && pr.then) {
        pr.then(() => { try { p.pause(); } catch (e) {} p.muted = false; })
          .catch(() => { p.muted = false; });
      } else {
        p.muted = false;
      }
    } catch (e) {}
  }, [getPlayer]);

  const speak = useCallback(async (text, opts, onDone) => {
    try {
      setPlaying(true);
      const res = await api.tts(sayable(text), opts);
      const p = getPlayer();
      try { p.pause(); } catch (e) {}
      p.onended = null;
      p.muted = false;
      p.src = `data:audio/mp3;base64,${res.audio_base64}`;
      p.onended = () => {
        setPlaying(false);
        if (onDone) onDone();
      };
      await p.play();
    } catch (e) {
      setPlaying(false);
      // Rapid successive speak() calls (barge-in) abort the previous play() — benign, ignore.
      const name = e && e.name;
      if (name === "AbortError") return;
      push("error", "// audio channel unavailable");
    }
  }, [push, getPlayer]);

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
      const available = menu.items.filter((it) => !it.coming_soon);
      const spokenMenu =
        menu.greeting +
        " " +
        available.map((it) => `For ${it.name}, press ${it.key}.`).join(" ") +
        " To check your voicemail, press star. To hear this menu again, press zero.";
      speak(spokenMenu, { voice: OPERATOR_VOICE });
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
  const playSfx = useCallback((name) => {
    if (name === "beep") playBeep();
    else if (name === "parity") playParity();
    else if (name === "reboot") playReboot();
    else if (name === "disconnect") playDisconnect();
    else if (name === "startup") playStartup();
    else if (name === "win") playWin();
    else if (name === "lose") playLose();
  }, []);

  const enterMindline = useCallback(async () => {
    currentLine.current = "therapy";
    setMindlineInput("");
    setModeSafe("busy");
    try {
      const r = await api.mindlineStart();
      mlSession.current = { id: r.session_id, phase: "await_name" };
      push("system", "── MINDLINE ──");
      push("program", `⚠ ${r.disclaimer}`);
      push("program", r.name_prompt);
      setModeSafe("mindline_name");
      playSfx("startup");
      speak(
        "MindLine is a comedy and entertainment experience. Doctor Dialtone is not a real doctor. " +
          "For entertainment only. " + r.name_prompt,
        { voice: r.voice }
      );
    } catch (e) {
      setModeSafe("mindline_name");
      push("error", "// MindLine is offline");
    }
  }, [push, speak, setModeSafe, playSfx]);

  // Universal MindLine turn: name entry, name confirmation, and live conversation.
  const mindlineSend = useCallback(async (explicit) => {
    const msg = (typeof explicit === "string" ? explicit : mindlineInput).trim();
    if (!msg) return;
    setMindlineInput("");
    if (msg !== "__silence__") push("caller", msg);
    const prevPhase = mlSession.current.phase;
    setModeSafe("busy");
    try {
      const r = await api.mindlineTurn(mlSession.current.id, msg);
      mlSession.current.phase = r.phase;
      if (r.sfx) playSfx(r.sfx);
      push("program", `Dr. Dialtone: ${r.text}`);
      if (!r.ended) setModeSafe(PHASE_MODE[r.phase] || "mindline_talk");
      const finish = async () => {
        if (prevPhase === "confirm" && r.phase === "talking") playBeep();
        if (r.event === "meltdown") {
          push("system", `💥 You broke Doctor Dialtone in ${r.score} turn${r.score === 1 ? "" : "s"}! Added to the Hall of Meltdowns.`);
          if (r.ended) {
            try {
              const board = await api.mindlineLeaderboard();
              push("system", "── HALL OF MELTDOWNS ──");
              board.slice(0, 5).forEach((b, i) =>
                push("line", `  ${i + 1}. ${b.name} — ${b.score} turns`));
            } catch (e) {}
          }
        }
        if (r.ended) {
          if (r.event === "meltdown") setTimeout(() => backToMenu(), 5000);
          else backToMenu();
        }
      };
      speak(r.text, { voice: r.voice }, () => {
        if (r.followup) {
          push("program", `Dr. Dialtone: ${r.followup}`);
          speak(r.followup, { voice: r.voice }, finish);
        } else {
          finish();
        }
      });
    } catch (e) {
      setModeSafe("mindline_talk");
      push("error", "// Dr. Dialtone is buffering emotionally");
    }
  }, [mindlineInput, push, speak, backToMenu, setModeSafe, playSfx]);

  // Silence timer: if the caller goes quiet in a MindLine session, Doctor Dialtone escalates.
  useEffect(() => {
    if (mode !== "mindline_talk") return undefined;
    const t = setTimeout(() => mindlineSend("__silence__"), 13000);
    return () => clearTimeout(t);
  }, [mode, mindlineSend]);

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

  const askMagic8 = useCallback(async (explicit) => {
    const q = (typeof explicit === "string" ? explicit : mindlineInput).trim();
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

  // ---------------- Knock Knock ----------------
  const enterKnockKnock = useCallback(async () => {
    if (currentLine.current !== "knockknock") kkTold.current = [];
    currentLine.current = "knockknock";
    setMindlineInput("");
    setModeSafe("busy");
    push("system", "── KNOCK KNOCK ──");
    try {
      const j = await api.knockknock(kkTold.current);
      kkJoke.current = j;
      if (j.name) kkTold.current = [...kkTold.current, j.name];
      setModeSafe("kk_whos_there");
      push("program", "Knock, knock.");
      speak("Knock, knock.", { voice: j.voice });
    } catch (e) {
      setModeSafe("kk_whos_there");
      push("error", "// nobody's home (engine error)");
    }
  }, [push, speak, setModeSafe]);

  const kkRespond = useCallback((explicit) => {
    const said = (typeof explicit === "string" ? explicit : mindlineInput).trim();
    setMindlineInput("");
    if (said) push("caller", said);
    const j = kkJoke.current;
    if (!j) return;
    setModeSafe("kk_who");
    push("program", `${j.name}.`);
    speak(`${j.name}.`, { voice: j.voice });
  }, [mindlineInput, push, speak, setModeSafe]);

  const kkReveal = useCallback((explicit) => {
    const said = (typeof explicit === "string" ? explicit : mindlineInput).trim();
    setMindlineInput("");
    if (said) push("caller", said);
    const j = kkJoke.current;
    if (!j) return;
    setModeSafe("kk_done");
    push("program", j.punchline);
    push("system", "Press 5 for another joke · 0 for the main menu · or hang up.");
    deliver(j.punchline, { voice: j.voice },
      "Press five for another joke. Press zero for the main menu.");
  }, [mindlineInput, push, deliver, setModeSafe]);

  // ---------------- Dial 4 Adventure ----------------
  const renderAdvNode = useCallback((node) => {
    advSession.current.node = node.node_id;
    push("program", node.text);
    if (node.inventory && node.inventory.length)
      push("system", `🎒 you carry: ${node.inventory.join(", ")}`);
    if (node.ended) {
      setModeSafe("adventure_end");
      playSfx(node.ending === "win" ? "win" : "lose");
      const tag = node.ending === "win" ? "VICTORY" : "THE END";
      const endOpts = "That is the end of this adventure. Press one to play it again, press two to choose another adventure, or press zero for the main menu.";
      push("system", `── ${tag} ── 1 play again · 2 choose another · 0 main menu · or hang up.`);
      lastSpoken.current = { text: node.text, opts: { voice: node.voice }, optionsText: endOpts };
      speak(node.text, { voice: node.voice }, () => speak(endOpts, { voice: OPERATOR_VOICE }));
      return;
    }
    (node.choices || []).forEach((c) => push("line", `  ${c.key}  ${c.label}`));
    push("system", "Press a number to choose · \u2731 to hear it again · 0 to leave.");
    setModeSafe("adventure_play");
    const choicesText = (node.choices || []).map((c) => `For ${c.label}, press ${c.key}.`).join(" ");
    const optionsText = choicesText + " Or press zero to leave the adventure.";
    lastSpoken.current = { text: node.text, opts: { voice: node.voice }, optionsText };
    speak(node.text, { voice: node.voice }, () => speak(optionsText, { voice: OPERATOR_VOICE }));
  }, [push, speak, setModeSafe, playSfx]);

  // Show the catalog of adventures to choose from.
  const enterAdventure = useCallback(async () => {
    currentLine.current = "adventure";
    setModeSafe("busy");
    push("system", "── DIAL 4 ADVENTURE ──");
    try {
      const stories = await api.adventureStories();
      const withAi = [...stories, { slug: "__ai__", title: "Endless Adventure — you name the theme" }];
      advStories.current = withAi;
      push("program", "Choose your adventure.");
      withAi.forEach((s, i) => push("line", `  ${i + 1}  ${s.title}`));
      push("system", "Press a number to begin · 0 to leave.");
      setModeSafe("adventure_select");
      const spoken =
        "Choose your adventure. " +
        withAi.map((s, i) => `For ${s.title}, press ${i + 1}.`).join(" ") +
        " Or press zero to leave.";
      lastSpoken.current = { text: "Choose your adventure.", opts: { voice: OPERATOR_VOICE }, optionsText: spoken };
      speak(spoken, { voice: OPERATOR_VOICE });
    } catch (e) {
      setModeSafe("message");
      push("error", "// the adventure catalog is down");
      push("system", "Dial 0 for the main menu, or hang up.");
    }
  }, [push, speak, setModeSafe]);

  const advStartStory = useCallback(async (slug) => {
    stopAudio();
    setModeSafe("busy");
    try {
      const r = await api.adventureStart(slug);
      advSession.current = { id: r.session_id, node: null, slug };
      push("program", `\u25b6 ${r.title}`);
      renderAdvNode(r.node);
    } catch (e) {
      setModeSafe("message");
      push("error", "// the adventure reel jammed");
      push("system", "Dial 0 for the main menu, or hang up.");
    }
  }, [push, renderAdvNode, setModeSafe]);

  const advChoose = useCallback(async (key) => {
    if (!advSession.current.id) return;
    stopAudio();
    setModeSafe("busy");
    push("caller", `chose ${key}`);
    try {
      const r = advSession.current.ai
        ? await api.adventureAiChoose(advSession.current.id, key)
        : await api.adventureChoose(advSession.current.id, key);
      if (r.error) {
        push("error", "// the signal was lost in the static");
        backToMenu();
        return;
      }
      renderAdvNode(r);
    } catch (e) {
      setModeSafe("adventure_play");
      push("error", "// static on the line — choose again");
    }
  }, [push, renderAdvNode, backToMenu, setModeSafe]);

  // Endless (AI) mode: caller names a theme, GPT spins a fresh branching tale.
  const enterAiTheme = useCallback(() => {
    setMindlineInput("");
    stopAudio();
    setModeSafe("adventure_ai_theme");
    push("system", "── ENDLESS ADVENTURE ──");
    push("program", "Name any theme — pirates, dinosaurs, space wizards, a spooky ghost story, anything at all — and I'll spin you a tale.");
    speak("Name any theme for your adventure. Anything you like — pirates, dragons, or a spooky ghost story. Then press send, or just say it.",
      { voice: OPERATOR_VOICE });
  }, [push, speak, setModeSafe]);

  const aiStartAdventure = useCallback(async (theme) => {
    const t = (typeof theme === "string" ? theme : mindlineInput).trim();
    setMindlineInput("");
    stopAudio();
    setModeSafe("busy");
    push("caller", `theme: ${t || "surprise me"}`);
    push("program", "✍ The storyteller is dreaming up your adventure…");
    speak("Wonderful. Give me a moment to write your tale.", { voice: OPERATOR_VOICE });
    try {
      const r = await api.adventureAiStart(t);
      advSession.current = { id: r.session_id, node: null, slug: "__ai__", ai: true };
      push("program", `\u25b6 ${r.title}`);
      renderAdvNode(r.node);
    } catch (e) {
      setModeSafe("message");
      push("error", "// the storyteller is unavailable right now");
      push("system", "Dial 0 for the main menu, or hang up.");
    }
  }, [mindlineInput, push, speak, renderAdvNode, setModeSafe]);

  const submitCurrent = useCallback((val) => {
    const m = modeRef.current;
    if (m === "mindline_name" || m === "mindline_confirm" || m === "mindline_talk") mindlineSend(val);
    else if (m === "magic8_ask") askMagic8(val);
    else if (m === "kk_whos_there") kkRespond(val);
    else if (m === "kk_who") kkReveal(val);
    else if (m === "adventure_ai_theme") aiStartAdventure(val);
  }, [mindlineSend, askMagic8, kkRespond, kkReveal, aiStartAdventure]);

  const micStart = useCallback(() => {
    if (listening) return;
    startListening(
      (text) => {
        if (holdTalkRef.current) holdTalkRef.current(text);
      },
      (err) => {
        if (err === "not-allowed" || err === "service-not-allowed" || err === "audio-capture") {
          setVoiceBlocked(true);
        }
      }
    );
  }, [listening, startListening]);

  const micStop = useCallback(() => {
    stopListening();
  }, [stopListening]);

  // Tap mode: tap once to start, tap again to stop & send.
  const micToggle = useCallback(() => {
    if (listening) stopListening();
    else micStart();
  }, [listening, stopListening, micStart]);

  const changeVoiceMode = useCallback((m) => {
    if (listening) stopListening();
    setVoiceMode(m);
    try {
      localStorage.setItem(VOICE_MODE_KEY, m);
    } catch (e) {}
  }, [listening, stopListening]);

  // Safety (hold mode only): releasing the mouse/finger anywhere stops recording.
  useEffect(() => {
    if (!listening || voiceMode !== "hold") return undefined;
    const up = () => micStop();
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
    };
  }, [listening, voiceMode, micStop]);

  // ---------------- Universal exit system (## / Goodbye) ----------------
  const enterLine = useCallback((slug) => {
    if (slug === "fortune") {
      setModeSafe("fortune_persona");
      loadFortunePersonas();
    } else if (slug === "therapy") {
      enterMindline();
    } else if (slug === "magic8") {
      enterMagic8();
    } else if (slug === "knockknock") {
      enterKnockKnock();
    } else if (slug === "adventure") {
      enterAdventure();
    } else {
      backToMenu();
    }
  }, [loadFortunePersonas, enterMindline, enterMagic8, enterKnockKnock, enterAdventure, backToMenu, setModeSafe]);

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
      } else if (res.type === "program" && res.interaction === "knockknock") {
        push("program", `Connecting to ${res.name}...`);
        enterKnockKnock();
      } else if (res.type === "program" && res.interaction === "adventure") {
        push("program", `Connecting to ${res.name}...`);
        enterAdventure();
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
  }, [personas, generateFortune, push, speak, deliver, enterMindline, enterMagic8, enterKnockKnock, setModeSafe]);

  const lift = useCallback(() => {
    unlockAudio(); // unlock mobile/iOS audio within this user gesture
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
      } else if (sched && sched.interaction === "knockknock") {
        enterKnockKnock();
      } else if (sched && sched.interaction === "magic8") {
        enterMagic8();
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
  }, [incoming, openMenu, push, loadFortunePersonas, enterMindline, enterKnockKnock, enterMagic8, setBuf, setModeSafe, unlockAudio]);

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
    const inMindline = m === "mindline_name" || m === "mindline_confirm" || m === "mindline_talk";
    const inMagic8 = m === "magic8_ask" || m === "magic8_answer";
    const inKnock = m === "kk_whos_there" || m === "kk_who" || m === "kk_done";
    const inAdventure = m === "adventure_play" || m === "adventure_end" || m === "adventure_select" || m === "adventure_ai_theme";
    const inExperience = inCall || inMindline || inMagic8 || inKnock || inAdventure || m === "fortune_persona";

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
      if (d === "0") backToMenu(); // type or use the mic to talk; 0 returns to the menu
      return;
    }

    if (inMagic8) {
      if (d === "8") m === "magic8_ask" ? askMagic8() : enterMagic8();
      else if (d === "0") backToMenu();
      return;
    }

    if (inKnock) {
      if (m === "kk_done" && d === "5") enterKnockKnock();
      else if (d === "0") backToMenu();
      return;
    }

    if (m === "adventure_select") {
      if (d === "0") backToMenu();
      else if (d === "*") replayLast();
      else {
        const idx = parseInt(d, 10) - 1;
        const s = advStories.current && advStories.current[idx];
        if (s && s.slug === "__ai__") enterAiTheme();
        else if (s) advStartStory(s.slug);
      }
      return;
    }
    if (m === "adventure_ai_theme") {
      if (d === "0") backToMenu();
      return;
    }
    if (m === "adventure_play") {
      if (d === "0") backToMenu();
      else if (d === "*") replayLast();
      else advChoose(d);
      return;
    }
    if (m === "adventure_end") {
      if (d === "1") advSession.current.ai ? enterAiTheme() : advStartStory(advSession.current.slug || "starfall");
      else if (d === "2") enterAdventure();
      else if (d === "*") replayLast();
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
  }, [offHook, processDial, backToMenu, replayLast, chooseAnotherOracle, playBranch, playVoicemails, askMagic8, enterMagic8, enterKnockKnock, advChoose, advStartStory, enterAdventure, enterAiTheme, enterLine, triggerExitConfirm, callEnded, resetLine, openMenu, setBuf]);

  // Route a spoken phrase by mode: content in text modes, a whispered question in
  // Fortune, or a dialed number/command everywhere else (hands-free operation).
  const handleHoldTalk = useCallback((text) => {
    const m = modeRef.current;
    if (INPUT_MODES[m]) {
      setMindlineInput(text);
      submitCurrent(text);
      return;
    }
    if (m === "fortune_persona") {
      const words = text.trim().split(/\s+/);
      const key = parseVoiceCommand(text);
      if (key && words.length <= 2) onKey(key);
      else setQuestion(text);
      return;
    }
    if (/\b(good\s?bye|hang up)\b/i.test(text)) {
      onKey("#");
      setTimeout(() => onKey("#"), 130);
      return;
    }
    const key = parseVoiceCommand(text);
    if (key) onKey(key);
  }, [submitCurrent, onKey]);
  holdTalkRef.current = handleHoldTalk;


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
            <div className="flex flex-col items-center gap-1" data-testid="rec-indicator">
              <span
                className={`h-4 w-4 rounded-full border ${
                  listening
                    ? "border-red-500 bg-red-500 shadow-[0_0_10px_rgba(230,57,70,0.9)] animate-pulse"
                    : "border-neutral-700 bg-neutral-900"
                }`}
              />
              <span className={`font-mono text-[8px] uppercase tracking-widest ${listening ? "text-red-400" : "text-neutral-600"}`}>
                Rec
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Volume2 className={`h-4 w-4 ${playing ? "crt-glow" : "text-neutral-700"}`} />
              <span className="font-mono text-[8px] uppercase tracking-widest text-neutral-600">Spk</span>
            </div>
          </div>
        </div>

        {/* Hook control — lift / hang up, kept up top for quick access */}
        <div className="mb-4">
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

        {/* Interactive input — typed or spoken (Web Speech API mic). MindLine, Magic 8, Knock Knock. */}
        {INPUT_MODES[mode] && (
          <form
            className="mb-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submitCurrent();
            }}
          >
            <input
              data-testid={INPUT_MODES[mode].testid}
              value={mindlineInput}
              onChange={(e) => setMindlineInput(e.target.value)}
              placeholder={INPUT_MODES[mode].ph}
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

        {/* Global voice input — tap-to-talk or hold-to-talk (hands-free); mode is switchable */}
        {speechSupported && (
          <div className="mt-3">
            <button
              type="button"
              data-testid="hold-to-talk-btn"
              onMouseDown={voiceMode === "hold" ? (e) => { e.preventDefault(); micStart(); } : undefined}
              onMouseUp={voiceMode === "hold" ? micStop : undefined}
              onTouchStart={voiceMode === "hold" ? (e) => { e.preventDefault(); micStart(); } : undefined}
              onTouchEnd={voiceMode === "hold" ? (e) => { e.preventDefault(); micStop(); } : undefined}
              onClick={voiceMode === "tap" ? micToggle : undefined}
              disabled={!offHook || mode === "busy"}
              title={voiceMode === "tap"
                ? "Tap to talk — say a number to dial, or speak your answer; tap again to send"
                : "Hold to talk — say a number to dial, or speak your answer"}
              className={`tactile flex w-full select-none items-center justify-center gap-2 rounded-sm border-2 py-3 font-mono text-xs font-bold uppercase tracking-widest disabled:opacity-40 ${
                listening
                  ? "border-red-500 bg-red-500/15 text-red-400 animate-pulse"
                  : "border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-[#39ff14] hover:text-[#39ff14]"
              }`}
            >
              <Mic className="h-4 w-4" />{" "}
              {listening
                ? (voiceMode === "tap" ? "Listening… tap to send" : "Listening… release to send")
                : (voiceMode === "tap" ? "Tap to Talk" : "Hold to Talk")}
            </button>

            {/* Voice-mode switch */}
            <div className="mt-2 flex items-center justify-center gap-2 font-mono text-[9px] uppercase tracking-widest text-neutral-500">
              <span>voice mode:</span>
              <button
                type="button"
                data-testid="voice-mode-tap-btn"
                onClick={() => changeVoiceMode("tap")}
                className={`rounded-sm border px-2 py-0.5 ${
                  voiceMode === "tap"
                    ? "border-[#39ff14] bg-[#39ff14]/15 text-[#39ff14]"
                    : "border-neutral-800 text-neutral-500 hover:text-neutral-300"
                }`}
              >
                Tap
              </button>
              <button
                type="button"
                data-testid="voice-mode-hold-btn"
                onClick={() => changeVoiceMode("hold")}
                className={`rounded-sm border px-2 py-0.5 ${
                  voiceMode === "hold"
                    ? "border-[#39ff14] bg-[#39ff14]/15 text-[#39ff14]"
                    : "border-neutral-800 text-neutral-500 hover:text-neutral-300"
                }`}
              >
                Hold
              </button>
            </div>
          </div>
        )}

        {/* iOS: Web Speech only works in Safari */}
        {IOS_NEEDS_SAFARI && offHook && (
          <div
            data-testid="ios-safari-hint"
            className="mt-2 block rounded-sm border border-[#ffb000]/40 bg-[#ffb000]/10 px-2 py-1.5 text-center font-mono text-[10px] uppercase leading-relaxed tracking-widest text-[#ffb000]"
          >
            🎤 on iPhone, voice works in Safari only — open DialBox in Safari. Keypad & typing work anywhere.
          </div>
        )}

        {/* Hint */}
        {(IN_IFRAME || voiceBlocked) && speechSupported && offHook && (
          <a
            href={typeof window !== "undefined" ? window.location.href : "#"}
            target="_blank"
            rel="noreferrer"
            data-testid="voice-tab-hint"
            className="mt-2 block rounded-sm border border-[#ffb000]/40 bg-[#ffb000]/10 px-2 py-1.5 text-center font-mono text-[10px] uppercase leading-relaxed tracking-widest text-[#ffb000] hover:bg-[#ffb000]/20"
          >
            🎤 voice is blocked in the embedded preview — tap to open DialBox in its own tab ↗
          </a>
        )}

        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">
          {offHook ? "dial or use Talk to say a number · \u2731 confirms a longer number" : "lift the handset to open the line"}
        </p>

        {/* Line Monitor (CRT) — below the controls so you never scroll up to dial */}
        <div className="mt-4 h-64">
          <CrtConsole lines={lines} statusLabel={incoming ? STATUS.incoming : STATUS[mode]} />
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

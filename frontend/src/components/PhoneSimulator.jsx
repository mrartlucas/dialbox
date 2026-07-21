import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, PhoneOff, PhoneCall, Volume2, Bell, Mic } from "lucide-react";
import Keypad from "./Keypad";
import CrtConsole from "./CrtConsole";
import { api, playTone, playDialTone, playBeep, playStartup, playParity, playReboot, playDisconnect, playWin, playLose, resumeAudioCtx, SILENT_CLIP, isOutOfCredits } from "../lib/phoneApi";
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
  ruby_name: "MADAME RUBY",
  ruby_situation: "MADAME RUBY",
  ruby_style: "MADAME RUBY",
  cyndi_topic: "CYNDI & LOUISE",
  cyndi_name: "CYNDI & LOUISE",
  cyndi_question: "CYNDI & LOUISE",
  zelda_topic: "ZELDA",
  nyx_build: "NYX · STARS",
  count_menu: "COUNT",
  count_category: "COUNT",
  count_number: "COUNT",
  count_magic: "MATHEMAGIC",
  count_magic_menu: "MATHEMAGIC",
  count_magic_37: "MATHEMAGIC",
  count_magic_kaprekar: "MATHEMAGIC",
  sphinx_menu: "THE SPHINX",
  sphinx_gate: "THE GATES",
  sphinx_riddle: "CHALLENGE",
  trivia_play: "TRIVIA",
  trivia_end: "GAME OVER",
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
  ruby_name: { testid: "ruby-name-input", ph: "your first name…" },
  ruby_situation: { testid: "ruby-situation-input", ph: "what do you seek guidance on?…" },
  cyndi_name: { testid: "cyndi-name-input", ph: "your first name…" },
  cyndi_question: { testid: "cyndi-question-input", ph: "what's going on? ask one thing…" },
  count_number: { testid: "count-number-input", ph: "enter a number (birth year, a date…) then Send or #" },
  count_magic: { testid: "count-magic-input", ph: "enter your final answer, then Send or #" },
  count_magic_37: { testid: "count-magic-input", ph: "enter your result, then Send or #" },
  count_magic_kaprekar: { testid: "count-magic-input", ph: "enter any 4-digit number, then Send or #" },
  sphinx_riddle: { testid: "sphinx-riddle-input", ph: "speak or type your answer, then Send" },
};

// Cyndi & Louise topic menu — keypad 1-9 map to these (Fortune Caller Oracle Bible).
const CYNDI_TOPICS = [
  "Love", "Money", "Career", "Family", "Friendship",
  "Health and Well-Being", "The Future", "Difficult Decisions", "General Reading",
];

// Zelda the All-Knowing crystal-vision topic menu — keypad 1-9.
const ZELDA_TOPICS = [
  "Love", "Money", "Career", "Family", "Friendship",
  "Secrets", "Upcoming Event", "Difficult Decision", "General Future",
];

// Nyx of the Nine Stars — each keypad digit 1-9 is a star with a meaning (build a constellation).
const NYX_STARS = [
  "Origin", "Bond", "Voice", "Foundation", "Crossroads",
  "Desire", "Shadow", "Power", "Becoming",
];

// Count Clairvoyant number-reading categories — keypad 1-9.
const COUNT_CATEGORIES = [
  "Love", "Money", "Career", "Family", "Friendship",
  "Lucky Numbers", "Important Dates", "Difficult Decisions", "General",
];
const MATHEMAGIC_ANSWER = "1089";

// The Sphinx — Three Gates (symbolic choices, keys 1-4) + a curated riddle bank for the Challenge.
const SPHINX_GATES = [
  { key: "mind", title: "The Gate of Mind", prompt: "What do you carry into the dark?",
    choices: ["a Lantern", "a Map", "a Key", "a Blade"] },
  { key: "heart", title: "The Gate of Heart", prompt: "Which sound stops you where you stand?",
    choices: ["a distant Bell", "a Whisper", "sudden Laughter", "utter Silence"] },
  { key: "path", title: "The Gate of Path", prompt: "At the fork, which way?",
    choices: ["the Climbing Road", "the River", "the Tunnel", "to wait for Dawn"] },
];
const SPHINX_RIDDLES = [
  { q: "What must be broken before you can use it?", a: ["egg"] },
  { q: "I am tall when I am young, and short when I am old. What am I?", a: ["candle"] },
  { q: "What has hands, but cannot clap?", a: ["clock", "watch"] },
  { q: "What has a neck but no head?", a: ["bottle", "shirt"] },
  { q: "What gets wetter the more it dries?", a: ["towel"] },
  { q: "What has keys but opens no locks?", a: ["piano", "keyboard", "map"] },
  { q: "The more you take, the more you leave behind. What am I?", a: ["footstep", "step", "footprint"] },
  { q: "What has an eye but cannot see?", a: ["needle", "storm", "hurricane"] },
];

// Kaprekar's routine: any 4-digit number (with 2+ distinct digits) collapses to 6174.
function kaprekarSteps(numStr) {
  let cur = (numStr || "").replace(/\D/g, "").slice(0, 4).padStart(4, "0");
  const steps = [];
  let guard = 0;
  while (cur !== "6174" && guard < 12) {
    const ds = cur.split("").sort();
    const asc = ds.join("");
    const desc = ds.slice().reverse().join("");
    const diff = parseInt(desc, 10) - parseInt(asc, 10);
    if (diff === 0) return { steps, landed: "0000" };
    const diffStr = String(diff).padStart(4, "0");
    steps.push(`${desc} − ${asc} = ${diffStr}`);
    cur = diffStr;
    guard++;
  }
  return { steps, landed: cur };
}
function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Every Tuesday the Master rests and Spirit Taco takes key 5 (caller's local day).
const IS_TUESDAY = new Date().getDay() === 2;
function relabelForToday(list) {
  if (!IS_TUESDAY) return list || [];
  return (list || []).map((p) =>
    p.slug === "goy"
      ? { ...p, name: "Spirit Taco", blurb: "Tuesday's traveling food psychic — the Master is resting" }
      : p
  );
}

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
const STAR_HOLD_MS = 850; // grace period after a lone ✱ before it means replay/voicemail
// Modes where a lone ✱ (no digits after) means "hear it again".
const REPLAY_MODES = new Set([
  "result", "secret", "message", "magic8_answer", "kk_done",
  "adventure_play", "adventure_end", "adventure_select", "trivia_play", "trivia_end",
]);
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
  const mindlineInputRef = useRef("");
  useEffect(() => { mindlineInputRef.current = mindlineInput; }, [mindlineInput]);
  const [voiceBlocked, setVoiceBlocked] = useState(false);
  const [creditsOut, setCreditsOut] = useState(false);
  useEffect(() => {
    const h = () => setCreditsOut(true);
    window.addEventListener("dialbox-out-of-credits", h);
    return () => window.removeEventListener("dialbox-out-of-credits", h);
  }, []);
  const [voiceMode, setVoiceMode] = useState(
    () => (typeof localStorage !== "undefined" && localStorage.getItem(VOICE_MODE_KEY)) || "tap"
  );
  const { supported: speechSupported, listening, start: startListening, stop: stopListening } = useSpeechInput();

  const audioRef = useRef(null);
  const ringTimer = useRef(null);
  const digitTimer = useRef(null);
  const starTimer = useRef(null);
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
  const rubyData = useRef({ name: "", situation: "", style: "reflective" });
  const cyndiData = useRef({ name: "", topic: "General Reading", question: "" });
  const nyxStars = useRef([]);
  const countData = useRef({ category: "General" });
  const sphinxState = useRef({ step: 0, gates: {}, deck: [], idx: 0, correct: 0, asked: 0 });
  const triviaSession = useRef({ id: null, num: 4 });
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
      // Audio failed (blocked/unsupported) — still advance any chained step so flows never stall.
      if (onDone) onDone();
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
      const labeled = relabelForToday(ps);
      setPersonas(labeled);
      setProgram({ slug: "fortune", name: "Fortune Caller", has_personas: true });
      if (intro) push("program", intro);
      push("system", "── FORTUNE TELLER: CHOOSE YOUR ORACLE ──");
      labeled.forEach((p, i) => push("line", `  ${i + 1}  ${p.name} — ${p.blurb}`));
      push("system", "Dial 1-9 to choose, or 0 to return to the main menu. (Optionally whisper a question below first.)");
      speak(oraclePrompt(labeled), { voice: ORACLE_VOICE });
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

  // ---------------- Madame Ruby: guided tarot session ----------------
  const generateRubyReading = useCallback(async () => {
    stopAudio();
    setModeSafe("busy");
    push("program", "Madame Ruby shuffles the deck… the cards are cut…");
    try {
      const { name, situation, style } = rubyData.current;
      const res = await api.rubyReading(name, situation, style);
      push("program", `🂠 Cards drawn: ${(res.cards || []).join(" · ")}`);
      push("program", `${res.persona_name}: ${res.text}`);
      if (res.sign_off) push("program", res.sign_off);
      setModeSafe("result");
      push("system", "Press \u2731 to hear it again · # for another oracle · 0 for the main menu · or hang up.");
      deliver(
        `${res.text} ${res.sign_off || ""}`,
        { voice: res.voice },
        "To hear your reading again, press star. For another oracle, press pound. For the main menu, dial 0."
      );
    } catch (e) {
      setModeSafe("result");
      push("error", "// Madame Ruby's cards went dark (engine error)");
      push("system", "Press \u2731 to try again · # for another oracle · 0 for the main menu.");
    }
  }, [push, deliver, setModeSafe]);

  const askRubyStyle = useCallback(() => {
    setMindlineInput("");
    setModeSafe("ruby_style");
    push("program", "And how shall I read for you? Press 1 for a PREDICTION of what is coming, or 2 for REFLECTION and guidance.");
    push("system", "Press 1 (predict) or 2 (reflect) · 0 to leave.");
    speak("And how shall I read for you? Press one for a prediction of what is coming, or two for reflection and guidance.",
      { voice: "shimmer" });
  }, [push, speak, setModeSafe]);

  const askRubySituation = useCallback(() => {
    setMindlineInput("");
    setModeSafe("ruby_situation");
    const nm = rubyData.current.name;
    push("program", `And what weighs on you, ${nm}? Tell me the situation you seek guidance on.`);
    speak(`And what weighs on you, ${nm}? Tell me the situation you seek guidance on. Then press send, or just say it.`,
      { voice: "shimmer" });
  }, [push, speak, setModeSafe]);

  const startRuby = useCallback(() => {
    currentLine.current = "fortune";
    rubyData.current = { name: "", situation: "", style: "reflective" };
    setMindlineInput("");
    setModeSafe("ruby_name");
    push("program", "Madame Ruby: Welcome, seeker. Before I turn the cards… tell me, what name shall I call you?");
    speak("Welcome, seeker. Before I turn the cards, tell me — what name shall I call you? Then press send, or just say it.",
      { voice: "shimmer" });
  }, [push, speak, setModeSafe]);

  // ---------------- Cyndi & Louise: guided dual-voice reading ----------------
  const generateCyndiReading = useCallback(async () => {
    setModeSafe("busy");
    push("program", "Cyndi settles in… a second line crackles open… Louise is here.");
    try {
      const { name, topic, question } = cyndiData.current;
      const res = await api.cyndiReading(name, topic, question);
      const signOff = res.sign_off ? ` ${res.sign_off}` : "";
      push("program", res.text);
      if (res.sign_off) push("program", res.sign_off);
      setModeSafe("result");
      push("system", "Press \u2731 to hear it again · # for another oracle · 0 for the main menu · or hang up.");
      deliver(
        `${res.text}${signOff}`,
        { voice: res.voice || "nova" },
        "To hear that again, press star. To speak with another oracle, press pound. To return to the main menu, dial 0."
      );
    } catch (e) {
      setModeSafe("result");
      if (isOutOfCredits(e)) {
        push("error", "// out of minutes — the Universal Key needs more balance");
        push("system", "Add balance: Profile \u2192 Universal Key \u2192 Add Balance. Then dial again.");
      } else {
        push("error", "// Cyndi and Louise lost the connection (engine error)");
        push("system", "Press \u2731 to try again · # for another oracle · 0 for the main menu.");
      }
    }
  }, [push, deliver, setModeSafe]);

  const askCyndiQuestion = useCallback(() => {
    setMindlineInput("");
    setModeSafe("cyndi_question");
    const nm = cyndiData.current.name || "sweetheart";
    push("program", `Cyndi: Alright ${nm}, tell us what's going on — ask us one clear thing.`);
    speak(`Alright ${nm}, tell us what's going on. Ask us one clear thing, then press send, or just say it.`,
      { voice: "nova" });
  }, [push, speak, setModeSafe]);

  const askCyndiName = useCallback(() => {
    setMindlineInput("");
    setModeSafe("cyndi_name");
    push("program", "Cyndi: Beautiful. And what's your first name, hon?");
    push("program", "Louise: We don't got all day, sweetheart.");
    speak("Beautiful. And what's your first name, hon? Then press send, or just say it.", { voice: "nova" });
  }, [push, speak, setModeSafe]);

  const startCyndi = useCallback(() => {
    currentLine.current = "fortune";
    cyndiData.current = { name: "", topic: "General Reading", question: "" };
    setMindlineInput("");
    setModeSafe("cyndi_topic");
    push("program", "Cyndi & Louise: Welcome, sweetheart — two voices, one answer. What do you want to talk about?");
    CYNDI_TOPICS.forEach((t, i) => push("line", `  ${i + 1}  ${t}`));
    push("system", "Press 1-9 to choose a topic · 0 to return to the main menu.");
    const spoken = "Welcome, sweetheart. Two voices, one answer. Choose your topic. " +
      CYNDI_TOPICS.map((t, i) => `For ${t}, press ${i + 1}.`).join(" ");
    speak(spoken, { voice: "nova" });
  }, [push, speak, setModeSafe]);

  // ---------------- Zelda the All-Knowing: crystal-vision broadcast ----------------
  const generateZeldaReading = useCallback(async (topic) => {
    setModeSafe("busy");
    push("program", `Zelda peers into the crystal ball… the mists swirl around ${topic}…`);
    try {
      const res = await api.zeldaReading(topic);
      const signOff = res.sign_off ? ` ${res.sign_off}` : "";
      push("program", res.text);
      if (res.sign_off) push("program", res.sign_off);
      setModeSafe("result");
      push("system", "Press \u2731 to hear it again · # for another oracle · 0 for the main menu · or hang up.");
      deliver(
        `${res.text}${signOff}`,
        { voice: res.voice || "shimmer" },
        "To see that vision again, press star. To speak with another oracle, press pound. To return to the main menu, dial 0."
      );
    } catch (e) {
      setModeSafe("result");
      if (isOutOfCredits(e)) {
        push("error", "// out of minutes — the Universal Key needs more balance");
        push("system", "Add balance: Profile \u2192 Universal Key \u2192 Add Balance. Then dial again.");
      } else {
        push("error", "// the crystal ball went cloudy (engine error)");
        push("system", "Press \u2731 to try again · # for another oracle · 0 for the main menu.");
      }
    }
  }, [push, deliver, setModeSafe]);

  const startZelda = useCallback(() => {
    currentLine.current = "fortune";
    setMindlineInput("");
    setModeSafe("zelda_topic");
    push("program", "Zelda the All-Knowing: The crystal awaits. Choose the vision you seek.");
    ZELDA_TOPICS.forEach((t, i) => push("line", `  ${i + 1}  ${t}`));
    push("system", "Press 1-9 to choose · 0 to return to the main menu.");
    const spoken = "The crystal awaits. Choose the vision you seek. " +
      ZELDA_TOPICS.map((t, i) => `For ${t}, press ${i + 1}.`).join(" ");
    speak(spoken, { voice: "shimmer" });
  }, [push, speak, setModeSafe]);

  // ---------------- Nyx of the Nine Stars: constellation builder + moon phase ----------------
  const generateNyxReading = useCallback(async (stars) => {
    setModeSafe("busy");
    const named = stars.map((n) => NYX_STARS[n - 1]).join(" · ");
    push("program", `Nyx traces your constellation across the dark: ${named}…`);
    try {
      const res = await api.nyxReading(stars);
      const signOff = res.sign_off ? ` ${res.sign_off}` : "";
      if (res.moon_phase) push("system", `🌙 Tonight's moon: ${res.moon_phase} (${res.illumination}% lit)`);
      push("program", res.text);
      if (res.sign_off) push("program", res.sign_off);
      setModeSafe("result");
      push("system", "Press \u2731 to hear it again · # for another oracle · 0 for the main menu · or hang up.");
      deliver(
        `${res.text}${signOff}`,
        { voice: res.voice || "alloy" },
        "To hear the stars again, press star. To speak with another oracle, press pound. To return to the main menu, dial 0."
      );
    } catch (e) {
      setModeSafe("result");
      if (isOutOfCredits(e)) {
        push("error", "// out of minutes — the Universal Key needs more balance");
        push("system", "Add balance: Profile \u2192 Universal Key \u2192 Add Balance. Then dial again.");
      } else {
        push("error", "// the stars went dark (engine error)");
        push("system", "Press \u2731 to try again · # for another oracle · 0 for the main menu.");
      }
    }
  }, [push, deliver, setModeSafe]);

  const startNyx = useCallback(() => {
    currentLine.current = "fortune";
    nyxStars.current = [];
    setMindlineInput("");
    setModeSafe("nyx_build");
    push("program", "Nyx of the Nine Stars: The keypad becomes the sky. Build your constellation, star by star.");
    NYX_STARS.forEach((s, i) => push("line", `  ${i + 1}  ${s}`));
    push("system", "Press stars 1-9 to place them, then # to read the constellation · 0 to return.");
    const spoken = "The keypad becomes the sky. Each number is a star. " +
      NYX_STARS.map((s, i) => `${i + 1}, ${s}.`).join(" ") +
      " Press your stars in order, then press pound to read the constellation.";
    speak(spoken, { voice: "alloy" });
  }, [push, speak, setModeSafe]);

  // ---------------- Count Clairvoyant: number divination + mathemagic ----------------
  const generateCountReading = useCallback(async (category, number) => {
    setModeSafe("busy");
    push("program", `The Count runs a pale finger down the digits of ${number || "your number"}…`);
    try {
      const res = await api.countReading(category, number);
      const signOff = res.sign_off ? ` ${res.sign_off}` : "";
      push("program", res.text);
      if (res.sign_off) push("program", res.sign_off);
      setModeSafe("result");
      push("system", "Press \u2731 to hear it again · # for another oracle · 0 for the main menu · or hang up.");
      deliver(
        `${res.text}${signOff}`,
        { voice: res.voice || "echo" },
        "To hear that again, press star. To speak with another oracle, press pound. To return to the main menu, dial 0."
      );
    } catch (e) {
      setModeSafe("result");
      if (isOutOfCredits(e)) {
        push("error", "// out of minutes — the Universal Key needs more balance");
        push("system", "Add balance: Profile \u2192 Universal Key \u2192 Add Balance. Then dial again.");
      } else {
        push("error", "// the Count vanished into the dark (engine error)");
        push("system", "Press \u2731 to try again · # for another oracle · 0 for the main menu.");
      }
    }
  }, [push, deliver, setModeSafe]);

  const revealMathemagic = useCallback((answer) => {
    const clean = (answer || "").replace(/\D/g, "");
    setMindlineInput("");
    setModeSafe("result");
    let line, speech;
    if (clean === MATHEMAGIC_ANSWER) {
      line = "Count Clairvoyant: Behold! My sealed prophecy read… one thousand and eighty-nine. As it forever shall. Your mind holds no secrets from the Count.";
      speech = "Behold. My sealed prophecy read one thousand and eighty nine. As it forever shall. Your mind holds no secrets from the Count.";
    } else {
      line = `Count Clairvoyant: Curious… the crypt holds one thousand and eighty-nine, yet you bring me ${clean || "nothing at all"}. The dead never err at arithmetic — recount, mortal, and the number shall obey.`;
      speech = `Curious. The crypt holds one thousand and eighty nine, yet you bring me ${clean || "nothing at all"}. The dead never err at arithmetic. Recount, mortal, and the number shall obey.`;
    }
    push("program", line);
    push("system", "Press \u2731 to hear it again · # for another oracle · 0 for the main menu · or hang up.");
    deliver(speech, { voice: "echo" },
      "To hear that again, press star. For another oracle, press pound. For the main menu, dial 0.");
  }, [push, deliver, setModeSafe]);

  const askCountNumber = useCallback((category) => {
    countData.current.category = category;
    setMindlineInput("");
    setModeSafe("count_number");
    push("program", `Count Clairvoyant: ${category}. A worthy question. Give me a number — a birth year, a fateful date, any number your soul offers.`);
    push("system", "Enter digits then press Send or # · you may type or speak them.");
    speak(`${category}. A worthy question. Give me a number. A birth year, a fateful date, any number your soul offers. Enter it, then send.`,
      { voice: "echo" });
  }, [push, speak, setModeSafe]);

  const startCountNumber = useCallback(() => {
    setMindlineInput("");
    setModeSafe("count_category");
    push("program", "Count Clairvoyant: Which corner of your fate shall the numbers illuminate?");
    COUNT_CATEGORIES.forEach((c, i) => push("line", `  ${i + 1}  ${c}`));
    push("system", "Press 1-9 to choose · 0 to return.");
    const spoken = "Which corner of your fate shall the numbers illuminate? " +
      COUNT_CATEGORIES.map((c, i) => `For ${c}, press ${i + 1}.`).join(" ");
    speak(spoken, { voice: "echo" });
  }, [push, speak, setModeSafe]);

  const startMagic1089 = useCallback(() => {
    setMindlineInput("");
    setModeSafe("count_magic");
    push("program", "Count Clairvoyant: The 1089 Prophecy. Think of a three-digit number whose first and last digits differ by at least two. Do not speak it.");
    push("program", "Reverse it. Subtract the smaller from the larger. Reverse THAT result, and add the two together.");
    push("system", "I have sealed my prophecy in the crypt. Enter your final answer, then Send or #.");
    const spoken = "The one thousand eighty nine prophecy. Think of a three digit number whose first and last digits differ by at least two. Do not speak it. Reverse it. Subtract the smaller from the larger. Now reverse that result, and add the two together. I have already sealed my prophecy in the crypt. Enter your final answer, then send.";
    speak(spoken, { voice: "echo" });
  }, [push, speak, setModeSafe]);

  const startMagic37 = useCallback(() => {
    setMindlineInput("");
    setModeSafe("count_magic_37");
    push("program", "Count Clairvoyant: The Eternal 37. Choose a three-digit number of THREE IDENTICAL digits — 111, 222, all the way to 999.");
    push("program", "Add its three digits together. Now divide your number by that sum.");
    push("system", "I already know your answer. Enter your result, then Send or #.");
    const spoken = "The eternal thirty seven. Choose a three digit number of three identical digits. One eleven, two twenty two, all the way to nine ninety nine. Add its three digits together. Now divide your number by that sum. I already know your answer. Enter your result, then send.";
    speak(spoken, { voice: "echo" });
  }, [push, speak, setModeSafe]);

  const startMagicKaprekar = useCallback(() => {
    setMindlineInput("");
    setModeSafe("count_magic_kaprekar");
    push("program", "Count Clairvoyant: The Black Hole of 6174. Give me ANY four-digit number — but not four of the same digit.");
    push("system", "Enter your four digits, then Send or #, and watch no number escape.");
    const spoken = "The black hole of sixty one seventy four. Give me any four digit number, but not four of the same digit. Enter your four digits, then send, and watch as no number escapes the void.";
    speak(spoken, { voice: "echo" });
  }, [push, speak, setModeSafe]);

  const startCountMagic = useCallback(() => {
    setMindlineInput("");
    setModeSafe("count_magic_menu");
    push("program", "Count Clairvoyant: Choose your trick. The numbers obey me either way.");
    push("line", "  1  The 1089 Prophecy");
    push("line", "  2  The Eternal 37");
    push("line", "  3  The Black Hole of 6174");
    push("system", "Press 1-3 to choose · 0 to go back.");
    speak("Choose your trick. Press one for the one thousand eighty nine prophecy, two for the eternal thirty seven, or three for the black hole of sixty one seventy four. Press zero to go back.",
      { voice: "echo" });
  }, [push, speak, setModeSafe]);

  const reveal37 = useCallback((answer) => {
    const clean = (answer || "").replace(/\D/g, "");
    setMindlineInput("");
    setModeSafe("result");
    let line, speech;
    if (clean === "37") {
      line = "Count Clairvoyant: Thirty-seven. It is ALWAYS thirty-seven — a number as loyal as the grave. Your arithmetic pleases the dead.";
      speech = "Thirty seven. It is always thirty seven. A number as loyal as the grave. Your arithmetic pleases the dead.";
    } else {
      line = `Count Clairvoyant: You bring me ${clean || "nothing"}, yet the true answer is always thirty-seven. Check your identical digits and divide once more, mortal.`;
      speech = `You bring me ${clean || "nothing"}, yet the true answer is always thirty seven. Check your identical digits and divide once more, mortal.`;
    }
    push("program", line);
    push("system", "Press \u2731 to hear it again · # for another oracle · 0 for the main menu · or hang up.");
    deliver(speech, { voice: "echo" }, "To hear that again, press star. For another oracle, press pound. For the main menu, dial 0.");
  }, [push, deliver, setModeSafe]);

  const revealKaprekar = useCallback((number) => {
    const clean = (number || "").replace(/\D/g, "");
    const distinct = new Set(clean.split("")).size;
    setMindlineInput("");
    if (clean.length < 4 || distinct < 2) {
      push("program", "Count Clairvoyant: The void is particular. Bring me FOUR digits, and not all alike.");
      speak("The void is particular. Bring me four digits, and not all alike.", { voice: "echo" });
      return; // stay in count_magic_kaprekar
    }
    setModeSafe("result");
    const { steps, landed } = kaprekarSteps(clean);
    steps.forEach((s) => push("line", `  ${s}`));
    const win = landed === "6174";
    const line = win
      ? `Count Clairvoyant: In ${steps.length} step${steps.length === 1 ? "" : "s"}, your number falls into the Black Hole… six thousand one hundred seventy-four. No four-digit number, however proud, escapes it.`
      : "Count Clairvoyant: Curious — four alike collapse to nothing. Try a number with variety, and the void shall claim it.";
    push("program", line);
    push("system", "Press \u2731 to hear it again · # for another oracle · 0 for the main menu · or hang up.");
    const speech = win
      ? `In ${steps.length} steps, your number falls into the black hole. Six thousand one hundred seventy four. No four digit number, however proud, escapes it.`
      : "Curious. Four alike collapse to nothing. Try a number with variety, and the void shall claim it.";
    deliver(speech, { voice: "echo" }, "To hear that again, press star. For another oracle, press pound. For the main menu, dial 0.");
  }, [push, speak, deliver, setModeSafe]);

  const startCount = useCallback(() => {
    currentLine.current = "fortune";
    setMindlineInput("");
    setModeSafe("count_menu");
    push("program", "Count Clairvoyant: Ahhh… a living mind, warm with numbers. What shall we do?");
    push("line", "  1  A Number Reading");
    push("line", "  2  Mathemagic (I shall read your mind)");
    push("system", "Press 1 or 2 · 0 to return to the main menu.");
    speak("Ahhh, a living mind, warm with numbers. Press one for a number reading, or press two for mathemagic, and I shall read your mind. Press zero to leave.",
      { voice: "echo" });
  }, [push, speak, setModeSafe]);

  // ---------------- The Sphinx: Three Gates + Challenge (riddle game) ----------------
  const generateGatesReading = useCallback(async () => {
    setModeSafe("busy");
    const g = sphinxState.current.gates;
    push("program", "The three gates close behind you… the Sphinx considers…");
    try {
      const res = await api.sphinxGates(g.mind, g.heart, g.path);
      const signOff = res.sign_off ? ` ${res.sign_off}` : "";
      push("program", res.text);
      if (res.sign_off) push("program", res.sign_off);
      setModeSafe("result");
      push("system", "Press \u2731 to hear it again · # for another oracle · 0 for the main menu · or hang up.");
      deliver(`${res.text}${signOff}`, { voice: res.voice || "ash" },
        "To hear that again, press star. For another oracle, press pound. For the main menu, dial 0.");
    } catch (e) {
      setModeSafe("result");
      if (isOutOfCredits(e)) {
        push("error", "// out of minutes — the Universal Key needs more balance");
        push("system", "Add balance: Profile \u2192 Universal Key \u2192 Add Balance. Then dial again.");
      } else {
        push("error", "// the Sphinx fell silent (engine error)");
        push("system", "Press \u2731 to try again · # for another oracle · 0 for the main menu.");
      }
    }
  }, [push, deliver, setModeSafe]);

  const unlockFourthGate = useCallback(async () => {
    setModeSafe("busy");
    push("system", "── THE HIDDEN FOURTH GATE OPENS ──");
    push("program", "The Sphinx: Three riddles answered true. A gate you did not know existed now yawns wide.");
    try {
      const res = await api.sphinxFourthGate();
      const signOff = res.sign_off ? ` ${res.sign_off}` : "";
      push("program", res.text);
      if (res.sign_off) push("program", res.sign_off);
      setModeSafe("result");
      push("system", "Press \u2731 to hear it again · # for another oracle · 0 for the main menu · or hang up.");
      deliver(`${res.text}${signOff}`, { voice: res.voice || "ash" },
        "To hear that again, press star. For another oracle, press pound. For the main menu, dial 0.");
    } catch (e) {
      setModeSafe("result");
      if (isOutOfCredits(e)) {
        push("error", "// out of minutes — the Universal Key needs more balance");
        push("system", "Add balance: Profile \u2192 Universal Key \u2192 Add Balance. Then dial again.");
      } else {
        push("error", "// the fourth gate jammed (engine error)");
        push("system", "Press \u2731 to try again · # for another oracle · 0 for the main menu.");
      }
    }
  }, [push, deliver, setModeSafe]);

  const closeSphinx = useCallback(() => {
    const st = sphinxState.current;
    setModeSafe("result");
    const line = `The Sphinx: ${st.correct} of three. The hidden gate stays shut — for now. Return when your mind is sharper.`;
    push("program", line);
    push("system", "Press # for another oracle · 0 for the main menu · or hang up.");
    deliver(`${st.correct} of three. The hidden gate stays shut, for now. Return when your mind is sharper.`,
      { voice: "ash" }, "For another oracle, press pound. For the main menu, dial 0.");
  }, [push, deliver, setModeSafe]);

  const presentGate = useCallback((step) => {
    const st = sphinxState.current;
    if (step >= SPHINX_GATES.length) { generateGatesReading(); return; }
    st.step = step;
    const gate = SPHINX_GATES[step];
    setModeSafe("sphinx_gate");
    push("system", `── ${gate.title} ──`);
    push("program", `The Sphinx: ${gate.prompt}`);
    gate.choices.forEach((c, i) => push("line", `  ${i + 1}  ${c}`));
    push("system", "Press 1-4 to choose · 0 to leave.");
    const spoken = `${gate.prompt} ` + gate.choices.map((c, i) => `For ${c}, press ${i + 1}.`).join(" ");
    speak(spoken, { voice: "ash" });
  }, [push, speak, setModeSafe, generateGatesReading]);

  const recordGateChoice = useCallback((idx) => {
    const st = sphinxState.current;
    const gate = SPHINX_GATES[st.step];
    if (!gate || !gate.choices[idx]) return;
    st.gates[gate.key] = gate.choices[idx];
    push("caller", `chose ${gate.choices[idx]}`);
    presentGate(st.step + 1);
  }, [push, presentGate]);

  const startThreeGates = useCallback(() => {
    currentLine.current = "fortune";
    sphinxState.current = { step: 0, gates: {}, deck: [], idx: 0, correct: 0, asked: 0 };
    push("program", "The Sphinx: Three gates stand before you. Choose, and do not overthink.");
    presentGate(0);
  }, [push, presentGate]);

  const presentRiddle = useCallback(() => {
    const st = sphinxState.current;
    if (st.correct >= 3) { unlockFourthGate(); return; }
    if (st.asked >= 5 || st.idx >= st.deck.length) { closeSphinx(); return; }
    const riddle = st.deck[st.idx];
    setMindlineInput("");
    setModeSafe("sphinx_riddle");
    push("system", `── Riddle ${st.asked + 1} · ${st.correct}/3 correct ──`);
    push("program", `The Sphinx: ${riddle.q}`);
    push("system", "Speak or type your answer, then Send · 0 to leave.");
    speak(riddle.q, { voice: "ash" });
  }, [push, speak, setModeSafe, unlockFourthGate, closeSphinx]);

  const checkRiddleAnswer = useCallback((val) => {
    const st = sphinxState.current;
    const riddle = st.deck[st.idx];
    if (!riddle) { closeSphinx(); return; }
    const ans = (val || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ");
    setMindlineInput("");
    if (val) push("caller", val);
    const correct = riddle.a.some((t) => ans.includes(t));
    st.asked += 1;
    st.idx += 1;
    let fb, sp;
    if (correct) {
      st.correct += 1;
      fb = `The Sphinx inclines its head. Correct — ${riddle.a[0]}. (${st.correct}/3)`;
      sp = `Correct. ${riddle.a[0]}.`;
    } else {
      fb = `The Sphinx is unmoved. The answer was ${riddle.a[0]}. A wrong answer is still a step.`;
      sp = `The answer was ${riddle.a[0]}. A wrong answer is still a step.`;
    }
    push(correct ? "program" : "system", fb);
    setModeSafe("busy");
    speak(sp, { voice: "ash" }, () => presentRiddle());
  }, [push, speak, setModeSafe, closeSphinx, presentRiddle]);

  const startChallenge = useCallback(() => {
    currentLine.current = "fortune";
    sphinxState.current = { step: 0, gates: {}, deck: shuffled(SPHINX_RIDDLES), idx: 0, correct: 0, asked: 0 };
    setMindlineInput("");
    push("program", "The Sphinx: Answer three riddles true, and the hidden Fourth Gate shall open to you.");
    setModeSafe("busy");
    speak("Answer three riddles true, and the hidden fourth gate shall open to you.", { voice: "ash" }, () => presentRiddle());
  }, [push, speak, setModeSafe, presentRiddle]);

  const startSphinx = useCallback(() => {
    currentLine.current = "fortune";
    setMindlineInput("");
    setModeSafe("sphinx_menu");
    push("program", "The Sphinx: You seek the gates, or you dare the riddles?");
    push("line", "  1  The Three Gates");
    push("line", "  2  Challenge the Sphinx");
    push("system", "Press 1 or 2 · 0 to return to the main menu.");
    speak("You seek the gates, or you dare the riddles? Press one for the three gates, or two to challenge the Sphinx. Press zero to leave.",
      { voice: "ash" });
  }, [push, speak, setModeSafe]);

  // ---------------- Dial-In Trivia ----------------
  const renderTriviaEnd = useCallback((data) => {
    setModeSafe("trivia_end");
    const score = data.final_score;
    const total = data.total;
    let remark = "A valiant effort!";
    if (score >= total * 0.85) remark = "Absolutely brilliant — a true trivia champion!";
    else if (score >= total * 0.6) remark = "Nicely done — sharp as a tack!";
    else if (score >= total * 0.35) remark = "Not bad at all!";
    push("system", `── GAME OVER · You scored ${score} out of ${total} ──`);
    push("program", remark);
    push("system", "Press 1 to play again · 0 for the main menu · or hang up.");
    const speech = `That's the end of the game! You scored ${score} out of ${total}. ${remark} Press one to play again, or press zero for the main menu.`;
    lastSpoken.current = { text: speech, opts: { voice: OPERATOR_VOICE }, optionsText: "" };
    speak(speech, { voice: OPERATOR_VOICE });
  }, [push, speak, setModeSafe]);

  const renderTriviaQuestion = useCallback((q) => {
    triviaSession.current.num = q.num_choices;
    setModeSafe("trivia_play");
    push("system", `── Round ${q.round} of ${q.total_rounds} · Question ${q.q_num} of ${q.q_per_round} ──`);
    push("program", q.question);
    (q.choices || []).forEach((c) => push("line", `  ${c.key}  ${c.label}`));
    push("system", "Press a number to answer · say \u201crepeat\u201d, \u201cexplain\u201d or \u201cskip\u201d · 0 to quit.");
    const optionsText =
      "Is it: " +
      (q.choices || []).map((c) => `${c.label}, press ${c.key}`).join("; ") +
      ". Press a number, or say repeat, explain, or skip.";
    lastSpoken.current = { text: q.question, opts: { voice: OPERATOR_VOICE }, optionsText };
    speak(q.question, { voice: OPERATOR_VOICE }, () => speak(optionsText, { voice: OPERATOR_VOICE }));
  }, [push, speak, setModeSafe]);

  const handleTriviaResponse = useCallback((data) => {
    if (data.error === "session_expired") {
      push("error", "// the quiz line dropped");
      backToMenu();
      return;
    }
    const r = data.result;
    let line, speech;
    if (r.skipped) {
      line = `⏭ Skipped. The answer was ${r.correct_key}. ${r.correct_label}.`;
      speech = `Skipped. The answer was ${r.correct_label}.`;
    } else if (r.correct) {
      line = `✅ Correct! ${r.explanation} (Score: ${r.score})`;
      speech = `Correct! ${r.explanation}`;
    } else {
      line = `❌ Not quite. The answer was ${r.correct_key}. ${r.correct_label}. ${r.explanation} (Score: ${r.score})`;
      speech = `Not quite. The correct answer was ${r.correct_label}. ${r.explanation}`;
    }
    push(r.correct ? "program" : "system", line);
    if (data.game_complete) {
      speak(speech, { voice: OPERATOR_VOICE }, () => renderTriviaEnd(data));
      return;
    }
    if (data.error === "generation_failed" || !data.next) {
      push("error", "// the quiz machine hiccuped");
      backToMenu();
      return;
    }
    speak(speech, { voice: OPERATOR_VOICE }, () => {
      if (data.finished_round) {
        push("system", `── Round ${data.finished_round} complete! ──`);
        speak(`That's the end of round ${data.finished_round}. On to round ${data.finished_round + 1} — the questions get tougher!`,
          { voice: OPERATOR_VOICE }, () => renderTriviaQuestion(data.next));
      } else {
        renderTriviaQuestion(data.next);
      }
    });
  }, [push, speak, backToMenu, renderTriviaQuestion, renderTriviaEnd]);

  const triviaAnswer = useCallback(async (choice) => {
    if (!triviaSession.current.id) return;
    stopAudio();
    setModeSafe("busy");
    push("caller", choice === "skip" ? "skip" : `answered ${choice}`);
    try {
      const data = await api.triviaAnswer(triviaSession.current.id, choice);
      handleTriviaResponse(data);
    } catch (e) {
      setModeSafe("trivia_play");
      push("error", "// static on the line — try again");
    }
  }, [push, handleTriviaResponse, setModeSafe]);

  const triviaSkip = useCallback(() => triviaAnswer("skip"), [triviaAnswer]);

  const triviaHint = useCallback(async () => {
    if (!triviaSession.current.id) return;
    try {
      const r = await api.triviaHint(triviaSession.current.id);
      push("program", `💡 Hint: ${r.hint}`);
      speak(`Here's a hint. ${r.hint}`, { voice: OPERATOR_VOICE });
    } catch (e) {}
  }, [push, speak]);

  const enterTrivia = useCallback(async () => {
    currentLine.current = "trivia";
    setModeSafe("busy");
    push("system", "── DIAL-IN TRIVIA ──");
    push("program", "Four rounds, six questions each. Answer with the keypad, or say repeat, explain, or skip. Good luck!");
    try {
      const r = await api.triviaStart();
      triviaSession.current = { id: r.session_id, num: r.question.num_choices };
      renderTriviaQuestion(r.question);
    } catch (e) {
      setModeSafe("message");
      push("error", "// the quiz machine is offline");
      push("system", "Dial 0 for the main menu, or hang up.");
    }
  }, [push, renderTriviaQuestion, setModeSafe]);

  const submitCurrent = useCallback((val) => {
    const m = modeRef.current;
    const v = typeof val === "string" ? val : mindlineInputRef.current;
    if (m === "mindline_name" || m === "mindline_confirm" || m === "mindline_talk") mindlineSend(v);
    else if (m === "magic8_ask") askMagic8(v);
    else if (m === "kk_whos_there") kkRespond(v);
    else if (m === "kk_who") kkReveal(v);
    else if (m === "adventure_ai_theme") aiStartAdventure(v);
    else if (m === "ruby_name") { rubyData.current.name = (v || "").trim() || "seeker"; askRubySituation(); }
    else if (m === "ruby_situation") { rubyData.current.situation = (v || "").trim(); askRubyStyle(); }
    else if (m === "cyndi_name") { cyndiData.current.name = (v || "").trim() || "sweetheart"; askCyndiQuestion(); }
    else if (m === "cyndi_question") { cyndiData.current.question = (v || "").trim(); generateCyndiReading(); }
    else if (m === "count_number") { generateCountReading(countData.current.category, (v || "").trim()); }
    else if (m === "count_magic") { revealMathemagic((v || "").trim()); }
    else if (m === "count_magic_37") { reveal37((v || "").trim()); }
    else if (m === "count_magic_kaprekar") { revealKaprekar((v || "").trim()); }
    else if (m === "sphinx_riddle") { checkRiddleAnswer((v || "").trim()); }
  }, [mindlineSend, askMagic8, kkRespond, kkReveal, aiStartAdventure, askRubySituation, askRubyStyle, askCyndiQuestion, generateCyndiReading, generateCountReading, revealMathemagic, reveal37, revealKaprekar, checkRiddleAnswer]);

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
    } else if (slug === "trivia") {
      enterTrivia();
    } else {
      backToMenu();
    }
  }, [loadFortunePersonas, enterMindline, enterMagic8, enterKnockKnock, enterAdventure, enterTrivia, backToMenu, setModeSafe]);

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
      if (isOutOfCredits(e)) {
        push("error", "// out of minutes — the Universal Key needs more balance");
        push("system", "Add balance: Profile \u2192 Universal Key \u2192 Add Balance. Then dial again.");
      } else {
        push("error", "// the oracle went silent (engine error)");
        push("system", "To try again, press \u2731. Dial 0 for the main menu, or hang up.");
      }
    }
  }, [question, push, deliver, setModeSafe]);

  const processDial = useCallback(async (digits) => {
    if (!digits) return;
    const curMode = modeRef.current;

    if (curMode === "fortune_persona") {
      const idx = parseInt(digits, 10) - 1;
      if (personas[idx]) {
        push("caller", `dialed ${digits} — ${personas[idx].name}`);
        if (personas[idx].slug === "ruby") startRuby();
        else if (personas[idx].slug === "cyndi") startCyndi();
        else if (personas[idx].slug === "zelda") startZelda();
        else if (personas[idx].slug === "nyx") startNyx();
        else if (personas[idx].slug === "count") startCount();
        else if (personas[idx].slug === "sphinx") startSphinx();
        else generateFortune(personas[idx].slug);
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
      } else if (res.type === "program" && res.interaction === "trivia") {
        push("program", `Connecting to ${res.name}...`);
        enterTrivia();
      } else if (res.type === "program" && res.has_personas) {
        currentLine.current = "fortune";
        setModeSafe("fortune_persona");
        const labeled = relabelForToday(res.personas || []);
        setPersonas(labeled);
        setProgram(res);
        push("program", `Connecting to ${res.name}...`);
        push("system", "── CHOOSE YOUR ORACLE ──");
        labeled.forEach((p, i) => push("line", `  ${i + 1}  ${p.name} — ${p.blurb}`));
        push("system", "Dial 1-9 to choose, or 0 to return to the main menu. (Optionally whisper a question below first.)");
        speak(oraclePrompt(labeled), { voice: ORACLE_VOICE });
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
  }, [personas, generateFortune, startRuby, startCyndi, startZelda, startNyx, startCount, startSphinx, push, speak, deliver, enterMindline, enterMagic8, enterKnockKnock, enterAdventure, enterTrivia, setModeSafe]);

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
    const inRuby = m === "ruby_name" || m === "ruby_situation" || m === "ruby_style";
    const inCyndi = m === "cyndi_topic" || m === "cyndi_name" || m === "cyndi_question";
    const inZelda = m === "zelda_topic";
    const inNyx = m === "nyx_build";
    const inCount = m === "count_menu" || m === "count_category" || m === "count_number" || m === "count_magic" || m === "count_magic_menu" || m === "count_magic_37" || m === "count_magic_kaprekar";
    const inSphinx = m === "sphinx_menu" || m === "sphinx_gate" || m === "sphinx_riddle";
    const inTrivia = m === "trivia_play" || m === "trivia_end";
    const inExperience = inCall || inMindline || inMagic8 || inKnock || inAdventure || inRuby || inCyndi || inZelda || inNyx || inCount || inSphinx || inTrivia || m === "fortune_persona";

    // ── Secret-code dialing: ✱ then digits then # (e.g. *69#), works from ANY mode ──
    // Submit the code with #
    if (d === "#" && bufferRef.current.startsWith("*")) {
      clearTimeout(starTimer.current);
      clearTimeout(digitTimer.current);
      const code = bufferRef.current.slice(1);
      setBuf("");
      if (code) processDial(code);
      else playVoicemails(); // '*#' with no digits = check voicemail
      return;
    }
    // ✱ begins (or restarts) a secret-code entry — barges into whatever is playing
    if (d === "*") {
      clearTimeout(starTimer.current);
      clearTimeout(digitTimer.current);
      stopAudio();
      const modeAtStar = m;
      setBuf("*");
      starTimer.current = setTimeout(() => {
        // No digits followed a lone ✱ -> fall back to the classic meaning
        if (bufferRef.current === "*") {
          setBuf("");
          if (modeAtStar === "dialtone") playVoicemails();
          else if (REPLAY_MODES.has(modeAtStar)) replayLast();
        }
      }, STAR_HOLD_MS);
      return;
    }
    // While entering a secret code, digits append to it (auto-connects after a pause)
    if (bufferRef.current.startsWith("*") && /^[0-9]$/.test(d)) {
      clearTimeout(starTimer.current);
      clearTimeout(digitTimer.current);
      const nb = bufferRef.current.length < 14 ? bufferRef.current + d : bufferRef.current;
      setBuf(nb);
      digitTimer.current = setTimeout(() => {
        const code = nb.slice(1);
        setBuf("");
        if (code) processDial(code);
      }, INTER_DIGIT_MS);
      return;
    }

    // ## (double pound) = universal exit; opens the End Call? confirmation.
    if (d === "#") {
      // In Nyx's constellation builder, # submits the constellation for a reading.
      if (modeRef.current === "nyx_build") {
        if (nyxStars.current.length >= 1) generateNyxReading(nyxStars.current.slice());
        else push("system", "Place at least one star (press 1-9), then press #.");
        return;
      }
      // In the Count's number / mathemagic entry, # submits the typed-or-keyed number.
      if (["count_number", "count_magic", "count_magic_37", "count_magic_kaprekar"].includes(modeRef.current)) {
        submitCurrent();
        return;
      }
      // In the Sphinx's riddle challenge, # submits the typed answer.
      if (modeRef.current === "sphinx_riddle") { submitCurrent(); return; }
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

    if (m === "ruby_name" || m === "ruby_situation") {
      if (d === "0") backToMenu(); // type or speak your answer; 0 returns to the menu
      return;
    }
    if (m === "ruby_style") {
      if (d === "1") { rubyData.current.style = "predictive"; generateRubyReading(); }
      else if (d === "2") { rubyData.current.style = "reflective"; generateRubyReading(); }
      else if (d === "0") backToMenu();
      return;
    }

    if (m === "cyndi_topic") {
      if (d === "0") { backToMenu(); return; }
      const n = parseInt(d, 10);
      if (n >= 1 && n <= 9) { cyndiData.current.topic = CYNDI_TOPICS[n - 1]; askCyndiName(); }
      return;
    }
    if (m === "cyndi_name" || m === "cyndi_question") {
      if (d === "0") backToMenu(); // type or speak your answer; 0 returns to the menu
      return;
    }

    if (m === "zelda_topic") {
      if (d === "0") { backToMenu(); return; }
      const n = parseInt(d, 10);
      if (n >= 1 && n <= 9) generateZeldaReading(ZELDA_TOPICS[n - 1]);
      return;
    }

    if (m === "nyx_build") {
      if (d === "0") { backToMenu(); return; }
      const n = parseInt(d, 10);
      if (n >= 1 && n <= 9 && nyxStars.current.length < 7) {
        nyxStars.current.push(n);
        push("line", `  \u2605 ${NYX_STARS[n - 1]}  (${nyxStars.current.length}/7 — press # to read)`);
      }
      return;
    }

    if (m === "count_menu") {
      if (d === "1") startCountNumber();
      else if (d === "2") startCountMagic();
      else if (d === "0") backToMenu();
      return;
    }
    if (m === "count_category") {
      if (d === "0") { backToMenu(); return; }
      const n = parseInt(d, 10);
      if (n >= 1 && n <= 9) askCountNumber(COUNT_CATEGORIES[n - 1]);
      return;
    }
    if (m === "count_number" || m === "count_magic" || m === "count_magic_37" || m === "count_magic_kaprekar") {
      // keypad digits append to the entry (also typable / speakable); # submits (handled above).
      if (/^[0-9]$/.test(d)) {
        const nv = mindlineInputRef.current + d;
        mindlineInputRef.current = nv;
        setMindlineInput(nv);
      }
      return;
    }
    if (m === "count_magic_menu") {
      if (d === "1") startMagic1089();
      else if (d === "2") startMagic37();
      else if (d === "3") startMagicKaprekar();
      else if (d === "0") startCount();
      return;
    }

    if (m === "sphinx_menu") {
      if (d === "1") startThreeGates();
      else if (d === "2") startChallenge();
      else if (d === "0") backToMenu();
      return;
    }
    if (m === "sphinx_gate") {
      if (d === "0") { backToMenu(); return; }
      const n = parseInt(d, 10);
      if (n >= 1 && n <= 4) recordGateChoice(n - 1);
      return;
    }
    if (m === "sphinx_riddle") {
      if (d === "0") backToMenu(); // type or speak your answer; 0 leaves
      return;
    }

    if (m === "trivia_play") {
      if (d === "0") backToMenu();
      else if (d === "*") replayLast();
      else {
        const n = parseInt(d, 10);
        if (n >= 1 && n <= (triviaSession.current.num || 4)) triviaAnswer(d);
      }
      return;
    }
    if (m === "trivia_end") {
      if (d === "1") enterTrivia();
      else if (d === "*") replayLast();
      else if (d === "0") backToMenu();
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
  }, [offHook, processDial, backToMenu, replayLast, chooseAnotherOracle, playBranch, playVoicemails, askMagic8, enterMagic8, enterKnockKnock, advChoose, advStartStory, enterAdventure, enterAiTheme, generateRubyReading, askCyndiName, generateZeldaReading, generateNyxReading, startCountNumber, startCountMagic, startCount, askCountNumber, startMagic1089, startMagic37, startMagicKaprekar, startThreeGates, startChallenge, recordGateChoice, submitCurrent, triviaAnswer, enterTrivia, enterLine, triggerExitConfirm, callEnded, resetLine, openMenu, setBuf]);

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
    if (m === "trivia_play") {
      const t = text.toLowerCase();
      if (/\b(repeat|again|say that)\b/.test(t)) { replayLast(); return; }
      if (/\b(explain|hint|help|clue)\b/.test(t)) { triviaHint(); return; }
      if (/\b(skip|pass|next)\b/.test(t)) { triviaSkip(); return; }
      const key = parseVoiceCommand(text);
      if (key) onKey(key);
      return;
    }
    if (/\b(good\s?bye|hang up)\b/i.test(text)) {
      onKey("#");
      setTimeout(() => onKey("#"), 130);
      return;
    }
    const key = parseVoiceCommand(text);
    if (key) onKey(key);
  }, [submitCurrent, onKey, replayLast, triviaHint, triviaSkip]);
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

        {/* Out-of-credits banner — the shared Universal LLM key ran out of balance */}
        {creditsOut && (
          <div
            data-testid="credits-out-banner"
            className="mb-4 rounded-sm border border-red-600/50 bg-red-600/10 px-3 py-2 font-mono text-[11px] leading-relaxed text-red-300"
          >
            <span className="font-bold uppercase tracking-widest text-red-400">⚠ Network out of minutes</span>
            <br />
            The AI voices (oracles, trivia, adventures) share a Universal Key that's out of balance.
            Top up at <span className="text-red-200">Profile → Universal Key → Add Balance</span> to bring them back.
          </div>
        )}

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

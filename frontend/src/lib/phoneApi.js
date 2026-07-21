import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const http = axios.create({ baseURL: API });

// A 402 from any endpoint means the shared Universal LLM key is out of credits.
http.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err && err.response && err.response.status === 402) {
      try {
        window.dispatchEvent(new CustomEvent("dialbox-out-of-credits"));
      } catch (e) {}
    }
    return Promise.reject(err);
  }
);

export function isOutOfCredits(err) {
  return !!(err && err.response && err.response.status === 402);
}

export const api = {
  getMenu: () => http.get("/menu").then((r) => r.data),
  getPersonas: () => http.get("/personas").then((r) => r.data),
  getOracles: () => http.get("/oracles").then((r) => r.data),
  createOracle: (data) => http.post("/oracles", data).then((r) => r.data),
  updateOracle: (slug, data) => http.patch(`/oracles/${slug}`, data).then((r) => r.data),
  deleteOracle: (slug) => http.delete(`/oracles/${slug}`).then((r) => r.data),
  getPrograms: () => http.get("/programs").then((r) => r.data),
  updateProgram: (slug, data) => http.patch(`/programs/${slug}`, data).then((r) => r.data),
  dial: (digits) => http.post("/session/dial", { digits }).then((r) => r.data),
  fortune: (persona, question) =>
    http.post("/programs/fortune", { persona, question, hour: new Date().getHours() }).then((r) => r.data),
  rubyReading: (name, situation, style) =>
    http.post("/programs/ruby", { name, situation, style }).then((r) => r.data),
  triviaStart: () => http.post("/trivia/start", {}).then((r) => r.data),
  triviaAnswer: (session_id, choice) =>
    http.post("/trivia/answer", { session_id, choice }).then((r) => r.data),
  triviaHint: (session_id) => http.post("/trivia/hint", { session_id }).then((r) => r.data),
  magic8: (question) => http.post("/programs/magic8", { question }).then((r) => r.data),
  knockknock: (exclude = []) => http.post("/programs/knockknock", { exclude }).then((r) => r.data),
  tts: (text, opts = {}) => http.post("/tts", { text, ...opts }).then((r) => r.data),
  getSecretCodes: () => http.get("/secret-codes").then((r) => r.data),
  createSecretCode: (data) => http.post("/secret-codes", data).then((r) => r.data),
  updateSecretCode: (id, data) => http.patch(`/secret-codes/${id}`, data).then((r) => r.data),
  deleteSecretCode: (id) => http.delete(`/secret-codes/${id}`).then((r) => r.data),
  getSchedules: () => http.get("/schedules").then((r) => r.data),
  createSchedule: (data) => http.post("/schedules", data).then((r) => r.data),
  updateSchedule: (id, data) => http.patch(`/schedules/${id}`, data).then((r) => r.data),
  deleteSchedule: (id) => http.delete(`/schedules/${id}`).then((r) => r.data),
  schedulesDue: () => http.get("/schedules/due").then((r) => r.data),
  scheduleFired: (id) => http.post(`/schedules/${id}/fired`).then((r) => r.data),
  mindlineStart: () => http.post("/mindline/start").then((r) => r.data),
  mindlineTurn: (session_id, message) =>
    http.post("/mindline/turn", { session_id, message }).then((r) => r.data),
  mindlineLeaderboard: () => http.get("/mindline/leaderboard").then((r) => r.data),
  adventureStart: (story = "starfall") =>
    http.post("/adventure/start", { story }).then((r) => r.data),
  adventureChoose: (session_id, choice) =>
    http.post("/adventure/choose", { session_id, choice }).then((r) => r.data),
  adventureStories: () => http.get("/adventure/stories").then((r) => r.data),
  adventureAiStart: (theme) => http.post("/adventure/ai/start", { theme }).then((r) => r.data),
  adventureAiChoose: (session_id, choice) =>
    http.post("/adventure/ai/choose", { session_id, choice }).then((r) => r.data),
  getVoicemails: () => http.get("/voicemails").then((r) => r.data),
  createVoicemail: (program_slug) => http.post("/voicemails", { program_slug }).then((r) => r.data),
  markVoicemail: (id) => http.patch(`/voicemails/${id}`).then((r) => r.data),
  deleteVoicemail: (id) => http.delete(`/voicemails/${id}`).then((r) => r.data),
};

// Tiny silent clip used to unlock HTMLAudio playback on a user gesture (iOS/Safari).
export const SILENT_CLIP =
  "data:audio/wav;base64,UklGRsQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YaAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA";

// Resume the WebAudio context if the browser suspended it (autoplay policy).
export function resumeAudioCtx() {
  try {
    const c = ctx();
    if (c.state === "suspended") c.resume();
  } catch (e) {}
}

// Simple WebAudio DTMF tones + dial tone
let audioCtx = null;
function ctx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
  }
  return audioCtx;
}

const DTMF = {
  "1": [697, 1209], "2": [697, 1336], "3": [697, 1477],
  "4": [770, 1209], "5": [770, 1336], "6": [770, 1477],
  "7": [852, 1209], "8": [852, 1336], "9": [852, 1477],
  "*": [941, 1209], "0": [941, 1336], "#": [941, 1477],
};

export function playTone(key) {
  try {
    const pair = DTMF[key];
    if (!pair) return;
    const c = ctx();
    const gain = c.createGain();
    gain.gain.value = 0.08;
    gain.connect(c.destination);
    pair.forEach((f) => {
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      osc.connect(gain);
      osc.start();
      osc.stop(c.currentTime + 0.16);
    });
  } catch (e) {}
}

export function playDialTone(duration = 1.2) {
  try {
    const c = ctx();
    const gain = c.createGain();
    gain.gain.value = 0.05;
    gain.connect(c.destination);
    [350, 440].forEach((f) => {
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      osc.connect(gain);
      osc.start();
      osc.stop(c.currentTime + duration);
    });
  } catch (e) {}
}

export function playBeep() {
  try {
    const c = ctx();
    const gain = c.createGain();
    gain.gain.value = 0.12;
    gain.connect(c.destination);
    const osc = c.createOscillator();
    osc.type = "square";
    osc.frequency.value = 880;
    osc.connect(gain);
    osc.start();
    osc.stop(c.currentTime + 0.28);
  } catch (e) {}
}

// Retro MindLine SFX (placeholders until Seed Audio 1.0)
export function playStartup() {
  try {
    const c = ctx();
    [523, 659, 784, 1047].forEach((f, i) => {
      const g = c.createGain();
      g.gain.value = 0.05;
      g.connect(c.destination);
      const o = c.createOscillator();
      o.type = "square";
      o.frequency.value = f;
      o.connect(g);
      o.start(c.currentTime + i * 0.11);
      o.stop(c.currentTime + i * 0.11 + 0.1);
    });
  } catch (e) {}
}

export function playParity() {
  try {
    const c = ctx();
    const g = c.createGain();
    g.gain.value = 0.08;
    g.connect(c.destination);
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(1200, c.currentTime);
    o.frequency.linearRampToValueAtTime(180, c.currentTime + 0.5);
    o.frequency.linearRampToValueAtTime(1500, c.currentTime + 0.9);
    o.connect(g);
    o.start();
    o.stop(c.currentTime + 1.0);
    const o2 = c.createOscillator();
    o2.type = "square";
    o2.frequency.value = 95;
    o2.connect(g);
    o2.start();
    o2.stop(c.currentTime + 1.0);
  } catch (e) {}
}

export function playReboot() {
  try {
    const c = ctx();
    const g = c.createGain();
    g.gain.value = 0.06;
    g.connect(c.destination);
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(180, c.currentTime);
    o.frequency.linearRampToValueAtTime(880, c.currentTime + 0.6);
    o.connect(g);
    o.start();
    o.stop(c.currentTime + 0.65);
  } catch (e) {}
}

export function playDisconnect() {
  try {
    const c = ctx();
    [480, 620].forEach((f) => {
      const g = c.createGain();
      g.gain.value = 0.05;
      g.connect(c.destination);
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.connect(g);
      o.start();
      o.stop(c.currentTime + 0.5);
    });
  } catch (e) {}
}

// Triumphant rising arpeggio for an adventure WIN ending.
export function playWin() {
  try {
    const c = ctx();
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((f, i) => {
      const g = c.createGain();
      const t = c.currentTime + i * 0.13;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.09, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      g.connect(c.destination);
      const o = c.createOscillator();
      o.type = "triangle";
      o.frequency.value = f;
      o.connect(g);
      o.start(t);
      o.stop(t + 0.4);
    });
  } catch (e) {}
}

// Somber descending tones for an adventure LOSE ending.
export function playLose() {
  try {
    const c = ctx();
    const notes = [392.0, 329.63, 261.63, 196.0];
    notes.forEach((f, i) => {
      const g = c.createGain();
      const t = c.currentTime + i * 0.22;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.08, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      g.connect(c.destination);
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.connect(g);
      o.start(t);
      o.stop(t + 0.55);
    });
  } catch (e) {}
}

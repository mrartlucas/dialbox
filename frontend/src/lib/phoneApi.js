import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const http = axios.create({ baseURL: API });

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
    http.post("/programs/fortune", { persona, question }).then((r) => r.data),
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
  getVoicemails: () => http.get("/voicemails").then((r) => r.data),
  createVoicemail: (program_slug) => http.post("/voicemails", { program_slug }).then((r) => r.data),
  markVoicemail: (id) => http.patch(`/voicemails/${id}`).then((r) => r.data),
  deleteVoicemail: (id) => http.delete(`/voicemails/${id}`).then((r) => r.data),
};

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

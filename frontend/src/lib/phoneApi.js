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
  mindlineIntro: () => http.get("/mindline/intro").then((r) => r.data),
  mindlineGreeting: (name) => http.post("/mindline/greeting", { name }).then((r) => r.data),
  mindlineReply: (message) => http.post("/mindline/reply", { message }).then((r) => r.data),
  mindlineSignoff: () => http.get("/mindline/signoff").then((r) => r.data),
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

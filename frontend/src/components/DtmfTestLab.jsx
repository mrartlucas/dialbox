import React, { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff, Play, Square, RotateCcw, ShieldAlert } from "lucide-react";
import {
  DtmfDetector,
  synthesizeDtmf,
  KEY_TO_FREQS,
  ALL_KEYS,
} from "../lib/dtmf";
import {
  emitExternalKey,
  getDevKeyboardEnabled,
  setDevKeyboardEnabled,
} from "../lib/dialboxKeys";

const GRID = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
];

const LIMITATIONS =
  "Cell2Jack behaves as telephone audio hardware, not as a Bluetooth keyboard. Bluetooth " +
  "microphone routing depends on the operating system, browser, and whether the device " +
  "exposes an active audio input. iPhone browser support may be limited. Successful browser " +
  "detection is not guaranteed until tested with real Cell2Jack hardware.";

export default function DtmfTestLab() {
  const [permission, setPermission] = useState("idle"); // idle | granted | denied
  const [error, setError] = useState("");
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [lastKey, setLastKey] = useState(null);
  const [flashKey, setFlashKey] = useState(null);
  const [tested, setTested] = useState({}); // key -> true once detected
  const [sensitivity, setSensitivity] = useState(0.5);
  const [acceptInput, setAcceptInput] = useState(false);
  const [devKeyboard, setDevKeyboardState] = useState(getDevKeyboardEnabled());
  const [simulating, setSimulating] = useState(false);

  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const detectorRef = useRef(new DtmfDetector({ minDurationMs: 40, gapMs: 50, sensitivity: 0.5 }));
  const bufRef = useRef(null);
  const acceptRef = useRef(false);
  useEffect(() => { acceptRef.current = acceptInput; }, [acceptInput]);
  useEffect(() => { detectorRef.current.setSensitivity(sensitivity); }, [sensitivity]);

  const ensureContext = useCallback(() => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctxRef.current = new Ctx();
    }
    if (!analyserRef.current) {
      const a = ctxRef.current.createAnalyser();
      a.fftSize = 2048;
      a.smoothingTimeConstant = 0;
      analyserRef.current = a;
      bufRef.current = new Float32Array(a.fftSize);
    }
    return ctxRef.current;
  }, []);

  const registerKey = useCallback((key) => {
    setLastKey(key);
    setFlashKey(key);
    setTested((t) => (t[key] ? t : { ...t, [key]: true }));
    setTimeout(() => setFlashKey((k) => (k === key ? null : k)), 220);
    if (acceptRef.current) emitExternalKey(key, "dtmf");
  }, []);

  const loop = useCallback(() => {
    const analyser = analyserRef.current;
    const ctx = ctxRef.current;
    if (!analyser || !ctx) return;
    analyser.getFloatTimeDomainData(bufRef.current);
    const res = detectorRef.current.push(bufRef.current, ctx.sampleRate, performance.now());
    setLevel(Math.min(1, detectorRef.current.lastLevel * 6));
    if (res && res.key) registerKey(res.key);
    rafRef.current = requestAnimationFrame(loop);
  }, [registerKey]);

  const listDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === "audioinput"));
    } catch {
      /* ignore */
    }
  }, []);

  const startMic = useCallback(async () => {
    setError("");
    try {
      const ctx = ensureContext();
      if (ctx.state === "suspended") await ctx.resume();
      const constraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setPermission("granted");
      await listDevices();
      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyserRef.current);
      sourceRef.current = src;
      detectorRef.current.reset();
      setListening(true);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      const name = e && e.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setPermission("denied");
        setError("Microphone permission was denied. Allow mic access in your browser and retry.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("No matching audio input device was found. Pick a different device and retry.");
      } else {
        setError(`Could not start the microphone: ${name || e}`);
      }
    }
  }, [deviceId, ensureContext, listDevices, loop]);

  const stopMic = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setListening(false);
    setLevel(0);
    try { sourceRef.current && sourceRef.current.disconnect(); } catch {}
    sourceRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Full teardown of audio resources on unmount.
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      try { sourceRef.current && sourceRef.current.disconnect(); } catch {}
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (ctxRef.current) { try { ctxRef.current.close(); } catch {} }
    };
  }, []);

  // Synthesize a real DTMF tone through the Web Audio graph so the live analyser + Goertzel
  // detector actually decode it — a true end-to-end test with no hardware.
  const playToneToAnalyser = useCallback(
    async (key, durationMs = 200) =>
      new Promise((resolve) => {
        const ctx = ensureContext();
        const analyser = analyserRef.current;
        const pair = KEY_TO_FREQS[key];
        const gain = ctx.createGain();
        gain.gain.value = 0.35;
        gain.connect(analyser); // into analyser only (silent — analyser has no output)
        const oscA = ctx.createOscillator();
        const oscB = ctx.createOscillator();
        oscA.frequency.value = pair.low;
        oscB.frequency.value = pair.high;
        oscA.connect(gain);
        oscB.connect(gain);
        const now = ctx.currentTime;
        oscA.start(now);
        oscB.start(now);
        oscA.stop(now + durationMs / 1000);
        oscB.stop(now + durationMs / 1000);
        oscB.onended = () => {
          try { gain.disconnect(); } catch {}
          resolve();
        };
      }),
    [ensureContext]
  );

  const ensureLoopRunning = useCallback(async () => {
    const ctx = ensureContext();
    if (ctx.state === "suspended") await ctx.resume();
    if (!rafRef.current) {
      detectorRef.current.reset();
      rafRef.current = requestAnimationFrame(loop);
    }
  }, [ensureContext, loop]);

  const simulateKey = useCallback(async (key) => {
    await ensureLoopRunning();
    await playToneToAnalyser(key, 200);
  }, [ensureLoopRunning, playToneToAnalyser]);

  const runSimulatedTest = useCallback(async () => {
    setSimulating(true);
    setError("");
    setTested({});
    detectorRef.current.reset();
    await ensureLoopRunning();
    for (const key of ALL_KEYS) {
      // eslint-disable-next-line no-await-in-loop
      await playToneToAnalyser(key, 220);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 120)); // gap so duplicate-rejection resets
    }
    setSimulating(false);
  }, [ensureLoopRunning, playToneToAnalyser]);

  const resetTest = useCallback(() => {
    setTested({});
    setLastKey(null);
    detectorRef.current.reset();
  }, []);

  const toggleDevKeyboard = useCallback(() => {
    const next = !devKeyboard;
    setDevKeyboardState(next);
    setDevKeyboardEnabled(next);
  }, [devKeyboard]);

  const testedCount = Object.keys(tested).length;

  return (
    <div className="space-y-5 font-mono text-neutral-200" data-testid="dtmf-test-lab">
      <div className="flex items-start gap-2 rounded-sm border border-amber-600/50 bg-amber-950/30 p-3 text-[11px] leading-relaxed text-amber-300/90">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <p data-testid="dtmf-limitations">{LIMITATIONS}</p>
      </div>

      <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-500">
        Experimental hardware-testing tool · not guaranteed production support
      </p>

      {/* Controls */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2 rounded-sm border border-neutral-800 bg-neutral-950/60 p-3">
          <label className="block text-[10px] uppercase tracking-widest text-neutral-500">
            Audio input device
          </label>
          <select
            data-testid="dtmf-device-select"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            className="w-full rounded-sm border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-xs"
          >
            <option value="">Default input</option>
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Input ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
          <div className="flex gap-2 pt-1">
            {!listening ? (
              <button
                data-testid="dtmf-start-btn"
                onClick={startMic}
                className="tactile flex flex-1 items-center justify-center gap-2 rounded-sm border-2 border-[#39ff14] bg-[#39ff14]/15 px-3 py-2 text-xs font-bold uppercase tracking-widest crt-glow"
              >
                <Mic className="h-4 w-4" /> Start listening
              </button>
            ) : (
              <button
                data-testid="dtmf-stop-btn"
                onClick={stopMic}
                className="tactile flex flex-1 items-center justify-center gap-2 rounded-sm border-2 border-red-500 bg-red-500/15 px-3 py-2 text-xs font-bold uppercase tracking-widest text-red-300"
              >
                <MicOff className="h-4 w-4" /> Stop
              </button>
            )}
          </div>
          {error && (
            <p data-testid="dtmf-error" className="pt-1 text-[11px] text-red-400">
              {error}
            </p>
          )}
          <p className="text-[10px] text-neutral-500">
            Permission:{" "}
            <span
              data-testid="dtmf-permission-state"
              className={
                permission === "granted"
                  ? "text-[#39ff14]"
                  : permission === "denied"
                  ? "text-red-400"
                  : "text-neutral-400"
              }
            >
              {permission}
            </span>
          </p>
        </div>

        <div className="space-y-3 rounded-sm border border-neutral-800 bg-neutral-950/60 p-3">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-neutral-500">
              Input level
            </label>
            <div className="mt-1 h-3 w-full overflow-hidden rounded-sm border border-neutral-700 bg-neutral-900">
              <div
                data-testid="dtmf-level-meter"
                className="h-full bg-[#39ff14] transition-[width] duration-75"
                style={{ width: `${Math.round(level * 100)}%` }}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-neutral-500">
              Detection sensitivity: {(sensitivity * 100).toFixed(0)}%
            </label>
            <input
              data-testid="dtmf-sensitivity"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              className="w-full accent-[#39ff14]"
            />
          </div>
          <label className="flex items-center justify-between text-[11px]">
            <span>Accept DTMF input (feed the live DialBox)</span>
            <input
              data-testid="dtmf-accept-toggle"
              type="checkbox"
              checked={acceptInput}
              onChange={(e) => setAcceptInput(e.target.checked)}
              className="h-4 w-4 accent-[#39ff14]"
            />
          </label>
          <label className="flex items-center justify-between text-[11px]">
            <span>Enable Development Keyboard Controls</span>
            <input
              data-testid="dev-keyboard-toggle"
              type="checkbox"
              checked={devKeyboard}
              onChange={toggleDevKeyboard}
              className="h-4 w-4 accent-[#39ff14]"
            />
          </label>
        </div>
      </div>

      {/* Last detected + grid */}
      <div className="rounded-sm border border-neutral-800 bg-neutral-950/60 p-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-neutral-500">
            Last detected key
          </span>
          <span data-testid="dtmf-last-key" className="text-2xl font-bold text-[#39ff14] crt-glow">
            {lastKey || "—"}
          </span>
        </div>
        <div className="mx-auto grid max-w-[240px] grid-cols-3 gap-2">
          {GRID.flat().map((k) => {
            const on = flashKey === k;
            const done = !!tested[k];
            return (
              <div
                key={k}
                data-testid={`dtmf-key-${k === "*" ? "star" : k === "#" ? "hash" : k}`}
                data-detected={done ? "true" : "false"}
                className={`flex h-14 flex-col items-center justify-center rounded-sm border-2 text-lg font-bold transition-colors duration-100 ${
                  on
                    ? "border-[#39ff14] bg-[#39ff14]/30 text-white"
                    : done
                    ? "border-[#39ff14]/70 bg-[#39ff14]/10 text-[#39ff14]"
                    : "border-neutral-700 bg-neutral-900 text-neutral-400"
                }`}
              >
                {k}
                <span className="text-[8px] font-normal text-neutral-500">
                  {KEY_TO_FREQS[k].low}/{KEY_TO_FREQS[k].high}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-center text-[11px] text-neutral-400">
          Keypad test:{" "}
          <span data-testid="dtmf-tested-count" className="text-[#39ff14]">
            {testedCount}/12
          </span>{" "}
          keys detected
          {testedCount === 12 && <span className="ml-1 text-[#39ff14]">✓ complete</span>}
        </p>
      </div>

      {/* Simulated generator */}
      <div className="flex flex-wrap gap-2">
        <button
          data-testid="dtmf-simulate-all-btn"
          onClick={runSimulatedTest}
          disabled={simulating}
          className="tactile flex items-center gap-2 rounded-sm border-2 border-sky-500 bg-sky-500/15 px-3 py-2 text-xs font-bold uppercase tracking-widest text-sky-300 disabled:opacity-40"
        >
          <Play className="h-4 w-4" /> {simulating ? "Simulating…" : "Run simulated test (no hardware)"}
        </button>
        <button
          data-testid="dtmf-reset-btn"
          onClick={resetTest}
          className="tactile flex items-center gap-2 rounded-sm border-2 border-neutral-600 bg-neutral-800 px-3 py-2 text-xs font-bold uppercase tracking-widest"
        >
          <RotateCcw className="h-4 w-4" /> Reset test
        </button>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {ALL_KEYS.map((k) => (
          <button
            key={k}
            data-testid={`dtmf-sim-key-${k === "*" ? "star" : k === "#" ? "hash" : k}`}
            onClick={() => simulateKey(k)}
            className="tactile rounded-sm border border-neutral-700 bg-neutral-900 py-1.5 text-sm font-bold text-neutral-200 hover:border-sky-500"
          >
            {k}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-neutral-500">
        "Run simulated test" synthesizes each real DTMF tone-pair through the Web Audio graph and
        feeds the same Goertzel detector used for live microphone input — no Cell2Jack required.
      </p>
    </div>
  );
}

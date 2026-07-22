// ---------------------------------------------------------------------------
// DTMF (touch-tone) detection — pure, UI-free, framework-free.
//
// This module intentionally has NO React / Web Audio dependency so it can be:
//   • unit-tested in Node/Jest by feeding synthesized samples,
//   • driven live from a Web Audio AnalyserNode in the browser,
//   • reused later by a native iOS/Android app or a telephony backend.
//
// It uses the Goertzel algorithm (an efficient single-bin DFT) to measure the
// energy at each of the 8 standard DTMF frequencies and decodes the low/high pair.
// ---------------------------------------------------------------------------

export const LOW_FREQS = [697, 770, 852, 941];
export const HIGH_FREQS = [1209, 1336, 1477];

// [lowIndex][highIndex] -> key
export const DTMF_MATRIX = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
];

export const KEY_TO_FREQS = (() => {
  const m = {};
  for (let l = 0; l < LOW_FREQS.length; l++) {
    for (let h = 0; h < HIGH_FREQS.length; h++) {
      m[DTMF_MATRIX[l][h]] = { low: LOW_FREQS[l], high: HIGH_FREQS[h] };
    }
  }
  return m;
})();

export const ALL_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

// Goertzel power for a single target frequency over a block of time-domain samples.
export function goertzelPower(samples, sampleRate, targetFreq) {
  const n = samples.length;
  const k = Math.round((n * targetFreq) / sampleRate);
  const omega = (2 * Math.PI * k) / n;
  const coeff = 2 * Math.cos(omega);
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < n; i++) {
    s0 = samples[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  const power = s1 * s1 + s2 * s2 - coeff * s1 * s2;
  return power / n; // normalize by block size
}

export function rms(samples) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

const DEFAULTS = {
  // A detected group frequency must dominate the other candidates in its group by this
  // factor, and the low/high powers must be within this "twist" factor of each other.
  dominanceRatio: 4,
  maxTwist: 8,
  // Minimum absolute power (per-freq, normalized) to count as signal (noise floor).
  noiseFloor: 0.0008,
  // Minimum overall RMS of the block to bother analyzing.
  minRms: 0.008,
};

// Analyze one block of samples. Returns { key, confidence, level, lowFreq, highFreq } or null.
// `sensitivity` 0..1 scales the thresholds (higher = more sensitive / lower thresholds).
export function detectDtmfFromSamples(samples, sampleRate, opts = {}) {
  const cfg = { ...DEFAULTS, ...opts };
  const sens = typeof opts.sensitivity === "number" ? opts.sensitivity : 0.5;
  const scale = 1 / (0.25 + 1.5 * sens); // sens 0 -> 4x thresholds, 1 -> ~0.57x
  const noiseFloor = cfg.noiseFloor * scale;
  const minRms = cfg.minRms * scale;

  const level = rms(samples);
  if (level < minRms) return null;

  const lowPowers = LOW_FREQS.map((f) => goertzelPower(samples, sampleRate, f));
  const highPowers = HIGH_FREQS.map((f) => goertzelPower(samples, sampleRate, f));

  const pick = (powers) => {
    let best = 0;
    let second = 0;
    let idx = -1;
    for (let i = 0; i < powers.length; i++) {
      if (powers[i] > best) {
        second = best;
        best = powers[i];
        idx = i;
      } else if (powers[i] > second) {
        second = powers[i];
      }
    }
    return { idx, best, second };
  };

  const lo = pick(lowPowers);
  const hi = pick(highPowers);
  if (lo.idx < 0 || hi.idx < 0) return null;

  // Must clear the noise floor.
  if (lo.best < noiseFloor || hi.best < noiseFloor) return null;

  // Each winner must dominate the runner-up in its own group (rejects noise / speech).
  if (lo.best < lo.second * cfg.dominanceRatio) return null;
  if (hi.best < hi.second * cfg.dominanceRatio) return null;

  // Low vs high energies must be reasonably balanced (twist).
  const twist = lo.best > hi.best ? lo.best / hi.best : hi.best / lo.best;
  if (twist > cfg.maxTwist) return null;

  const key = DTMF_MATRIX[lo.idx][hi.idx];
  // Confidence: how strongly the pair beats the surrounding noise (0..1).
  const dom = Math.min(
    lo.best / (lo.second * cfg.dominanceRatio),
    hi.best / (hi.second * cfg.dominanceRatio)
  );
  const confidence = Math.max(0, Math.min(1, (dom - 1) / 4 + 0.5));

  return {
    key,
    confidence,
    level,
    lowFreq: LOW_FREQS[lo.idx],
    highFreq: HIGH_FREQS[hi.idx],
  };
}

// Stateful detector applied across successive blocks: enforces a minimum tone duration,
// debounce, and duplicate-tone rejection (a gap of silence is required before the same
// key can fire again). Emits a confirmed key ONCE per press.
export class DtmfDetector {
  constructor(opts = {}) {
    this.opts = opts;
    this.minDurationMs = opts.minDurationMs ?? 40;
    this.gapMs = opts.gapMs ?? 40; // silence needed before the same key can re-fire
    this.sensitivity = opts.sensitivity ?? 0.5;
    this.reset();
  }

  reset() {
    this._candidate = null;
    this._candidateSince = 0;
    this._fired = false;
    this._lastFiredKey = null;
    this._silentSince = 0;
    this.lastLevel = 0;
  }

  setSensitivity(s) {
    this.sensitivity = s;
  }

  // Feed one block. Returns a detection object (with .key) exactly once when a tone is
  // confirmed, otherwise null. Always updates lastLevel.
  push(samples, sampleRate, nowMs) {
    const res = detectDtmfFromSamples(samples, sampleRate, {
      ...this.opts,
      sensitivity: this.sensitivity,
    });
    this.lastLevel = res ? res.level : rms(samples);

    if (!res) {
      // silence / no valid tone
      if (this._silentSince === 0) this._silentSince = nowMs;
      // Require a gap before the same key can fire again.
      if (nowMs - this._silentSince >= this.gapMs) {
        this._lastFiredKey = null;
      }
      this._candidate = null;
      this._candidateSince = 0;
      this._fired = false;
      return null;
    }

    this._silentSince = 0;

    if (res.key !== this._candidate) {
      this._candidate = res.key;
      this._candidateSince = nowMs;
      this._fired = false;
      return null;
    }

    // Same candidate as last block — check duration.
    if (
      !this._fired &&
      nowMs - this._candidateSince >= this.minDurationMs &&
      res.key !== this._lastFiredKey // duplicate rejection until a gap resets it
    ) {
      this._fired = true;
      this._lastFiredKey = res.key;
      return res;
    }
    return null;
  }
}

// Synthesize a DTMF tone (sum of the two sines) as a Float32Array. Used for the simulated
// generator and for unit tests. `noise` (0..1) adds white noise for tolerance testing.
export function synthesizeDtmf(key, sampleRate = 44100, durationMs = 120, opts = {}) {
  const pair = KEY_TO_FREQS[key];
  if (!pair) throw new Error(`Unknown DTMF key: ${key}`);
  const amp = opts.amplitude ?? 0.4;
  const noise = opts.noise ?? 0;
  const n = Math.floor((sampleRate * durationMs) / 1000);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let v =
      amp * Math.sin(2 * Math.PI * pair.low * t) +
      amp * Math.sin(2 * Math.PI * pair.high * t);
    if (noise > 0) v += noise * (Math.random() * 2 - 1);
    out[i] = v;
  }
  return out;
}

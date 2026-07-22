import {
  ALL_KEYS,
  KEY_TO_FREQS,
  detectDtmfFromSamples,
  synthesizeDtmf,
  DtmfDetector,
  goertzelPower,
} from "./dtmf";

const SR = 44100;

describe("DTMF Goertzel detection — all twelve keys", () => {
  test.each(ALL_KEYS)("detects key '%s' from a synthesized tone pair", (key) => {
    const samples = synthesizeDtmf(key, SR, 120);
    const res = detectDtmfFromSamples(samples, SR, { sensitivity: 0.5 });
    expect(res).not.toBeNull();
    expect(res.key).toBe(key);
    expect(res.lowFreq).toBe(KEY_TO_FREQS[key].low);
    expect(res.highFreq).toBe(KEY_TO_FREQS[key].high);
    expect(res.confidence).toBeGreaterThan(0);
  });
});

describe("Goertzel primitive", () => {
  test("peaks at the target frequency", () => {
    const n = 2048;
    const s = new Float32Array(n);
    for (let i = 0; i < n; i++) s[i] = Math.sin((2 * Math.PI * 770 * i) / SR);
    const onTarget = goertzelPower(s, SR, 770);
    const offTarget = goertzelPower(s, SR, 1477);
    expect(onTarget).toBeGreaterThan(offTarget * 50);
  });
});

describe("Rejection of invalid input", () => {
  test("silence yields no key", () => {
    const s = new Float32Array(2048); // all zeros
    expect(detectDtmfFromSamples(s, SR)).toBeNull();
  });

  test("a single pure tone (not a valid DTMF pair) yields no key", () => {
    const n = 2048;
    const s = new Float32Array(n);
    for (let i = 0; i < n; i++) s[i] = 0.5 * Math.sin((2 * Math.PI * 1000 * i) / SR);
    expect(detectDtmfFromSamples(s, SR)).toBeNull();
  });

  test("two non-DTMF frequencies yield no key", () => {
    const n = 2048;
    const s = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      s[i] = 0.4 * Math.sin(2 * Math.PI * 500 * t) + 0.4 * Math.sin(2 * Math.PI * 1800 * t);
    }
    expect(detectDtmfFromSamples(s, SR)).toBeNull();
  });

  test("broadband noise alone yields no key", () => {
    const n = 2048;
    const s = new Float32Array(n);
    for (let i = 0; i < n; i++) s[i] = (Math.random() * 2 - 1) * 0.3;
    // Noise should almost never resolve to a clean dominant pair.
    expect(detectDtmfFromSamples(s, SR)).toBeNull();
  });
});

describe("Noise tolerance", () => {
  test.each(["5", "*", "#", "0"])("still detects '%s' with added white noise", (key) => {
    const samples = synthesizeDtmf(key, SR, 120, { noise: 0.05 });
    const res = detectDtmfFromSamples(samples, SR, { sensitivity: 0.6 });
    expect(res).not.toBeNull();
    expect(res.key).toBe(key);
  });
});

describe("DtmfDetector — duration, debounce, duplicate rejection", () => {
  const block = (key) => synthesizeDtmf(key, SR, 30); // ~30ms blocks (reliable detection)

  test("does not fire before minimum tone duration is met", () => {
    const det = new DtmfDetector({ minDurationMs: 40, gapMs: 30 });
    const b = block("5");
    // First block establishes the candidate; too short to fire yet.
    expect(det.push(b, SR, 0)).toBeNull();
    expect(det.push(b, SR, 10)).toBeNull();
    expect(det.push(b, SR, 20)).toBeNull();
  });

  test("fires exactly once after the tone is held long enough", () => {
    const det = new DtmfDetector({ minDurationMs: 40, gapMs: 30 });
    const b = block("7");
    det.push(b, SR, 0);
    det.push(b, SR, 20);
    const fire = det.push(b, SR, 60); // >= 40ms held
    expect(fire).not.toBeNull();
    expect(fire.key).toBe("7");
    // Held further without a gap -> must NOT re-fire (debounce / duplicate rejection).
    expect(det.push(b, SR, 80)).toBeNull();
    expect(det.push(b, SR, 100)).toBeNull();
  });

  test("same key can fire again only after a silent gap", () => {
    const det = new DtmfDetector({ minDurationMs: 40, gapMs: 40 });
    const b = block("3");
    const silence = new Float32Array(SR * 0.012); // ~12ms silence
    det.push(b, SR, 0);
    det.push(b, SR, 20);
    expect(det.push(b, SR, 60).key).toBe("3");
    // Silence long enough to clear the lock.
    det.push(silence, SR, 80);
    det.push(silence, SR, 140);
    // Press again.
    det.push(b, SR, 160);
    det.push(b, SR, 180);
    const second = det.push(b, SR, 220);
    expect(second).not.toBeNull();
    expect(second.key).toBe("3");
  });
});

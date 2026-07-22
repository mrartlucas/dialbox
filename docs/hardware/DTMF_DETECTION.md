# DTMF Detection (Goertzel)

Implementation: `frontend/src/lib/dtmf.js` — pure, framework-free, UI-free so it can be reused
by the browser Test Lab, Jest unit tests, and future native/telephony consumers without change.

## Goertzel algorithm overview
The Goertzel algorithm is an efficient single-bin DFT: instead of a full FFT it computes the
energy at one target frequency in O(N). We run it for each of the 8 standard DTMF frequencies
over each incoming block of time-domain samples and decode the dominant low/high pair.

## Supported frequencies (standard 4×3 DTMF grid)
| | 1209 Hz | 1336 Hz | 1477 Hz |
|---|---|---|---|
| **697 Hz** | 1 | 2 | 3 |
| **770 Hz** | 4 | 5 | 6 |
| **852 Hz** | 7 | 8 | 9 |
| **941 Hz** | * | 0 | # |

(The fourth high-column at 1633 Hz — A/B/C/D — is intentionally not used.)

## Detection pipeline
1. **RMS gate** — blocks below a minimum RMS are treated as silence (skip analysis).
2. **Per-frequency Goertzel power** — normalized by block size.
3. **Group winners** — strongest low-group freq and strongest high-group freq.
4. **Noise floor** — each winner must exceed an absolute normalized-power floor.
5. **Dominance** — each winner must exceed its own group's runner-up by `dominanceRatio` (default 4×). This rejects speech/noise that lacks two clean tones.
6. **Twist** — low vs high power must be within `maxTwist` (default 8×) of each other (a valid DTMF pair is roughly balanced).
7. **Decode** — map (lowIndex, highIndex) → key.

## Thresholds & sensitivity
- `noiseFloor` (default 0.0008), `minRms` (0.008), `dominanceRatio` (4), `maxTwist` (8).
- A single `sensitivity` control (0..1) scales `noiseFloor`/`minRms` (higher sensitivity → lower thresholds). Exposed in the Test Lab as a slider.

## Debounce strategy (`DtmfDetector` class, stateful across blocks)
- **Minimum tone duration** (`minDurationMs`, default 40 ms): a candidate key must persist across consecutive blocks for at least this long before it fires.
- **Fire once per press**: after firing, the key is latched and will not re-fire while held.
- **Duplicate rejection + gap**: the same key can only fire again after a silent `gapMs` (default ~50 ms) resets the latch. Different keys can follow immediately.

## Noise rejection
- Dominance + twist checks reject broadband noise and single stray tones.
- Optional white-noise tolerance verified in tests (detects correctly with added noise at moderate sensitivity).

## Confidence scoring
`confidence` (0..1) is derived from how far the detected pair beats the dominance threshold over
the surrounding runner-up energies. Useful for logging / future thresholding.

## Test methodology
- **Unit (Jest):** `frontend/src/lib/dtmf.test.js` synthesizes each of the 12 tone-pairs and asserts the detector returns the correct key; covers min-duration, debounce, duplicate rejection, noise tolerance, and rejection of invalid pairs (silence, single tone, non-DTMF pair, broadband noise).
- **Integration (UI):** the Test Lab's "Run simulated test" synthesizes real DTMF tones through the Web Audio graph into the same AnalyserNode → Goertzel loop used for live mic input, then verifies each on-screen key highlights and that all 12 complete.
- **Live hardware:** microphone/Cell2Jack path — see `CELL2JACK_LIMITATIONS.md`.

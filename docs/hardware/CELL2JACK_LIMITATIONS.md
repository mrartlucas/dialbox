# Cell2Jack & Browser DTMF — Limitations

> **Notice shown in the app:** *Cell2Jack behaves as telephone audio hardware, not as a
> Bluetooth keyboard. Bluetooth microphone routing depends on the operating system, browser,
> and whether the device exposes an active audio input. iPhone browser support may be limited.
> Successful browser detection is not guaranteed until tested with real Cell2Jack hardware.*

## What Cell2Jack actually is
Cell2Jack connects a **traditional analog telephone to a cellular phone** by bridging the
handset audio and the phone's call audio. It is **telephone AUDIO hardware** — it is **not** a
Bluetooth keyboard, Bluetooth HID device, or game controller. Physical keypad presses on the
attached phone are produced as **DTMF audio tones**, not as browser `keydown` events. Any
browser-side "keypad" detection therefore has to happen by **listening to audio and decoding
DTMF**, which is exactly what the DTMF Test Lab does — experimentally.

## Browser limitations
- Microphone capture requires **HTTPS** (or `localhost`) and an explicit user permission grant.
- `getUserMedia` audio constraints (`echoCancellation`, `noiseSuppression`, `autoGainControl`) are **advisory**; some browsers ignore or force them, which can distort tones. We request them **off** for cleaner DTMF but cannot guarantee compliance.
- Device labels from `enumerateDevices()` are empty until permission is granted.
- Autoplay/AudioContext may start **suspended** until a user gesture resumes it.

## iOS limitations
- Microphone/`getUserMedia` in browsers works reliably only in **Safari**; third-party browsers on iOS are constrained by WebKit.
- iOS aggressively manages audio routing and Bluetooth profiles (HFP vs A2DP); a Bluetooth call-audio device may **not** be exposed as a selectable Web Audio input at all.
- Background/lock-screen audio capture is restricted.
- **Assume iOS browser DTMF detection may not work** until proven on-device.

## Android limitations
- Generally better `getUserMedia` support across browsers (Chrome recommended).
- Bluetooth SCO/HFP routing to the web layer is inconsistent across OEMs; the OS may route call audio to a channel the browser cannot read.
- Sample-rate/AGC behavior varies by device.

## Bluetooth audio routing (the core risk)
Whether Cell2Jack's audio reaches the browser depends on a chain outside our control:
`Cell2Jack → cellular phone → OS audio routing → Bluetooth profile → browser audio-input device`.
If the OS routes call audio to the earpiece/HFP path and does not expose it as a capturable
**input**, the browser simply never receives the tones. This cannot be fixed in JavaScript.

## DTMF considerations
- Standard tones (see `DTMF_DETECTION.md`) are short (~40–100 ms). Aggressive noise suppression / AGC can suppress or distort them.
- Codec compression on a live cellular call can shift/attenuate tone energy, lowering detection confidence.
- Line noise requires the dominance + twist + noise-floor checks; sensitivity may need tuning per setup.

## Supported vs unsupported (today)
| Scenario | Status |
|---|---|
| On-screen keypad | ✅ Fully supported |
| Computer keyboard (dev) | ✅ Supported |
| Voice number commands | ✅ Supported (browser speech support permitting) |
| Simulated DTMF (Web Audio → detector) | ✅ Supported (no hardware) |
| Live mic DTMF on desktop Chrome | ⚠️ Experimental — works in controlled tests |
| Cell2Jack over Bluetooth call audio | ❓ Unverified — depends on OS/browser routing |
| iOS browser live DTMF | ❌ Likely limited — unverified |

## Testing checklist (with real hardware)
1. Serve over HTTPS; grant mic permission; confirm `permission = granted`.
2. Enumerate devices; confirm the Cell2Jack/call-audio input is **listed and selectable**.
3. Select it; Start listening; watch the **input level** meter respond to call audio.
4. Press each of the 12 keys on the physical phone; confirm the correct on-screen key highlights.
5. Tune **sensitivity** until all 12 are reliably detected without false positives.
6. Enable **Accept DTMF input** and confirm keys drive the live DialBox (`source = "dtmf"`).
7. Repeat on target OS/browser combinations (desktop Chrome, Android Chrome, iOS Safari).
8. Document which combinations actually work — do **not** assume; verify.

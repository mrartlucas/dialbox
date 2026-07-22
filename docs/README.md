# DialBox — Technical Documentation Index

Central index for DialBox hardware, telephony, and architecture documentation.

## Hardware & Telephony (`docs/hardware/`)
| Document | Purpose |
|---|---|
| [HARDWARE_SHOPPING_LIST.md](hardware/HARDWARE_SHOPPING_LIST.md) | Parts list for "The Line" Raspberry-Pi prototype (Phase-1 physical build). |
| [CELL2JACK_LIMITATIONS.md](hardware/CELL2JACK_LIMITATIONS.md) | Browser / iOS / Android / Bluetooth-audio limitations for Cell2Jack + DTMF. |
| [TELEPHONE_INTEGRATION_PLAN.md](hardware/TELEPHONE_INTEGRATION_PLAN.md) | Production telephone-mode architecture (traditional phone → Cell2Jack → telephony provider → DialBox backend). |
| [DTMF_DETECTION.md](hardware/DTMF_DETECTION.md) | Goertzel-based DTMF detector: frequencies, thresholds, debounce, confidence, test methodology. |
| [HARDWARE_ROADMAP.md](hardware/HARDWARE_ROADMAP.md) | Phased roadmap: browser simulator → Cell2Jack → native mobile → telephony → dedicated hardware. |

## Related code
- **Shared keypad dispatcher:** `frontend/src/lib/dialboxKeys.js` (`dispatchDialBoxKey`-compatible contract, valid keys/sources).
- **DTMF detector (UI-free, reusable):** `frontend/src/lib/dtmf.js` + unit tests `frontend/src/lib/dtmf.test.js`.
- **DTMF Test Lab UI:** `frontend/src/components/DtmfTestLab.jsx` (opened from the header "DTMF Test Lab" button).

> All input sources — on-screen keypad, computer keyboard, voice, DTMF audio, telephone, and
> tests — funnel through a single dispatcher into `onKey()` so menu-navigation logic is never
> duplicated per input method.

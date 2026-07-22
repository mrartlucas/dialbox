# DialBox — Hardware & Platform Roadmap

A phased path from the current browser toy to dedicated physical hardware. Each phase is
independently useful and preserves the previous surface.

## Phase 1 — Browser simulator ✅ (current)
- React CRA app + FastAPI/MongoDB backend.
- Full IVR: Fortune Caller oracles, Dial-4 Adventure, Trivia, MindLine, Knock-Knock, Magic 8,
  secret codes, voicemail.
- Shared input dispatcher: on-screen keypad, computer keyboard (dev), and voice all route
  through `dispatchDialBoxKey(key, source)` → `onKey`.
- Deliverable of this phase: solid, testable software core. **Done.**

## Phase 2 — Cell2Jack experimental support 🧪 (current work)
- Experimental **Cell2Jack / DTMF Test Lab** (browser): mic capture, device selection, live
  Goertzel DTMF detection, sensitivity, simulated tone generator, 12-key test, cleanup.
- Detected keys can feed the live DialBox via the dispatcher (`source = "dtmf"`).
- Explicitly **experimental** — browser/OS/Bluetooth limits documented in `CELL2JACK_LIMITATIONS.md`.
- Goal: learn what actually works on real hardware before committing to a path.

## Phase 3 — Native mobile app 📱 (future)
- iOS/Android app reusing the UI-free DTMF detector and existing backend endpoints.
- Native audio sessions to bypass browser Bluetooth-routing limitations.
- Optional: offline caching of prompts, push-based scheduled calls.

## Phase 4 — Telephony integration ☎️ (future)
- Real DID (phone number) via a programmable-voice provider (Twilio/Telnyx/etc.) or self-hosted
  Asterisk/FreeSWITCH.
- Vintage phone → Cell2Jack → cellular call → DialBox number → provider → backend.
- Requires moving the IVR state machine server-side (see `TELEPHONE_INTEGRATION_PLAN.md`).
- Milestone: call a phone number and talk to DialBox with no browser involved.

## Phase 5 — Dedicated DialBox hardware 🛠️ (long-term)
- Raspberry-Pi build inside a gutted touch-tone phone (see `HARDWARE_SHOPPING_LIST.md`):
  MT8870 DTMF decode, hook switch, ringer relay, message-waiting LED, USB handset audio.
- Eventually a plug-and-play RJ11 "answering machine" box (SLIC/FXS, custom PCB, enclosure) so
  any unmodified phone works.
- Milestone: a self-contained physical DialBox appliance.

## Guiding principles
- Keep the **single shared dispatcher** — every new input source is just another `source`.
- Keep the **DTMF detector UI-free** so it ports to native/telephony unchanged.
- Preserve the **browser simulator** as the dev/demo surface at every phase.

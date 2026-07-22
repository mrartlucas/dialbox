# DialBox — Telephone Integration Plan (Production Mode)

Status: **planning only.** Do not implement or purchase a telephony provider yet. This document
describes how the existing Python backend and DialBox program logic could connect to a real
phone network while preserving the browser simulator.

## Overall architecture
Recommended production call flow:

```
Traditional telephone
   → Cell2Jack
      → cellular telephone call
         → DialBox telephone number
            → telephony provider (SIP / programmable voice)
               → DTMF + voice streamed to the DialBox backend
                  → existing DialBox program logic (oracles, IVR, MindLine, etc.)
                     → TTS/audio streamed back to the caller
```

The key insight: DialBox's navigation is already funneled through a **single key dispatcher**
(`dispatchDialBoxKey(key, source)` → `onKey`). A telephony provider becomes just another
**source** (`"telephone"`) feeding the same logic — no menu rules are duplicated.

## Browser implementation (today)
- React CRA simulator. Inputs: on-screen keypad, computer keyboard, voice (Web Speech), and
  experimental DTMF (Web Audio + Goertzel). All route through the shared dispatcher.
- Backend: FastAPI + MongoDB; oracle/program logic and LLM/TTS orchestration already exist as
  HTTP endpoints (`/api/programs/*`).
- This stays the **development + demo** surface indefinitely.

## Native mobile implementation (future)
- A native iOS/Android app could reuse the **UI-free DTMF detector** (`lib/dtmf.js` port) and
  the same backend endpoints, with native audio capture that avoids browser Bluetooth-routing
  limits (see `CELL2JACK_LIMITATIONS.md`).
- Native apps can hold a foreground audio session and access call/Bluetooth audio more reliably.

## Telephony provider architecture (recommended production path)
Use a programmable-voice provider (e.g. Twilio Programmable Voice, Telnyx, Vonage, or a
self-hosted Asterisk/FreeSWITCH). Two integration styles:

1. **Provider-driven IVR callbacks (simplest to start):**
   - Buy a DID (phone number) from the provider.
   - Provider sends webhooks to a new backend router (e.g. `/api/telephony/voice`) on call
     start, on gathered DTMF, and on speech results.
   - Backend responds with provider markup (e.g. TwiML `<Gather input="dtmf speech">`,
     `<Play>` a TTS clip, `<Say>`).
   - Each gathered digit is translated into `dispatch("telephone", key)` server-side and run
     through a **headless version of the DialBox state machine** (see "Backend refactor").

2. **Media-streams / SIP (lowest latency, most control):**
   - Provider streams raw call audio to the backend over WebSocket/RTP.
   - Backend runs the same Goertzel DTMF detector on the inbound audio and STT for voice, then
     streams TTS audio back. Best for the "voice-first" oracle experience.

## Cell2Jack integration
- In the production flow Cell2Jack simply lets a **vintage analog phone place a normal cellular
  call** to the DialBox DID. From the provider's perspective it is an ordinary inbound call;
  DTMF/voice arrive normally. This sidesteps the browser Bluetooth-routing problem entirely.
- The browser DTMF Test Lab remains an **experimental local** path for tinkerers, separate from
  the production telephony path.

## Backend refactor required for telephony
Today the DialBox **state machine lives in the React client** (`PhoneSimulator.jsx`). For a
phone call there is no browser, so the navigation/state logic must be available **server-side**:
- Extract the IVR/program state machine into a backend module (Python) that maps
  `(session_id, key|speech)` → next prompt + audio, reusing existing `/api/programs/*` logic.
- Maintain per-call session state in MongoDB keyed by the provider's Call SID.
- The React simulator can then call the SAME backend state machine (thin client) — unifying
  browser and phone behavior and eliminating drift.

## Risks & recommendations
- **Cost:** per-minute + per-number charges; LLM/TTS cost per call. Add rate limiting + budget caps (reuse the existing 402 "out of minutes" handling).
- **Latency:** LLM+TTS round-trips must feel responsive on a call; pre-generate/caching and streaming TTS help. Media-streams path preferred for voice.
- **State duplication:** the biggest risk is logic drift between the client state machine and a server one — mitigate by moving the state machine to the backend and making the browser a client of it.
- **Security/abuse:** validate provider webhook signatures; guard against toll fraud and prompt-injection via spoken input.
- **Start small:** DID + provider-driven `<Gather>` IVR against a headless backend state machine is the cheapest way to validate the phone experience before investing in media streaming.
- **Preserve the simulator:** keep the browser build as the primary dev/demo surface throughout.

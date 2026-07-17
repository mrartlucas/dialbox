# PRD — Old-School Phone Revival Platform ("The Line")

## Problem Statement
A Raspberry Pi–based answering-machine box wired to a real touch-tone landline phone. Lift the
handset → an IVR dial menu launches interactive "programs" (Fortune, Adventure, Therapy, Love
Line, Pickup Lines, Haunted, Santa) plus hidden Easter-egg numbers. AI-voiced with acting-quality
performances. Includes a web config panel. Launch fully standalone (no subscription); entitlements
dormant. Full multi-phase roadmap in the original brief.

## User Choices (locked)
- First build = **Software Phone Simulator + Config Panel together** (de-risk Phases 2–5 without hardware).
- AI = **Emergent Universal LLM key** — GPT-5.2 for text, OpenAI `tts-1` for voice.
- Programs = **Fortune Teller only** for now (one at a time).
- **No authentication** (single-user local box).
- Aesthetic = **retro phone / CRT green**.

## Personas / Users
- Nostalgia & maker enthusiasts, families (kid-safe), adults, eventual mainstream buyers.

## Architecture (current)
- **Backend** FastAPI + MongoDB (`/app/backend/server.py`, `seed_data.py`). All routes under `/api`.
  - LLM via `emergentintegrations` LlmChat (`openai/gpt-5.2`) + `OpenAITextToSpeech` (`tts-1`, per-persona voice).
  - Collections: `programs`, `secret_codes`, `schedules` (uuid string ids, `_id` excluded).
  - Endpoints: `/menu`, `/personas`, `/programs`(GET,PATCH), `/session/dial`, `/programs/fortune`,
    `/tts`, `/secret-codes`(CRUD), `/schedules`(CRUD).
- **Frontend** React (`App.js` split layout). Components: `PhoneSimulator.jsx` (call state machine,
  keypad, CRT console, WebAudio DTMF tones, TTS playback), `ConfigPanel.jsx` (tabs: programs/menu,
  secret numbers, schedules), `Keypad.jsx`, `CrtConsole.jsx`, `lib/phoneApi.js`.

## Implemented (2026-07-17)
- ✅ Retro phone simulator: lift/hang-up handset, 12-key DTMF keypad w/ tones, CRT transcript, dialed buffer, ringer + message-light indicators, "simulate scheduled call" (rings you → voicemail if unanswered in 9s).
- ✅ **Audio-first UX**: greeting, dial menu, oracle prompt, fortunes, secret eggs, and operator messages are all spoken via OpenAI TTS. CRT transcript is a dev-only read-out.
- ✅ **No Call button** — single menu digits auto-dial after a short inter-digit pause; longer/secret numbers confirmed with `*`. `0` returns to main menu from any program/egg (announced). In Fortune: `*` = hear fortune again, `#` = speak with another oracle.
- ✅ Easter-egg engine: **15 secret numbers** (666, 42, 007, 5552368, 411, 900, 789, 88, 321, 1955, 2015, 000, 13, 101, 1313) with upgraded performed scripts; **branch menus** (411 & 900 have sub-options via keypad), **story clues** cross-linking numbers (007→Ghostbusters, 1955→2015, 101→1313), and a **555-xxxx wildcard exchange**. Fully data-driven + manageable in config.
- ✅ Config panel: program on/off toggles + menu-key builder + live IVR preview; secret-number manager (add/toggle/delete + voice); schedule editor (windows/frequency, CRUD).
- ✅ Tested: backend 22/22 pytest, frontend 100%, no blocking issues.
- ✅ Hardware shopping list delivered (`/app/HARDWARE_SHOPPING_LIST.md`).


## Backlog (prioritized)
- **P1** Voicemail persistence (record/store messages via object storage, auto-expire, message-light state in DB).
- **P1** Second program: Dial-A-Therapy (ELIZA keyword bot) or Pickup Lines (user picks next).
- **P2** Real scheduler that fires "programs call you" within windows; frequency/seasonal rules engine.
- **P2** Persistent story engine (Dial-A-Adventure branching + endless AI mode) — Phase 5.
- **P2** Haunted Telephone + The Haunting arc (Phase 6); Santa Hotline + Santa Watch + Weather API (Phase 7).
- **P3** Age-gate/PIN, dormant entitlements flip + Stripe (Phase 9), device sync client (Phase 3 OTA).
- **P3** ElevenLabs Eleven v3 upgrade for acting-quality voices + budget monitor; pre-recorded high-repeat lines.
- **P3** Hardware productization (RJ11 box) — Phase 10, outside this environment.

## Notes
- Seed uses `$setOnInsert`; editing `seed_data.py` won't update already-seeded docs (drop collections to re-seed).
- No dedup index on secret `code` (allows duplicates) — add unique index if needed.

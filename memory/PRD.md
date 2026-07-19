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

## Update 2026-07-17 (Oracle Manager + Easter-egg authoring)
- Fortune Teller renamed -> **Fortune Caller**. 9 oracles now **DB-driven** (Mongo `personas`): Zartan Speaks, The Great and Powerful AZ, Madame Ruby, Master Sum Dum Goy (punchy cookie), Miss Calypso, Zelda, Count Clairvoyant, The Sphinx (chiasmus riddles), Nyx. TTS pronunciation fixed (Zartan->Zar-tan, AZ->Oz).
- **Oracle Manager** (config tab): CRUD + clone/toggle/reorder; fields incl type (resident/traveling) + season; phone shows residents always, travelers only in active season (month-based).
- **Easter eggs**: branch sub-menus (411,900) + story clues (007,1955,101) + 555-xxxx wildcard; branches & clues now editable in config panel.
- **Barge-in**: keypress cuts current audio. In-call: * replay, # another oracle, 0 main menu.
- Tested: backend 35/35, frontend 100%, no issues.
- Known notes (non-blocking): personas seeded via $setOnInsert (seed_data content edits won't overwrite existing docs); no dup-check on secret `code`; season filter uses UTC month.

## Update 2026-07-17 (MindLine + Scheduler + Voicemail)
- **MindLine / Dr. Dialtone** live on key 3: primitive ELIZA/Dr. Sbaitso keyword bot (backend `mindline.py`, NOT LLM), flat robot voice (echo). Ask-name opening, short spoken entertainment disclaimer (full text on-screen), ELIZA replies, sign-off. Typed input simulates voice (Whisper STT later).
- **Real scheduler**: backend `/schedules/due` (window + frequency due-logic) + `/schedules/{id}/fired`; frontend polls every 20s and rings the phone in-window. Answer -> launches program; missed (9s) -> real **voicemail** created + message light on.
- **Voicemail**: `/voicemails` CRUD (7-day auto-expire, themed per-program templates); `*` from main menu plays messages aloud and clears the light.
- Traveling oracles (Miss Information, Psychic Accountant, Ghost in the Wi-Fi, Sacred Taco) captured in VOICE_DIRECTION.md as backlog — NOT built yet (waiting to flush out the 9 residents).
- Tested: backend 50/50, frontend 100%, no issues.
- Note: OpenAI TTS blocks the backend event loop on very long text; MindLine speaks a short disclaimer to avoid stalls. Program seed uses $setOnInsert (fresh DB seeds MindLine correctly; existing DB was patched live).
- Next: split PhoneSimulator into hooks; author traveling oracles; add Season Preview to Oracle Manager.

## Update 2026-07-19 (DialBox rebrand + Magic 8 Dial + Universal Exit — Iteration 4 VERIFIED)
- **Rebrand** "The Line" -> **DialBox** ("the DialBox network"). Main menu expanded to 9 items: 1 Fortune Caller, 2 Chat Bae (soon), 3 MindLine, 4 Dial 4 Adventure (soon), 5 Smooth Operator (soon), 6 Unknown Caller (seasonal/soon), 7 Holiday Hotline (soon), 8 Magic 8 Dial, 9 Prank Dialer (soon).
- **Magic 8 Dial** (key 8): ask one question (typed into on-screen input, testid `magic8-input`), press 8 to get one of 20 canonical mysterious answers (🎱). Press 8 again to re-ask, * to replay, 0 for main menu. Endpoint `POST /api/programs/magic8` -> {answer, voice(onyx)}.
- **Universal Exit System**: dialing `##` (two '#' within ~650ms) OR typing/saying "Goodbye" in MindLine triggers an `exit_confirm` state ("END CALL? press 1 continue / 2 end"). Pressing 2 -> `call_ended` with 1 retry · 2 explore Line · 3 DialBox network · 4 end session.
- **Bug fixed this iteration**: Magic 8 question input was not rendered (mode guard omitted `magic8_ask`). Fixed the conditional in PhoneSimulator.jsx (~L692) + form submit routes magic8_ask -> askMagic8.
- Tested: backend 60/60 pytest (test_iteration4.py), frontend flows verified (screenshot + testing_agent). Report: /app/test_reports/iteration_4.json.
- Next: build remaining DialBox Lines (Dial 4 Adventure, Smooth Operator, Chat Bae, Unknown Caller, Holiday Hotline, Prank Dialer); ElevenLabs TTS migration; editable ELIZA rules; Season Preview; split PhoneSimulator into hooks.

## Update 2026-07-19 (Knock Knock Line + Laptop-mic voice input)
- **Smooth Operator put ON HOLD**. Key 5 is now **Knock Knock** (slug `knockknock`, enabled, interaction `knockknock`). seed() now prunes orphan program slugs (`delete_many $nin seed_slugs`) so the old `pickup` doc is removed cleanly.
- **Knock Knock flow**: dial 5 (or scheduled incoming) → "Knock, knock." → caller responds (forgiving: any typed/spoken input advances) → setup name delivered → caller responds → punchline → press 5 for another joke / 0 main menu / hang up. State modes: `kk_whos_there`, `kk_who`, `kk_done`. Voice: `fable`.
- **Jokes**: backend `POST /api/programs/knockknock` -> {name, punchline, voice, ai}. **Mix** = curated 18-joke bank + ~25% AI-generated (GPT-5.2, kid-safe JSON prompt, falls back to bank on parse/error).
- **Laptop-mic voice input** via browser Web Speech API (new hook `frontend/src/lib/useSpeechInput.js`). A mic button (`data-testid=mic-btn`) appears alongside the text input in **Knock Knock, MindLine, and Magic 8 Dial** modes; speaking fills + auto-submits the input. Web Speech is Chrome/Edge only (mic button hidden where unsupported); keypad + typing remain the fallback.
- Verified: backend curl (menu key5=Knock Knock, dial 5 routes, endpoint returns jokes incl. AI), frontend screenshot (full knock flow to punchline + mic button rendered, no JS errors).
- Files touched: server.py (knockknock endpoint + seed prune), seed_data.py (key-5 program), phoneApi.js (api.knockknock), PhoneSimulator.jsx (knock state machine, unified INPUT_MODES form, mic), new useSpeechInput.js.

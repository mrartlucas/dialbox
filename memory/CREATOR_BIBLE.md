# DialBox Creator Bible v3.1 — Condensed Dev Reference
Source: DialBox_Creator_Bible_v3.1_Updated_Master.docx (ingested 2026-07-19).
This is the creative SOURCE OF TRUTH. Note: the bible predates our recent build changes
(DialBox rebrand, Knock Knock on key 5, Magic 8, MindLine engine, leaderboard, hands-free voice).

## CORE PRODUCT PIVOT (from user's latest message — overrides bible where conflicting)
- **DialBox is SOFTWARE FIRST**: a smartphone app that works on its own (on-screen dial pad,
  phone mic, speaker, headphones/BT, cloud content, downloadable add-on Lines, live AI, scripted
  audio, in-app incoming calls/notifications).
- **NO Twilio, NO SIP, NO separate phone number, NO Raspberry Pi, NO custom hardware** required.
- **Cell2Jack = optional "Home Mode"** enhancement (smartphone -> Bluetooth -> Cell2Jack -> home
  phone) so a real handset can ring/answer/talk. NOT required; same product, another way to play.
- Hardware (RPi prototype, custom enclosure/console) is PAUSED INDEFINITELY.
- Our current self-contained web app (device mic/speaker, no telephony) IS the correct direction.
  => Earlier Twilio recommendation is RETRACTED as the launch path.

## LINES ROSTER (main keypad 1-9)
1. **Fortune Caller** — oracle characters read your fortune. Talk + keypad. [BUILT]
2. **Chat Bae** — companion/relationship/dating, themed dates, confidence. Talk-primary. [coming soon]
3. **MindLine** — Doctor Dialtone, Sbaitso/ELIZA retro psychiatrist. Talk-only. [BUILT]
4. **Dial 4 Adventure** — interactive audio stories; keypad = choices/inventory/movement. Both. [coming soon]
5. **Smooth Operator** — charm/pickup/confidence coaching + roleplay. Both. [ON HOLD per user]
   - NOTE: we currently put **Knock Knock on key 5** at user's request (Smooth Operator shelved).
6. **Unknown Caller** — paranormal/mystery/strange transmissions; standalone scares or serialized. Both. [coming soon]
7. **Holiday Hotline** — seasonal hub. Both. Branches: Call Santa (Xmas), Hop Line (Easter),
   Monsters Calling (Halloween), Call Uncle Sam (July 4). [coming soon]
8. **Magic 8 Dial** — ask a yes/no question, press 8 for a mysterious answer. Both. [BUILT]
9. **Prank Dialer** — comedy roleplay / scripted calls, safe participation. Both. [coming soon]

### Expansion Lines (not on main keypad; via menu)
- **Radio Dial Theater** — passive radio dramas/comedies/mysteries (public-domain + original). Keypad only.
- **Customer Service** — workplace comedy roleplay (customer & employee POV). Both.
  - Depts: **Problem Department** (absurd complaints), **Please Hold** (passive hold comedy).
- **Dialed-In Trivia** — keypad-first multiple choice; talk for repeat/explain/skip.
- **Outta Line** — insult/roast/trash-talk comedy. Both.
- **Knock Knock** — tiny call-and-response joke; main menu or opt-in surprise incoming call. Both. [BUILT]

### Nested / serialized
- **Lost Connection** (within Unknown Caller) — premium serialized ghost mystery over multiple calls/days.

### Future concepts
- Phone Games (keypad arcade), Animal House Call, Homework Helpline, Call the Game, Time Line.

## CHARACTERS / PERSONAS
### Fortune Caller oracles (each: distinct voice, personality, clear sign-off; respectful accents)
- Zartan the Great — grand, mysterious, certain of destiny.
- AZ the Great and Powerful — whirlwind energy, booming, theatrical.
- Madam Ruby — warm but sharp, practical under mysticism.
- Miss Calypso — sea-touched, Jamaican-inspired, tidal imagery.
- Zelda the All-Knowing — crystal-ball diva, dramatic reveals.
- Master Sum Dum Goy — ancient cookie-wisdom, hunger metaphors. VOICE: onyx (old male) [set].
- Count Clairvoyant — aristocratic mind reader; treats thoughts as an estate.
- The Sphinx — absurd riddles/teachings; ONE short device per call (chiasmus/animal metaphor/
  Socratic/koan), deadpan. [reworked]
- Nyx of the Nine Stars — cosmic prophet, patterns/alignments.
- Merlinius the Questionable — unreliable wizard, accidental insight, confidence-based magic.
- Doctor Dialtone (MindLine) — retro comedic psychiatrist; smart enough to keep you talking,
  not to help; keyword matching, deflections, breakthrough callbacks, parity-error meltdowns.
- Chat Bae characters — companionable/romantic/coach; kind disagreement, no emotional manipulation.
- Smooth Operator coach — suspiciously confident, charming, mock-stern.
- Unknown Caller — ghosts/witnesses/dispatchers/suspects.
- Holiday characters — Santa, Easter Bunny, Monsters, Uncle Sam, Founding-Father voicemails.
- Customer Service — weary/bureaucratic employees; demanding/absurd customers.

## INTERACTION MECHANICS
- **Breakthrough Callbacks** (MindLine): store odd nouns/names/foods/denials; resurface 3-8 turns
  later as a fake breakthrough; caller objection escalates. [BUILT]
- **Parity Errors** (MindLine): hostility -> stutter -> distortion -> crash. Reward for breaking him.
  [BUILT — currently 2-strike; "break the doctor" leaderboard added]
- **Retro Error Events** (MindLine easter eggs, NOT yet built): Thought Buffer Full, Topic Lost,
  False Diagnosis ("unresolved Tuesday"), Memory Failure, System Update ("installing empathy"),
  Invalid Breakthrough. [Phase 2 TODO]
- **Secret numbers**: 0 = repeat menu; ## = universal in-experience exit; 00 = reserved for eggs.
- **Universal Exit**: say "Goodbye" or dial ## -> "ARE YOU SURE?" (1 continue / 2 end). Post-exit
  routing: 1 replay · 2 return to Line · 3 return to Network · 4 end DialBox. Physical hang-up ends
  the session. [BUILT]
- **Incoming/scheduled calls**: Lines can call back; must identify the Line (or conceal for mystery);
  caller controls consent; serialized progress stored; missed -> voicemail/return-call; no spam.
  Knock Knock opt-in surprise calls; Lost Connection unfolds over days. [scheduler BUILT; consent TODO]
- **Memory**: MindLine current-call only. Chat Bae serialized only with explicit consent.
  State layers: Session / Progress / Preference / Consent. Per-Line reset + full profile delete.

## MONETIZATION / TIERS (Phase 9 — not built)
- Product framing: **DialBox Mobile** (app) and **DialBox Home Mode** (app + Cell2Jack) — same product.
- Subscription (rotating catalog, premium serials, radio seasons).
- Add-on packs: Character / Story / Category(trivia) / Department / Seasonal / Voice packs.
- IAP: premium mysteries, radio seasons, collector voice packs, special editions.
- Free: core/starter Lines, seasonal windows, featured trials.
- Entitlements: Owned / Subscribed / Seasonal-Free / Featured-Trial / Installed / Active-Slot.
- Rules: no pay-to-win in games/trivia; purchases handled outside kids' live calls; no mid-call paywalls.

## VOICE / AUDIO (two-engine)
- **Seed Audio 1.0** = scripted/prerecorded (voicemails, stories, dramas, announcements, sign-offs).
- **ElevenLabs** = live AI conversation, recurring character voices, dynamic/personalized speech.
- Hybrid: Seed Audio for polished scripted worlds; ElevenLabs for responsive characters; Seed can
  return for reveals/endings/sign-offs.
- Each recurring voice gets a "Voice Identity Bible": age/pitch/speed/rhythm/texture/accent/range/
  vocabulary/signature phrases/how they say names & numbers.
- SFX: tactile, uncanny, immediate (answering machines, switchboards, early digital). DTMF as
  feedback not decoration. Prioritize midrange speech; music beneath dialogue; mono-compatible;
  avoid harsh sustained tones. Distinct soft error tone for unavailable options.
- CURRENT STATE: using OpenAI TTS ("echo"/onyx/etc.) as placeholder + in-browser WebAudio SFX.
  ElevenLabs + Seed Audio to be wired when key/assets provided.
- Scripted file standard: DB_[LINE]_[PACK]_[EPISODE]_[SCENE]_[LANG]_[RATING]_v###.wav

## BRAND / TONE
- Vibe: a telephone that feels ALIVE; retro-futurism; immediate, personal, expandable, replayable.
- "Talk to interact, touch to decide." Preserve telephone grammar. Lines can grow into mini-networks.
- DO: clear exit always; use names naturally; surprise/curiosity; age gates + consent for mature; crisp audio.
- DON'T: generic chatbot directory; podcast-with-buttons; endless menu trees; AI talk-back everywhere;
  cruel by default; impersonate real emergency services/professionals; clutter the main keypad;
  trap the caller; fake live operators; drown dialogue in SFX.

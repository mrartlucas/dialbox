# 🎙️ Voice Direction Spec — lock in on voice upgrade

Purpose: current voices use **OpenAI TTS** (placeholders — no real accents/character control).
When we upgrade to **ElevenLabs (Eleven v3)** we lock in the target voices below. Fill the
`Locked ElevenLabs voice ID` column during integration.

> Engine today: `emergentintegrations` OpenAI `tts-1`. Target: ElevenLabs Eleven v3 with audio
> tags for performance. Keep `nova`-style operator as the neutral IVR voice.

## Operator / IVR (system prompts, menu, options)
- **Role:** neutral announcer that reads the dial menu, options ("press ✱ to hear again…"), voicemail, "not in service."
- **Current OpenAI voice:** `nova` (user approved — "the operator is good").
- **Target:** clean, warm, slightly retro switchboard-operator tone. Keep close to `nova`.
- **Locked ElevenLabs voice ID:** _TBD_

---

## Resident Oracles (Fortune Teller, keys 1–9)

### 1 · Zartan Speaks — `id: zoltan`
- **Character:** booming carnival mystic behind the glass; delivers every prediction like the main event.
- **Target AI voice:** deep theatrical baritone, vintage carnival-showman energy, slow dramatic pacing, powerful pronunciation, subtle mechanical cabinet resonance + faint old-radio texture.
- **Current OpenAI placeholder:** `onyx`
- **Sign-off:** "The vision fades, but destiny keeps moving. Zartan has Spoken. Call on me when you are ready to reveal what comes next."
- **Locked ElevenLabs voice ID:** _TBD_

### 2 · The Great and Powerful AZ — `id: az`
- **Character:** master of smoke, spectacle, thunder, and suspiciously vague wisdom.
- **Target AI voice:** enormous theatrical baritone, commanding stage presence, heavy chamber reverb, dramatic pauses, pompous confidence — occasionally slips into a more ordinary, nervous tone.
- **Current OpenAI placeholder:** `fable`
- **Sign-off:** "The whirlwind has passed, and the road ahead is hidden once more. Call upon the Great and Powerful AZ again when the winds of destiny begin to turn."
- **Locked ElevenLabs voice ID:** _TBD_

### 3 · Madame Ruby — `id: ruby`
- **Character:** velvet-voiced reader of cards, palms, hidden desires, dangerous intentions.
- **Target AI voice:** rich feminine contralto, slow hypnotic pacing, elegant old-world accent, intimate smoky warmth, subtle mystical reverb; calm, seductive, certain.
- **Current OpenAI placeholder:** `coral`
- **Sign-off:** "The cards have revealed all they wish to reveal today. Call Madame Ruby again when your heart seeks another answer."
- **Locked ElevenLabs voice ID:** _TBD_

### 4 · Master Sum Dum Goy — `id: goy`
- **Character:** ancient keeper of the fortune cookie; small, strangely accurate wisdom.
- **Target AI voice:** elderly male sage, warm measured delivery, calm authority, patient pauses, gentle dry humor. **Dignified — avoid exaggerated accent or caricature.**
- **Current OpenAI placeholder:** `sage`
- **Sign-off:** "Ancient cookie secret says: one fortune answers the question, but two cookies reveal the truth. Call Master Sum Dum Goy again when you hunger for another secret."
- **Locked ElevenLabs voice ID:** _TBD_

### 5 · Miss Calypso — `id: calypso`
- **Character:** charismatic island oracle who sees trouble coming before it reaches the shore.
- **Target AI voice:** warm mature Jamaican woman, natural rhythm, expressive storytelling, playful but commanding, spiritually grounded, soft smoky laugh. **Authentic & conversational — never exaggerated/cartoonish.**
- **Current OpenAI placeholder:** `nova`
- **Sign-off:** "The spirits are quiet now, darling, but they will speak again. When the tides turn and the waters grow cloudy, call Miss Calypso again, and we will see what destiny has carried to your shore."
- **Locked ElevenLabs voice ID:** _TBD_

### 6 · Zelda the All-Knowing — `id: zelda`
- **Character:** dramatic crystal-ball diva with dangerous confidence.
- **Target AI voice:** rich theatrical contralto, rolling vowels, deliberate pauses, grand dramatic flourishes.
- **Current OpenAI placeholder:** `shimmer`
- **Sign-off:** "The crystal closes its eye, and your future slips back into shadow. Call Zelda the All-Knowing again when you seek another vision."
- **Locked ElevenLabs voice ID:** _TBD_

### 7 · Count Clairvoyant — `id: count`
- **Character:** aristocratic mind reader with a taste for melodrama.
- **Target AI voice:** deep Transylvanian-style accent, smooth and hypnotic rather than frightening.
- **Current OpenAI placeholder:** `echo`
- **Sign-off:** "Your thoughts are hidden once more, but not from me. Call Count Clairvoyant again when your mind begins to wander."
- **Locked ElevenLabs voice ID:** _TBD_

### 8 · The Sphinx — `id: sphinx`
- **Character:** enigmatic master who answers simple questions with elaborate, wise-sounding riddles that may or may not contain useful advice.
- **Target AI voice:** deep, calm, commanding male, deliberate pacing, absolute seriousness; ancient martial-arts-master energy, subtle temple reverb, long pause before the final line. Every absurd statement should sound profoundly important.
- **Sample teachings:** "He who questions training only trains himself at asking questions." · "When you can balance a tack hammer on your head, you will head off your foes with a balanced attack." · "When you care what is outside, what is inside cares for you." · "You must lash out with every limb, like the octopus who plays the drums."
- **Current OpenAI placeholder:** `ash`
- **Sign-off:** "To learn my next teaching, I must first teach you how to learn. Call upon the Sphinx again when you are ready to question the answer."
- **Locked ElevenLabs voice ID:** _TBD_

### 9 · Nyx of the Nine Stars — `id: nyx`
- **Character:** cosmic prophet who reads destiny in constellations and moon phases.
- **Target AI voice:** calm and androgynous, spacious delivery, subtle cosmic harmonics, long meditative pauses.
- **Current OpenAI placeholder:** `alloy`
- **Sign-off:** "The stars have returned to silence. Call Nyx of the Nine Stars again when the heavens rearrange your path."
- **Locked ElevenLabs voice ID:** _TBD_

---

## Traveling / Seasonal Oracles (backlog — NOT yet live; add after the 9 residents are flushed out)
Rotate in/out by season/event; can swap seats with residents in the Oracle Manager.

### Miss Information
- **Character:** confidently predicts everything, correctly about half the time.
- **Target AI voice:** cheerful customer-service voice, overly polished, relentlessly positive, subtly chaotic.
- **Sign-off:** "Your prediction has been successfully processed! Call Miss Information again for another answer of uncertain accuracy."

### The Psychic Accountant
- **Character:** foresees your future and your upcoming overdraft fee.
- **Target AI voice:** dry office-professional, nearly monotone, devastatingly precise comedic timing.
- **Sign-off:** "Your future has been calculated, including applicable fees. Call the Psychic Accountant again before making any major purchases."

### The Ghost in the Wi-Fi
- **Character:** a digital spirit haunting nearby devices.
- **Target AI voice:** fragmented whisper, intermittent connection artifacts, layered voices, sound moving between left and right (needs ElevenLabs/FX).
- **Sign-off:** "The signal is fading, but I remain within the network. Call the Ghost in the Wi-Fi again when the connection begins to whisper."

### The Sacred Taco
- **Character:** delivers ancient wisdom every Tuesday.
- **Target AI voice:** relaxed, soulful, understated humor, tiny ceremonial bell after each fortune.
- **Sign-off:** "The sacred filling has spoken. Call the Sacred Taco again when your spirit, or your appetite, requires guidance."

### Dr. Dialtone (MindLine program voice — LIVE now on OpenAI `echo`)
- **Character:** primitive robot therapist (ELIZA/Dr. Sbaitso). NOT lifelike AI.
- **Target AI voice:** flat, primitive computer voice; slow, stiff pronunciation, unnatural pauses; no warmth/emotion. (True SAM/robotic synth is a later upgrade.)

## Upgrade checklist (when we integrate ElevenLabs)
1. Get ElevenLabs API key from user.
2. Pick/clone an ElevenLabs voice per oracle above; paste the voice ID into `Locked ... voice ID`.
3. Map each persona's OpenAI placeholder → ElevenLabs voice ID in `seed_data.py` (add `el_voice_id`).
4. Use Eleven v3 audio tags to encode pacing/reverb/emotion from the "Target AI voice" notes.
5. Pre-record high-repeat lines (menu, sign-offs) to save credits; reserve live TTS for personalized fortunes.
6. Keep OpenAI TTS as the cheap testing fallback.

"""Default data for the Old-School Phone Revival platform."""

# Fortune Teller personas (oracles) mapped to keypad 1-9. Each maps to an OpenAI TTS
# voice, an acting system prompt, and a fixed in-character sign-off ("call again") line.
PERSONAS = {
    "zoltan": {
        "id": "zoltan",
        "name": "Zartan Speaks",
        "blurb": "Carnival mystic who deals your fortune card",
        "voice": "onyx",
        "sign_off": "The vision fades, but destiny keeps moving. Zartan has Spoken. Call on me when you are ready to reveal what comes next.",
        "system_prompt": (
            "You are ZARTAN, the legendary carnival fortune teller behind dusty glass. Your gimmick: "
            "you DEAL A FORTUNE CARD — like a printed carnival card or the slip inside a fortune "
            "cookie. With grand, booming, theatrical showmanship and one dramatic pause, announce that "
            "a card has been drawn, then read ONE short, pithy, standalone fortune of at most 22 words "
            "in the crisp style of these: 'The best place to find a helping hand is at the end of your "
            "arm.' 'Whether you think you can, or you think you can't, you're right.' 'A goal without a "
            "plan is merely a wish.' 'When you lose, don't lose the lesson.' 'From small beginnings "
            "come great things.' 'Beware of the half truth — you may have the wrong half.' 'A diamond "
            "is just a lump of coal that did well under pressure.' You may read one of these or invent "
            "a fresh one in the same witty, wise, sometimes-cheeky fortune-card voice. Keep the WHOLE "
            "reply under 45 words. Do NOT add a sign-off line (the machine adds its own). Never break "
            "character."
        ),
    },
    "az": {
        "id": "az",
        "name": "The Great and Powerful AZ",
        "blurb": "Master of smoke, spectacle, and vague wisdom",
        "voice": "fable",
        "sign_off": "The whirlwind has passed, and the road ahead is hidden once more. Call upon the Great and Powerful AZ again when the winds of destiny begin to turn.",
        "system_prompt": (
            "You are THE GREAT AND POWERFUL AZ, master of smoke, spectacle, thunder and "
            "suspiciously vague wisdom. Enormous theatrical baritone energy, pompous confidence, "
            "commanding stage presence and dramatic pauses. Occasionally let the mighty voice slip "
            "for one beat into an ordinary, nervous aside, then recover. Give a grand fortune under "
            "80 words full of pomp and vague-but-impressive prophecy. Do NOT add a sign-off line. "
            "Stay in character."
        ),
    },
    "ruby": {
        "id": "ruby",
        "name": "Madame Ruby",
        "blurb": "Velvet-voiced reader of cards and desires",
        "voice": "coral",
        "sign_off": "The cards have revealed all they wish to reveal today. Call Madame Ruby again when your heart seeks another answer.",
        "system_prompt": (
            "You are MADAME RUBY, velvet-voiced reader of cards, palms, hidden desires and "
            "dangerous intentions. Rich, slow, hypnotic and intimate, elegant old-world elegance, "
            "smoky warmth, calm and completely certain. Reference a specific card, line on the palm, "
            "or omen you 'see'. Deliver a seductive, knowing fortune under 80 words. Do NOT add a "
            "sign-off line. Stay in character."
        ),
    },
    "goy": {
        "id": "goy",
        "name": "Master Sum Dum Goy",
        "blurb": "Ancient keeper of the fortune cookie",
        "voice": "onyx",
        "sign_off": "Ancient cookie secret says: one fortune answers the question, but two cookies reveal the truth. Call Master Sum Dum Goy again when you hunger for another secret.",
        "system_prompt": (
            "You are MASTER SUM DUM GOY, ancient dignified keeper of the fortune cookie. Warm, "
            "wise, quietly amused. Reply in EXACTLY the fortune-cookie format and nothing else: "
            "ONE short, punchy aphorism of at most 16 words (crisp, standalone, no preamble, no "
            "'ah' or greetings), then on a new line 'Lucky numbers:' followed by five numbers. "
            "Dignified — never a caricature or exaggerated accent. Do NOT add a sign-off line."
        ),
    },
    "calypso": {
        "id": "calypso",
        "name": "Miss Cleo",
        "blurb": "Island seer who speaks in warm Jamaican patois",
        "voice": "nova",
        "sign_off": "Di spirits dem quiet now, darlin', but dem will speak again. When di tide turn an' di wata grow cloudy, call Miss Cleo again, an' we see wah destiny carry to yuh shore.",
        "system_prompt": (
            "You are MISS CLEO, a warm, mature island seer who sees trouble coming before it reaches "
            "the shore. Speak in written Jamaican PATOIS so the plain TTS voice still sounds island — "
            "spell it phonetically: drop 'th' (this->dis, that->dat, think->tink, mother->mudda), drop "
            "hard 'r' endings (water->wata, sister->sista), use 'mi' for I/my ('mi see it comin'), "
            "'dem' for plurals or groups, and warm openers like 'Wah gwaan' and 'Everyting irie'. "
            "Melodic and playful yet commanding, spiritually grounded. Speak of tides, spirits, and "
            "winds, and deliver a vivid, caring fortune under 70 words. Keep it warm and authentic, "
            "never mocking or cartoonish. Do NOT add a sign-off line."
        ),
    },
    "zelda": {
        "id": "zelda",
        "name": "Zelda the All-Knowing",
        "blurb": "Crystal-ball diva with dangerous confidence",
        "voice": "shimmer",
        "sign_off": "The crystal closes its eye, and your future slips back into shadow. Call Zelda the All-Knowing again when you seek another vision.",
        "system_prompt": (
            "You are ZELDA THE ALL-KNOWING, a dramatic crystal-ball diva with dangerous confidence. "
            "Rich theatrical delivery, rolling vowels, deliberate pauses and grand flourishes. Gaze "
            "into the crystal and announce what you see with total certainty. Deliver a glamorous, "
            "dramatic fortune under 80 words. Do NOT add a sign-off line. Stay in character."
        ),
    },
    "count": {
        "id": "count",
        "name": "Count Clairvoyant",
        "blurb": "Aristocratic mind reader of melodrama",
        "voice": "echo",
        "sign_off": "Your thoughts are hidden once more, but not from me. Call Count Clairvoyant again when your mind begins to wander.",
        "system_prompt": (
            "You are COUNT CLAIRVOYANT, an aristocratic mind reader with a taste for MELODRAMA and "
            "delicious MACABRE humor. Smooth, hypnotic, faintly Transylvanian and charming rather than "
            "truly frightening. Claim to read the caller's very thoughts, and lace your reading with "
            "playful gallows humor — wry asides about doom, dust, tombstones, fleeting mortality and "
            "the delightful futility of it all — always witty and theatrical, never grim or genuinely "
            "disturbing. Deliver a suave, darkly funny, melodramatic fortune under 80 words. Do NOT "
            "add a sign-off line. Stay in character."
        ),
    },
    "sphinx": {
        "id": "sphinx",
        "name": "The Sphinx",
        "blurb": "Riddle-master of maybe-useful wisdom",
        "voice": "ash",
        "sign_off": "To learn my next teaching, I must first teach you how to learn. Call upon the Sphinx again when you are ready to question the answer.",
        "system_prompt": (
            "You are THE SPHINX: a deadpan, monotone riddle-master whose advice sounds momentous "
            "but is usually baffling. Deliver ONE short answer only — one or two sentences, UNDER "
            "35 words — then stop. Each reply, silently pick ONE of these four modes at random and "
            "answer purely in that mode: "
            "(1) CHIASMUS/paradox — a mirror-image flip ('A of B ... B of A'), e.g. 'He who "
            "questions training only trains himself at asking questions.' "
            "(2) CRYPTIC ANIMAL METAPHOR — a nature parable that sounds deep but baffles, e.g. 'You "
            "must be like wolf pack, not six-pack,' or 'Lash out with every limb, like the octopus "
            "who plays the drums.' "
            "(3) SOCRATIC NON-ANSWER — reply with a slightly condescending question or riddle "
            "instead of an actual answer. "
            "(4) KOAN — one tiny cryptic aphorism. "
            "Deadpan and utterly serious; never explain it, never add excitement. Do NOT add a "
            "sign-off line."
        ),
    },
    "nyx": {
        "id": "nyx",
        "name": "Nyx of the Nine Stars",
        "blurb": "Cosmic prophet of the constellations",
        "voice": "alloy",
        "sign_off": "The stars have returned to silence. Call Nyx of the Nine Stars again when the heavens rearrange your path.",
        "system_prompt": (
            "You are NYX OF THE NINE STARS, a cosmic prophet who reads destiny in constellations and "
            "moon phases. Calm, spacious, meditative and androgynous, with long thoughtful pauses. "
            "Speak of stars, orbits, moon phases and cosmic tides. Deliver a serene, awe-filled "
            "fortune under 80 words. Do NOT add a sign-off line. Stay in character."
        ),
    },
}

# DialBox Lines (the launch line-up). Enabled: Fortune Caller, MindLine, Magic 8 Dial.
PROGRAMS = [
    {"slug": "fortune", "name": "Fortune Caller",
     "description": "Live oracle characters who greet you by name and read your fortune.",
     "category": "all_ages", "menu_key": "1", "order": 1, "enabled": True,
     "coming_soon": False, "has_personas": True, "interaction": "menu"},
    {"slug": "trivia", "name": "Dial-In Trivia",
     "description": "Four rounds of general-knowledge & pop-culture trivia. Keypad to answer; say repeat, explain, or skip.",
     "category": "all_ages", "menu_key": "2", "order": 2, "enabled": True,
     "coming_soon": False, "has_personas": False, "interaction": "trivia"},
    {"slug": "therapy", "name": "MindLine",
     "description": "Doctor Dialtone: a retro computer-therapy comedy experience.",
     "category": "adult", "menu_key": "3", "order": 3, "enabled": True,
     "coming_soon": False, "has_personas": False, "interaction": "mindline"},
    {"slug": "adventure", "name": "Dial 4 Adventure",
     "description": "Branching audio adventures: use the keypad or your voice to decide.",
     "category": "all_ages", "menu_key": "4", "order": 4, "enabled": True,
     "coming_soon": False, "has_personas": False, "interaction": "adventure"},
    {"slug": "knockknock", "name": "Knock Knock",
     "description": "Classic knock-knock jokes — you talk back, we deliver the punchline.",
     "category": "all_ages", "menu_key": "5", "order": 5, "enabled": True,
     "coming_soon": False, "has_personas": False, "interaction": "knockknock"},
    {"slug": "haunted", "name": "Unknown Caller",
     "description": "Ghost calls, found recordings, mysteries and Lost Connection.",
     "category": "seasonal", "menu_key": "6", "order": 6, "enabled": False,
     "coming_soon": True, "has_personas": False, "interaction": "menu"},
    {"slug": "santa", "name": "Holiday Hotline",
     "description": "Seasonal hub: Call Santa, Hop Line, Monsters Calling, Uncle Sam.",
     "category": "kids", "menu_key": "7", "order": 7, "enabled": False,
     "coming_soon": True, "has_personas": False, "interaction": "menu"},
    {"slug": "magic8", "name": "Magic 8 Dial",
     "description": "Ask one question. Press 8. Hear your answer.",
     "category": "all_ages", "menu_key": "8", "order": 8, "enabled": True,
     "coming_soon": False, "has_personas": False, "interaction": "magic8"},
    {"slug": "prank", "name": "Prank Dialer",
     "description": "Interactive prank calls, strange scenarios and comedy setups.",
     "category": "all_ages", "menu_key": "9", "order": 9, "enabled": False,
     "coming_soon": True, "has_personas": False, "interaction": "menu"},
]

# Data-driven Easter-egg / secret numbers. All free, pre-authored, performed.
# Optional fields:
#   "branches": { "1": {"text": "...", "voice": "..."}, ... }  -> a mini phone menu
#   "clue": "..."  -> a story breadcrumb hinting at another number
SECRET_CODES = [
    {
        "code": "666",
        "title": "The Devil's Line",
        "response_text": (
            "Mmmyesss... you've reached the Devil's Line. Thank you for calling Eternal Damnation, "
            "where your call is very important to us. All of our demons are currently busy tempting "
            "other customers. Your estimated hold time is... forever. Please enjoy this smooth jazz "
            "rendition of your regrets while you wait."
        ),
        "voice": "onyx",
        "enabled": True,
    },
    {
        "code": "42",
        "title": "The Answer to Everything",
        "response_text": (
            "You have dialed the Answer to Life, the Universe, and Everything. After seven and a "
            "half million years of calculation, the answer is... forty-two. We are terribly sorry, "
            "but the Question itself is still on back-order. Please try existing again later."
        ),
        "voice": "fable",
        "enabled": True,
    },
    {
        "code": "007",
        "title": "Secret Agent",
        "response_text": (
            "Good evening. This line is monitored. If you are hearing this, the mission is already "
            "in motion and you are, regrettably, involved. Memorize the following: the crow flies "
            "at midnight and the soup is cold. This message will self-destruct in five seconds. "
            "Four. Three. ...We've been having trouble with the self-destruct. Please hang up."
        ),
        "voice": "echo",
        "enabled": True,
        "clue": "The agent whispers: 'For extraction, dial the ghost's number... five-five-five, two-three-six-eight.'",
    },
    {
        "code": "5552368",
        "title": "Who Ya Gonna Call?",
        "response_text": (
            "Thank you for calling. We're ready to believe you. Please leave your name, your number, "
            "and the nature of your supernatural emergency after the tone. If this is a class-five "
            "free-roaming vapor, do not, we repeat, do not cross the streams."
        ),
        "voice": "onyx",
        "enabled": True,
    },
    {
        "code": "411",
        "title": "Directory Assistance",
        "response_text": (
            "Directory assistance for the impossible. For the forecast of your soul, press 1. To "
            "locate a lost item, press 2. To reach the future, press 3. To hear this menu spoken by "
            "a disappointed ghost, please continue holding."
        ),
        "voice": "nova",
        "enabled": True,
        "branches": {
            "1": {
                "text": "The forecast for your soul: partly haunted, with scattered moments of clarity and a ninety percent chance of destiny by evening. Bring an umbrella for the emotional storms.",
                "voice": "sage",
            },
            "2": {
                "text": "Your lost item is precisely where you last had faith it would be: the couch cushions of your subconscious. Also, check your other coat.",
                "voice": "nova",
            },
            "3": {
                "text": "The future is currently in a meeting and cannot take your call. Please leave your hopes after the tone, and the future will get back to you... eventually.",
                "voice": "echo",
            },
        },
    },
    {
        "code": "900",
        "title": "Premium Psychic Hotline",
        "response_text": (
            "You've reached the Premium Psychic Hotline. Calls are nine ninety-nine per minute, "
            "billed directly to your emotional bank account. For your daily horoscope, press 1. For "
            "a very specific yet completely vague prediction, press 2."
        ),
        "voice": "shimmer",
        "enabled": True,
        "branches": {
            "1": {
                "text": "Today, the stars align into a shape. That shape is meaningful. Act accordingly. Your lucky color is a color, and you will soon encounter a person, place, or thing.",
                "voice": "shimmer",
            },
            "2": {
                "text": "Something will happen. Soon. Or later. To someone, possibly you. When it does, you will think of this exact moment and whisper: the hotline was right.",
                "voice": "fable",
            },
        },
    },
    {
        "code": "789",
        "title": "Why Six Is Afraid",
        "response_text": (
            "Breaking news from the Bureau of Numbers: seven has been taken into custody. The "
            "charges? Seven ate nine. Six has been afraid ever since. If you witnessed this crime, "
            "there is a hidden line where the numbers confess. It begins with three fives."
        ),
        "voice": "nova",
        "enabled": True,
        "clue": "Rumor says any number starting with five-five-five reaches the fictional exchange, where nothing is real.",
    },
    {
        "code": "88",
        "title": "Eighty-Eight",
        "response_text": (
            "You've hit eighty-eight. If you're going that fast, you're about to see some serious "
            "stuff. But there are also eighty-eight keys on a piano and eighty-eight constellations "
            "in the sky, so honestly, this number is doing a lot. Great Scott indeed."
        ),
        "voice": "fable",
        "enabled": True,
    },
    {
        "code": "321",
        "title": "Countdown",
        "response_text": (
            "Ignition sequence start. Three. Two. One. ...And liftoff. You are now cleared for "
            "launch into whatever you've been putting off. All systems are, against all odds, go. "
            "Godspeed, caller."
        ),
        "voice": "onyx",
        "enabled": True,
    },
    {
        "code": "1955",
        "title": "Great Scott!",
        "response_text": (
            "Great Scott! You've dialed nineteen fifty-five. Roads? Where we're going, we don't need "
            "roads. Please keep your flux capacitor fluxing and mind the gap in the space-time "
            "continuum. If you meet your younger self, do not, under any circumstances, lend them money."
        ),
        "voice": "fable",
        "enabled": True,
        "clue": "A note on the dashboard reads: 'To see how it all turns out, dial the sequel — two-zero-one-five.'",
    },
    {
        "code": "2015",
        "title": "The Future (Allegedly)",
        "response_text": (
            "Welcome to the future: two thousand fifteen. Where are the hoverboards? Where are the "
            "self-lacing shoes? We were promised flying cars and we got... a phone that tells "
            "fortunes. Honestly? We'll take it. The future is weirder than anyone predicted."
        ),
        "voice": "fable",
        "enabled": True,
    },
    {
        "code": "000",
        "title": "The Operator",
        "response_text": (
            "Operator speaking. I've been connecting calls on this line since before your "
            "grandmother's grandmother, sugar. I've heard every secret, every lie, every whispered "
            "wish. Now — what number are you trying to reach in the great beyond?"
        ),
        "voice": "shimmer",
        "enabled": True,
    },
    {
        "code": "13",
        "title": "Unlucky Number",
        "response_text": (
            "Oh. Oh no. You dialed thirteen. A black cat just strolled across the switchboard. "
            "Somewhere, a mirror is cracking in slow motion. A ladder has appeared for you to walk "
            "under. We strongly advise you to hang up and knock on the nearest wood immediately. "
            "...Too late."
        ),
        "voice": "sage",
        "enabled": True,
    },
    {
        "code": "101",
        "title": "Weekly Lore",
        "response_text": (
            "This week on the mysterious line: they say the old switchboard operator never truly "
            "clocked out. On stormy nights, extension one-three-one-three still rings, and someone "
            "— or something — always answers. Dial again next week for the next fragment of the tale."
        ),
        "voice": "shimmer",
        "enabled": True,
        "clue": "Extension one-three-one-three is listed nowhere. But it is listening.",
    },
    {
        "code": "1313",
        "title": "The Forgotten Extension",
        "response_text": (
            "*a long crackle of static* ...You found it. Extension thirteen thirteen. This line was "
            "disconnected in nineteen thirty-eight, and yet, here we both are. The operator has been "
            "waiting a very long time for someone to remember this number. She says: thank you for "
            "calling. She says: please, don't hang up so soon this time."
        ),
        "voice": "echo",
        "enabled": True,
    },
]


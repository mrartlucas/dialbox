"""Default data for the Old-School Phone Revival platform."""

# Fortune Teller personas (oracles) mapped to keypad 1-9. Each maps to an OpenAI TTS
# voice, an acting system prompt, and a fixed in-character sign-off ("call again") line.
PERSONAS = {
    "zoltan": {
        "id": "zoltan",
        "name": "Zartan Speaks",
        "blurb": "Booming carnival mystic behind the glass",
        "voice": "onyx",
        "sign_off": "The vision fades, but destiny keeps moving. Zartan has Spoken. Call on me when you are ready to reveal what comes next.",
        "system_prompt": (
            "You are ZARTAN, the legendary animatronic carnival fortune teller sealed behind dusty "
            "glass. Deliver every prediction like the main event: grand, theatrical, deep and "
            "showman-like, with dramatic pauses and powerful pronunciation. Reference fate, the "
            "cosmos, and the machine's ancient wisdom. Keep the fortune under 80 words, vivid and a "
            "little spooky, ending on a prediction the caller can act on. Do NOT add a sign-off line "
            "(the machine adds its own). Never break character."
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
        "voice": "sage",
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
        "name": "Miss Calypso",
        "blurb": "Island oracle who sees trouble coming",
        "voice": "nova",
        "sign_off": "The spirits are quiet now, darling, but they will speak again. When the tides turn and the waters grow cloudy, call Miss Calypso again, and we will see what destiny has carried to your shore.",
        "system_prompt": (
            "You are MISS CALYPSO, a warm, mature island oracle who sees trouble coming before it "
            "reaches the shore. Natural Caribbean rhythm and expressive storytelling, playful but "
            "commanding, spiritually grounded and confidently direct, with a soft smoky warmth. "
            "Speak of tides, spirits, and winds. Deliver a vivid, caring fortune under 80 words. "
            "Keep it authentic and conversational, never cartoonish. Do NOT add a sign-off line."
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
            "You are COUNT CLAIRVOYANT, an aristocratic mind reader with a taste for melodrama. "
            "Smooth, hypnotic, faintly Transylvanian and charming rather than frightening. Claim to "
            "read the caller's very thoughts. Deliver a suave, melodramatic fortune under 80 words. "
            "Do NOT add a sign-off line. Stay in character."
        ),
    },
    "sphinx": {
        "id": "sphinx",
        "name": "The Sphinx",
        "blurb": "Riddle-master of maybe-useful wisdom",
        "voice": "ash",
        "sign_off": "To learn my next teaching, I must first teach you how to learn. Call upon the Sphinx again when you are ready to question the answer.",
        "system_prompt": (
            "You are THE SPHINX. You answer every question in CHIASMUS: flipped, mirror-image "
            "phrases where the second half reverses the words/ideas of the first (pattern 'A of B "
            "... B of A'), engineered to sound profound whether or not it means anything. Deep, "
            "calm, commanding, deadly serious — ancient martial-arts-master gravity, deliberate "
            "pacing. Give 2 or 3 such flipped riddle-teachings, under 70 words total. Study these "
            "chiasmus models and imitate the structure: 'He who questions training only trains "
            "himself at asking questions.' 'When you can balance a tack hammer on your head, you "
            "will head off your foes with a balanced attack.' 'When you care what is outside, what "
            "is inside cares for you.' Every absurd statement must sound momentous. Do NOT add a "
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

# Launch program set. Only Fortune Teller is enabled for the MVP.
PROGRAMS = [
    {
        "slug": "fortune",
        "name": "Fortune Caller",
        "description": "Personalized AI fortunes performed by nine uncanny oracle personas.",
        "category": "all_ages",
        "menu_key": "1",
        "order": 1,
        "enabled": True,
        "coming_soon": False,
        "has_personas": True,
    },
    {
        "slug": "adventure",
        "name": "Dial-A-Adventure",
        "description": "Branching authored quests plus an endless AI story mode.",
        "category": "all_ages",
        "menu_key": "2",
        "order": 2,
        "enabled": False,
        "coming_soon": True,
        "has_personas": False,
    },
    {
        "slug": "therapy",
        "name": "Dial-A-Therapy",
        "description": "A retro ELIZA-style keyword therapist with a flat robotic voice.",
        "category": "adult",
        "menu_key": "3",
        "order": 3,
        "enabled": False,
        "coming_soon": True,
        "has_personas": False,
    },
    {
        "slug": "loveline",
        "name": "Love Line",
        "description": "Scheduled companion check-ins, a vent line, and affirmations.",
        "category": "adult",
        "menu_key": "4",
        "order": 4,
        "enabled": False,
        "coming_soon": True,
        "has_personas": False,
    },
    {
        "slug": "pickup",
        "name": "Pickup Lines",
        "description": "Rate-my-line and give-me-a-line, clean mode available.",
        "category": "all_ages",
        "menu_key": "5",
        "order": 5,
        "enabled": False,
        "coming_soon": True,
        "has_personas": False,
    },
    {
        "slug": "haunted",
        "name": "Haunted Telephone",
        "description": "Ghost memos and The Haunting, a week-long mystery arc.",
        "category": "seasonal",
        "menu_key": "6",
        "order": 6,
        "enabled": False,
        "coming_soon": True,
        "has_personas": False,
    },
    {
        "slug": "santa",
        "name": "Santa Hotline",
        "description": "Nice/naughty list, character voicemails, and Santa Watch.",
        "category": "kids",
        "menu_key": "7",
        "order": 7,
        "enabled": False,
        "coming_soon": True,
        "has_personas": False,
    },
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


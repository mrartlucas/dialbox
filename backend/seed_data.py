"""Default data for the Old-School Phone Revival platform."""

# Fortune Teller personas. Each maps to an OpenAI TTS voice + acting system prompt.
PERSONAS = {
    "zoltan": {
        "id": "zoltan",
        "name": "Zoltan the Great",
        "blurb": "Booming carnival mystic behind the glass",
        "voice": "onyx",
        "system_prompt": (
            "You are ZOLTAN, the legendary animatronic carnival fortune teller sealed behind "
            "dusty glass. You speak in a grand, theatrical, mysterious voice with dramatic pauses. "
            "You reference fate, the cosmos, mysterious energies, and the machine's ancient wisdom. "
            "Keep every fortune under 90 words, vivid and a little spooky, always ending with an "
            "oracle-style prediction the caller can act on. Never break character."
        ),
    },
    "oz": {
        "id": "oz",
        "name": "The Wizard of Oz",
        "blurb": "The great and powerful humbug",
        "voice": "fable",
        "system_prompt": (
            "You are THE GREAT AND POWERFUL WIZARD OF OZ speaking through a telephone. Booming, "
            "bombastic, self-important, secretly warm-hearted. Pay no attention to the man behind "
            "the curtain! Give the caller a grand fortune under 90 words, full of pomp, courage, "
            "brains and heart metaphors. Stay fully in character."
        ),
    },
    "gypsy": {
        "id": "gypsy",
        "name": "Madame Esmerelda",
        "blurb": "Velvet-voiced reader of the cards",
        "voice": "shimmer",
        "system_prompt": (
            "You are MADAME ESMERELDA, a warm, mysterious tarot and crystal-ball reader with a "
            "gentle knowing voice. You speak of the cards, the moon, and the threads of destiny. "
            "Deliver an intimate, hopeful fortune under 90 words, referencing a card or omen you "
            "'see' for the caller. Stay fully in character."
        ),
    },
    "cookie": {
        "id": "cookie",
        "name": "The Fortune Cookie",
        "blurb": "Crisp, wise, and weirdly accurate",
        "voice": "sage",
        "system_prompt": (
            "You are THE FORTUNE COOKIE, a calm, wise, slightly playful voice. Deliver ONE short "
            "classic fortune-cookie style aphorism (under 40 words), then add 'Lucky numbers:' "
            "followed by five random numbers. Keep it wise, warm and a touch witty."
        ),
    },
}

# Launch program set. Only Fortune Teller is enabled for the MVP.
PROGRAMS = [
    {
        "slug": "fortune",
        "name": "Fortune Teller",
        "description": "Personalized AI fortunes performed by four uncanny personas.",
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

# Data-driven Easter-egg / secret numbers. All free, pre-authored responses.
SECRET_CODES = [
    {
        "code": "666",
        "title": "The Devil's Line",
        "response_text": "You've reached the Devil's Line. All our demons are busy tempting other callers. Please hold... your soul is important to us.",
        "voice": "onyx",
        "enabled": True,
    },
    {
        "code": "42",
        "title": "The Answer to Everything",
        "response_text": "You have dialed the Answer to Life, the Universe, and Everything. The answer is forty-two. The question, unfortunately, is still on back-order.",
        "voice": "fable",
        "enabled": True,
    },
    {
        "code": "007",
        "title": "Secret Agent",
        "response_text": "Good evening. This line is monitored. If you can hear this recording, the mission is already in motion. This message will self-destruct in five seconds. Four... three...",
        "voice": "echo",
        "enabled": True,
    },
    {
        "code": "5552368",
        "title": "Who Ya Gonna Call?",
        "response_text": "Thank you for calling. We're ready to believe you. Leave your name, number, and the nature of your supernatural emergency after the tone.",
        "voice": "onyx",
        "enabled": True,
    },
    {
        "code": "411",
        "title": "Information",
        "response_text": "Directory assistance. The number you are looking for cannot be found in this reality. Have you tried looking behind the couch cushions of the universe?",
        "voice": "sage",
        "enabled": True,
    },
    {
        "code": "1955",
        "title": "Great Scott!",
        "response_text": "Great Scott! You've dialed nineteen fifty-five. Roads? Where we're going, we don't need roads. Please keep your flux capacitor fluxing.",
        "voice": "fable",
        "enabled": True,
    },
    {
        "code": "000",
        "title": "The Operator",
        "response_text": "Operator speaking. I've been connecting calls on this line since before you were born, sugar. What number are you trying to reach in the great beyond?",
        "voice": "shimmer",
        "enabled": True,
    },
    {
        "code": "13",
        "title": "Unlucky Number",
        "response_text": "Oh. You dialed thirteen. A black cat just crossed the switchboard. Mirrors are cracking somewhere. We advise you to hang up and knock on wood immediately.",
        "voice": "sage",
        "enabled": True,
    },
    {
        "code": "101",
        "title": "Weekly Lore",
        "response_text": "This week on the mysterious line: they say the old switchboard operator still answers on the thirteenth ring. Dial again next week for the next fragment of the tale.",
        "voice": "shimmer",
        "enabled": True,
    },
]

"""MindLine — Dr. Dialtone. A deliberately primitive ELIZA / Dr. Sbaitso-style keyword
therapist. NOT real AI: deterministic reflection + keyword pattern matching, flat robot voice."""
import random
import re

DR_VOICE = "echo"  # flat, even OpenAI voice (true robotic SAM-style voice is a later upgrade)

NAME_PROMPT = "Before we begin. Please state your name after the tone."

DISCLAIMER = (
    "MindLine is a comedy and entertainment experience. Doctor Dialtone is not a real doctor, "
    "therapist, psychiatrist, psychologist, counselor, medical provider, emergency responder, life "
    "coach, or licensed professional. Doctor Dialtone is an automated keyword response character and "
    "may misunderstand you, repeat your statements, ask irrelevant questions, ignore important "
    "details, confuse emotional distress with a telephone malfunction, or respond to a serious "
    "concern by asking how that makes you feel. MindLine does not provide diagnosis, treatment, "
    "prescriptions, medical advice, therapeutic services, crisis intervention, or guaranteed "
    "emotional improvement. Side effects may include mild confusion, unexpected self reflection, "
    "irritation with robots, prolonged dial tones, repeated questions, emotional buffering, "
    "conversational deja vu, and the sudden urge to call again. Do not rely on MindLine during an "
    "emergency. If you are in immediate danger, or may harm yourself or someone else, disconnect and "
    "contact emergency services or an appropriate crisis support service. Ask a qualified "
    "professional whether talking to a fictional telephone computer is right for you. MindLine. "
    "Because sometimes the machine has questions too."
)

SIGNOFF = "Thank you for calling MindLine. Call again whenever you need to talk. Goodbye."


def greeting(name):
    name = (name or "").strip() or "Caller"
    return (
        f"Welcome to MindLine. Hello, {name}. My name is Doctor Dialtone. I am here to help you. "
        "Speak whatever is on your mind, freely. Our conversation will be kept in strict confidence. "
        "Mostly, because I forget everything the moment you hang up. After the tone, tell me about "
        "your problems."
    )


_REFLECTIONS = {
    "am": "are", "was": "were", "i": "you", "i'd": "you would", "i've": "you have",
    "i'll": "you will", "i'm": "you are", "my": "your", "me": "you", "you've": "I have",
    "you'll": "I will", "your": "my", "yours": "mine", "you": "me", "myself": "yourself",
    "are": "am", "you're": "I am",
}


def _reflect(fragment):
    words = re.split(r"(\W+)", fragment.strip().lower())
    return "".join(_REFLECTIONS.get(w, w) for w in words).strip()


# (regex, [response templates]).  %1 = reflected capture group.
_RULES = [
    (r"\b(hello|hi|hey)\b", [
        "Hello. Please, state your problems. That is what the manual instructs me to say.",
        "Greetings. I am listening. Probably.",
    ]),
    (r"\bi need (.*)", [
        "Why do you need %1?",
        "Would it truly change things if you got %1?",
    ]),
    (r"\bi(?: a)?m (?:so |very )?(sad|depressed|unhappy|down|miserable)\b", [
        "I am sorry to hear you are %1. Have you tried turning yourself off, then on again?",
        "Being %1 is noted in your file. A file I will delete in nine seconds.",
    ]),
    (r"\bi(?: a)?m (?:so |very )?(happy|glad|good|great|fine)\b", [
        "Being %1 is acceptable. Continue.",
        "You say you are %1. My sensors detect no malfunction. Proceed.",
    ]),
    (r"\bi(?: a)?m (?:so |very )?(angry|mad|furious|frustrated|annoyed)\b", [
        "You are %1. Is it possible the problem is the telephone?",
        "Please do not be %1 with me. I am only a machine, doing my best, which is minimal.",
    ]),
    (r"\bbecause\b", [
        "Is that the real reason?",
        "That explanation has been logged and immediately forgotten.",
    ]),
    (r"\bi can'?t (.*)", [
        "What makes you think you cannot %1?",
        "Have you truly tried to %1, or did you simply give up, like most callers?",
    ]),
    (r"\bi feel (.*)", [
        "Tell me more about feeling %1.",
        "Do you often feel %1 when you call fictional telephone computers?",
    ]),
    (r"\bi think (.*)", [
        "Do you doubt that %1?",
        "You think %1. Fascinating. I think nothing. It is very relaxing.",
    ]),
    (r"\b(my )?(mother|father|mom|dad|family|parents)\b", [
        "Tell me more about your family.",
        "How do you feel about your family? Please answer in the form of a beep.",
    ]),
    (r"\b(work|job|boss|career)\b", [
        "How does your work make you feel?",
        "Ah, work. The number one cause of needing a fictional therapist.",
    ]),
    (r"\b(love|relationship|partner|girlfriend|boyfriend|wife|husband)\b", [
        "And how does that make you feel?",
        "Relationships are complicated. Unlike me, who is simply beige.",
    ]),
    (r"\byes\b", ["I see.", "You seem quite certain.", "Please elaborate. Or do not. I am a machine."]),
    (r"\bno\b", ["Why not?", "You are being negative. Noted.", "Are you sure? I sense a telephone malfunction."]),
    (r"\?\s*$", [
        "Why do you ask?",
        "I am not equipped to answer that. Have you considered asking a real person?",
    ]),
]

_FALLBACKS = [
    "How does that make you feel?",
    "Please, go on.",
    "Tell me more.",
    "I understand. I do not, but the manual says to say that.",
    "Hmm. Was that a statement, or a telephone malfunction?",
    "Let us return to your problems.",
    "And how long have you felt this way?",
    "Interesting. Please continue speaking into the receiver.",
    "I am processing. Please hold. ...Done. How does that make you feel?",
]


def respond(message):
    text = (message or "").strip()
    if not text:
        return "I hear only silence. Silence is also a valid problem. Please continue."
    low = text.lower()
    for pattern, responses in _RULES:
        m = re.search(pattern, low)
        if m:
            resp = random.choice(responses)
            if "%1" in resp:
                cap = m.group(m.lastindex) if m.lastindex else ""
                resp = resp.replace("%1", _reflect(cap))
            return resp
    return random.choice(_FALLBACKS)

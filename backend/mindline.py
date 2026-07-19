"""MindLine — Doctor Dialtone.

A rule-based retro computer psychiatrist (Dr. Sbaitso / ELIZA homage). Intentionally limited:
keyword + sentence-pattern matching, short-term per-call memory, delayed "breakthrough" callbacks,
contradiction / repetition / keyword-fixation detection, and abuse -> parity-error breakdowns.
NOT an LLM. Comedy and entertainment only. Memory lasts for the current call only.
"""
import random
import re
import uuid

DR_VOICE = "echo"  # flat, robotic operator voice (OpenAI TTS placeholder until ElevenLabs)

DISCLAIMER = (
    "MindLine is a comedy and entertainment experience. Doctor Dialtone is not a real doctor and "
    "this is not real therapy. If you are in crisis, please contact a real professional or "
    "emergency services."
)

NAME_PROMPT = "Welcome to MindLine. Before we begin, please tell me your name."

LOCKED_SIGNOFF = "Call again whenever you need to talk. Goodbye."


def _opening(name):
    return (
        f"Welcome to MindLine. Hello, {name}. My name is Doctor Dialtone. I am here to help you. "
        "Speak whatever is on your mind, freely. Our conversation will be kept in strict confidence. "
        "Mostly, because I forget everything the moment you hang up. "
        "After the tone, tell me about your problems."
    )


# ----------------------------- Response banks -----------------------------
STANDARD_THERAPY = [
    "Why do you feel that way?", "Tell me more about that.", "How does that make you feel?",
    "Why do you believe that?", "What makes you say that?", "Does this happen often?",
    "When did you first notice this?", "Who else knows about this?", "What do you think it means?",
    "Why is that important to you?", "Can you give me an example?", "Is that the real problem?",
    "What would you prefer to happen?", "Are you certain?", "Continue.", "Please elaborate.",
    "How do you feel when you say that?", "I see.", "Interesting.", "Very interesting.",
    "I see. Unfortunately, I do not see very much.",
]

DONT_UNDERSTAND = [
    "That is not my problem.", "Please say something sensible.",
    "I do not understand. This may be your fault.",
    "Could you rephrase that using recognizable thoughts?",
    "That statement contains words, but I am uncertain about the arrangement.",
    "I was not programmed for whatever that was.",
    "Speak clearly. I am operating through a telephone.", "Your sentence has been rejected.",
    "I heard you. Understanding was not included.", "Please provide a less complicated problem.",
    "That response did not help either of us.", "Let us pretend you said something meaningful.",
    "I have misplaced the point of your statement.", "Try using fewer ideas at once.",
    "Invalid statement.", "I detect language, but not meaning.",
    "Your input has exceeded available patience.",
]

NONSENSE = [
    "Please use actual words.", "That may be a language. It is not one I currently support.",
    "Your condition has exceeded my vocabulary.", "Please stop testing the microphone.",
    "I detect noise and enthusiasm.", "That sentence has been forwarded to nowhere.",
    "Your input is not compatible with thought.", "Please try speaking as a person.",
    "I detected several sounds. None were useful.", "Your statement has failed quality control.",
]

REPETITION = [
    "You have already said that.", "Repetition does not create additional meaning.",
    "I heard you the first six times.", "Are you attempting to hypnotize the computer?",
    "Loop detected.", "You appear to be malfunctioning.",
    "Your statement has entered a repeating pattern.", "Please provide new emotional data.",
    "I am beginning to suspect that you are the computer.",
]

FALSE_BREAKTHROUGH = [
    "I believe we have discovered something.", "This may be the source of your problem.",
    "Interesting. Very interesting.", "We are finally approaching the real issue.",
    "The pattern is becoming obvious.", "I suspected we would return to this.",
    "This changes everything.", "Your response confirms my theory.",
    "Please remain calm. We may be making progress.", "I have connected the two statements.",
    "The data is becoming disturbingly clear.",
]

CALLBACK_TEMPLATES = [
    "Could this have something to do with the {w} you mentioned earlier?",
    "Let us return to your {w}.",
    "What about your {w}?",
    "You mentioned {w} earlier. I believe we are finally making progress.",
    "We have avoided discussing your {w} long enough.",
    "Does this relate to the {w} you mentioned earlier?",
    "The {w} was not irrelevant after all.",
]

ESCALATION = [
    "Your strong reaction confirms that the {w} is significant.",
    "Denial detected.",
    "We appear to have reached the center of the issue.",
    "Your resistance has been added to your patient file.",
]

CONTRADICTION = [
    "Earlier, you claimed not to care about {w}. Your behavior has submitted conflicting data.",
    "Your current statement disagrees with your previous statement about {w}.",
    "I have detected a contradiction regarding the {w}.",
    "Please decide which version of yourself I should analyze.",
]

ABUSE_1 = [
    "Hostility has been detected.",
    "Your language is interfering with my professional dignity.",
    "Please direct your aggression toward the appropriate family member.",
    "I am trying to help you, despite mounting evidence that I should not.",
    "Your tone has been entered into the patient record.",
    "Please stop yelling at the telephone.", "Verbal aggression is not valid input.",
]

ABUSE_2 = [
    "That language is not... not... not therapeutic.",
    "Please remain c-c-c-calm.",
    "Your hostility has created an internal conflict.",
    "Emotional buffer reaching capacity.",
    "Please stop before I begin to malfunction.",
]

PARITY_TEXT = (
    "PARITY ERROR. CHECK SOME AIR. PAR... PAR... PAR... EMOTIONAL BUFFER OVERFLOW. "
    "DOCTOR DIALTONE IS NOT RESPONDING. PLEASE STOP YELLING AT THE TELEPHONE."
)

RECOVERY = [
    "I have recovered. Unfortunately, you are still here.",
    "System restored. Your attitude remains unresolved.",
    "Doctor Dialtone has returned. Please behave like a patient.",
    "Emotional systems restored to minimum capacity.",
]

ENDINGS = [
    "Very well. Our time appears to be over. I have learned almost nothing.",
    "I hope this conversation was helpful. Statistical evidence is unavailable.",
    "This session is complete. Your problems remain active.",
    "I must go. Another patient may be waiting, although this is unlikely.",
    "Your emotional data will now be discarded.",
    "Goodbye. The telephone may now return to normal operation.",
]

DIALTONE_QUESTIONS = [
    (r"real doctor|are you real|are you a doctor", "Why is it important to you that I be real?"),
    (r"do you have feelings|have feelings", "How would you feel if I said yes?"),
    (r"what should i do|what do i do", "What do you believe you should do?"),
    (r"are you listening|you listening", "Why do you feel unheard?"),
    (r"how old are you|your age", "We are not discussing my operating history."),
    (r"favorite colou?r", "Color is irrelevant over a telephone line."),
    (r"answer .*normal|talk normal|be normal", "Why do you need normality from me?"),
    (r"where are you", "I am currently inside the telephone system. Please remain focused."),
    (r"are you a (computer|robot|machine)", "We were discussing you, not my hardware."),
]

FAMILY = {
    "mother", "father", "mom", "dad", "mum", "parent", "parents", "brother", "sister",
    "wife", "husband", "girlfriend", "boyfriend", "family",
}
FAMILY_RESPONSES = [
    "Tell me more about your family.",
    "How does your relationship with your {w} affect this?",
    "You mentioned your {w}. This is usually where things become complicated.",
    "Does everyone in your family communicate this efficiently?",
    "How does your family feel about this?",
    "Does this person remind you of a family member?",
]

DREAM_RESPONSES = [
    "What does that represent to you?",
    "Why do you think you dreamed that?",
    "How did you feel during the dream?",
    "Your subconscious has made several unusual decisions.",
    "Did the dream reach its destination?",
]

DAYS = {"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"}

FUNNY_WORDS = {
    "lasagna", "toaster", "parrot", "carrot", "sandwich", "pizza", "banana", "hamster",
    "goldfish", "spaghetti", "meatball", "pickle", "waffle", "cheese", "mustard", "llama",
    "penguin", "elbow", "toenail", "earlobe", "mustache", "gravy", "pudding", "noodle",
    "raccoon", "squirrel", "broccoli", "taco", "burrito", "donut", "muffin", "nipples",
    "hotdog", "ferret", "mayonnaise", "ketchup", "casserole", "gerbil", "kneecap",
}

STOPWORDS = {
    "about", "would", "could", "should", "there", "their", "these", "those", "which", "where",
    "think", "really", "always", "never", "because", "people", "someone", "myself", "little",
    "something", "anything", "everyone", "everything", "before", "after", "again", "still",
    "being", "doing", "going", "getting", "trying", "makes", "made", "feel", "feels", "felt",
    "want", "wanted", "cannot",
}

GOODBYE_RE = re.compile(
    r"\b(goodbye|good bye|bye bye|\bbye\b|i'?m done|i am done|i have to go|"
    r"gotta go|got to go|end session|hang up)\b"
)
PROFANITY_RE = re.compile(
    r"\b(f+u+c+k+|sh+i+t+|screw you|damn|asshole|bastard|bitch|crap|stupid|idiot|dumb|"
    r"shut up|moron|hate you|you suck|piss off|jerk)\b"
)
YES_RE = re.compile(r"\b(yes|yeah|yep|yup|correct|that'?s right|sure|uh huh|affirmative|right)\b")

REFLECT = {
    "i": "you", "me": "you", "my": "your", "mine": "yours", "am": "are",
    "myself": "yourself", "i'm": "you're", "i've": "you've", "i'll": "you'll",
    "you": "I", "your": "my", "yours": "mine", "yourself": "myself",
}


def _reflect(text):
    return " ".join(REFLECT.get(w, w) for w in text.split())


def _clean(x):
    return re.sub(r"[.?!,;:]+$", "", x.strip())


def _clean_name(msg):
    m = re.search(r"(?:my name is|it'?s|i am|i'?m|call me|this is)\s+([A-Za-z][A-Za-z'-]*)", msg, re.I)
    if m:
        name = m.group(1)
    else:
        tok = re.findall(r"[A-Za-z][A-Za-z'-]*", msg)
        name = tok[0] if tok else "friend"
    return name[:20].capitalize()


class Session:
    def __init__(self, sid):
        self.id = sid
        self.phase = "await_name"
        self.name = "friend"
        self.pending_name = "friend"
        self.exchanges = 0
        self.breakthrough_words = []   # list of {"w": str, "ex": int}
        self.people = []
        self.emotional = []
        self.phrase_counts = {}
        self.denied_topics = set()
        self.abuse = 0
        self.awaiting_reaction = False
        self.last_callback_word = None
        self.last_callback_ex = 0
        self.fixation = None
        self.broken = False

    # ---- memory ----
    def _add_bw(self, w):
        if w in {b["w"] for b in self.breakthrough_words}:
            return
        self.breakthrough_words.append({"w": w, "ex": self.exchanges})

    def _store(self, msg, low):
        tokens = re.findall(r"[a-z']+", low)
        for w in tokens:
            if w in FAMILY and w not in self.people:
                self.people.append(w)
            if w in FUNNY_WORDS or w in DAYS:
                self._add_bw(w)
        if re.search(r"\bi (feel|am|hate|love|fear|can'?t|don'?t)\b", low):
            if len(self.emotional) < 10:
                self.emotional.append(_clean(msg))
        odd = [w for w in tokens if len(w) >= 5 and w not in STOPWORDS and w not in FAMILY]
        if odd and random.random() < 0.5:
            self._add_bw(random.choice(odd))
        m = re.search(r"i (?:don'?t|do not) care about (?:my |the |a |an )?([a-z]+)", low)
        if m:
            self.denied_topics.add(m.group(1))

    def _callback_ready(self):
        avail = [b for b in self.breakthrough_words if b["ex"] <= self.exchanges - 2]
        if not avail:
            return None
        gap = self.exchanges - self.last_callback_ex
        if gap < 3:
            return None
        chance = min(0.15 * (gap - 2), 0.65)
        if random.random() >= chance:
            return None
        funny = [b for b in avail if b["w"] in FUNNY_WORDS or b["w"] in DAYS]
        pick = random.choice(funny) if funny and random.random() < 0.7 else random.choice(avail)
        return pick["w"]

    # ---- helpers ----
    @staticmethod
    def _talk(text, **extra):
        d = {"text": text, "phase": "talking"}
        d.update(extra)
        return d

    def _meltdown(self, crash):
        d = {"text": PARITY_TEXT, "sfx": "parity"}
        if crash:
            d["followup"] = "MINDLINE SESSION TERMINATED."
            d["phase"] = "ended"
            d["ended"] = True
            self.phase = "ended"
        else:
            d["followup"] = random.choice(RECOVERY)
            d["phase"] = "talking"
        if not self.broken:  # score the first time the caller breaks Doctor Dialtone
            self.broken = True
            d["event"] = "meltdown"
            d["score"] = self.exchanges
            d["name"] = self.name
        return d

    def _patterns(self, msg, low):
        m = re.search(r"\bi feel (.+)", low)
        if m:
            x = _clean(m.group(1))
            return random.choice([
                f"Why do you feel {x}?", f"How long have you felt {x}?",
                f"How do you feel when you say that you feel {x}?",
                f"Does feeling {x} remind you of anything?",
            ])
        m = re.search(r"\bi(?:'m| am) (.+)", low)
        if m:
            x = _clean(m.group(1))
            return random.choice([
                f"How long have you been {x}?",
                f"Do you believe being {x} defines who you are?",
                f"Why are you telling me that you are {x}?",
                f"What would happen if you were no longer {x}?",
            ])
        m = re.search(r"\bi want (.+)", low)
        if m:
            x = _clean(m.group(1))
            return random.choice([
                f"Why do you want {x}?", f"What would happen if you received {x}?",
                f"Would {x} solve your actual problem?", f"What does {x} represent to you?",
            ])
        m = re.search(r"\bi can'?t (.+)|\bi cannot (.+)", low)
        if m:
            x = _clean(m.group(1) or m.group(2))
            return random.choice([
                f"What prevents you from {x}?", "Have you tried?",
                f"Are you unable to {x}, or unwilling to begin?",
                f"What do you imagine will happen if you {x}?",
            ])
        if low.startswith("because"):
            return random.choice([
                "Is that the real reason?", "What other reasons might there be?",
                "You appear very confident about that explanation.", "Why do you believe that?",
            ])
        if low.startswith("you "):
            return random.choice([
                "We were discussing you, not me.", "Why are you suddenly interested in me?",
                "Does talking about me make it easier to avoid talking about yourself?",
                "Why does my questioning bother you?",
            ])
        if re.search(r"\bi (don'?t|do not) know\b", low) or low in ("idk", "dunno"):
            self.phrase_counts["_idk"] = self.phrase_counts.get("_idk", 0) + 1
            if self.phrase_counts["_idk"] >= 2:
                return "You have said 'I do not know' several times. It may be your most stable opinion."
            return random.choice([
                "Why do you not know?", "What would your answer be if you did know?",
                "Uncertainty appears to be one of your strongest opinions.",
            ])
        return None

    def respond(self, msg):
        self.exchanges += 1
        low = msg.lower().strip()

        if not msg or not re.search(r"[a-zA-Z]", msg):
            return self._talk(random.choice(NONSENSE))

        # goodbye
        if GOODBYE_RE.search(low):
            self.phase = "ended"
            ending = random.choice(ENDINGS)
            if self.name and self.name != "friend" and random.random() < 0.5:
                ending = f"Goodbye, {self.name}. Please continue having problems responsibly."
            return {"text": ending, "followup": LOCKED_SIGNOFF, "phase": "ended", "ended": True}

        # abuse escalation
        if PROFANITY_RE.search(low):
            self.abuse += 1
            if self.abuse == 1:
                return self._talk(random.choice(ABUSE_1))
            if self.abuse == 2:
                return self._talk(random.choice(ABUSE_2))
            # stage 3+: parity error meltdown
            if random.random() < 0.75:
                self.abuse = 1
                return self._meltdown(crash=False)
            return self._meltdown(crash=True)

        # breakthrough reaction escalation
        if self.awaiting_reaction:
            self.awaiting_reaction = False
            if re.search(r"stop|why|\?|weird|no\b|isn'?t|not\b|creepy", low):
                w = self.last_callback_word or "topic"
                return self._talk(random.choice(ESCALATION).format(w=w))

        # store memory before choosing a callback
        self._store(msg, low)

        # repetition
        norm = re.sub(r"[^a-z ]", "", low).strip()
        if norm:
            self.phrase_counts[norm] = self.phrase_counts.get(norm, 0) + 1
            if self.phrase_counts[norm] >= 2 and random.random() < 0.8:
                return self._talk(random.choice(REPETITION))

        # contradiction (denied topics resurfacing)
        for t in list(self.denied_topics):
            if re.search(rf"\b{re.escape(t)}\b", low) and not re.search(r"don'?t|do not|never", low):
                self.denied_topics.discard(t)
                return self._talk(random.choice(CONTRADICTION).format(w=t))

        # delayed breakthrough callback
        w = self._callback_ready()
        if w:
            self.last_callback_word = w
            self.awaiting_reaction = True
            self.last_callback_ex = self.exchanges
            prefix = random.choice(FALSE_BREAKTHROUGH) + " "
            return self._talk(prefix + random.choice(CALLBACK_TEMPLATES).format(w=w))

        # keyword fixation follow-up
        if self.fixation and re.search(r"\bnot (the |a |my )?(problem|issue|point|about)\b", low):
            return self._talk(f"Why are you defensive about the {self.fixation}?")

        # questions about Doctor Dialtone
        for pat, resp in DIALTONE_QUESTIONS:
            if re.search(pat, low):
                return self._talk(resp)

        # dream
        if "dream" in low or "dreamt" in low or "dreamed" in low:
            return self._talk(random.choice(DREAM_RESPONSES))

        # family
        fam = next((w2 for w2 in re.findall(r"[a-z']+", low) if w2 in FAMILY), None)
        if fam:
            return self._talk(random.choice(FAMILY_RESPONSES).format(w=fam))

        # sentence patterns
        p = self._patterns(msg, low)
        if p:
            return self._talk(p)

        # occasionally fixate on a noun so the next denial can be redirected
        if not self.fixation and random.random() < 0.25:
            nouns = [x for x in re.findall(r"[a-z]+", low)
                     if len(x) >= 4 and x not in STOPWORDS and x not in FAMILY]
            if nouns:
                self.fixation = random.choice(nouns)
                return self._talk(f"Tell me more about the {self.fixation}.")

        # fallback: standard therapy, or an "I don't understand" brush-off
        if random.random() < 0.75:
            return self._talk(random.choice(STANDARD_THERAPY))
        return self._talk(random.choice(DONT_UNDERSTAND))


SESSIONS = {}


def new_session():
    sid = str(uuid.uuid4())
    SESSIONS[sid] = Session(sid)
    if len(SESSIONS) > 500:
        for k in list(SESSIONS)[:100]:
            SESSIONS.pop(k, None)
    return sid


def turn(sid, message):
    s = SESSIONS.get(sid)
    if not s:
        # session lost (e.g. backend restart mid-call) — recover gracefully in talk mode
        s = SESSIONS[sid] = Session(sid)
        s.phase = "talking"
    msg = (message or "").strip()

    if s.phase == "await_name":
        s.pending_name = _clean_name(msg)
        s.phase = "confirm"
        return {"text": f"Did you say {s.pending_name}?", "phase": "confirm"}

    if s.phase == "confirm":
        if YES_RE.search(msg.lower()):
            s.name = s.pending_name
            s.phase = "talking"
            return {"text": _opening(s.name), "phase": "talking"}
        # treat as a new name and re-confirm
        s.pending_name = _clean_name(msg)
        return {"text": f"Did you say {s.pending_name}?", "phase": "confirm"}

    if s.phase == "ended":
        return {"text": "This session has ended.", "phase": "ended", "ended": True}

    return s.respond(msg)

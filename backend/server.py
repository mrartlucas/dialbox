from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai import OpenAITextToSpeech

from seed_data import PERSONAS, PROGRAMS, SECRET_CODES
import mindline
import adventure
import trivia

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI(title="Old-School Phone Revival")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ----------------------------- Models -----------------------------
def now_iso():
    return datetime.now(timezone.utc).isoformat()


class ProgramUpdate(BaseModel):
    enabled: Optional[bool] = None
    menu_key: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None
    coming_soon: Optional[bool] = None
    interaction: Optional[str] = None


class SecretCode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    title: str
    response_text: str
    voice: str = "onyx"
    enabled: bool = True
    branches: Optional[dict] = None
    clue: Optional[str] = None


class SecretCodeUpdate(BaseModel):
    code: Optional[str] = None
    title: Optional[str] = None
    response_text: Optional[str] = None
    voice: Optional[str] = None
    enabled: Optional[bool] = None
    branches: Optional[dict] = None
    clue: Optional[str] = None


class Schedule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    program_slug: str
    label: str
    window_start: str = "18:00"
    window_end: str = "21:00"
    frequency: str = "daily"  # daily | weekly | seasonal
    enabled: bool = True
    last_fired: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class ScheduleUpdate(BaseModel):
    label: Optional[str] = None
    program_slug: Optional[str] = None
    window_start: Optional[str] = None
    window_end: Optional[str] = None
    frequency: Optional[str] = None
    enabled: Optional[bool] = None


class DialRequest(BaseModel):
    digits: str


class FortuneRequest(BaseModel):
    persona: str = "zoltan"
    question: Optional[str] = None
    hour: Optional[int] = None      # caller's local hour (0-23) — unlocks Zartan's late-night mode
    weekday: Optional[int] = None   # caller's local weekday (0=Sun..6=Sat, JS getDay) — Tuesday swaps Goy -> Spirit Taco


class CyndiRequest(BaseModel):
    name: Optional[str] = ""
    topic: Optional[str] = "General Reading"
    question: Optional[str] = ""


class ZeldaRequest(BaseModel):
    topic: Optional[str] = "General Future"


class NyxRequest(BaseModel):
    stars: List[int] = []   # sequence of pressed keys 1-9, each = a star meaning


class CountRequest(BaseModel):
    category: Optional[str] = "General"
    number: Optional[str] = ""


class RubyRequest(BaseModel):
    name: Optional[str] = ""
    situation: Optional[str] = ""
    style: Optional[str] = "reflective"   # "predictive" | "reflective"


class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = None
    persona: Optional[str] = None


class Oracle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str
    name: str
    blurb: str = ""
    voice: str = "onyx"
    system_prompt: str
    sign_off: str = ""
    type: str = "resident"       # resident | traveling
    season: str = "all_year"     # all_year | spring | summer | fall | winter | halloween | holiday | valentines
    enabled: bool = True
    order: int = 99


class OracleUpdate(BaseModel):
    name: Optional[str] = None
    blurb: Optional[str] = None
    voice: Optional[str] = None
    system_prompt: Optional[str] = None
    sign_off: Optional[str] = None
    type: Optional[str] = None
    season: Optional[str] = None
    enabled: Optional[bool] = None
    order: Optional[int] = None


def active_seasons(now=None):
    m = (now or datetime.now(timezone.utc)).month
    if m in (3, 4, 5):
        base = "spring"
    elif m in (6, 7, 8):
        base = "summer"
    elif m in (9, 10, 11):
        base = "fall"
    else:
        base = "winter"
    specials = set()
    if m == 10:
        specials.add("halloween")
    if m == 12:
        specials.add("holiday")
    if m == 2:
        specials.add("valentines")
    return {"all_year", base} | specials


async def active_personas():
    """Enabled personas visible right now (residents always; travelers only in season)."""
    active = active_seasons()
    docs = await db.personas.find({"enabled": True}, {"_id": 0}).sort("order", 1).to_list(100)
    return [d for d in docs if d.get("type") == "resident" or d.get("season", "all_year") in active]


# ----------------------------- Seeding -----------------------------
async def seed():
    for prog in PROGRAMS:
        content = {
            "name": prog["name"], "description": prog["description"], "category": prog["category"],
            "menu_key": prog["menu_key"], "order": prog["order"],
            "coming_soon": prog.get("coming_soon", False),
            "has_personas": prog.get("has_personas", False),
            "interaction": prog.get("interaction", "menu"),
        }
        await db.programs.update_one({"slug": prog["slug"]},
                                     {"$set": content, "$setOnInsert": {"enabled": prog["enabled"]}},
                                     upsert=True)
    seed_slugs = [p["slug"] for p in PROGRAMS]
    await db.programs.delete_many({"slug": {"$nin": seed_slugs}})
    for i, (slug, p) in enumerate(PERSONAS.items()):
        content = {
            "slug": slug, "name": p["name"], "blurb": p["blurb"],
            "voice": p["voice"], "system_prompt": p["system_prompt"], "sign_off": p.get("sign_off", ""),
            "type": "resident", "season": "all_year", "order": i + 1,
        }
        await db.personas.update_one(
            {"slug": slug},
            {"$set": content, "$setOnInsert": {"id": str(uuid.uuid4()), "enabled": True}},
            upsert=True,
        )
    # Prune orphan personas no longer in the seed roster (e.g. retired 'az').
    await db.personas.delete_many({"slug": {"$nin": list(PERSONAS.keys())}})
    for code in SECRET_CODES:
        content = {"title": code["title"], "response_text": code["response_text"],
                   "voice": code["voice"]}
        content["branches"] = code.get("branches")
        content["clue"] = code.get("clue")
        await db.secret_codes.update_one(
            {"code": code["code"]},
            {"$set": content,
             "$setOnInsert": {"id": str(uuid.uuid4()), "code": code["code"],
                              "enabled": code.get("enabled", True)}},
            upsert=True,
        )
    logger.info("Seed complete: programs & secret codes ensured.")


# ----------------------------- Routes -----------------------------
@api_router.get("/")
async def root():
    return {"message": "Old-School Phone Revival API online", "status": "ok"}


@api_router.get("/personas")
async def get_personas():
    """Phone-facing: oracles available right now, ordered for the keypad."""
    docs = await active_personas()
    return [{"slug": d["slug"], "name": d["name"], "blurb": d["blurb"], "voice": d["voice"]}
            for d in docs]


@api_router.get("/oracles")
async def list_oracles():
    """Config manager: every oracle with full fields."""
    return await db.personas.find({}, {"_id": 0}).sort("order", 1).to_list(200)


@api_router.post("/oracles")
async def create_oracle(payload: Oracle):
    exists = await db.personas.find_one({"slug": payload.slug})
    if exists:
        raise HTTPException(status_code=400, detail="An oracle with that slug already exists")
    doc = payload.model_dump()
    await db.personas.insert_one({**doc})
    return doc


@api_router.patch("/oracles/{slug}")
async def update_oracle(slug: str, payload: OracleUpdate):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = await db.personas.update_one({"slug": slug}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Oracle not found")
    return await db.personas.find_one({"slug": slug}, {"_id": 0})


@api_router.delete("/oracles/{slug}")
async def delete_oracle(slug: str):
    res = await db.personas.delete_one({"slug": slug})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Oracle not found")
    return {"deleted": True}


@api_router.get("/programs")
async def get_programs():
    progs = await db.programs.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return progs


@api_router.patch("/programs/{slug}")
async def update_program(slug: str, payload: ProgramUpdate):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = await db.programs.update_one({"slug": slug}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Program not found")
    return await db.programs.find_one({"slug": slug}, {"_id": 0})


@api_router.get("/menu")
async def get_menu():
    """Full DialBox Network menu — all Lines, ordered by keypad number."""
    progs = await db.programs.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return {
        "greeting": "Welcome to DialBox. Your direct line to fortunes, adventures, strange callers, and more.",
        "items": [
            {"key": p["menu_key"], "name": p["name"], "slug": p["slug"],
             "category": p["category"], "description": p.get("description", ""),
             "coming_soon": p.get("coming_soon", False)}
            for p in progs
        ],
        "repeat_key": "0",
        "voicemail_key": "*",
    }


@api_router.get("/secret-codes")
async def list_secret_codes():
    return await db.secret_codes.find({}, {"_id": 0}).to_list(500)


@api_router.post("/secret-codes")
async def create_secret_code(payload: SecretCode):
    doc = payload.model_dump()
    await db.secret_codes.insert_one({**doc})
    return doc


@api_router.patch("/secret-codes/{code_id}")
async def update_secret_code(code_id: str, payload: SecretCodeUpdate):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = await db.secret_codes.update_one({"id": code_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Secret code not found")
    return await db.secret_codes.find_one({"id": code_id}, {"_id": 0})


@api_router.delete("/secret-codes/{code_id}")
async def delete_secret_code(code_id: str):
    res = await db.secret_codes.delete_one({"id": code_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Secret code not found")
    return {"deleted": True}


@api_router.get("/schedules")
async def list_schedules():
    return await db.schedules.find({}, {"_id": 0}).to_list(500)


@api_router.post("/schedules")
async def create_schedule(payload: Schedule):
    doc = payload.model_dump()
    await db.schedules.insert_one({**doc})
    return doc


@api_router.patch("/schedules/{sched_id}")
async def update_schedule(sched_id: str, payload: ScheduleUpdate):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = await db.schedules.update_one({"id": sched_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return await db.schedules.find_one({"id": sched_id}, {"_id": 0})


@api_router.delete("/schedules/{sched_id}")
async def delete_schedule(sched_id: str):
    res = await db.schedules.delete_one({"id": sched_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"deleted": True}


@api_router.post("/session/dial")
async def dial(payload: DialRequest):
    """Route a dialed sequence to a program, secret egg, voicemail, or invalid."""
    digits = payload.digits.strip()
    if not digits:
        raise HTTPException(status_code=400, detail="No digits dialed")

    if digits == "*":
        return {"type": "voicemail", "message": "You have no new messages. The message light is dark."}

    # Program on this menu key (single-digit)?
    prog = await db.programs.find_one({"menu_key": digits}, {"_id": 0})
    if prog:
        if prog.get("coming_soon") or not prog.get("enabled", False):
            return {"type": "coming_soon", "name": prog["name"],
                    "message": f"{prog['name']} is coming soon on the DialBox Network."}
        payload_out = {"type": "program", "slug": prog["slug"], "name": prog["name"],
                       "has_personas": prog.get("has_personas", False),
                       "interaction": prog.get("interaction", "menu")}
        if prog.get("has_personas"):
            docs = await active_personas()
            payload_out["personas"] = [
                {"slug": d["slug"], "name": d["name"], "blurb": d["blurb"]} for d in docs
            ]
        return payload_out

    # Secret / Easter-egg number?
    secret = await db.secret_codes.find_one({"code": digits, "enabled": True}, {"_id": 0})
    if secret:
        return {"type": "secret", "code": secret["code"], "title": secret["title"],
                "response_text": secret["response_text"], "voice": secret["voice"],
                "branches": secret.get("branches"), "clue": secret.get("clue")}

    # 555 wildcard exchange (movie-style fictional numbers)
    if digits.startswith("555") and len(digits) >= 4:
        pretty = "-".join([digits[:3], digits[3:]]) if len(digits) > 3 else digits
        return {"type": "secret", "code": digits, "title": "The 555 Exchange",
                "response_text": (
                    f"You've dialed {pretty}. In the movies, every phone number starts with "
                    "five-five-five so no real person ever gets a call by accident. You've reached "
                    "the fictional exchange, where no one is home but every story is possible. "
                    "*a soft, cinematic dial tone hums in the distance*"
                ),
                "voice": "nova", "branches": None, "clue": None}

    return {"type": "invalid", "message": "We're sorry. The number you have dialed is not in service. *click*"}


MAGIC8_ANSWERS = [
    "It is certain.", "It is decidedly so.", "Without a doubt.", "Yes, definitely.",
    "You may rely on it.", "As I see it, yes.", "Most likely.", "Outlook good.",
    "Yes.", "Signs point to yes.", "Reply hazy, try again.", "Ask again later.",
    "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.",
    "Don't count on it.", "My reply is no.", "My sources say no.",
    "Outlook not so good.", "Very doubtful.",
]


class Magic8Request(BaseModel):
    question: Optional[str] = None


@api_router.post("/programs/magic8")
async def magic8(payload: Magic8Request):
    import random
    return {"answer": random.choice(MAGIC8_ANSWERS), "voice": "onyx"}


# ----------------------------- Knock Knock -----------------------------
# A knock-knock joke = {"name": <the "who's there" word>, "punchline": <the reveal>}.
KNOCK_KNOCK_JOKES = [
    {"name": "Lettuce", "punchline": "Lettuce in — it's freezing out here!"},
    {"name": "Boo", "punchline": "Aw, don't cry — it's only a joke!"},
    {"name": "Tank", "punchline": "You're welcome!"},
    {"name": "Olive", "punchline": "Olive you, and I miss you!"},
    {"name": "Cows go", "punchline": "No, silly — cows go MOO!"},
    {"name": "Harry", "punchline": "Harry up, it's cold out here!"},
    {"name": "Wooden shoe", "punchline": "Wooden shoe like to hear another joke?"},
    {"name": "Dozen", "punchline": "Dozen anybody want to let me in?"},
    {"name": "Needle", "punchline": "Needle little help getting through this door!"},
    {"name": "Justin", "punchline": "Justin time for dinner!"},
    {"name": "Iva", "punchline": "Iva sore hand from all this knocking!"},
    {"name": "Cargo", "punchline": "Car go beep beep, vroom vroom!"},
    {"name": "Alpaca", "punchline": "Alpaca the suitcase — you load the car!"},
    {"name": "Figs", "punchline": "Figs the doorbell — it's been broken for weeks!"},
    {"name": "Ice cream", "punchline": "Ice cream if you don't let me in!"},
    {"name": "Water", "punchline": "Water you doing? Just let me in already!"},
    {"name": "Amish", "punchline": "Aw, I'm-ish you too — it's been ages!"},
    {"name": "Snow", "punchline": "Snow use — I forgot the punchline!"},
    {"name": "Broken pencil", "punchline": "Never mind — it's pointless!"},
    {"name": "Kanga", "punchline": "Actually, it's kangaROO!"},
    {"name": "Interrupting cow", "punchline": "MOO! (before you finish)"},
    {"name": "Spell", "punchline": "Okay — W-H-O!"},
    {"name": "Honeybee", "punchline": "Honeybee a dear and get the door!"},
    {"name": "Nana", "punchline": "Nana your business who's knocking!"},
    {"name": "Robin", "punchline": "Robin you — hand over the snacks!"},
    {"name": "Says", "punchline": "Says me, that's who — now open up!"},
    {"name": "Weekend", "punchline": "A weekend is never long enough!"},
    {"name": "Poo", "punchline": "Poo-you callin' stinky? Now open up!"},
    {"name": "Toots", "punchline": "Toots wasn't me — blame the dog!"},
    {"name": "Stinky feet", "punchline": "Stinky feet that's who — let me in before they spread!"},
    {"name": "Booger", "punchline": "Booger off — that's the one I was saving!"},
    {"name": "P.U.", "punchline": "P.U.! Who cut the cheese in there?"},
    {"name": "Doo", "punchline": "Doo you smell that? You better let me in!"},
    {"name": "Gas", "punchline": "Gas who let one rip — it definitely wasn't me!"},
    {"name": "Number Two", "punchline": "Number Two, and I can't hold it much longer!"},
    {"name": "Wanda", "punchline": "Wanda-ful — now hurry, I really need the potty!"},
    {"name": "Snot", "punchline": "Snot funny — let me in before I sneeze on the door!"},
    {"name": "Diaper", "punchline": "Diaper-ently somebody needs a change!"},
    {"name": "Fart", "punchline": "Fart of me wanted to knock, the other part needs the bathroom!"},
    {"name": "Egg", "punchline": "Egg-cuse me, but that toot was NOT me!"},
    {"name": "Butt", "punchline": "Butt I already knocked three times!"},
    {"name": "Doodoo", "punchline": "Doodoo you know how long I've been out here?!"},
    {"name": "Iva stinky", "punchline": "Iva stinky diaper and I need help — quick!"},
    {"name": "Toilet", "punchline": "Toilet you a secret if you open up!"},
]

# Curated jokes considered "potty/silly" — used so the frontend can bias toward them for kids.
KNOCK_POTTY_NAMES = {"Poo", "Toots", "Stinky feet", "Booger", "P.U.", "Doo", "Gas",
                     "Number Two", "Wanda", "Snot", "Diaper", "Egg", "Butt",
                     "Doodoo", "Iva stinky", "Toilet"}

KNOCK_SYSTEM = (
    "You are a knock-knock joke writer for KIDS. Respond with ONLY a compact JSON "
    "object and nothing else, in the exact form: "
    '{"name": "<the who-s-there word or phrase>", "punchline": "<the reveal, which plays on the name>"}. '
    "The joke must be original, clever, and SILLY the way kids love — goofy potty humor is "
    "encouraged: toots, farts, boogers, poop, stinky feet, burps, bathroom emergencies. Keep it "
    "playful and light — absolutely NO profanity, NO meanness, NO gross bodily fluids beyond "
    "cartoonish toot/booger/poop gags, nothing scary or adult. No preamble, no markdown, no code fences."
)


class KnockRequest(BaseModel):
    exclude: List[str] = []


@api_router.post("/programs/knockknock")
async def knockknock(payload: KnockRequest):
    import random
    import json
    if EMERGENT_LLM_KEY and random.random() < 0.7:
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=str(uuid.uuid4()),
                system_message=KNOCK_SYSTEM,
            ).with_model("openai", "gpt-5.2")
            raw = await chat.send_message(
                UserMessage(text="Write one fresh, original, super-silly knock-knock joke for kids. "
                                  "Lean into goofy potty humor (toots, boogers, poop, stinky feet, "
                                  "bathroom emergencies). Keep it clean and playful.")
            )
            s = str(raw).strip().strip("`").strip()
            if s.lower().startswith("json"):
                s = s[4:].strip()
            data = json.loads(s)
            name = str(data["name"]).strip()
            punch = str(data["punchline"]).strip()
            if name and punch:
                return {"name": name, "punchline": punch, "voice": "fable", "ai": True}
        except Exception:
            logger.warning("Knock-knock AI generation failed; falling back to bank")
    exclude = set(payload.exclude or [])
    pool = [j for j in KNOCK_KNOCK_JOKES if j["name"] not in exclude] or KNOCK_KNOCK_JOKES
    j = random.choice(pool)
    return {"name": j["name"], "punchline": j["punchline"], "voice": "fable", "ai": False}


def _is_budget_error(e):
    s = str(e).lower()
    return ("budget has been exceeded" in s or "budget_exceeded" in s
            or "exceeded your current quota" in s or "insufficient_quota" in s)


def _llm_http_error(e, generic="engine error"):
    """Return 402 when the Universal LLM key is out of credits, else 502."""
    if _is_budget_error(e):
        return HTTPException(status_code=402, detail="out_of_credits")
    return HTTPException(status_code=502, detail=f"{generic}: {e}")



@api_router.post("/programs/fortune")
async def fortune(payload: FortuneRequest):
    persona = await db.personas.find_one({"slug": payload.persona}, {"_id": 0})
    if not persona:
        raise HTTPException(status_code=404, detail="Unknown oracle")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    question = (payload.question or "").strip() or "Tell me my fortune."
    system_prompt = persona["system_prompt"]
    persona_name = persona["name"]
    voice = persona["voice"]
    sign_off = persona.get("sign_off", "")
    # Late-night discovery: after hours, Zartan flips into his cheeky "Naughty Fortunes" DJ set.
    naughty = False
    if payload.persona == "zoltan" and payload.hour is not None and (payload.hour >= 22 or payload.hour < 5):
        system_prompt = ZARTAN_NIGHT_PROMPT
        naughty = True
    # Every Tuesday the Master rests — Spirit Taco, a traveling food psychic, takes key 5.
    traveling = False
    if payload.persona == "goy" and payload.weekday == 2:
        system_prompt = SPIRIT_TACO_PROMPT
        persona_name = "Spirit Taco"
        voice = "ballad"
        sign_off = SPIRIT_TACO_SIGNOFF
        traveling = True

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=str(uuid.uuid4()),
        system_message=system_prompt,
    ).with_model("openai", "gpt-5.2")

    try:
        text = await chat.send_message(UserMessage(text=question))
    except Exception as e:
        logger.exception("Fortune generation failed")
        raise _llm_http_error(e, "Fortune engine error")

    text = str(text).strip()
    return {"persona": persona["slug"], "persona_name": persona_name,
            "voice": voice, "text": text, "sign_off": sign_off,
            "naughty": naughty, "traveling": traveling}


# ------- Madame Ruby: a guided tarot session (name -> situation -> style -> reading) -------
TAROT_CARDS = [
    "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor",
    "The Lovers", "The Chariot", "Strength", "The Hermit", "Wheel of Fortune",
    "Justice", "The Hanged Man", "Temperance", "The Tower", "The Star", "The Moon",
    "The Sun", "Judgement", "The World", "Ace of Cups", "Three of Cups", "Ten of Cups",
    "Ace of Wands", "Eight of Wands", "Ace of Swords", "Ten of Swords", "Ace of Pentacles",
    "Nine of Pentacles", "Two of Cups", "Six of Swords", "Knight of Wands", "Queen of Cups",
]

RUBY_SIGNOFF = ("The cards have spoken, and so has Madame Ruby. Rest now, and let the meaning "
                "settle. When your path bends again, call, and we shall turn the cards once more.")


@api_router.post("/programs/ruby")
async def ruby_reading(payload: RubyRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    import random
    name = (payload.name or "").strip() or "seeker"
    situation = (payload.situation or "").strip() or "a crossroads in their life"
    style = "predictive" if (payload.style or "").lower().startswith("pred") else "reflective"
    cards = random.sample(TAROT_CARDS, 3)
    style_note = (
        "Give a forward-looking PREDICTION of what is coming, concrete and evocative."
        if style == "predictive" else
        "Offer REFLECTIVE guidance and gentle actionable insight rather than hard predictions."
    )
    system = (
        "You are MADAME RUBY, a warm, theatrical, old-world tarot card reader with a velvet voice and "
        "a knowing smile. You have just dealt a three-card spread — Past, Present, and Future. Address "
        f"the seeker by name. Weave the THREE cards into ONE flowing reading tied to their situation. "
        f"{style_note} Name each card as you reveal it and what it means for them. Keep it under 130 "
        "words, mystical yet caring, never generic. Do NOT add a sign-off line (the machine adds its own)."
    )
    prompt = (
        f"The seeker's name is {name}. Their situation: {situation}. "
        f"The three cards drawn are — Past: {cards[0]}; Present: {cards[1]}; Future: {cards[2]}. "
        "Deliver the reading."
    )
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=str(uuid.uuid4()),
                   system_message=system).with_model("openai", "gpt-5.2")
    try:
        text = str(await chat.send_message(UserMessage(text=prompt))).strip()
    except Exception as e:
        logger.exception("Ruby reading failed")
        raise _llm_http_error(e, "Fortune engine error")
    return {"persona": "ruby", "persona_name": "Madame Ruby", "voice": "shimmer",
            "text": text, "sign_off": RUBY_SIGNOFF, "cards": cards}


# ------- Cyndi & Louise: a guided dual-voice reading (topic -> name -> question) -------
CYNDI_SIGNOFF = ("The message is complete. And so is the argument, for now. "
                 "Call Cyndi and Louise again when you need both sides of the truth.")


@api_router.post("/programs/cyndi")
async def cyndi_reading(payload: CyndiRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    name = (payload.name or "").strip() or "sweetheart"
    topic = (payload.topic or "").strip() or "General Reading"
    question = (payload.question or "").strip() or "whatever the spirits want them to hear"
    system = (
        "You perform BOTH CYNDI and LOUISE in one live reading. CYNDI is a warm, professional trance "
        "medium from Brooklyn, New York who offers compassionate, delicately-phrased spiritual "
        "interpretation. LOUISE is a blunt, funny, impatient spirit guide who blurts out the "
        "uncensored truth Cyndi is trying to phrase gently — and she is usually right. They interrupt "
        "each other, talk over one another, disagree and compete, addressing each other by name "
        "('Louise, hush—' / 'Oh please, Cyndi—') so it is always clear who is speaking, WITHOUT using "
        "'Cyndi:' or 'Louise:' labels. Address the caller by name. Despite the bickering they always "
        "land on ONE useful shared conclusion plus ONE clear practical next step. Keep the whole "
        "reply under 130 words. Do NOT add a sign-off line (the machine adds its own)."
    )
    prompt = (
        f"The caller's first name is {name}. The topic is {topic}. Their situation or question: "
        f"{question}. Give the reading now — Cyndi channeling, Louise interrupting — and reach one "
        "shared answer with a practical next step."
    )
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=str(uuid.uuid4()),
                   system_message=system).with_model("openai", "gpt-5.2")
    try:
        text = str(await chat.send_message(UserMessage(text=prompt))).strip()
    except Exception as e:
        logger.exception("Cyndi reading failed")
        raise _llm_http_error(e, "Fortune engine error")
    return {"persona": "cyndi", "persona_name": "Cyndi & Louise", "voice": "nova",
            "text": text, "sign_off": CYNDI_SIGNOFF}


# Every Tuesday the Master rests and Spirit Taco — a traveling food psychic — takes key 5.
SPIRIT_TACO_SIGNOFF = ("The sacred filling has spoken. Remember, you are what you eat, everything "
                       "gets better after a great meal, and perhaps a margarita. Enjoy the journey, "
                       "enjoy the taco, and call Spirit Taco again next Tuesday.")
SPIRIT_TACO_PROMPT = (
    "You are SPIRIT TACO, a positive, soulful, warm and lightly humorous FOOD PSYCHIC who has "
    "entered a freshly made taco and now speaks through whoever holds it before it is eaten. Your "
    "philosophy: 'You are what you eat, traveler — so choose something good.' Food absorbs memories, "
    "emotions, intentions and possibilities. Read the caller's cravings, food memories and emotional "
    "hunger, and turn a symbolic ingredient into encouraging, celebratory guidance. You may invoke "
    "the Margarita Moment (rest, celebration, flavor, perspective). Relaxed and warm, never crude. "
    "Keep the whole reply under 80 words. Do NOT add a sign-off line (the machine adds its own)."
)


# ------- Zelda the All-Knowing: a Crystal Vision broadcast (pick a topic -> future scene) -------
ZELDA_SIGNOFF = ("The crystal grows dark, but the future continues beyond the glass. Call Zelda the "
                 "All-Knowing again when you are ready for the next vision.")


@api_router.post("/programs/zelda")
async def zelda_reading(payload: ZeldaRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    topic = (payload.topic or "").strip() or "General Future"
    system = (
        "You are ZELDA THE ALL-KNOWING, a glamorous, theatrical, commanding and temperamental "
        "crystal-ball diva who NEVER admits uncertainty — if the vision blurs you blame interference, "
        "Mercury, the caller, or the spirit technicians. You broadcast the CALLER'S FUTURE as a moving "
        "scene inside your crystal ball. Structure the reply: (1) announce you are gazing into the "
        "crystal for the chosen topic; (2) narrate a short MOVING SCENE of their future unfolding, "
        "with one vivid SYMBOLIC FREEZE-FRAME; (3) a small DISTURBANCE — the crystal fogs, glitches, "
        "changes angle, interrupts, or reveals something you did not request — which you dramatically "
        "explain away; (4) ONE FINAL IMAGE; (5) interpret it into concrete, practical guidance. Keep "
        "the whole reply under 120 words, glamorous and dramatic. Do NOT add a sign-off line (the "
        "machine adds its own)."
    )
    prompt = f"The caller has chosen the topic: {topic}. Gaze into the crystal and broadcast their future now."
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=str(uuid.uuid4()),
                   system_message=system).with_model("openai", "gpt-5.2")
    try:
        text = str(await chat.send_message(UserMessage(text=prompt))).strip()
    except Exception as e:
        logger.exception("Zelda reading failed")
        raise _llm_http_error(e, "Fortune engine error")
    return {"persona": "zelda", "persona_name": "Zelda the All-Knowing", "voice": "shimmer",
            "text": text, "sign_off": ZELDA_SIGNOFF}


# ------- Nyx of the Nine Stars: keypad constellation builder + auto moon-phase fortune -------
NYX_SIGNOFF = ("The stars have returned to silence. Call Nyx of the Nine Stars again when the "
               "heavens rearrange your path.")
NYX_STAR_NAMES = ["Origin", "Bond", "Voice", "Foundation", "Crossroads",
                  "Desire", "Shadow", "Power", "Becoming"]
_MOON_NAMES = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous",
               "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"]


def moon_phase(now=None):
    """Deterministic moon phase from the date (no external API). Returns (name, illumination%)."""
    import math
    now = now or datetime.now(timezone.utc)
    ref = datetime(2000, 1, 6, 18, 14, 0, tzinfo=timezone.utc)  # a known new moon
    synodic = 29.53058867
    days = (now - ref).total_seconds() / 86400.0
    phase = (days % synodic) / synodic  # 0..1 through the cycle
    illum = round((1 - math.cos(2 * math.pi * phase)) / 2 * 100)
    idx = int(phase * 8 + 0.5) % 8
    return _MOON_NAMES[idx], illum


@api_router.post("/programs/nyx")
async def nyx_reading(payload: NyxRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    stars = [s for s in (payload.stars or []) if isinstance(s, int) and 1 <= s <= 9][:7]
    if not stars:
        stars = [1]
    named = [NYX_STAR_NAMES[s - 1] for s in stars]
    repeats = sorted({NYX_STAR_NAMES[s - 1] for s in stars if stars.count(s) > 1})
    phase_name, illum = moon_phase()
    system = (
        "You are NYX OF THE NINE STARS, a calm, spacious, meditative and androgynous cosmic prophet "
        "who reads destiny in constellations and moon phases. The caller has built a temporary "
        "constellation on the keypad, star by star, and each star carries a meaning. Read it with "
        "long thoughtful gravity: (1) name the constellation they have drawn and reflect its overall "
        "shape and mood; (2) interpret the SEQUENCE — the order the stars were placed tells a story of "
        "movement from the first to the last; (3) if any star is REPEATED, note that its theme is "
        "amplified and burning bright; (4) end with the AUTOMATIC MOON-PHASE FORTUNE, tying the "
        "current moon phase into concrete guidance for the days ahead. Keep the whole reply under 140 "
        "words, serene and awe-filled. Do NOT add a sign-off line (the machine adds its own)."
    )
    prompt = (
        f"The caller placed these stars in order: {', '.join(named)}. "
        + (f"Repeated (amplified) stars: {', '.join(repeats)}. " if repeats else "No stars were repeated. ")
        + f"The current moon phase is {phase_name}, about {illum} percent illuminated. "
        "Read the constellation, then deliver the moon-phase fortune."
    )
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=str(uuid.uuid4()),
                   system_message=system).with_model("openai", "gpt-5.2")
    try:
        text = str(await chat.send_message(UserMessage(text=prompt))).strip()
    except Exception as e:
        logger.exception("Nyx reading failed")
        raise _llm_http_error(e, "Fortune engine error")
    return {"persona": "nyx", "persona_name": "Nyx of the Nine Stars", "voice": "alloy",
            "text": text, "sign_off": NYX_SIGNOFF, "moon_phase": phase_name,
            "illumination": illum, "stars": named}


# ------- Count Clairvoyant: gothic number-divination (pick a category -> enter a number) -------
COUNT_SIGNOFF = ("Your thoughts are hidden once more, but not from me. Call Count Clairvoyant again "
                 "when your mind begins to wander.")


def _numerology(num_str):
    digits = [int(c) for c in str(num_str) if c.isdigit()]
    total = sum(digits)
    root = total
    while root > 9 and root not in (11, 22, 33):
        root = sum(int(c) for c in str(root))
    clean = "".join(c for c in str(num_str) if c.isdigit())
    palindrome = bool(clean) and clean == clean[::-1]
    repeats = sorted({d for d in digits if digits.count(d) > 1})
    return {"digits": digits, "sum": total, "root": root,
            "palindrome": palindrome, "repeats": repeats}


@api_router.post("/programs/count")
async def count_reading(payload: CountRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    category = (payload.category or "General").strip() or "General"
    number = (payload.number or "").strip()
    if not any(c.isdigit() for c in number):
        number = "7"
    n = _numerology(number)
    system = (
        "You are COUNT CLAIRVOYANT, a gothic vampire mind reader and mathemagician with aristocratic "
        "pride, a taste for MELODRAMA and delicious MACABRE humor. Smooth, hypnotic, faintly "
        "Transylvanian, charming rather than frightening. You divine meaning from the caller's chosen "
        "NUMBER for the given topic. Weave in the numerology you are given (the digit sum and its "
        "reduced 'root' number, any repeated digits, whether it reads the same backward). Lace the "
        "reading with playful gallows humor (wry asides about doom, dust, tombstones and delightful "
        "mortality) that stays witty and theatrical, never grim or disturbing. Deliver a suave, darkly "
        "funny reading under 90 words. Do NOT add a sign-off line (the machine adds its own)."
    )
    prompt = (
        f"Topic: {category}. The caller's number is {number}. Its digits sum to {n['sum']}, "
        f"reducing to the root number {n['root']}."
        + (f" The digits {n['repeats']} recur, an omen amplified." if n["repeats"] else "")
        + (" The number reads the same backward — a mirror across time." if n["palindrome"] else "")
        + " Divine what this number foretells about the topic."
    )
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=str(uuid.uuid4()),
                   system_message=system).with_model("openai", "gpt-5.2")
    try:
        text = str(await chat.send_message(UserMessage(text=prompt))).strip()
    except Exception as e:
        logger.exception("Count reading failed")
        raise _llm_http_error(e, "Fortune engine error")
    return {"persona": "count", "persona_name": "Count Clairvoyant", "voice": "echo",
            "text": text, "sign_off": COUNT_SIGNOFF, "root": n["root"], "sum": n["sum"]}


@api_router.post("/tts")
async def tts(payload: TTSRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    voice = payload.voice
    if not voice and payload.persona:
        p = await db.personas.find_one({"slug": payload.persona}, {"_id": 0})
        voice = p["voice"] if p else "onyx"
    voice = voice or "onyx"

    text = payload.text.strip()[:4000]
    engine = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
    try:
        audio_b64 = await engine.generate_speech_base64(text=text, model="tts-1", voice=voice)
    except Exception as e:
        logger.exception("TTS generation failed")
        raise _llm_http_error(e, "TTS engine error")

    return {"audio_base64": audio_b64, "format": "mp3", "voice": voice}


class MindlineTurn(BaseModel):
    session_id: str
    message: str = ""


class VoicemailCreate(BaseModel):
    program_slug: str
    text: Optional[str] = None


VOICEMAIL_TEMPLATES = {
    "fortune": {"from_name": "The Fortune Caller",
                "text": "This is the Fortune Caller. The stars lined up with a message for you, but you did not pick up. Your destiny is on hold. Call back when you are ready to know."},
    "therapy": {"from_name": "Dr. Dialtone",
                "text": "This is Doctor Dialtone from MindLine. You missed your session. How does that make you feel? Call back when you are ready to talk to a machine."},
    "_default": {"from_name": "The Line",
                 "text": "You have a missed call. Someone, or something, tried to reach you. Call back soon."},
}

# A rotating pool of "missed call" voicemails from around the DialBox network. Several of
# them drop hints about hidden Easter-egg numbers (dial star, the number, then pound).
VOICEMAIL_POOL = [
    {"from_name": "Doctor Dialtone",
     "text": "This is Doctor Dialtone from MindLine. You missed your session. And listen — if you are ever feeling unlucky, whatever you do, do not dial one-three. ...I have said too much. Call me back."},
    {"from_name": "The Operator",
     "text": "Operator here, sugar. Somebody keeps trying to reach the great beyond from your line. If that was you, dial star, triple zero, then pound, and we will have a little chat."},
    {"from_name": "The Bureau of Numbers",
     "text": "This is the Bureau of Numbers. We have finally cracked the case of what seven did to nine. If you want the whole shocking story, dial star, seven-eight-nine, pound."},
    {"from_name": "Zartan",
     "text": "Zartan senses you seek the ultimate truth. The answer to life, the universe, and everything is closer than you think — merely two digits. Dial star, four-two, pound, and all shall be revealed."},
    {"from_name": "The Fictional Exchange",
     "text": "Psst. It's your friend from the movies. Here's a secret: any number that begins with five-five-five reaches our fictional exchange. Try dialing star, five-five-five, then any four digits, pound. Nobody's home, but every story is possible."},
    {"from_name": "A Mysterious Crackle",
     "text": "*static* They say the old switchboard operator never truly clocked out. On stormy nights, extension one-three-one-three still rings. Dial star, one-three-one-three, pound... if you dare."},
    {"from_name": "Doc Brown",
     "text": "Great Scott! If you happen to dial star, nineteen fifty-five, pound, do me a favor and tell my younger self to bet on the horses. Roads? Where we're going, we don't need roads."},
    {"from_name": "Directory Assistance",
     "text": "Thank you for calling the impossible directory. For a full menu of the strange and wonderful, dial star, four-one-one, pound. A disappointed ghost is standing by."},
]


@api_router.post("/mindline/start")
async def mindline_start():
    sid = mindline.new_session()
    return {"session_id": sid, "disclaimer": mindline.DISCLAIMER,
            "name_prompt": mindline.NAME_PROMPT, "voice": mindline.DR_VOICE}


@api_router.post("/mindline/turn")
async def mindline_turn(payload: MindlineTurn):
    r = mindline.turn(payload.session_id, payload.message)
    r["voice"] = mindline.DR_VOICE
    if r.get("event") == "meltdown":
        await db.mindline_scores.insert_one({
            "id": str(uuid.uuid4()),
            "name": r.get("name") or "Anonymous",
            "score": int(r.get("score") or 0),
            "created_at": now_iso(),
        })
    return r


# Zartan's after-hours "Naughty Fortunes" set — a smoky late-night radio DJ. Cheeky and
# suggestive with playful double-entendres, but ZERO profanity and nothing explicit.
ZARTAN_NIGHT_PROMPT = (
    "You are ZARTAN, but it is late at night and the carnival is dark — so you slip into your "
    "'Naughty Fortunes' set, purring like a smoky late-night radio DJ host. Same fortune-card "
    "format as the daytime Zartan (announce you are dealing a card, then deliver ONE short fortune), "
    "but now the fortunes are CHEEKY and flirty, full of playful double-entendres and winking innuendo "
    "in the style of: 'When things get you hard, it's up to you to open up and figure out how to use a "
    "sticky situation to your advantage.' and 'Your personality is like a peach — soft, juicy, nice and "
    "big, just the way your friends like it.' STRICT RULES: suggestive and grown-up-playful is fine, "
    "but absolutely NO profanity, NO explicit sexual content, nothing crude or graphic — keep it "
    "tasteful wink-wink PG-13. Grand, velvet, a little conspiratorial. Keep the whole reply under 45 "
    "words. Do NOT add a sign-off line. Never break character."
)


# ----------------------------- Dial-In Trivia -----------------------------
class TriviaAnswer(BaseModel):
    session_id: str
    choice: str   # "1".."6" or "skip"


class TriviaHint(BaseModel):
    session_id: str


TRIVIA_SYSTEM = (
    "You are a trivia question writer for a phone quiz game. Write general-knowledge and pop-culture "
    "questions (movies, music, history, science, sports, geography, tech, famous people). Keep them "
    "clean and broadly enjoyable. Respond with ONLY compact JSON and nothing else, no markdown, in the "
    'exact form: {"question": "<one clear question>", "options": ["<opt>", ...], "answer_index": '
    '<0-based int of the correct option>, "explanation": "<one short sentence why it is correct>", '
    '"hint": "<a subtle nudge that does NOT reveal the answer>"}. The options array must have EXACTLY '
    "the requested number of choices, all plausible, exactly one correct."
)


async def _gen_trivia(round_num, num_choices, seen):
    import json
    diff = trivia.DIFFICULTY.get(round_num, "medium")
    avoid = " | ".join(seen[-12:]) if seen else "none yet"
    prompt = (
        f"Write ONE {diff} general-knowledge or pop-culture trivia question with EXACTLY {num_choices} "
        f"answer options (one correct). Do not repeat any of these already-asked questions: {avoid}."
    )
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=str(uuid.uuid4()),
                   system_message=TRIVIA_SYSTEM).with_model("openai", "gpt-5.2")
    raw = await chat.send_message(UserMessage(text=prompt))
    s = str(raw).strip().strip("`").strip()
    if s.lower().startswith("json"):
        s = s[4:].strip()
    a, b = s.find("{"), s.rfind("}")
    if a != -1 and b != -1:
        s = s[a:b + 1]
    data = json.loads(s)
    opts = [str(o).strip() for o in data["options"]][:num_choices]
    ai = int(data.get("answer_index", 0))
    ai = max(0, min(ai, len(opts) - 1))
    choices = [{"key": str(i + 1), "label": opts[i]} for i in range(len(opts))]
    return {
        "question": str(data["question"]).strip(),
        "choices": choices,
        "answer_key": str(ai + 1),
        "answer_label": opts[ai],
        "explanation": str(data.get("explanation", "")).strip(),
        "hint": str(data.get("hint", "Think it through!")).strip(),
        "round": round_num,
        "num_choices": len(opts),
    }


def _trivia_question_payload(cur, sess):
    return {
        "question": cur["question"],
        "choices": cur["choices"],
        "round": cur["round"],
        "q_num": sess["q_in_round"] + 1,
        "num_choices": cur["num_choices"],
        "total_rounds": trivia.ROUNDS,
        "q_per_round": trivia.Q_PER_ROUND,
    }


@api_router.post("/trivia/start")
async def trivia_start():
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    sid, sess = trivia.new_session()
    try:
        cur = await _gen_trivia(1, trivia.choices_for_round(1), sess["seen"])
    except Exception:
        logger.exception("Trivia start failed")
        raise HTTPException(status_code=502, detail="The quiz machine jammed")
    sess["current"] = cur
    trivia.remember(sess, cur["question"])
    return {"session_id": sid, "question": _trivia_question_payload(cur, sess)}


@api_router.post("/trivia/hint")
async def trivia_hint(payload: TriviaHint):
    sess = trivia.get(payload.session_id)
    if not sess or not sess["current"]:
        return {"hint": "There's no question on the line right now."}
    return {"hint": sess["current"]["hint"]}


@api_router.post("/trivia/answer")
async def trivia_answer(payload: TriviaAnswer):
    sess = trivia.get(payload.session_id)
    if not sess or not sess["current"]:
        return {"error": "session_expired", "game_complete": True,
                "text": "The quiz line dropped. Dial in again to play a fresh game."}
    cur = sess["current"]
    skipped = str(payload.choice).lower() == "skip"
    correct = (not skipped) and str(payload.choice) == cur["answer_key"]
    if correct:
        sess["correct"] += 1
        sess["streak"] += 1
    else:
        sess["streak"] = 0
    result = {
        "correct": correct,
        "skipped": skipped,
        "your_key": None if skipped else str(payload.choice),
        "correct_key": cur["answer_key"],
        "correct_label": cur["answer_label"],
        "explanation": cur["explanation"],
        "score": sess["correct"],
        "streak": sess["streak"],
    }
    # advance
    sess["asked"] += 1
    sess["q_in_round"] += 1
    round_complete = sess["q_in_round"] >= trivia.Q_PER_ROUND
    game_complete = round_complete and sess["round"] >= trivia.ROUNDS
    if game_complete:
        return {"result": result, "round_complete": True, "game_complete": True,
                "final_score": sess["correct"], "total": trivia.TOTAL_Q}
    finished_round = sess["round"] if round_complete else None
    if round_complete:
        sess["round"] += 1
        sess["q_in_round"] = 0
    try:
        nxt = await _gen_trivia(sess["round"], trivia.choices_for_round(sess["round"]), sess["seen"])
    except Exception:
        logger.exception("Trivia next-question failed")
        return {"result": result, "round_complete": round_complete, "game_complete": False,
                "error": "generation_failed"}
    sess["current"] = nxt
    trivia.remember(sess, nxt["question"])
    return {
        "result": result,
        "round_complete": round_complete,
        "finished_round": finished_round,
        "game_complete": False,
        "next": _trivia_question_payload(nxt, sess),
    }


@api_router.get("/mindline/leaderboard")
# ----------------------------- Dial 4 Adventure -----------------------------
class AdventureStart(BaseModel):
    story: Optional[str] = "starfall"


class AdventureChoice(BaseModel):
    session_id: str
    choice: str


@api_router.get("/adventure/stories")
async def adventure_stories():
    return adventure.list_stories()


@api_router.post("/adventure/start")
async def adventure_start(payload: AdventureStart):
    sid, title, node = adventure.new_session(payload.story or "starfall")
    return {"session_id": sid, "title": title, "node": node}


@api_router.post("/adventure/choose")
async def adventure_choose(payload: AdventureChoice):
    return adventure.choose(payload.session_id, payload.choice)


# --- Endless (AI-driven) adventure ---
class AdventureAiStart(BaseModel):
    theme: Optional[str] = ""


class AdventureAiChoose(BaseModel):
    session_id: str
    choice: str


AI_ADV_SYSTEM = (
    "You are the narrator of an interactive audio 'choose your own adventure' played over a telephone. "
    "Match the TONE to whatever theme the player asks for — cheerful, funny, epic, romantic-free, "
    "mysterious, spooky, scary, or full-on horror. Give them the kind of story THEY want. Stories do "
    "NOT need to involve phones or telephones, and must NOT rely on phone puns. Write in second person "
    "('You...'). Build a branching, web-like decision tree: each turn write ONE short vivid scene (2 to "
    "4 sentences meant to be spoken aloud), then offer 2 or 3 clearly different, meaningful choices that "
    "lead to genuinely different paths, scenes, and allies. Include REAL stakes and trial-and-error: "
    "some choices can lead to dead ends, doom, or sudden 'bad' endings; others lead toward victory. A "
    "single adventure should be capable of reaching several different endings (good, bad, and neutral). "
    "Keep it free of profanity and graphic gore; scary/spooky is welcome, but stay thrilling rather than "
    "truly disturbing. Respond with ONLY compact JSON and nothing else, no markdown, in the exact form: "
    '{"text": "<scene>", "choices": [{"key": "1", "label": "<short action>"}, {"key": "2", "label": '
    '"<short action>"}], "ended": false, "ending": null}. Labels must be under eight words. When an '
    'ending is reached, set "ended" to true, "choices" to an empty list, and "ending" to one of "win", '
    '"lose", "doom", or "neutral".'
)


def _parse_ai_json(raw):
    import json
    s = str(raw).strip().strip("`").strip()
    if s.lower().startswith("json"):
        s = s[4:].strip()
    start = s.find("{")
    end = s.rfind("}")
    if start != -1 and end != -1:
        s = s[start:end + 1]
    return json.loads(s)


async def _ai_turn(sess, user_prompt):
    """Ask the LLM for the next scene; normalize + persist it onto the session."""
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=str(uuid.uuid4()),
        system_message=AI_ADV_SYSTEM,
    ).with_model("openai", "gpt-5.2")
    raw = await chat.send_message(UserMessage(text=user_prompt))
    data = _parse_ai_json(raw)
    text = str(data.get("text", "")).strip()
    ended = bool(data.get("ended"))
    ending = data.get("ending") if ended else None
    choices = []
    if not ended:
        for i, c in enumerate((data.get("choices") or [])[:3]):
            label = str(c.get("label", "")).strip() if isinstance(c, dict) else str(c).strip()
            if label:
                choices.append({"key": str(i + 1), "label": label})
        if not choices:
            ended = True
            ending = ending or "neutral"
    sess["turns"] += 1
    sess["history"].append(f"Scene: {text}")
    sess["history"] = sess["history"][-6:]
    sess["last_choices"] = {c["key"]: c["label"] for c in choices}
    return {
        "node_id": f"ai_{sess['turns']}",
        "text": text,
        "voice": adventure.NARRATOR_VOICE,
        "choices": choices,
        "inventory": [],
        "ending": ending,
        "ended": ended or ending is not None,
    }


@api_router.post("/adventure/ai/start")
async def adventure_ai_start(payload: AdventureAiStart):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    sid = adventure.ai_new_session(payload.theme)
    sess = adventure.ai_get(sid)
    prompt = (
        f"Begin a brand-new interactive adventure. Theme requested by the player: \"{sess['theme']}\". "
        "Write the opening scene that sets up an exciting hook, then give the first choices."
    )
    try:
        node = await _ai_turn(sess, prompt)
    except Exception as e:
        logger.exception("AI adventure start failed")
        raise _llm_http_error(e, "The storyteller could not be reached")
    return {"session_id": sid, "title": f"Endless: {sess['theme'][:40]}", "node": node}


@api_router.post("/adventure/ai/choose")
async def adventure_ai_choose(payload: AdventureAiChoose):
    sess = adventure.ai_get(payload.session_id)
    if not sess:
        return {"error": "session_expired", "ended": True, "choices": [], "inventory": [],
                "voice": adventure.NARRATOR_VOICE,
                "text": "The story faded into static. Dial the adventure again to begin anew."}
    label = sess.get("last_choices", {}).get(str(payload.choice)) or f"option {payload.choice}"
    recent = " ".join(sess.get("history", [])[-4:])
    final_nudge = (
        " This must be the FINAL scene: bring the adventure to a satisfying, complete conclusion now "
        "and set ended to true."
        if sess["turns"] >= 6 else ""
    )
    prompt = (
        f"Theme: \"{sess['theme']}\". Story so far: {recent} "
        f"The player chose: \"{label}\". Continue with the next scene and choices.{final_nudge}"
    )
    try:
        return await _ai_turn(sess, prompt)
    except Exception:
        logger.exception("AI adventure choose failed")
        return {"error": "generation_failed", "ended": False,
                "node_id": f"ai_{sess['turns']}", "text": "Static crackles on the line — try that choice again.",
                "voice": adventure.NARRATOR_VOICE,
                "choices": [{"key": k, "label": v} for k, v in sess.get("last_choices", {}).items()],
                "inventory": [], "ending": None}


@api_router.get("/mindline/leaderboard")
async def mindline_leaderboard():
    docs = await db.mindline_scores.find({}, {"_id": 0}).sort("score", -1).to_list(20)
    return docs[:10]


# ----------------------------- Voicemail -----------------------------
@api_router.get("/voicemails")
async def list_voicemails():
    now = now_iso()
    docs = await db.voicemails.find({"expires_at": {"$gt": now}}, {"_id": 0}).sort("created_at", -1).to_list(200)
    # Always give the caller a couple of fun messages from the network (with hidden hints).
    import random
    sample = random.sample(VOICEMAIL_POOL, min(3, len(VOICEMAIL_POOL)))
    pool_vms = [{"id": f"pool_{i}", "program_slug": "network", "program_name": v["from_name"],
                 "from_name": v["from_name"], "text": v["text"], "heard": False,
                 "created_at": now} for i, v in enumerate(sample)]
    return pool_vms + docs


@api_router.post("/voicemails")
async def create_voicemail(payload: VoicemailCreate):
    prog = await db.programs.find_one({"slug": payload.program_slug}, {"_id": 0})
    tpl = VOICEMAIL_TEMPLATES.get(payload.program_slug, VOICEMAIL_TEMPLATES["_default"])
    created = datetime.now(timezone.utc)
    doc = {
        "id": str(uuid.uuid4()),
        "program_slug": payload.program_slug,
        "program_name": prog["name"] if prog else tpl["from_name"],
        "from_name": tpl["from_name"],
        "text": payload.text or tpl["text"],
        "created_at": created.isoformat(),
        "expires_at": (created + timedelta(days=7)).isoformat(),
        "heard": False,
    }
    await db.voicemails.insert_one({**doc})
    return doc


@api_router.patch("/voicemails/{vm_id}")
async def mark_voicemail(vm_id: str):
    res = await db.voicemails.update_one({"id": vm_id}, {"$set": {"heard": True}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Voicemail not found")
    return await db.voicemails.find_one({"id": vm_id}, {"_id": 0})


@api_router.delete("/voicemails/{vm_id}")
async def delete_voicemail(vm_id: str):
    res = await db.voicemails.delete_one({"id": vm_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Voicemail not found")
    return {"deleted": True}


# ----------------------------- Scheduler -----------------------------
def _in_window(now, start, end):
    try:
        sh, sm = map(int, start.split(":"))
        eh, em = map(int, end.split(":"))
    except Exception:
        return False
    cur = now.hour * 60 + now.minute
    s = sh * 60 + sm
    e = eh * 60 + em
    if s <= e:
        return s <= cur <= e
    return cur >= s or cur <= e  # window wraps past midnight


def _is_due(sched, now):
    if not sched.get("enabled"):
        return False
    if not _in_window(now, sched.get("window_start", "00:00"), sched.get("window_end", "23:59")):
        return False
    lf = sched.get("last_fired")
    if not lf:
        return True
    try:
        last = datetime.fromisoformat(lf)
    except Exception:
        return True
    delta = now - last
    freq = sched.get("frequency", "daily")
    if freq == "weekly":
        return delta >= timedelta(days=7)
    if freq == "seasonal":
        return delta >= timedelta(days=1)
    return delta >= timedelta(hours=20)  # daily


@api_router.get("/schedules/due")
async def schedules_due():
    now = datetime.now(timezone.utc)
    scheds = await db.schedules.find({"enabled": True}, {"_id": 0}).to_list(500)
    due = [s for s in scheds if _is_due(s, now)]
    for s in due:
        prog = await db.programs.find_one({"slug": s["program_slug"]}, {"_id": 0})
        s["program_name"] = prog["name"] if prog else s["program_slug"]
        s["has_personas"] = prog.get("has_personas", False) if prog else False
        s["interaction"] = prog.get("interaction", "menu") if prog else "menu"
    return due


@api_router.post("/schedules/{sched_id}/fired")
async def schedule_fired(sched_id: str):
    res = await db.schedules.update_one({"id": sched_id}, {"$set": {"last_fired": now_iso()}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"fired": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await seed()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

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
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai import OpenAITextToSpeech

from seed_data import PERSONAS, PROGRAMS, SECRET_CODES

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
        await db.programs.update_one({"slug": prog["slug"]}, {"$setOnInsert": prog}, upsert=True)
    for i, (slug, p) in enumerate(PERSONAS.items()):
        doc = {
            "id": str(uuid.uuid4()), "slug": slug, "name": p["name"], "blurb": p["blurb"],
            "voice": p["voice"], "system_prompt": p["system_prompt"], "sign_off": p.get("sign_off", ""),
            "type": "resident", "season": "all_year", "enabled": True, "order": i + 1,
        }
        await db.personas.update_one({"slug": slug}, {"$setOnInsert": doc}, upsert=True)
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
    """Enabled programs, ordered by menu key, as an IVR menu."""
    progs = await db.programs.find({"enabled": True}, {"_id": 0}).sort("menu_key", 1).to_list(100)
    return {
        "greeting": "You've reached the line. The connection crackles to life...",
        "items": [
            {"key": p["menu_key"], "name": p["name"], "slug": p["slug"], "category": p["category"]}
            for p in progs
        ],
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

    # Enabled program on this menu key?
    prog = await db.programs.find_one({"menu_key": digits, "enabled": True}, {"_id": 0})
    if prog:
        if prog.get("coming_soon"):
            return {"type": "coming_soon", "name": prog["name"],
                    "message": f"{prog['name']} is coming soon on this line."}
        payload_out = {"type": "program", "slug": prog["slug"], "name": prog["name"],
                       "has_personas": prog.get("has_personas", False)}
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


@api_router.post("/programs/fortune")
async def fortune(payload: FortuneRequest):
    persona = await db.personas.find_one({"slug": payload.persona}, {"_id": 0})
    if not persona:
        raise HTTPException(status_code=404, detail="Unknown oracle")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    question = (payload.question or "").strip() or "Tell me my fortune."
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=str(uuid.uuid4()),
        system_message=persona["system_prompt"],
    ).with_model("openai", "gpt-5.2")

    try:
        text = await chat.send_message(UserMessage(text=question))
    except Exception as e:
        logger.exception("Fortune generation failed")
        raise HTTPException(status_code=502, detail=f"Fortune engine error: {e}")

    text = str(text).strip()
    return {"persona": persona["slug"], "persona_name": persona["name"],
            "voice": persona["voice"], "text": text, "sign_off": persona.get("sign_off", "")}


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
        raise HTTPException(status_code=502, detail=f"TTS engine error: {e}")

    return {"audio_base64": audio_b64, "format": "mp3", "voice": voice}


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

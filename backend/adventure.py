"""Dial 4 Adventure — branching audio-story engine.

Phase 1: one hand-authored, fully deterministic scripted story with a simple
inventory + item-gated choices. Server-side per-session state (in-memory, like MindLine).
AI "endless mode" is a planned follow-up. Family-friendly, no horror.
"""
import uuid

NARRATOR_VOICE = "onyx"

# A node: {text, grants:[items], choices:[{key,label,next, requires?, denied?}], ending?}
STARFALL = {
    "title": "Starfall Station: Signal from Sector Nine",
    "start": "start",
    "nodes": {
        "start": {
            "text": (
                "You are the night-shift operator aboard Starfall Station, alone with the hum of "
                "the reactor. Suddenly your console lights up with a garbled distress call from "
                "Sector Nine."
            ),
            "choices": [
                {"key": "1", "label": "answer the distress call", "next": "answer"},
                {"key": "2", "label": "grab your tool belt from the locker first", "next": "locker"},
            ],
        },
        "locker": {
            "text": (
                "You pop open your locker and clip on your trusty wrench and a flashlight. "
                "The console is still buzzing insistently."
            ),
            "grants": ["wrench", "flashlight"],
            "choices": [
                {"key": "1", "label": "now answer the distress call", "next": "answer"},
            ],
        },
        "answer": {
            "text": (
                "A shaky voice crackles through: 'This is engineer Vega. I'm trapped in Sector Nine, "
                "the blast door jammed and the reactor's overheating. Please hurry!'"
            ),
            "choices": [
                {"key": "1", "label": "head straight to Sector Nine", "next": "corridor"},
                {"key": "2", "label": "radio the captain for an override code", "next": "captain"},
            ],
        },
        "captain": {
            "text": (
                "The captain answers, half-asleep. 'Take my override keycard code and handle it, "
                "operator. I'm trusting you.' A keycard code blinks onto your screen."
            ),
            "grants": ["keycard"],
            "choices": [
                {"key": "1", "label": "rush to Sector Nine", "next": "corridor"},
            ],
        },
        "corridor": {
            "text": (
                "You reach the sealed blast door to Sector Nine. A control panel blinks angry red, "
                "and a narrow maintenance vent yawns to your left."
            ),
            "choices": [
                {"key": "1", "label": "pry the door open with your wrench", "next": "junction",
                 "requires": "wrench", "denied": "stuck_wrench"},
                {"key": "2", "label": "enter the captain's override code", "next": "junction",
                 "requires": "keycard", "denied": "stuck_code"},
                {"key": "3", "label": "crawl through the maintenance vent", "next": "vent"},
            ],
        },
        "stuck_wrench": {
            "text": (
                "You claw at the cold steel with bare fingers. Nothing budges — you'd need a tool "
                "for this."
            ),
            "choices": [
                {"key": "1", "label": "try the door another way", "next": "corridor"},
            ],
        },
        "stuck_code": {
            "text": "The panel demands an override code you don't have. It buzzes and locks you out.",
            "choices": [
                {"key": "1", "label": "try the door another way", "next": "corridor"},
            ],
        },
        "vent": {
            "text": (
                "You squeeze into the vent. It's pitch black, and the passage splits in three "
                "directions."
            ),
            "choices": [
                {"key": "1", "label": "light your way with the flashlight", "next": "junction",
                 "requires": "flashlight", "denied": "vent_dark"},
                {"key": "2", "label": "back out and try the door", "next": "corridor"},
            ],
        },
        "vent_dark": {
            "text": (
                "In the dark you crawl in hopeless circles for hours. By the time a rescue team finds "
                "you, another operator has already freed Vega. Not your finest shift, but everyone's safe."
            ),
            "ending": "lose",
        },
        "junction": {
            "text": (
                "You burst into Sector Nine. Vega is pinned under a fallen support beam, and behind "
                "them the reactor panel spits furious sparks."
            ),
            "choices": [
                {"key": "1", "label": "lift the beam off Vega right now", "next": "lift_beam"},
                {"key": "2", "label": "stabilize the sparking reactor first", "next": "reactor"},
            ],
        },
        "lift_beam": {
            "text": (
                "The beam is impossibly heavy. You look for a way to get leverage."
            ),
            "choices": [
                {"key": "1", "label": "use the wrench as a pry-bar lever", "next": "free_vega",
                 "requires": "wrench", "denied": "hurt"},
                {"key": "2", "label": "leave it and kill the reactor power instead", "next": "reactor"},
            ],
        },
        "hurt": {
            "text": "Bare-handed, the beam won't move an inch. You need a tool for leverage.",
            "choices": [
                {"key": "1", "label": "step back and rethink", "next": "junction"},
            ],
        },
        "reactor": {
            "text": (
                "You slam the coolant lever. The reactor sighs, sparks die down, and the station "
                "lights steady. With the power calmed, the beam settles just enough to move."
            ),
            "choices": [
                {"key": "1", "label": "free Vega", "next": "free_vega"},
            ],
        },
        "free_vega": {
            "text": (
                "You heave the beam aside and pull Vega free. They grip your hand, breathless. "
                "'You came for me. I knew someone would.' Starfall Station is safe, and it's all "
                "thanks to you, operator. A hero's shift, well dialed."
            ),
            "ending": "win",
        },
    },
}

STORIES = {"starfall": STARFALL}

SESSIONS = {}


def _node_payload(story, node_id, inventory):
    node = STORIES[story]["nodes"][node_id]
    ending = node.get("ending")
    return {
        "node_id": node_id,
        "text": node["text"],
        "voice": NARRATOR_VOICE,
        "choices": [{"key": c["key"], "label": c["label"]} for c in node.get("choices", [])],
        "inventory": sorted(inventory),
        "ending": ending,
        "ended": ending is not None,
    }


def _enter(sess, node_id):
    node = STORIES[sess["story"]]["nodes"][node_id]
    for it in node.get("grants", []):
        sess["inventory"].add(it)
    sess["node"] = node_id
    return _node_payload(sess["story"], node_id, sess["inventory"])


def list_stories():
    return [{"slug": k, "title": v["title"]} for k, v in STORIES.items()]


def new_session(story="starfall"):
    if story not in STORIES:
        story = "starfall"
    sid = uuid.uuid4().hex
    sess = {"story": story, "node": None, "inventory": set()}
    SESSIONS[sid] = sess
    payload = _enter(sess, STORIES[story]["start"])
    if len(SESSIONS) > 500:
        for k in list(SESSIONS)[:100]:
            SESSIONS.pop(k, None)
    return sid, STORIES[story]["title"], payload


def choose(sid, key):
    sess = SESSIONS.get(sid)
    if not sess:
        return {"error": "session_expired", "ended": True, "choices": [], "inventory": [],
                "voice": NARRATOR_VOICE,
                "text": "The signal was lost in the static. Please dial the adventure again."}
    node = STORIES[sess["story"]]["nodes"][sess["node"]]
    choice = next((c for c in node.get("choices", []) if c["key"] == str(key)), None)
    if not choice:
        payload = _node_payload(sess["story"], sess["node"], sess["inventory"])
        payload["invalid"] = True
        return payload
    req = choice.get("requires")
    if req and req not in sess["inventory"]:
        return _enter(sess, choice["denied"])
    return _enter(sess, choice["next"])

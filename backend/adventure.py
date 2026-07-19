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

SPY = {
    "title": "Operation Silent Dial",
    "start": "start",
    "nodes": {
        "start": {
            "text": (
                "You are Agent Dialtone, and tonight you must infiltrate Vertigo Tower to recover "
                "the stolen blueprints before dawn. A sleek limo idles at the entrance."
            ),
            "choices": [
                {"key": "1", "label": "head straight for the tower", "next": "front"},
                {"key": "2", "label": "stop at the spy van for gadgets first", "next": "van"},
            ],
        },
        "van": {
            "text": (
                "Inside the van, Q hands you a grappling hook and a smoke pen with a wink. "
                "'Try not to lose these, agent.'"
            ),
            "grants": ["grapple", "smoke_pen"],
            "choices": [
                {"key": "1", "label": "approach the tower now", "next": "front"},
            ],
        },
        "front": {
            "text": (
                "The lobby has a watchful guard, a locked service elevator, and a fire escape "
                "climbing the tower's glass face."
            ),
            "choices": [
                {"key": "1", "label": "scale the fire escape with your grapple", "next": "office",
                 "requires": "grapple", "denied": "fall_back"},
                {"key": "2", "label": "toss the smoke pen and slip past the guard", "next": "office",
                 "requires": "smoke_pen", "denied": "caught"},
                {"key": "3", "label": "smoothly bluff your way past the guard", "next": "office"},
            ],
        },
        "fall_back": {
            "text": "Without a grapple, the fire escape is out of reach. You slink back to the lobby.",
            "choices": [
                {"key": "1", "label": "find another way up", "next": "front"},
            ],
        },
        "caught": {
            "text": (
                "You have no smoke pen, and the sharp-eyed guard collars you before you take two "
                "steps. Mission compromised, agent. Better cover next time."
            ),
            "ending": "lose",
        },
        "office": {
            "text": (
                "You slip into the executive office. The blueprints sit inside a heavy wall safe, "
                "and a laptop glows invitingly on the desk."
            ),
            "choices": [
                {"key": "1", "label": "crack the safe now", "next": "crack"},
                {"key": "2", "label": "hack the laptop for the safe code first", "next": "hack"},
            ],
        },
        "hack": {
            "text": "The laptop cracks open in seconds and flashes the safe's override code. Nice.",
            "grants": ["code"],
            "choices": [
                {"key": "1", "label": "open the safe", "next": "crack"},
            ],
        },
        "crack": {
            "text": "You kneel at the wall safe, fingers hovering over the keypad.",
            "choices": [
                {"key": "1", "label": "enter the override code", "next": "win_spy",
                 "requires": "code", "denied": "alarm"},
                {"key": "2", "label": "step back and check the laptop", "next": "hack"},
            ],
        },
        "alarm": {
            "text": (
                "You guess wrong and a shrill alarm splits the night. Floodlights snap on and you "
                "barely escape with your identity intact — but the blueprints stay locked away."
            ),
            "ending": "lose",
        },
        "win_spy": {
            "text": (
                "The safe sighs open. You pocket the blueprints, salute the security camera, and "
                "vanish into the dark. Mission accomplished, Agent Dialtone. The world sleeps safe "
                "tonight — thanks to you."
            ),
            "ending": "win",
        },
    },
}

TREASURE = {
    "title": "The Isle of the Golden Dial",
    "start": "start",
    "nodes": {
        "start": {
            "text": (
                "Salt spray on your face, you wash ashore on a forgotten isle. Legend says the "
                "fabled Golden Dial is buried somewhere here. A weathered fisherman's hut leans "
                "nearby."
            ),
            "choices": [
                {"key": "1", "label": "search the fisherman's hut for supplies", "next": "hut"},
                {"key": "2", "label": "head inland right away", "next": "clearing"},
            ],
        },
        "hut": {
            "text": (
                "Inside the dusty hut you find a tattered treasure map, a rusty lantern, and a "
                "sturdy shovel. What luck!"
            ),
            "grants": ["map", "lantern", "shovel"],
            "choices": [
                {"key": "1", "label": "follow the trail inland", "next": "clearing"},
            ],
        },
        "clearing": {
            "text": (
                "You reach a jungle clearing. A stone pedestal holds a glinting golden dial, and a "
                "faded X is carved into the ground. Nearby, a dark cave mouth yawns."
            ),
            "choices": [
                {"key": "1", "label": "dig at the X", "next": "win_treasure",
                 "requires": "shovel", "denied": "dig_hands"},
                {"key": "2", "label": "explore the dark cave", "next": "cave"},
            ],
        },
        "dig_hands": {
            "text": "You claw at the packed earth with bare hands and get nowhere. You'd need a shovel.",
            "choices": [
                {"key": "1", "label": "look for another way", "next": "clearing"},
            ],
        },
        "cave": {
            "text": "The cave is pitch black, and the floor drops away into unseen depths.",
            "choices": [
                {"key": "1", "label": "light your lantern and press on", "next": "win_treasure",
                 "requires": "lantern", "denied": "cave_dark"},
                {"key": "2", "label": "back out to the clearing", "next": "clearing"},
            ],
        },
        "cave_dark": {
            "text": (
                "Without a light you stumble in the dark, lose your footing, and slide back out to "
                "the beach empty-handed. The Golden Dial keeps its secret — for now."
            ),
            "ending": "lose",
        },
        "win_treasure": {
            "text": (
                "Your effort pays off — you unearth an ancient chest and lift out the legendary "
                "Golden Dial, warm and gleaming in your hands. You are the isle's greatest treasure "
                "hunter, and the tale of your triumph will ring for ages!"
            ),
            "ending": "win",
        },
    },
}

STORIES = {"starfall": STARFALL, "spy": SPY, "treasure": TREASURE}

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

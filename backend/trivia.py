"""Dial-In Trivia — session state for a 4-round keypad quiz.

4 rounds x 6 questions. Rounds 1-3 have 4 answer choices; the final round 4 has 6.
Difficulty ramps by round. Questions are AI-generated (server.py handles the LLM);
this module just holds per-session progress in memory (like MindLine / Adventure).
"""
import uuid

ROUNDS = 4
Q_PER_ROUND = 6
TOTAL_Q = ROUNDS * Q_PER_ROUND
DIFFICULTY = {1: "easy", 2: "medium", 3: "hard", 4: "very hard"}

SESSIONS = {}


def choices_for_round(r):
    return 6 if r >= ROUNDS else 4


def new_session():
    sid = uuid.uuid4().hex
    SESSIONS[sid] = {
        "round": 1,
        "q_in_round": 0,   # completed questions in the current round
        "asked": 0,        # total questions served
        "correct": 0,
        "streak": 0,
        "current": None,   # {question, choices, answer_key, answer_label, explanation, hint, round, q_num}
        "seen": [],        # recent question texts to avoid repeats
    }
    if len(SESSIONS) > 300:
        for k in list(SESSIONS)[:100]:
            SESSIONS.pop(k, None)
    return sid, SESSIONS[sid]


def get(sid):
    return SESSIONS.get(sid)


def remember(sess, q):
    sess["seen"].append(q)
    sess["seen"] = sess["seen"][-24:]

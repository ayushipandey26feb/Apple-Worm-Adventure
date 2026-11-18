"""Server-side run validation. The browser is never the sole authority on score, stars or rewards."""
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from lib.dates import today_iso
from lib.db import db
from models.schemas import EconomyConfig, RunIn

# Generated from the deterministic frontend level generator (see memory/SPEC.md to regenerate).
LEVELS: dict[int, dict[str, Any]] = {int(k): v for k, v in json.loads((Path(__file__).parent.parent / "data" / "levels_meta.json").read_text()).items()}
DAILY_BOUNDS = {"apples": 12, "golden": 3, "mystery": 3, "rescue": 4, "min_moves": 4, "par": 0}


class CheatError(Exception):
    pass


async def flag(user_id: str, reason: str, detail: dict[str, Any]) -> None:
    await db.cheat_flags.insert_one({"id": str(uuid.uuid4()), "user_id": user_id, "reason": reason, "detail": detail, "day": today_iso(), "created_at": datetime.now(timezone.utc).isoformat()})


def _utc(ts: datetime) -> datetime:
    return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)


def stars_for(par: int, moves: int, revives: int) -> int:
    stars = 3
    if par and moves > -(-par * 135 // 100):
        stars -= 1
    if par and moves > -(-par * 190 // 100):
        stars -= 1
    if revives:
        stars -= 1
    return max(1, stars)


async def claim_session(user_id: str, body: RunIn, level_id: int) -> dict[str, Any]:
    """Atomically consumes the session: blocks reused sessions, replays and modified level ids."""
    session = await db.game_sessions.find_one({"id": body.session_id}, {"_id": 0})
    if not session or session["user_id"] != user_id:
        raise CheatError("Unknown or foreign game session")
    if session["level_id"] != level_id:
        raise CheatError("Level id does not match the session")
    done = await db.game_sessions.update_one({"id": body.session_id, "status": "ACTIVE"}, {"$set": {"status": "COMPLETED", "completed_at": datetime.now(timezone.utc).isoformat()}})
    if not done.modified_count:
        raise CheatError("This session was already submitted (duplicate completion / replay)")
    return session


async def score_run(user_id: str, body: RunIn, level_id: int, session: dict[str, Any], config: EconomyConfig) -> tuple[int, int, bool]:
    meta = LEVELS.get(level_id, DAILY_BOUNDS) if level_id else DAILY_BOUNDS
    sid = body.session_id
    granted = lambda p: db.ad_opportunities.count_documents({"actor": user_id, "attempt_id": sid, "placement": p, "status": "GRANTED"})  # noqa: E731
    bought = lambda p: db.coin_purchases.count_documents({"actor": user_id, "attempt_id": sid, "item": p})  # noqa: E731
    paid_revives = await granted("REVIVE") + await bought("REVIVE")
    extras = await granted("EXTRA_MOVES")

    if body.apples > meta["apples"] or body.golden > min(meta["golden"], body.apples) or body.rescued > meta["rescue"]:
        raise CheatError("Impossible apple / rescue count for this level")
    if level_id and meta["mode"] in ("classic", "limited", "timed", "key") and body.apples != meta["apples"]:
        raise CheatError("Level completed without collecting every apple")
    if level_id and meta["mode"] == "rescue" and body.rescued != meta["rescue"]:
        raise CheatError("Level completed without rescuing every ladybug")
    if body.moves < meta["min_moves"]:
        raise CheatError("Impossible movement count (too few moves)")
    max_bonus = extras * config.extra_moves + 3 * meta["mystery"]
    if body.bonus_moves > max_bonus:
        raise CheatError("Bonus moves exceed what was granted")
    limit = meta["move_limit"] if level_id else min(body.move_limit, 150)
    if body.moves > limit + body.bonus_moves:
        raise CheatError("Moves exceed the level's move limit")
    elapsed = (datetime.now(timezone.utc) - _utc(session["started_ts"])).total_seconds()
    if elapsed < max(1.0, body.moves * 0.06):
        raise CheatError("Impossible completion time")
    if body.revives < paid_revives or body.revives > config.free_revives_per_level + config.rewarded_revives_per_level:
        raise CheatError("Revive count doesn't match server records")

    stars = stars_for(meta["par"], body.moves, body.revives)
    perfect = stars == 3 and body.revives == 0 and body.undos == 0
    score = (body.apples - body.golden) * 10 + body.golden * 50 + body.rescued * 10 + 100 + 2 * max(0, limit + body.bonus_moves - body.moves) + (50 if body.revives == 0 else 0) + (250 if perfect else 0)
    if body.score > score:
        raise CheatError(f"Impossible score: reported {body.score}, server computed {score}")
    return score, stars, perfect

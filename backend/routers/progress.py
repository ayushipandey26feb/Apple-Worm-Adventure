import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from lib.achievements import evaluate
from lib.anticheat import LEVELS, CheatError, claim_session, flag, score_run
from lib.auth import current_user
from lib.dates import today_iso
from lib.db import db
from lib.economy import balance, get_config, record
from models.schemas import ProgressIn, ProgressOut, RunIn, RunOut, SessionIn, SessionOut, WalletOut

router = APIRouter()


async def max_unlocked(user_id: str) -> int:
    rows = await db.progress.find({"user_id": user_id, "completed": True}, {"_id": 0, "level_id": 1}).to_list(100)
    return min(50, max([r["level_id"] for r in rows], default=0) + 1)


@router.post("/sessions", response_model=SessionOut)
async def start_session(body: SessionIn, user=Depends(current_user)):
    daily = today_iso() if body.daily else None
    level_id = 0 if body.daily else body.level_id
    if not body.daily:
        if level_id not in LEVELS:
            raise HTTPException(422, "Unknown level")
        if level_id > await max_unlocked(user["id"]):
            await flag(user["id"], "Locked level requested", {"level_id": level_id})
            raise HTTPException(403, "Finish the previous level first")
    sid = str(uuid.uuid4())
    await db.game_sessions.insert_one({"id": sid, "user_id": user["id"], "level_id": level_id, "daily_date": daily, "status": "ACTIVE", "started_ts": datetime.now(timezone.utc), "started_at": datetime.now(timezone.utc).isoformat()})
    return SessionOut(session_id=sid, level_id=level_id, daily_date=daily)


@router.get("/progress")
async def progress(user=Depends(current_user)):
    return await db.progress.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)


@router.post("/progress", response_model=ProgressOut)
async def save_progress(body: ProgressIn, user=Depends(current_user)):
    """Unverified saves (e.g. made offline): unlock/stars only — never coins, score or leaderboard."""
    key = {"user_id": user["id"], "level_id": body.level_id}
    update: dict = {"$max": {"score": min(body.score, 0) if body.completed else body.score, "stars": body.stars, "apples": body.apples}, "$set": {**key, "updated_at": datetime.now(timezone.utc).isoformat()}}
    if body.completed:
        if body.level_id > await max_unlocked(user["id"]):
            await flag(user["id"], "Unverified completion of a locked level", {"level_id": body.level_id})
            raise HTTPException(403, "Finish the previous level first")
        update["$set"].update({"completed": True, "unverified": True})
    else:
        update["$setOnInsert"] = {"completed": False}
    await db.progress.update_one(key, update, upsert=True)
    return ProgressOut(saved=True, coins=await balance(user["id"]))


@router.post("/levels/{level_id}/complete", response_model=RunOut)
async def complete_level(level_id: int, body: RunIn, user=Depends(current_user)):
    if level_id not in LEVELS:
        raise HTTPException(422, "Unknown level")
    config = await get_config()
    try:
        session = await claim_session(user["id"], body, level_id)
        score, stars, perfect = await score_run(user["id"], body, level_id, session, config)
    except CheatError as e:
        await flag(user["id"], str(e), {"level_id": level_id, **body.model_dump()})
        raise HTTPException(422, f"Result rejected: {e}")

    key = {"user_id": user["id"], "level_id": level_id}
    prev = await db.progress.find_one(key, {"_id": 0}) or {}
    first_clear = not prev.get("completed") or prev.get("unverified", False) and not prev.get("verified_once")
    coins = config.level_completion_coins + body.golden * config.golden_apple_coins if first_clear else config.replay_coins
    if stars == 3 and prev.get("stars", 0) < 3:
        coins += config.three_star_bonus
    await db.progress.update_one(key, {"$max": {"score": score, "stars": stars, "apples": body.apples}, "$set": {**key, "completed": True, "unverified": False, "verified_once": True, "updated_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    await db.users.update_one({"id": user["id"]}, {"$max": {"best_score": score}, "$inc": {"completed_levels": 1 if first_clear else 0, "total_stars": max(0, stars - prev.get("stars", 0)), "apples_total": body.apples, "golden_total": body.golden, "perfect_count": 1 if perfect else 0}})
    history_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    await db.game_history.insert_one({"id": history_id, "user_id": user["id"], "level_id": level_id, "session_id": body.session_id, "score": score, "moves": body.moves, "stars": stars, "apples": body.apples, "golden": body.golden, "perfect": perfect, "revives": body.revives, "completed": True, "coins_earned": coins, "first_clear": first_clear, "doubled_score": False, "doubled_coins": False, "created_at": now.isoformat(), "created_ts": now})
    if coins:
        await record(user["id"], "CREDIT", "LEVEL_REWARD", coins, "LEVEL_COMPLETION", history_id)
    return RunOut(saved=True, history_id=history_id, score=score, stars=stars, perfect=perfect, coins_earned=coins, first_clear=first_clear, coins=await balance(user["id"]), new_achievements=await evaluate(user["id"]))


@router.get("/history")
async def history(user=Depends(current_user)):
    return await db.game_history.find({"user_id": user["id"]}, {"_id": 0, "created_ts": 0}).sort("created_at", -1).to_list(100)


@router.get("/wallet", response_model=WalletOut)
async def wallet(user=Depends(current_user)):
    rows = await db.reward_transactions.find({"user_id": user["id"]}, {"_id": 0, "created_ts": 0}).sort("created_at", -1).to_list(50)
    history = [{"id": r["id"], "record_type": r.get("record_type", "CREDIT"), "transaction_type": r.get("transaction_type", r.get("source", "AD_REWARD")), "placement": r.get("placement"), "amount": r.get("amount", 0), "created_at": r["created_at"]} for r in rows]
    return WalletOut(coins=user.get("coins", 0), history=history)

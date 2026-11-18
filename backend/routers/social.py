"""Daily challenge, daily leaderboard, achievements and the cosmetics shop."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from lib.achievements import evaluate, listing
from lib.anticheat import CheatError, claim_session, flag, score_run
from lib.auth import current_user, optional_user
from lib.catalog import COSMETICS, DEFAULT_SKIN
from lib.dates import today_iso
from lib.db import db
from lib.economy import balance, debit, get_config, record
from models.schemas import Achievement, DailyOut, LeaderboardOut, RunIn, RunOut, ShopIn, ShopOut

router = APIRouter()


@router.get("/daily", response_model=DailyOut)
async def daily(user=Depends(optional_user)):
    date = today_iso()
    row = await db.daily_scores.find_one({"user_id": user["id"], "date": date}, {"_id": 0}) if user else None
    return DailyOut(date=date, completed=bool(row), best_score=(row or {}).get("score", 0), reward_coins=(await get_config()).daily_challenge_coins)


@router.post("/daily/complete", response_model=RunOut)
async def daily_complete(body: RunIn, user=Depends(current_user)):
    config = await get_config()
    try:
        session = await claim_session(user["id"], body, 0)
        if session.get("daily_date") != today_iso():
            raise CheatError("Daily session is from another day")
        score, stars, perfect = await score_run(user["id"], body, 0, session, config)
    except CheatError as e:
        await flag(user["id"], str(e), {"daily": True, **body.model_dump()})
        raise HTTPException(422, f"Result rejected: {e}")
    date = today_iso()
    prev = await db.daily_scores.find_one({"user_id": user["id"], "date": date}, {"_id": 0})
    first = prev is None
    await db.daily_scores.update_one({"user_id": user["id"], "date": date}, {"$max": {"score": score}, "$setOnInsert": {"user_id": user["id"], "date": date, "name": user["name"], "moves": body.moves}}, upsert=True)
    if prev and score > prev.get("score", 0):
        await db.daily_scores.update_one({"user_id": user["id"], "date": date}, {"$set": {"moves": body.moves}})
    coins = config.daily_challenge_coins if first else 0
    now = datetime.now(timezone.utc)
    history_id = str(uuid.uuid4())
    await db.game_history.insert_one({"id": history_id, "user_id": user["id"], "level_id": 0, "daily_date": date, "session_id": body.session_id, "score": score, "moves": body.moves, "stars": stars, "apples": body.apples, "golden": body.golden, "perfect": perfect, "completed": True, "coins_earned": coins, "first_clear": first, "doubled_score": False, "doubled_coins": False, "created_at": now.isoformat(), "created_ts": now})
    if coins:
        await record(user["id"], "CREDIT", "DAILY_REWARD", coins, "DAILY_CHALLENGE", history_id)
        await db.users.update_one({"id": user["id"]}, {"$inc": {"daily_completed": 1}})
    return RunOut(saved=True, history_id=history_id, score=score, stars=stars, perfect=perfect, coins_earned=coins, first_clear=first, coins=await balance(user["id"]), new_achievements=await evaluate(user["id"]))


@router.get("/leaderboard/daily", response_model=LeaderboardOut)
async def daily_leaderboard(user=Depends(optional_user)):
    date = today_iso()
    rows = await db.daily_scores.find({"date": date}, {"_id": 0}).sort([("score", -1), ("moves", 1)]).to_list(20)
    entries = [{"rank": i + 1, "name": r["name"], "score": r["score"], "moves": r.get("moves", 0), "is_me": bool(user and r["user_id"] == user["id"])} for i, r in enumerate(rows)]
    me = None
    if user:
        mine = await db.daily_scores.find_one({"date": date, "user_id": user["id"]}, {"_id": 0})
        if mine:
            better = await db.daily_scores.count_documents({"date": date, "$or": [{"score": {"$gt": mine["score"]}}, {"score": mine["score"], "moves": {"$lt": mine.get("moves", 0)}}]})
            me = {"rank": better + 1, "name": mine["name"], "score": mine["score"], "moves": mine.get("moves", 0), "is_me": True}
    return LeaderboardOut(date=date, entries=entries, me=me)


@router.get("/achievements", response_model=list[Achievement])
async def achievements(user=Depends(current_user)):
    await evaluate(user["id"])
    return await listing(user["id"])


def _shop(user: dict | None) -> ShopOut:
    owned = set((user or {}).get("owned_items", [])) | {DEFAULT_SKIN}
    skin, hat = (user or {}).get("skin", DEFAULT_SKIN), (user or {}).get("hat")
    items = [{"id": i["id"], "kind": i["kind"], "name": i["name"], "price": i["price"], "preview": i["preview"], "owned": i["id"] in owned, "equipped": i["id"] in (skin, hat)} for i in COSMETICS.values()]
    return ShopOut(items=items, coins=(user or {}).get("coins", 0), skin=skin, hat=hat)


@router.get("/shop", response_model=ShopOut)
async def shop(user=Depends(optional_user)):
    return _shop(user)


@router.post("/shop/buy", response_model=ShopOut)
async def buy(body: ShopIn, user=Depends(current_user)):
    item = COSMETICS.get(body.item_id)
    if not item:
        raise HTTPException(404, "Unknown item")
    if body.item_id in user.get("owned_items", []) or body.item_id == DEFAULT_SKIN:
        raise HTTPException(409, "You already own this")
    if await debit(user["id"], item["price"], "COSMETIC_PURCHASE", item["kind"].upper(), body.item_id) is None:
        raise HTTPException(402, "Not enough coins")
    field = "skin" if item["kind"] == "skin" else "hat"
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"owned_items": body.item_id}, "$inc": {"cosmetics_bought": 1}, "$set": {field: body.item_id}})
    await db.cosmetic_sales.insert_one({"user_id": user["id"], "item_id": body.item_id, "price": item["price"], "day": today_iso()})
    await evaluate(user["id"])
    return _shop(await db.users.find_one({"id": user["id"]}, {"_id": 0}))


@router.post("/shop/equip", response_model=ShopOut)
async def equip(body: ShopIn, user=Depends(current_user)):
    if body.item_id == "hat-none":
        await db.users.update_one({"id": user["id"]}, {"$set": {"hat": None}})
    else:
        item = COSMETICS.get(body.item_id)
        if not item or (body.item_id != DEFAULT_SKIN and body.item_id not in user.get("owned_items", [])):
            raise HTTPException(403, "Buy this item first")
        await db.users.update_one({"id": user["id"]}, {"$set": {"skin" if item["kind"] == "skin" else "hat": body.item_id}})
    return _shop(await db.users.find_one({"id": user["id"]}, {"_id": 0}))

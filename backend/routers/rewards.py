"""Rewarded-ad pipeline (MOCKED provider): opportunity -> full watch (server-timed) -> verify -> grant.

Gameplay rewards (hint, revive, extra moves, booster) work for guests too, keyed by a guest id.
Coin/score rewards need an account. Every grant is capped, idempotent and written to the ledger.
"""

import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from lib.achievements import evaluate
from lib.auth import current_user, optional_user
from lib.dates import today_iso
from lib.db import db
from lib.economy import balance, debit, get_config, record
from models.schemas import AbandonIn, EconomyConfig, OpportunityIn, OpportunityOut, SpendIn, SpendOut, VerifyIn, VerifyOut

router = APIRouter()

ACCOUNT_ONLY = {"WALLET", "DOUBLE_COINS", "DOUBLE_SCORE"}
SHORT_ADS = {"HINT", "EXTRA_MOVES"}
GUEST_RE = re.compile(r"^[0-9a-fA-F-]{8,64}$")


def _actor(user: dict[str, Any] | None, guest_id: str | None) -> str:
    if user:
        return user["id"]
    if guest_id and GUEST_RE.match(guest_id):
        return f"guest:{guest_id}"
    raise HTTPException(401, "Sign in or play as guest to watch rewarded ads")


def _utc(ts: datetime) -> datetime:
    return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)


def _per_level_cap(config: EconomyConfig, placement: str) -> int | None:
    return {"HINT": config.max_hints_per_level, "REVIVE": config.rewarded_revives_per_level, "EXTRA_MOVES": config.max_extra_moves_per_level, "BOOSTER": config.max_boosters_per_level}.get(placement)


async def _attempt_uses(actor: str, attempt_id: str, placement: str) -> int:
    ads = await db.ad_opportunities.count_documents({"actor": actor, "attempt_id": attempt_id, "placement": placement, "status": "GRANTED"})
    bought = await db.coin_purchases.count_documents({"actor": actor, "attempt_id": attempt_id, "item": placement})
    return ads + bought


async def _history_for(user_id: str, history_id: str | None) -> dict[str, Any]:
    row = await db.game_history.find_one({"id": history_id, "user_id": user_id}, {"_id": 0}) if history_id else None
    if not row:
        raise HTTPException(404, "Finish a level first to double its reward")
    if datetime.now(timezone.utc) - _utc(row["created_ts"]) > timedelta(minutes=30):
        raise HTTPException(410, "This result is too old to double")
    return row


@router.post("/rewards/opportunity", response_model=OpportunityOut)
async def create_opportunity(body: OpportunityIn, user=Depends(optional_user)):
    actor = _actor(user, body.guest_id)
    if body.placement in ACCOUNT_ONLY and not user:
        raise HTTPException(401, "Sign in to earn coin and score rewards")
    config = await get_config()
    now = datetime.now(timezone.utc)

    if await db.ad_opportunities.count_documents({"actor": actor, "day": today_iso()}) >= config.max_ads_per_day:
        raise HTTPException(429, "You've reached today's rewarded-ad limit. Come back tomorrow!")
    if await db.ad_opportunities.count_documents({"actor": actor, "created_ts": {"$gte": now - timedelta(hours=1)}}) >= config.max_ads_per_hour:
        raise HTTPException(429, "That's plenty of ads for this hour. Keep playing and try later!")
    last = await db.ad_opportunities.find_one({"actor": actor, "status": "GRANTED"}, {"_id": 0, "verified_ts": 1}, sort=[("verified_ts", -1)])
    if last and last.get("verified_ts"):
        wait = config.min_seconds_between_ads - int((now - _utc(last["verified_ts"])).total_seconds())
        if wait > 0:
            raise HTTPException(429, f"Next rewarded ad is available in {wait}s")

    cap = _per_level_cap(config, body.placement)
    if cap is not None:
        if not body.attempt_id or not body.level_id:
            raise HTTPException(422, "Level and attempt are required for gameplay rewards")
        if await _attempt_uses(actor, body.attempt_id, body.placement) >= cap:
            raise HTTPException(429, "Limit for this reward reached on this level")
    if body.placement in ("DOUBLE_COINS", "DOUBLE_SCORE"):
        row = await _history_for(user["id"], body.history_id)
        if row.get("doubled_coins" if body.placement == "DOUBLE_COINS" else "doubled_score"):
            raise HTTPException(409, "This result was already doubled")
        if body.placement == "DOUBLE_COINS" and not row.get("coins_earned"):
            raise HTTPException(409, "No coins to double on this run")

    seconds = config.short_ad_seconds if body.placement in SHORT_ADS else config.long_ad_seconds
    # Real network ads report their own completion (adViewed); the server still enforces a minimum watch time.
    min_seconds = min(seconds, 3) if body.provider == "adsense" else seconds
    opportunity = {"provider": body.provider, "min_seconds": min_seconds, "id": str(uuid.uuid4()), "actor": actor, "user_id": user["id"] if user else None, "is_guest": not user, "placement": body.placement, "level_id": body.level_id, "attempt_id": body.attempt_id, "history_id": body.history_id, "required_seconds": seconds, "status": "AD_STARTED", "day": today_iso(), "created_at": now.isoformat(), "created_ts": now}
    await db.ad_opportunities.insert_one(opportunity)
    return OpportunityOut(opportunity_id=opportunity["id"], placement=body.placement, required_seconds=seconds, status="AD_STARTED")


@router.post("/rewards/abandon")
async def abandon(body: AbandonIn, user=Depends(optional_user)):
    actor = _actor(user, body.guest_id)
    result = await db.ad_opportunities.update_one({"id": body.opportunity_id, "actor": actor, "status": "AD_STARTED"}, {"$set": {"status": "ABANDONED", "closed_at": datetime.now(timezone.utc).isoformat()}})
    return {"status": "ABANDONED" if result.modified_count else "UNCHANGED", "reward": "none"}


@router.post("/rewards/verify", response_model=VerifyOut)
async def verify(body: VerifyIn, user=Depends(optional_user)):
    actor = _actor(user, body.guest_id)
    opp = await db.ad_opportunities.find_one({"id": body.opportunity_id, "actor": actor}, {"_id": 0})
    if not opp:
        raise HTTPException(404, "Reward opportunity not found")
    if opp["status"] == "GRANTED" or await db.reward_transactions.find_one({"event_id": body.event_id}, {"_id": 1}):
        raise HTTPException(409, "Reward event already processed")
    if opp["status"] != "AD_STARTED":
        raise HTTPException(409, "This ad was closed early, so no reward was granted")
    now = datetime.now(timezone.utc)
    watched = (now - _utc(opp["created_ts"])).total_seconds()
    if watched + 0.75 < opp.get("min_seconds", opp["required_seconds"]):
        await db.ad_opportunities.update_one({"id": opp["id"]}, {"$set": {"status": "REJECTED", "closed_at": now.isoformat()}})
        raise HTTPException(400, "Reward not completed. Watch the full ad to claim it.")
    # Claim atomically so a duplicate callback can never double-grant.
    claimed = await db.ad_opportunities.update_one({"id": opp["id"], "status": "AD_STARTED"}, {"$set": {"status": "GRANTED", "verified_ts": now, "verified_at": now.isoformat(), "event_id": body.event_id}})
    if not claimed.modified_count:
        raise HTTPException(409, "Reward event already processed")

    config = await get_config()
    placement = opp["placement"]
    out = VerifyOut(status="GRANTED", placement=placement, message="Full ad watched and verified")
    if placement == "WALLET":
        out.coins_granted = config.wallet_ad_coins
    elif placement == "DOUBLE_COINS":
        row = await _history_for(user["id"], opp.get("history_id"))
        flipped = await db.game_history.update_one({"id": row["id"], "doubled_coins": False}, {"$set": {"doubled_coins": True}})
        out.coins_granted = row["coins_earned"] * (config.double_coins_multiplier - 1) if flipped.modified_count else 0
    elif placement == "DOUBLE_SCORE":
        row = await _history_for(user["id"], opp.get("history_id"))
        new_score = row["score"] * config.double_score_multiplier
        flipped = await db.game_history.update_one({"id": row["id"], "doubled_score": False}, {"$set": {"doubled_score": True, "score": new_score}})
        if flipped.modified_count:
            await db.progress.update_one({"user_id": user["id"], "level_id": row["level_id"]}, {"$max": {"score": new_score}})
            await db.users.update_one({"id": user["id"]}, {"$max": {"best_score": new_score}})
        out.new_score = new_score
    elif placement == "EXTRA_MOVES":
        out.extra_moves, out.extra_seconds = config.extra_moves, config.extra_seconds

    if user:
        await record(user["id"], "CREDIT" if out.coins_granted else "BONUS", "AD_REWARD", out.coins_granted, placement, opp["id"], body.event_id)
        await db.users.update_one({"id": user["id"]}, {"$addToSet": {"reward_types": placement}, "$inc": {"ads_watched": 1, "recovery_used": 1 if placement in ("REVIVE", "EXTRA_MOVES") else 0}})
        out.coins = await balance(user["id"])
        out.new_achievements = await evaluate(user["id"])
    else:
        await db.reward_transactions.insert_one({"id": str(uuid.uuid4()), "user_id": actor, "record_type": "BONUS", "transaction_type": "AD_REWARD", "placement": placement, "amount": 0, "reference_id": opp["id"], "event_id": body.event_id, "status": "GRANTED", "day": today_iso(), "created_at": now.isoformat(), "created_ts": now})
    return out


@router.post("/wallet/spend", response_model=SpendOut)
async def spend(body: SpendIn, user=Depends(current_user)):
    config = await get_config()
    cost = {"HINT": config.hint_cost, "BOOSTER": config.booster_cost, "REVIVE": config.revive_cost}[body.item]
    cap = _per_level_cap(config, body.item)
    if cap is not None and await _attempt_uses(user["id"], body.attempt_id, body.item) >= cap:
        raise HTTPException(429, "Limit for this item reached on this level")
    coins = await debit(user["id"], cost, f"{body.item}_PURCHASE", body.item, body.attempt_id)
    if coins is None:
        raise HTTPException(402, "Not enough coins")
    await db.coin_purchases.insert_one({"id": str(uuid.uuid4()), "actor": user["id"], "attempt_id": body.attempt_id, "level_id": body.level_id, "item": body.item, "cost": cost, "day": today_iso(), "created_at": datetime.now(timezone.utc).isoformat()})
    return SpendOut(item=body.item, cost=cost, coins=coins)

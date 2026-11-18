from fastapi import APIRouter, Depends

from lib.auth import admin_user
from lib.dates import today_iso
from lib.db import db
from lib.economy import get_config, save_config
from models.schemas import AdminMetrics, EconomyConfig, PlacementStat

router = APIRouter(prefix="/admin")
PLACEMENTS = ["REVIVE", "DOUBLE_SCORE", "DOUBLE_COINS", "EXTRA_MOVES", "HINT", "BOOSTER", "WALLET"]


async def _sum(match: dict) -> int:
    rows = await db.reward_transactions.aggregate([{"$match": match}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]).to_list(1)
    return rows[0]["total"] if rows else 0


@router.get("/economy", response_model=AdminMetrics)
async def admin_economy(_=Depends(admin_user)):
    today = today_iso()
    day = {"day": today}
    opportunities = await db.ad_opportunities.count_documents(day)
    granted = await db.ad_opportunities.count_documents({**day, "status": "GRANTED"})
    failed = await db.ad_opportunities.count_documents({**day, "status": {"$in": ["ABANDONED", "REJECTED"]}})
    coins_granted = await _sum({**day, "record_type": {"$in": ["CREDIT", "BONUS"]}})
    coins_spent = await _sum({**day, "record_type": "DEBIT"})
    ad_users = len(await db.ad_opportunities.distinct("actor", {**day, "status": "GRANTED"}))
    reward_users = len(await db.reward_transactions.distinct("user_id", {**day, "record_type": "CREDIT"}))
    revives = await db.ad_opportunities.count_documents({**day, "placement": "REVIVE", "status": "GRANTED"}) + await db.coin_purchases.count_documents({**day, "item": "REVIVE"})
    by_placement = []
    for p in PLACEMENTS:
        by_placement.append(PlacementStat(placement=p, opportunities=await db.ad_opportunities.count_documents({**day, "placement": p}), granted=await db.ad_opportunities.count_documents({**day, "placement": p, "status": "GRANTED"}), failed=await db.ad_opportunities.count_documents({**day, "placement": p, "status": {"$in": ["ABANDONED", "REJECTED"]}})))
    return AdminMetrics(
        date=today, ad_opportunities=opportunities, completed_ads=granted, failed_ads=failed,
        completion_rate=round(granted / opportunities * 100, 1) if opportunities else 0.0,
        coins_granted=coins_granted, coins_spent=coins_spent, revives=revives,
        double_score_uses=next(s.granted for s in by_placement if s.placement == "DOUBLE_SCORE"),
        double_coin_uses=next(s.granted for s in by_placement if s.placement == "DOUBLE_COINS"),
        active_ad_users=ad_users, avg_ads_per_user=round(granted / ad_users, 2) if ad_users else 0.0,
        avg_reward_per_user=round(coins_granted / reward_users, 1) if reward_users else 0.0,
        players=await db.users.count_documents({"role": {"$ne": "admin"}}), by_placement=by_placement,
        all_time_opportunities=await db.ad_opportunities.count_documents({}),
        all_time_granted=await db.ad_opportunities.count_documents({"status": "GRANTED"}),
        cheat_flags_today=await db.cheat_flags.count_documents(day),
        recent_flags=await db.cheat_flags.find({}, {"_id": 0, "detail": 0}).sort("created_at", -1).to_list(8),
        cosmetics_sold_today=await db.cosmetic_sales.count_documents(day),
        daily_completions_today=await db.daily_scores.count_documents({"date": today}),
        economy=await get_config(),
    )


@router.put("/economy", response_model=EconomyConfig)
async def update_economy(body: EconomyConfig, _=Depends(admin_user)):
    return await save_config(body)

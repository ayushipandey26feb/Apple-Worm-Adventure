from datetime import datetime, timezone
from typing import Any

from lib.catalog import ACHIEVEMENTS
from lib.db import db


def _stats(user: dict[str, Any]) -> dict[str, int]:
    return {
        "apples_total": user.get("apples_total", 0), "golden_total": user.get("golden_total", 0),
        "completed_levels": user.get("completed_levels", 0), "perfect_count": user.get("perfect_count", 0),
        "total_stars": user.get("total_stars", 0), "recovery_used": user.get("recovery_used", 0),
        "reward_type_count": len(user.get("reward_types", [])), "daily_completed": user.get("daily_completed", 0),
        "cosmetics_bought": user.get("cosmetics_bought", 0),
    }


async def evaluate(user_id: str) -> list[str]:
    """Unlocks any newly-earned achievements; returns their names (server-computed from stored stats)."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        return []
    stats = _stats(user)
    have = {a["achievement_id"] for a in await db.user_achievements.find({"user_id": user_id}, {"_id": 0, "achievement_id": 1}).to_list(100)}
    fresh = []
    for aid, name, _, _, key, target in ACHIEVEMENTS:
        if aid not in have and stats[key] >= target:
            await db.user_achievements.update_one({"user_id": user_id, "achievement_id": aid}, {"$setOnInsert": {"user_id": user_id, "achievement_id": aid, "unlocked_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
            fresh.append(name)
    return fresh


async def listing(user_id: str) -> list[dict[str, Any]]:
    user = await db.users.find_one({"id": user_id}, {"_id": 0}) or {}
    stats = _stats(user)
    have = {a["achievement_id"]: a["unlocked_at"] for a in await db.user_achievements.find({"user_id": user_id}, {"_id": 0}).to_list(100)}
    return [{"id": aid, "name": name, "description": desc, "icon": icon, "target": target, "progress": min(stats[key], target), "unlocked": aid in have, "unlocked_at": have.get(aid)} for aid, name, desc, icon, key, target in ACHIEVEMENTS]

"""Shared Mongo handle — import `client`/`db` from here (server.py, routers, seed.py)."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

load_dotenv(Path(__file__).parent.parent / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logger = logging.getLogger(__name__)

# One entry per collection: every field a route filters, sorts, or dedupes on. Applied by ensure_indexes() at startup.
INDEXES: dict[str, list[IndexModel]] = {
    "status_checks": [IndexModel([("timestamp", DESCENDING)], name="timestamp_desc")],
    "users": [IndexModel([("email", ASCENDING)], name="email_unique", unique=True)],
    "progress": [IndexModel([("user_id", ASCENDING), ("level_id", ASCENDING)], name="user_level", unique=True)],
    "game_history": [IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)], name="user_history")],
    "reward_transactions": [IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)], name="user_rewards"), IndexModel([("event_id", ASCENDING)], name="event_unique", unique=True)],
    "ad_opportunities": [IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)], name="user_ads"), IndexModel([("actor", ASCENDING), ("day", ASCENDING)], name="actor_day"), IndexModel([("actor", ASCENDING), ("attempt_id", ASCENDING), ("placement", ASCENDING)], name="actor_attempt"), IndexModel([("id", ASCENDING)], name="opportunity_id", unique=True)],
    "game_sessions": [IndexModel([("id", ASCENDING)], name="session_id", unique=True)],
    "daily_scores": [IndexModel([("date", ASCENDING), ("user_id", ASCENDING)], name="date_user", unique=True), IndexModel([("date", ASCENDING), ("score", DESCENDING)], name="date_score")],
    "user_achievements": [IndexModel([("user_id", ASCENDING), ("achievement_id", ASCENDING)], name="user_ach", unique=True)],
    "cheat_flags": [IndexModel([("day", ASCENDING)], name="flag_day")],
    "coin_purchases": [IndexModel([("actor", ASCENDING), ("attempt_id", ASCENDING), ("item", ASCENDING)], name="actor_attempt_item")],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:  # one at a time so a bad spec skips only itself
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:  # never block boot on an index; the log line names what to fix
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)

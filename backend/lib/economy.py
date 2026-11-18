"""Economy config + the coin ledger. Coins never change without a transaction record."""

import uuid
from datetime import datetime, timezone
from typing import Any

from lib.dates import today_iso
from lib.db import db
from models.schemas import EconomyConfig


async def get_config() -> EconomyConfig:
    stored = await db.economy_configs.find_one({"id": "active"}, {"_id": 0, "id": 0, "updated_at": 0})
    defaults = EconomyConfig().model_dump()
    if stored:
        defaults.update({k: v for k, v in stored.items() if k in defaults})
    return EconomyConfig(**defaults)


async def save_config(config: EconomyConfig) -> EconomyConfig:
    await db.economy_configs.update_one({"id": "active"}, {"$set": {"id": "active", **config.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    return await get_config()


def _record(user_id: str, record_type: str, transaction_type: str, amount: int, placement: str | None, reference_id: str | None, event_id: str | None) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    return {"id": str(uuid.uuid4()), "user_id": user_id, "record_type": record_type, "transaction_type": transaction_type, "placement": placement, "amount": amount, "reference_id": reference_id, "event_id": event_id or str(uuid.uuid4()), "status": "GRANTED", "day": today_iso(), "created_at": now.isoformat(), "created_ts": now}


async def record(user_id: str, record_type: str, transaction_type: str, amount: int = 0, placement: str | None = None, reference_id: str | None = None, event_id: str | None = None) -> None:
    """Writes a ledger row; CREDIT/BONUS rows add coins to the wallet."""
    await db.reward_transactions.insert_one(_record(user_id, record_type, transaction_type, amount, placement, reference_id, event_id))
    if amount and record_type in ("CREDIT", "BONUS"):
        await db.users.update_one({"id": user_id}, {"$inc": {"coins": amount}})


async def debit(user_id: str, amount: int, transaction_type: str, placement: str, reference_id: str) -> int | None:
    """Atomically spends coins; returns the new balance, or None when the wallet is short."""
    user = await db.users.find_one_and_update({"id": user_id, "coins": {"$gte": amount}}, {"$inc": {"coins": -amount}}, projection={"_id": 0, "coins": 1}, return_document=True)
    if user is None:
        return None
    await db.reward_transactions.insert_one(_record(user_id, "DEBIT", transaction_type, amount, placement, reference_id, None))
    return user["coins"]


async def balance(user_id: str) -> int:
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "coins": 1})
    return (user or {}).get("coins", 0)

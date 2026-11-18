"""Pydantic request/response models. Each one is mirrored by hand in frontend/src/lib/types.ts."""

from typing import Literal

from pydantic import BaseModel, Field

AdPlacement = Literal["REVIVE", "DOUBLE_SCORE", "DOUBLE_COINS", "EXTRA_MOVES", "HINT", "BOOSTER", "WALLET"]
SpendItem = Literal["HINT", "BOOSTER", "REVIVE"]


class AuthIn(BaseModel):
    email: str
    password: str = Field(min_length=8)
    name: str | None = None


class PublicUser(BaseModel):
    id: str
    email: str
    name: str
    role: str
    coins: int
    best_score: int
    total_stars: int
    completed_levels: int
    skin: str = "skin-classic"
    hat: str | None = None


class ProgressIn(BaseModel):
    level_id: int = Field(ge=1, le=50)
    score: int = Field(ge=0, le=20000)
    moves: int = Field(ge=0, le=10000)
    stars: int = Field(ge=0, le=3)
    apples: int = Field(ge=0, le=200)
    golden: int = Field(default=0, ge=0, le=20)
    perfect: bool = False
    completed: bool = False


class ProgressOut(BaseModel):
    saved: bool
    history_id: str | None = None
    coins_earned: int = 0
    score: int = 0
    first_clear: bool = False
    coins: int = 0


class EconomyConfig(BaseModel):
    level_completion_coins: int = Field(default=25, ge=0, le=1000)
    replay_coins: int = Field(default=5, ge=0, le=500)
    golden_apple_coins: int = Field(default=10, ge=0, le=500)
    three_star_bonus: int = Field(default=20, ge=0, le=1000)
    wallet_ad_coins: int = Field(default=50, ge=0, le=1000)
    double_coins_multiplier: int = Field(default=2, ge=1, le=5)
    double_score_multiplier: int = Field(default=2, ge=1, le=5)
    extra_moves: int = Field(default=5, ge=1, le=30)
    extra_seconds: int = Field(default=15, ge=5, le=120)
    short_ad_seconds: int = Field(default=5, ge=3, le=60)
    long_ad_seconds: int = Field(default=30, ge=5, le=120)
    max_ads_per_day: int = Field(default=15, ge=1, le=200)
    max_ads_per_hour: int = Field(default=8, ge=1, le=100)
    min_seconds_between_ads: int = Field(default=15, ge=0, le=600)
    free_revives_per_level: int = Field(default=1, ge=0, le=5)
    rewarded_revives_per_level: int = Field(default=1, ge=0, le=5)
    max_hints_per_level: int = Field(default=3, ge=0, le=20)
    max_extra_moves_per_level: int = Field(default=2, ge=0, le=10)
    max_boosters_per_level: int = Field(default=1, ge=0, le=10)
    hint_cost: int = Field(default=50, ge=0, le=5000)
    booster_cost: int = Field(default=100, ge=0, le=5000)
    revive_cost: int = Field(default=75, ge=0, le=5000)
    daily_challenge_coins: int = Field(default=100, ge=0, le=5000)


class OpportunityIn(BaseModel):
    placement: AdPlacement
    provider: Literal["demo", "adsense"] = "demo"
    level_id: int | None = Field(default=None, ge=1, le=50)
    attempt_id: str | None = Field(default=None, max_length=64)
    history_id: str | None = Field(default=None, max_length=64)
    guest_id: str | None = Field(default=None, max_length=64)


class OpportunityOut(BaseModel):
    opportunity_id: str
    placement: AdPlacement
    required_seconds: int
    status: str


class VerifyIn(BaseModel):
    opportunity_id: str
    event_id: str = Field(min_length=8, max_length=64)
    guest_id: str | None = Field(default=None, max_length=64)


class VerifyOut(BaseModel):
    status: str
    placement: AdPlacement
    coins_granted: int = 0
    extra_moves: int = 0
    extra_seconds: int = 0
    new_score: int | None = None
    coins: int | None = None
    message: str
    new_achievements: list[str] = []


class AbandonIn(BaseModel):
    opportunity_id: str
    guest_id: str | None = Field(default=None, max_length=64)


class SpendIn(BaseModel):
    item: SpendItem
    level_id: int = Field(ge=1, le=50)
    attempt_id: str = Field(min_length=4, max_length=64)


class SpendOut(BaseModel):
    item: SpendItem
    cost: int
    coins: int


class Transaction(BaseModel):
    id: str
    record_type: str
    transaction_type: str
    placement: str | None = None
    amount: int
    created_at: str


class WalletOut(BaseModel):
    coins: int
    history: list[Transaction]


class PlacementStat(BaseModel):
    placement: str
    opportunities: int
    granted: int
    failed: int


class AdminMetrics(BaseModel):
    date: str
    ad_opportunities: int
    completed_ads: int
    failed_ads: int
    completion_rate: float
    coins_granted: int
    coins_spent: int
    revives: int
    double_score_uses: int
    double_coin_uses: int
    active_ad_users: int
    avg_ads_per_user: float
    avg_reward_per_user: float
    players: int
    by_placement: list[PlacementStat]
    all_time_opportunities: int
    all_time_granted: int
    cheat_flags_today: int
    recent_flags: list[dict]
    cosmetics_sold_today: int
    daily_completions_today: int
    economy: EconomyConfig


# ---------- sessions, anti-cheat, daily, shop, achievements, leaderboard ----------
class SessionIn(BaseModel):
    level_id: int = Field(default=0, ge=0, le=50)
    daily: bool = False


class SessionOut(BaseModel):
    session_id: str
    level_id: int
    daily_date: str | None = None


class RunIn(BaseModel):
    """Completed run report. The server recomputes score/stars and validates every field."""
    session_id: str = Field(min_length=8, max_length=64)
    moves: int = Field(ge=0, le=10000)
    apples: int = Field(ge=0, le=200)
    golden: int = Field(default=0, ge=0, le=50)
    rescued: int = Field(default=0, ge=0, le=50)
    revives: int = Field(default=0, ge=0, le=20)
    undos: int = Field(default=0, ge=0, le=10000)
    bonus_moves: int = Field(default=0, ge=0, le=500)
    move_limit: int = Field(default=0, ge=0, le=1000)
    score: int = Field(ge=0, le=20000)


class RunOut(BaseModel):
    saved: bool
    history_id: str
    score: int
    stars: int
    perfect: bool
    coins_earned: int
    first_clear: bool
    coins: int
    new_achievements: list[str] = []


class DailyOut(BaseModel):
    date: str
    completed: bool
    best_score: int
    reward_coins: int


class LeaderEntry(BaseModel):
    rank: int
    name: str
    score: int
    moves: int
    is_me: bool = False


class LeaderboardOut(BaseModel):
    date: str
    entries: list[LeaderEntry]
    me: LeaderEntry | None = None


class ShopItem(BaseModel):
    id: str
    kind: Literal["skin", "hat"]
    name: str
    price: int
    preview: str
    owned: bool = False
    equipped: bool = False


class ShopOut(BaseModel):
    items: list[ShopItem]
    coins: int
    skin: str
    hat: str | None


class ShopIn(BaseModel):
    item_id: str = Field(max_length=40)


class Achievement(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    target: int
    progress: int
    unlocked: bool
    unlocked_at: str | None = None

// Hand-written mirrors of backend/models/schemas.py — keep both sides in sync.
export type AdPlacement = "REVIVE" | "DOUBLE_SCORE" | "DOUBLE_COINS" | "EXTRA_MOVES" | "HINT" | "BOOSTER" | "WALLET";
export type SpendItem = "HINT" | "BOOSTER" | "REVIVE";

export interface PublicUser { id: string; email: string; name: string; role: string; coins: number; best_score: number; total_stars: number; completed_levels: number; skin: string; hat: string | null }

export interface ProgressIn { level_id: number; score: number; moves: number; stars: number; apples: number; golden: number; perfect: boolean; completed: boolean }
export interface ProgressOut { saved: boolean; history_id: string | null; coins_earned: number; score: number; first_clear: boolean; coins: number }
export interface ProgressRow { user_id: string; level_id: number; score: number; stars: number; apples: number; completed: boolean; updated_at: string }
export interface HistoryRow { id: string; level_id: number; score: number; moves: number; stars: number; apples: number; golden: number; perfect: boolean; coins_earned: number; doubled_score: boolean; doubled_coins: boolean; created_at: string }

export interface EconomyConfig {
  level_completion_coins: number; replay_coins: number; golden_apple_coins: number; three_star_bonus: number; wallet_ad_coins: number;
  double_coins_multiplier: number; double_score_multiplier: number; extra_moves: number; extra_seconds: number;
  short_ad_seconds: number; long_ad_seconds: number; max_ads_per_day: number; max_ads_per_hour: number; min_seconds_between_ads: number;
  free_revives_per_level: number; rewarded_revives_per_level: number; max_hints_per_level: number; max_extra_moves_per_level: number; max_boosters_per_level: number;
  hint_cost: number; booster_cost: number; revive_cost: number; daily_challenge_coins: number;
}
export interface PublicConfig { game_name: string; levels: number; economy: EconomyConfig; ads: AdsConfig }

export interface OpportunityIn { placement: AdPlacement; provider?: "demo" | "adsense"; level_id?: number; attempt_id?: string; history_id?: string; guest_id?: string }
export interface OpportunityOut { opportunity_id: string; placement: AdPlacement; required_seconds: number; status: string }
export interface VerifyOut { status: string; placement: AdPlacement; coins_granted: number; extra_moves: number; extra_seconds: number; new_score: number | null; coins: number | null; message: string; new_achievements: string[] }
export interface SpendOut { item: SpendItem; cost: number; coins: number }

export interface Transaction { id: string; record_type: string; transaction_type: string; placement: string | null; amount: number; created_at: string }
export interface WalletOut { coins: number; history: Transaction[] }

export interface PlacementStat { placement: string; opportunities: number; granted: number; failed: number }
export interface AdminMetrics {
  date: string; ad_opportunities: number; completed_ads: number; failed_ads: number; completion_rate: number; coins_granted: number; coins_spent: number;
  revives: number; double_score_uses: number; double_coin_uses: number; active_ad_users: number; avg_ads_per_user: number; avg_reward_per_user: number;
  players: number; by_placement: PlacementStat[]; all_time_opportunities: number; all_time_granted: number; economy: EconomyConfig;
  cheat_flags_today: number; recent_flags: { id: string; reason: string; created_at: string }[]; cosmetics_sold_today: number; daily_completions_today: number;
}

export const DEFAULT_ECONOMY: EconomyConfig = {
  level_completion_coins: 25, replay_coins: 5, golden_apple_coins: 10, three_star_bonus: 20, wallet_ad_coins: 50,
  double_coins_multiplier: 2, double_score_multiplier: 2, extra_moves: 5, extra_seconds: 15,
  short_ad_seconds: 5, long_ad_seconds: 30, max_ads_per_day: 15, max_ads_per_hour: 8, min_seconds_between_ads: 15,
  free_revives_per_level: 1, rewarded_revives_per_level: 1, max_hints_per_level: 3, max_extra_moves_per_level: 2, max_boosters_per_level: 1,
  hint_cost: 50, booster_cost: 100, revive_cost: 75, daily_challenge_coins: 100,
};

export interface AdsConfig { provider: "adsense" | "demo"; publisher_id: string; test_mode: boolean }
export interface SessionOut { session_id: string; level_id: number; daily_date: string | null }
export interface RunIn { session_id: string; moves: number; apples: number; golden: number; rescued: number; revives: number; undos: number; bonus_moves: number; move_limit: number; score: number }
export interface RunOut { saved: boolean; history_id: string; score: number; stars: number; perfect: boolean; coins_earned: number; first_clear: boolean; coins: number; new_achievements: string[] }
export interface DailyOut { date: string; completed: boolean; best_score: number; reward_coins: number }
export interface LeaderEntry { rank: number; name: string; score: number; moves: number; is_me: boolean }
export interface LeaderboardOut { date: string; entries: LeaderEntry[]; me: LeaderEntry | null }
export interface ShopItem { id: string; kind: "skin" | "hat"; name: string; price: number; preview: string; owned: boolean; equipped: boolean }
export interface ShopOut { items: ShopItem[]; coins: number; skin: string; hat: string | null }
export interface Achievement { id: string; name: string; description: string; icon: string; target: number; progress: number; unlocked: boolean; unlocked_at: string | null }

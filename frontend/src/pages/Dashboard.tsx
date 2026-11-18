import { useState } from "react";
import type { ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Coins, Crown, History, LogOut, PlayCircle, Settings2, Star, Trophy, Worm } from "lucide-react";
import { toast } from "sonner";
import { apiGet } from "@/lib/api";
import { GAME_NAME } from "@/config/gameConfig";
import { useEconomy, useMe } from "@/lib/hooks";
import { endSession } from "@/lib/session";
import { sfx } from "@/lib/audio";
import type { Achievement, HistoryRow, WalletOut } from "@/lib/types";
import { RewardAdModal } from "@/components/RewardAdModal";
import { AudioToggles } from "@/components/AudioToggles";

const TX_LABEL: Record<string, string> = { DAILY_REWARD: "Daily challenge", COSMETIC_PURCHASE: "Shop", LEVEL_REWARD: "Level reward", AD_REWARD: "Rewarded ad", HINT_PURCHASE: "Hint", BOOSTER_PURCHASE: "Booster", REVIVE_PURCHASE: "Revive" };
const PLACEMENT_LABEL: Record<string, string> = { WALLET: "wallet top-up", DOUBLE_COINS: "double coins", DOUBLE_SCORE: "double score", REVIVE: "revive", HINT: "hint", EXTRA_MOVES: "extra moves", BOOSTER: "booster", LEVEL_COMPLETION: "level clear" };

export default function Dashboard() {
  const { user, loading } = useMe();
  const eco = useEconomy();
  const qc = useQueryClient();
  const [ad, setAd] = useState(false);
  const history = useQuery({ queryKey: ["history"], queryFn: () => apiGet<HistoryRow[]>("/history"), enabled: !!user });
  const achievements = useQuery({ queryKey: ["achievements"], queryFn: () => apiGet<Achievement[]>("/achievements"), enabled: !!user });
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: () => apiGet<WalletOut>("/wallet"), enabled: !!user });
  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#dff5ee] text-[#174b3a]">Loading your grove…</main>;
  if (!user) return <Navigate to="/?auth=login" replace />;
  const rank = user.completed_levels >= 40 ? "Canopy legend" : user.completed_levels >= 25 ? "Forest keeper" : user.completed_levels >= 10 ? "Path finder" : "New sprout";
  const rows = history.data ?? [];

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,#d4f1fb_0%,#dff5ee_50%)] px-4 py-5 text-[#174b3a] sm:px-5">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-2 font-bold" data-testid="dashboard-home-link"><span className="rounded-xl bg-[#f8b73b] p-2">🍎</span><span className="hidden sm:inline">{GAME_NAME}</span></Link>
        <div className="flex items-center gap-2">
          <AudioToggles />
          {user.role === "admin" && <Link to="/admin/economy" className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold" data-testid="dashboard-admin-link"><Settings2 size={16} /> Economy admin</Link>}
          <Link to="/levels" className="rounded-full bg-[#174b3a] px-4 py-2 text-sm font-bold text-white" data-testid="dashboard-play-link">Play</Link>
          <button onClick={() => void endSession("/")} className="rounded-full bg-white/70 p-2.5" title="Log out" data-testid="logout-button"><LogOut size={18} /></button>
        </div>
      </header>
      <section className="mx-auto max-w-6xl py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold tracking-[.25em] text-[#4d9675]">PLAYER GROVE</p><h1 className="font-display mt-2 text-5xl font-bold" data-testid="dashboard-greeting">Hello, {user.name.split(" ")[0]}.</h1><p className="mt-2 text-[#5d7c70]">Your little worm has been busy exploring.</p></div>
          <div className="rounded-2xl bg-[#fff4cb] px-5 py-3 text-sm font-bold text-[#8c6914]" data-testid="dashboard-rank"><Crown className="mr-2 inline" size={18} /> {rank}</div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<Trophy />} label="Best score" value={user.best_score.toLocaleString()} accent="bg-[#fff4cb]" test="dashboard-best-score" />
          <StatCard icon={<Coins />} label="Coins" value={user.coins.toLocaleString()} accent="bg-[#ffe4a9]" test="dashboard-coins" />
          <StatCard icon={<Star />} label="Stars earned" value={`${user.total_stars} / 150`} accent="bg-[#e4f4bc]" test="dashboard-stars" />
          <StatCard icon={<Worm />} label="Paths completed" value={`${user.completed_levels} / 50`} accent="bg-[#c9efd9]" test="dashboard-levels" />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/daily" className="rounded-2xl bg-[#f1ae2d] px-5 py-3 font-bold shadow-sm transition-transform hover:-translate-y-0.5" data-testid="dashboard-daily-link">📅 Daily challenge</Link>
          <Link to="/leaderboard" className="rounded-2xl bg-white px-5 py-3 font-bold shadow-sm transition-transform hover:-translate-y-0.5" data-testid="dashboard-leaderboard-link">🏆 Leaderboard</Link>
          <Link to="/shop" className="rounded-2xl bg-white px-5 py-3 font-bold shadow-sm transition-transform hover:-translate-y-0.5" data-testid="dashboard-shop-link">🎩 Skins shop</Link>
        </div>
        <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm" data-testid="achievements-card">
          <div className="flex items-baseline justify-between"><div><p className="text-xs font-bold tracking-[.2em] text-[#4d9675]">BADGES</p><h2 className="font-display mt-1 text-2xl font-bold">Achievements</h2></div><span className="text-sm font-bold text-[#4d9675]" data-testid="achievements-count">{(achievements.data ?? []).filter((a) => a.unlocked).length} / {(achievements.data ?? []).length}</span></div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {(achievements.data ?? []).map((a, i) => (
              <div key={a.id} title={a.description} className={`rounded-2xl p-3 text-center transition-transform hover:-translate-y-0.5 animate-[rise_.4s_ease-out_both] ${a.unlocked ? "bg-gradient-to-b from-[#fff4cb] to-[#ffe4a9]" : "bg-[#f1f5f3] grayscale"}`} style={{ animationDelay: `${i * 0.03}s` }} data-testid={`achievement-${a.id}`}>
                <span className={`text-3xl ${a.unlocked ? "" : "opacity-40"}`}>{a.icon}</span>
                <p className="mt-1 text-xs font-bold leading-tight">{a.name}</p>
                <div className="mx-auto mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#4fb86a]" style={{ width: `${(a.progress / a.target) * 100}%` }} /></div>
                <p className="mt-1 text-[10px] text-[#6b8c7d]">{a.progress}/{a.target}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          <section className="rounded-[2rem] bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold tracking-[.2em] text-[#4d9675]">RECENT RUNS</p><h2 className="font-display mt-1 text-2xl font-bold">Adventure history</h2></div><History className="text-[#79cda4]" /></div>
            {rows.length ? (
              <div className="space-y-2.5">{rows.slice(0, 8).map((row) => (
                <div key={row.id} className="flex items-center justify-between rounded-2xl bg-[#effaf4] px-4 py-3" data-testid={`history-row-${row.level_id}`}>
                  <div><p className="font-bold">{row.level_id === 0 ? "Daily challenge" : `Level ${String(row.level_id).padStart(2, "0")}`} {row.perfect && <span className="ml-1 rounded-full bg-[#fff4cb] px-2 py-0.5 text-[10px] text-[#8c6914]">PERFECT</span>}</p><p className="text-xs text-[#6b8c7d]">{row.apples} apples · {row.moves} moves · +{row.coins_earned ?? 0} coins{row.doubled_coins ? " ×2" : ""}</p></div>
                  <div className="text-right"><p className="font-bold text-[#d79017]">{row.score} pts{row.doubled_score ? " ×2" : ""}</p><p className="text-xs text-[#e0aa2d]">{"★".repeat(row.stars)}{"☆".repeat(3 - row.stars)}</p></div>
                </div>))}</div>
            ) : <div className="rounded-2xl bg-[#effaf4] p-8 text-center text-[#6b8c7d]" data-testid="history-empty">Complete your first path and it will appear here.</div>}
          </section>

          <aside className="space-y-6">
            <section className="rounded-[2rem] bg-[#174b3a] p-6 text-white shadow-lg" data-testid="wallet-card">
              <p className="text-xs font-bold tracking-[.2em] text-[#a7dfb9]">FOREST WALLET</p>
              <div className="mt-3 flex items-center gap-3"><div className="rounded-2xl bg-[#f1ae2d] p-3 text-[#174b3a]"><Coins /></div><div><p className="font-display text-4xl font-bold" data-testid="wallet-balance">{user.coins.toLocaleString()}</p><p className="text-sm text-[#b4e6c9]">coins for hints, boosters & revives</p></div></div>
              <button onClick={() => setAd(true)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f1ae2d] px-5 py-3 font-bold text-[#174b3a] transition-transform hover:-translate-y-0.5" data-testid="wallet-watch-ad-button"><PlayCircle size={18} /> Watch ad · +{eco.wallet_ad_coins} coins</button>
              <p className="mt-2 text-center text-xs text-[#b4e6c9]">Optional · full {eco.long_ad_seconds}s ad · max {eco.max_ads_per_day} ads a day</p>
            </section>
            <section className="rounded-[2rem] bg-white p-6 shadow-sm">
              <p className="text-xs font-bold tracking-[.2em] text-[#4d9675]">COIN LEDGER</p>
              <ul className="mt-3 space-y-2" data-testid="wallet-ledger">
                {(wallet.data?.history ?? []).slice(0, 8).map((tx) => (
                  <li key={tx.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">{tx.record_type === "DEBIT" ? <ArrowUpRight size={15} className="text-[#d0553a]" /> : <ArrowDownLeft size={15} className="text-[#2f8a5f]" />}{TX_LABEL[tx.transaction_type] ?? tx.transaction_type}<span className="text-[#8aa99a]">{tx.placement ? `· ${PLACEMENT_LABEL[tx.placement] ?? tx.placement}` : ""}</span></span>
                    <b className={tx.record_type === "DEBIT" ? "text-[#d0553a]" : "text-[#2f8a5f]"}>{tx.record_type === "DEBIT" ? "−" : "+"}{tx.amount}</b>
                  </li>))}
                {!wallet.data?.history.length && <li className="text-sm text-[#6b8c7d]">No transactions yet.</li>}
              </ul>
            </section>
          </aside>
        </div>
      </section>
      {ad && <RewardAdModal placement="WALLET" title="Fill your wallet" reward={`+${eco.wallet_ad_coins} forest coins`} isGuest={false} onClose={() => setAd(false)} onGranted={(r) => { setAd(false); sfx("coin"); toast.success(`+${r.coins_granted} coins added to your wallet!`); void qc.invalidateQueries({ queryKey: ["me"] }); void qc.invalidateQueries({ queryKey: ["wallet"] }); }} />}
    </main>
  );
}

function StatCard({ icon, label, value, accent, test }: { icon: ReactNode; label: string; value: string; accent: string; test: string }) {
  return <div className="rounded-[1.5rem] bg-white p-5 shadow-sm" data-testid={test}><div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>{icon}</div><p className="text-sm text-[#6b8c7d]">{label}</p><p className="font-display mt-1 text-3xl font-bold">{value}</p></div>;
}

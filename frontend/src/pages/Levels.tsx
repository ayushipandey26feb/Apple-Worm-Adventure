import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Lock, Star } from "lucide-react";
import { apiGet } from "@/lib/api";
import { GAME_NAME } from "@/config/gameConfig";
import { LEVEL_COUNT, levelMeta, MODE_INFO } from "@/data/levels";
import { useMe } from "@/lib/hooks";
import { localStars, localUnlocked } from "@/lib/local";
import type { ProgressRow } from "@/lib/types";
import { AudioToggles } from "@/components/AudioToggles";

const TIERS = [
  { name: "Sprout Meadow", sub: "Levels 1–10 · Beginner", tint: "from-[#e6f9ef] to-[#d6f3fb]" },
  { name: "Mossy Brook", sub: "Levels 11–20 · Easy", tint: "from-[#dcf5e8] to-[#cdeefa]" },
  { name: "Whispering Pines", sub: "Levels 21–30 · Medium", tint: "from-[#d2f0df] to-[#c3e8f6]" },
  { name: "Thorn Hollow", sub: "Levels 31–40 · Hard", tint: "from-[#c6ead6] to-[#b9e2f2]" },
  { name: "Ancient Canopy", sub: "Levels 41–50 · Expert", tint: "from-[#b8e3cb] to-[#acdcee]" },
];

export default function Levels() {
  const { user, loading } = useMe();
  const progress = useQuery({ queryKey: ["progress"], queryFn: () => apiGet<ProgressRow[]>("/progress"), enabled: !!user });
  const local = localStars();
  const server = new Map((progress.data ?? []).filter((p) => p.completed).map((p) => [p.level_id, p.stars]));
  const unlocked = user ? Math.max(1, ...[...server.keys()].map((id) => Math.min(LEVEL_COUNT, id + 1))) : localUnlocked();
  const starsOf = (id: number) => Math.max(local[id] ?? 0, server.get(id) ?? 0);
  const totalStars = Array.from({ length: LEVEL_COUNT }, (_, i) => starsOf(i + 1)).reduce((a, b) => a + b, 0);

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,#d4f1fb_0%,#dff5ee_50%)] px-4 py-5 text-[#174b3a] sm:px-5">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-2 font-bold" data-testid="levels-home-link"><ArrowLeft size={18} /> <span className="hidden sm:inline">{GAME_NAME}</span></Link>
        <div className="flex items-center gap-2">
          {loading ? null : user ? <Link to="/dashboard" className="rounded-full bg-white px-4 py-2 text-sm font-bold" data-testid="levels-dashboard-link">My grove</Link> : <Link to="/?auth=login" className="rounded-full bg-white px-4 py-2 text-sm font-bold" data-testid="levels-login-link">Log in</Link>}
          <Link to="/daily" className="rounded-full bg-white px-4 py-2 text-sm font-bold" data-testid="levels-daily-link">📅 <span className="hidden sm:inline">Daily</span></Link>
          <Link to="/leaderboard" className="rounded-full bg-white px-4 py-2 text-sm font-bold" data-testid="levels-leaderboard-link">🏆 <span className="hidden sm:inline">Leaders</span></Link>
          <Link to="/shop" className="rounded-full bg-white px-4 py-2 text-sm font-bold" data-testid="levels-shop-link">🎩 <span className="hidden sm:inline">Shop</span></Link>
          <AudioToggles />
          <Link to={`/game/${unlocked}`} className="rounded-full bg-[#f1ae2d] px-4 py-2 text-sm font-bold" data-testid="levels-continue-button">Play level {unlocked}</Link>
        </div>
      </header>
      <section className="mx-auto max-w-6xl py-10">
        <p className="text-xs font-bold tracking-[.25em] text-[#4d9675]">THE FOREST MAP</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display mt-2 text-5xl font-bold">Choose your path</h1>
          <p className="flex items-center gap-2 rounded-full bg-white px-4 py-2 font-bold" data-testid="levels-total-stars"><Star size={16} className="text-[#f3b731]" fill="currentColor" /> {totalStars} / {LEVEL_COUNT * 3}</p>
        </div>
        <p className="mt-2 max-w-xl text-[#5d7c70]">Seven kinds of challenges — classic, collection, length, rescue, key & gate, limited moves and timed — spread across five forest regions.</p>
        <div className="mt-8 space-y-8">
          {TIERS.map((tier, t) => (
            <div key={tier.name} className={`rounded-[2rem] bg-gradient-to-br ${tier.tint} p-5 sm:p-6`} data-testid={`tier-${t + 1}`}>
              <div className="mb-4 flex items-baseline justify-between"><h2 className="font-display text-2xl font-bold">{tier.name}</h2><span className="text-sm text-[#4d9675]">{tier.sub}</span></div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {Array.from({ length: 10 }, (_, i) => {
                  const id = t * 10 + i + 1; const meta = levelMeta(id); const info = MODE_INFO[meta.mode];
                  const locked = id > unlocked; const stars = starsOf(id);
                  return (
                    <Link key={id} to={locked ? "#" : `/game/${id}`} onClick={(e) => locked && e.preventDefault()} aria-disabled={locked}
                      className={`group relative rounded-3xl border p-4 transition-[transform,box-shadow] ${locked ? "cursor-not-allowed border-white/40 bg-white/40 text-[#8caf9d]" : "border-white bg-white shadow-sm hover:-translate-y-1 hover:shadow-lg"} ${id === unlocked ? "ring-4 ring-[#f1ae2d]/60" : ""}`} data-testid={`level-${id}-card`}>
                      <div className="flex items-start justify-between"><span className="font-display text-2xl font-bold">{String(id).padStart(2, "0")}</span>{locked ? <Lock size={16} /> : <span className="text-xl" title={info.label}>{info.emoji}</span>}</div>
                      <p className="mt-5 text-xs font-bold tracking-wide" data-testid={`level-${id}-mode`}>{info.label}</p>
                      <div className="mt-2 flex gap-0.5 text-[#f3b731]" data-testid={`level-${id}-stars`}>{[1, 2, 3].map((s) => <Star key={s} size={14} fill={s <= stars ? "currentColor" : "none"} />)}</div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

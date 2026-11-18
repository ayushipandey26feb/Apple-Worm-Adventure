import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Crown, Medal, Play } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useMe } from "@/lib/hooks";
import type { LeaderboardOut } from "@/lib/types";
import { AudioToggles } from "@/components/AudioToggles";

const MEDAL = ["bg-[#f7c62f]", "bg-[#cfd8dc]", "bg-[#e0a46b]"];

export default function Leaderboard() {
  const { user } = useMe();
  const q = useQuery({ queryKey: ["leaderboard"], queryFn: () => apiGet<LeaderboardOut>("/leaderboard/daily"), refetchInterval: 30_000 });
  const rows = q.data?.entries ?? [];
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,#d4f1fb_0%,#dff5ee_50%)] px-4 py-5 text-[#174b3a] sm:px-5">
      <header className="mx-auto flex max-w-3xl items-center justify-between">
        <Link to="/levels" className="flex items-center gap-2 font-bold" data-testid="leaderboard-back-link"><ArrowLeft size={18} /> Forest map</Link>
        <AudioToggles />
      </header>
      <section className="mx-auto max-w-3xl py-10">
        <p className="text-xs font-bold tracking-[.25em] text-[#4d9675]">DAILY CHALLENGE · {q.data?.date ?? "…"}</p>
        <h1 className="font-display mt-2 text-5xl font-bold">Today's top worms</h1>
        <p className="mt-2 text-[#5d7c70]">Scores are checked by the server before they appear here. A new puzzle starts at midnight (UTC).</p>
        {q.data?.me && <div className="mt-6 flex items-center justify-between rounded-[1.5rem] bg-[#174b3a] px-5 py-4 text-white animate-[pop_.3s_ease-out]" data-testid="leaderboard-my-rank"><span className="flex items-center gap-2 font-bold"><Crown size={18} className="text-[#f1ae2d]" /> Your rank #{q.data.me.rank}</span><span className="font-display text-2xl font-bold">{q.data.me.score} pts</span></div>}
        <ol className="mt-6 space-y-2.5" data-testid="leaderboard-list">
          {rows.map((r, i) => (
            <li key={`${r.rank}-${r.name}`} className={`flex items-center gap-4 rounded-2xl px-5 py-3.5 shadow-sm transition-transform hover:-translate-y-0.5 animate-[rise_.4s_ease-out_both] ${r.is_me ? "bg-[#fff4cb] ring-2 ring-[#f1ae2d]" : "bg-white"}`} style={{ animationDelay: `${i * 0.04}s` }} data-testid={`leaderboard-row-${r.rank}`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold ${MEDAL[i] ?? "bg-[#effaf4]"}`}>{i < 3 ? <Medal size={18} /> : r.rank}</span>
              <span className="flex-1 truncate font-bold">{r.name}{r.is_me && " (you)"}</span>
              <span className="text-sm text-[#5d7c70]">{r.moves} moves</span>
              <span className="font-display w-20 text-right text-xl font-bold">{r.score}</span>
            </li>
          ))}
          {!rows.length && <li className="rounded-2xl bg-white p-8 text-center text-[#5d7c70]" data-testid="leaderboard-empty">No scores yet today — be the first!</li>}
        </ol>
        <Link to="/daily" className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#f1ae2d] px-6 py-3.5 font-bold shadow-lg shadow-[#f1ae2d]/30 transition-transform hover:-translate-y-1" data-testid="leaderboard-play-daily-button"><Play size={18} /> Play today's challenge</Link>
        {!user && <p className="mt-3 text-sm text-[#5d7c70]"><Link to="/?auth=login" className="font-bold underline">Log in</Link> to post your score.</p>}
      </section>
    </main>
  );
}

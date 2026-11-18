import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { apiGet } from "@/lib/api";
import { getDailyLevel } from "@/data/levels";
import { useMe } from "@/lib/hooks";
import type { DailyOut } from "@/lib/types";
import { GameView } from "@/pages/Game";

/** Today's daily puzzle. The date comes from the server so every player gets the same layout. */
export default function Daily() {
  const { user } = useMe();
  const q = useQuery({ queryKey: ["daily"], queryFn: () => apiGet<DailyOut>("/daily") });
  const date = q.data?.date ?? (q.isError ? new Date().toISOString().slice(0, 10) : null);
  if (!date) return <main className="flex min-h-screen items-center justify-center bg-[#dff5ee] text-[#174b3a]"><Loader2 className="animate-spin" /></main>;
  return (
    <>
      <div className="bg-gradient-to-r from-[#f1ae2d] via-[#ffd75e] to-[#f1ae2d] bg-[length:200%_100%] px-4 py-2 text-center text-sm font-bold text-[#174b3a] animate-[shine_6s_linear_infinite]" data-testid="daily-banner">
        📅 Daily Apple Challenge · {date} · {q.data?.completed ? `Done today — best ${q.data.best_score} pts. Replay to beat it!` : user ? `Win +${q.data?.reward_coins ?? 100} coins (watch an ad to double)` : "Sign in to earn coins and join the leaderboard"} · <Link to="/leaderboard" className="underline" data-testid="daily-leaderboard-link">Leaderboard</Link>
      </div>
      <GameView key={date} level={getDailyLevel(date)} user={user} daily={date} />
    </>
  );
}

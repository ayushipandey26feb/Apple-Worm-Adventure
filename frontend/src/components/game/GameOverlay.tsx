import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Coins, Footprints, HeartPulse, Map as MapIcon, RotateCcw, Star, Trophy } from "lucide-react";
import { sfx } from "@/lib/audio";
import { Burst, Confetti, CountUp, FlyingCoins } from "@/components/fx";
import type { Level } from "@/lib/engine";
import type { EconomyConfig, PublicUser } from "@/lib/types";

export type ResultInfo = { score: number; stars: number; perfect: boolean; breakdown: { label: string; value: number }[]; coinsEarned: number; historyId: string | null; doubledScore: boolean; doubledCoins: boolean; syncPending: boolean; firstClear: boolean; achievements: string[]; rejected: string | null };

type Props = {
  status: "dead" | "outOfMoves" | "timeout" | "won"; daily: boolean; reason: string; level: Level; result: ResultInfo | null; eco: EconomyConfig; user: PublicUser | null;
  canFreeRevive: boolean; canAdRevive: boolean; canExtra: boolean;
  onFreeRevive: () => void; onAdRevive: () => void; onCoinRevive: () => void; onExtra: () => void;
  onDouble: (p: "DOUBLE_SCORE" | "DOUBLE_COINS") => void; onRetry: () => void; onNext: () => void; onMap: () => void;
};

const Btn = ({ onClick, testid, tone = "light", children, disabled }: { onClick: () => void; testid: string; tone?: "dark" | "gold" | "light"; children: React.ReactNode; disabled?: boolean }) => (
  <button onClick={onClick} disabled={disabled} className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-bold transition-[transform,opacity] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 ${tone === "dark" ? "bg-[#174b3a] text-white" : tone === "gold" ? "bg-[#f1ae2d] text-[#174b3a] shadow-lg shadow-[#f1ae2d]/30" : "bg-[#effaf4] text-[#174b3a]"}`} data-testid={testid}>{children}</button>
);

export function GameOverlay(p: Props) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0f2f24]/55 p-4 backdrop-blur-[2px]" data-testid={`overlay-${p.status}`}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-[#fffdf4] p-7 text-center shadow-2xl animate-[pop_.3s_ease-out]">
        {p.status === "won" && p.result ? <Won {...p} result={p.result} /> : p.status === "dead" ? <Dead {...p} /> : <OutOf {...p} />}
      </div>
    </div>
  );
}

function Won({ level, result, user, eco, daily, onDouble, onNext, onRetry, onMap }: Props & { result: ResultInfo }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timers = Array.from({ length: result.stars }, (_, i) => window.setTimeout(() => { setShown(i + 1); sfx("star"); if (i + 1 === 3) window.setTimeout(() => sfx("achievement"), 250); }, 500 + i * 380));
    return () => timers.forEach(window.clearTimeout);
  }, [result.stars]);
  const last = daily || level.id >= 50;
  return (
    <>
      <Confetti />
      <Trophy className="mx-auto text-[#f2a51a] animate-[wiggle_1.2s_ease-in-out_2]" size={40} />
      <h2 className="font-display mt-2 text-4xl font-bold" data-testid="level-complete-title">{daily ? "Daily challenge done!" : last ? "Forest champion!" : "Path complete!"}</h2>
      <div className="mt-3 flex justify-center gap-2" data-testid="result-stars">{[1, 2, 3].map((s) => <span key={s} className="relative">{s <= shown && <Burst count={8} spread={36} size={5} />}<Star size={40} className={`transition-[transform,color] duration-300 ${s <= shown ? "scale-110 text-[#f3b731] animate-[grow_.4s_ease-out]" : "scale-90 text-[#d9e8df]"}`} fill="currentColor" /></span>)}</div>
      {result.perfect && <p className="mt-2 inline-block rounded-full bg-[#fff4cb] px-3 py-1 text-xs font-bold text-[#8c6914]" data-testid="result-perfect">✨ PERFECT COMPLETION</p>}
      <p key={result.score} className={`font-display mt-3 text-5xl font-bold text-[#174b3a] ${result.doubledScore ? "animate-[grow_.5s_ease-out]" : ""}`} data-testid="result-score"><CountUp value={result.score} /><span className="ml-1 text-lg text-[#5d7c70]">pts</span></p>
      {result.doubledScore && <p className="text-sm font-bold text-[#2f8a5f]" data-testid="result-score-doubled">Score doubled! ×{eco.double_score_multiplier}</p>}
      <ul className="mx-auto mt-3 max-w-xs space-y-1 text-left text-sm text-[#5d7c70]">{result.breakdown.filter((b) => b.value).map((b) => <li key={b.label} className="flex justify-between"><span>{b.label}</span><b className="text-[#174b3a]">+{b.value}</b></li>)}</ul>
      {user ? (
        result.rejected ? <p className="mt-4 rounded-2xl bg-[#fde2d6] px-4 py-2.5 text-sm font-bold text-[#a0401c]" data-testid="result-rejected">{result.rejected}</p> :
        <p key={result.coinsEarned} className="relative mt-4 flex items-center justify-center gap-2 rounded-2xl bg-[#fff4cb] px-4 py-2.5 font-bold text-[#8c6914]" data-testid="result-coins">{result.coinsEarned > 0 && <FlyingCoins />}<Coins size={18} /> {result.syncPending ? "Saved offline — progress syncs when you're back online (no coins for offline runs)" : <>+<CountUp value={result.coinsEarned} /> coins{result.doubledCoins ? " (doubled!)" : ""}</>}</p>
      ) : (
        <p className="mt-4 rounded-2xl bg-[#effaf4] px-4 py-2.5 text-sm text-[#40614f]" data-testid="result-guest-note">Playing as guest. <Link to="/?auth=register" className="font-bold underline">Create an account</Link> to save coins and double rewards.</p>
      )}
      {result.achievements.length > 0 && <div className="mt-3 flex flex-wrap justify-center gap-2" data-testid="result-achievements">{result.achievements.map((a) => <span key={a} className="rounded-full bg-[#174b3a] px-3 py-1 text-xs font-bold text-white animate-[pop_.4s_ease-out]">🏅 {a}</span>)}</div>}
      <div className="mt-5 grid gap-2.5">
        {user && result.historyId && (
          <div className="grid grid-cols-2 gap-2.5">
            <Btn onClick={() => onDouble("DOUBLE_SCORE")} disabled={result.doubledScore} testid="double-score-button">{result.doubledScore ? "Score doubled" : "▶ 2× Score"}</Btn>
            <Btn onClick={() => onDouble("DOUBLE_COINS")} disabled={result.doubledCoins || !result.coinsEarned} testid="double-coins-button">{result.doubledCoins ? "Coins doubled" : "▶ 2× Coins"}</Btn>
          </div>
        )}
        {user && result.historyId && <p className="-mt-1 text-xs text-[#5d7c70]">Optional · watch a full {eco.long_ad_seconds}s ad for each bonus</p>}
        {!last && <Btn tone="gold" onClick={onNext} testid="next-level-button">Next level →</Btn>}
        {daily && <Link to="/leaderboard" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f1ae2d] px-5 py-3.5 font-bold text-[#174b3a]" data-testid="result-leaderboard-link"><Trophy size={16} /> See today's leaderboard</Link>}
        <div className="grid grid-cols-2 gap-2.5"><Btn onClick={onRetry} testid="replay-level-button"><RotateCcw size={16} /> Replay</Btn><Btn onClick={onMap} testid="result-map-button"><MapIcon size={16} /> Map</Btn></div>
      </div>
    </>
  );
}

function Dead({ reason, eco, user, canFreeRevive, canAdRevive, onFreeRevive, onAdRevive, onCoinRevive, onRetry, onMap }: Props) {
  return (
    <>
      <HeartPulse className="mx-auto text-[#e5483b]" size={40} />
      <h2 className="font-display mt-2 text-4xl font-bold">Oops, tangled!</h2>
      <p className="mt-2 text-[#5d7c70]" data-testid="fail-reason">{reason}</p>
      <div className="mt-6 grid gap-2.5">
        {canFreeRevive ? <Btn tone="gold" onClick={onFreeRevive} testid="free-revive-button">Use free revive</Btn> : canAdRevive ? (
          <>
            <Btn tone="gold" onClick={onAdRevive} testid="ad-revive-button">▶ Revive · watch {eco.long_ad_seconds}s ad</Btn>
            <Btn onClick={onCoinRevive} disabled={!user || user.coins < eco.revive_cost} testid="coin-revive-button"><Coins size={16} /> Revive for {eco.revive_cost} coins{!user ? " (sign in)" : ""}</Btn>
          </>
        ) : <p className="rounded-2xl bg-[#effaf4] px-4 py-3 text-sm text-[#40614f]" data-testid="no-revives-left">No revives left on this level — give it a fresh try!</p>}
        <Btn tone="dark" onClick={onRetry} testid="retry-level-button"><RotateCcw size={16} /> Try again</Btn>
        <Btn onClick={onMap} testid="fail-map-button"><MapIcon size={16} /> Forest map</Btn>
      </div>
      <p className="mt-3 text-xs text-[#5d7c70]">{eco.free_revives_per_level} free + {eco.rewarded_revives_per_level} rewarded revive per level</p>
    </>
  );
}

function OutOf({ status, reason, eco, canExtra, onExtra, onRetry, onMap }: Props) {
  const timeout = status === "timeout";
  return (
    <>
      {timeout ? <Clock className="mx-auto text-[#3ba3e6]" size={40} /> : <Footprints className="mx-auto text-[#d97a1f]" size={40} />}
      <h2 className="font-display mt-2 text-4xl font-bold">{timeout ? "Time's up!" : "Out of moves!"}</h2>
      <p className="mt-2 text-[#5d7c70]" data-testid="fail-reason">{reason}</p>
      <div className="mt-6 grid gap-2.5">
        {canExtra ? <Btn tone="gold" onClick={onExtra} testid="extra-moves-button">▶ {timeout ? `+${eco.extra_seconds} seconds` : `+${eco.extra_moves} moves`} · watch {eco.short_ad_seconds}s ad</Btn> : <p className="rounded-2xl bg-[#effaf4] px-4 py-3 text-sm text-[#40614f]">No more extras on this level.</p>}
        <Btn tone="dark" onClick={onRetry} testid="retry-level-button"><RotateCcw size={16} /> Try again</Btn>
        <Btn onClick={onMap} testid="fail-map-button"><MapIcon size={16} /> Forest map</Btn>
      </div>
    </>
  );
}

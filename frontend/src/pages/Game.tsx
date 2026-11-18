import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Clock, Coins, Footprints, Lightbulb, Lock, Map as MapIcon, RotateCcw, Shield, Sparkles, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { sfx, type SfxName } from "@/lib/audio";
import { type Cell, type Dir, DIRS, type GameEvent, type GameState, type Level, initialState, isApple, k, objectiveProgress, routeCells, SCORE, solve, starsFor, step, TIME_APPLE_SECONDS } from "@/lib/engine";
import { getLevel, LEVEL_COUNT, MODE_INFO, objectiveText } from "@/data/levels";
import type { Fx } from "@/components/game/Board";
import { useEconomy, useLook, useMe } from "@/lib/hooks";
import { localUnlocked, queueProgress, recordLocalClear } from "@/lib/local";
import type { AdPlacement, ProgressIn, ProgressRow, PublicUser, RunIn, RunOut, SessionOut, SpendItem, SpendOut, VerifyOut } from "@/lib/types";
import { Board } from "@/components/game/Board";
import { ITEM_INFO, ItemIcon, Spikes, TILE_INFO } from "@/components/game/Icons";
import { type AdContext, RewardAdModal } from "@/components/RewardAdModal";
import { AudioToggles } from "@/components/AudioToggles";
import { GameOverlay, type ResultInfo } from "@/components/game/GameOverlay";
import { ChoiceSheet } from "@/components/game/ChoiceSheet";

type Status = "playing" | "dead" | "outOfMoves" | "timeout" | "won";
type Run = { attempt: string; state: GameState; history: GameState[]; status: Status; reason: string; freeRevives: number; adRevives: number; undos: number; hints: number; boosters: number; extras: number; timeLeft: number | null; hint: Cell[]; danger: Cell[]; shake: number; result: ResultInfo | null };
type AdRequest = { placement: AdPlacement; title: string; reward: string; context: AdContext; onGranted: (r: VerifyOut) => void };

const fresh = (level: Level): Run => ({ attempt: crypto.randomUUID(), state: initialState(level), history: [], status: "playing", reason: "", freeRevives: 0, adRevives: 0, undos: 0, hints: 0, boosters: 0, extras: 0, timeLeft: level.timeLimit, hint: [], danger: [], shake: 0, result: null });
const EVENT_SOUND: Partial<Record<GameEvent, SfxName>> = { apple: "apple", golden: "golden", mega: "mega", mystery: "mystery", time: "time", key: "key", rescue: "rescue", teleport: "teleport", shield: "shield" };
const KEYS: Record<string, Dir> = { ArrowUp: "UP", w: "UP", W: "UP", ArrowDown: "DOWN", s: "DOWN", S: "DOWN", ArrowLeft: "LEFT", a: "LEFT", A: "LEFT", ArrowRight: "RIGHT", d: "RIGHT", D: "RIGHT" };
const apiMessage = (e: unknown, fallback: string) => (e instanceof ApiError && typeof (e.body as { detail?: unknown })?.detail === "string" ? (e.body as { detail: string }).detail : fallback);

export default function Game() {
  const { levelId = "1" } = useParams();
  const id = Math.min(LEVEL_COUNT, Math.max(1, Number(levelId) || 1));
  const level = useMemo(() => getLevel(id), [id]);
  const { user, loading } = useMe();
  const progress = useQuery({ queryKey: ["progress"], queryFn: () => apiGet<ProgressRow[]>("/progress"), enabled: !!user });
  const serverUnlocked = Math.min(LEVEL_COUNT, Math.max(1, ...(progress.data ?? []).filter((p) => p.completed).map((p) => p.level_id + 1)));
  const unlocked = user ? serverUnlocked : localUnlocked();
  if (id > unlocked && !loading && (!user || progress.isFetched)) return <LockedLevel id={id} unlocked={unlocked} />;
  return <GameView key={id} level={level} user={user} />;
}

function LockedLevel({ id, unlocked }: { id: number; unlocked: number }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#dff5ee] p-6 text-[#174b3a]">
      <div className="max-w-sm rounded-[2rem] bg-white p-8 text-center shadow-xl" data-testid="level-locked">
        <Lock className="mx-auto text-[#4d9675]" size={40} /><h1 className="font-display mt-3 text-3xl font-bold">Level {id} is locked</h1>
        <p className="mt-2 text-[#5d7c70]">Finish level {unlocked} to open the next forest path.</p>
        <Link to={`/game/${unlocked}`} className="mt-6 block rounded-xl bg-[#f1ae2d] px-5 py-3 font-bold" data-testid="locked-play-unlocked-button">Play level {unlocked}</Link>
      </div>
    </main>
  );
}

export function GameView({ level, user, daily }: { level: Level; user: PublicUser | null; daily?: string }) {
  const eco = useEconomy();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [run, setRun] = useState<Run>(() => fresh(level));
  const [sheet, setSheet] = useState<"hint" | "booster" | null>(null);
  const [ad, setAd] = useState<AdRequest | null>(null);
  const [session, setSession] = useState<{ attempt: string; id: string } | null>(null);
  const [fx, setFx] = useState<Fx[]>([]);
  const [reviving, setReviving] = useState(false);
  const look = useLook(user);
  useEffect(() => {
    if (!user) return;
    const attempt = run.attempt;
    apiPost<SessionOut>("/sessions", { level_id: daily ? 0 : level.id, daily: !!daily }).then((s) => setSession({ attempt, id: s.session_id })).catch(() => undefined);
  }, [run.attempt, user?.id, level.id, daily]); // eslint-disable-line react-hooks/exhaustive-deps
  const sid = session && session.attempt === run.attempt ? session.id : null;
  const paused = !!sheet || !!ad || run.status !== "playing";
  const progress = objectiveProgress(level, run.state);
  const limit = level.moveLimit + run.state.bonusMoves;
  const mode = MODE_INFO[level.mode];

  // ---- timer (timed mode only; pauses whenever a popup is open) ----
  useEffect(() => {
    if (paused || run.timeLeft === null) return;
    const t = window.setInterval(() => setRun((r) => (r.timeLeft === null || r.status !== "playing" ? r : r.timeLeft <= 1 ? { ...r, timeLeft: 0, status: "timeout", reason: "The forest clock ran out!" } : { ...r, timeLeft: r.timeLeft - 1 })), 1000);
    return () => window.clearInterval(t);
  }, [paused, run.timeLeft]);
  useEffect(() => { if (run.status === "timeout" || run.status === "outOfMoves") sfx("fail"); }, [run.status]);

  const finish = useCallback(async (s: GameState, r: Run) => {
    const revives = r.freeRevives + r.adRevives;
    const stars = starsFor(level, s.moves, revives);
    const perfect = stars === 3 && revives === 0 && r.undos === 0;
    const movesLeft = Math.max(0, level.moveLimit + s.bonusMoves - s.moves);
    const breakdown = [
      { label: "Apples & rescues", value: s.score },
      { label: "Level complete", value: SCORE.completion },
      { label: `Moves left bonus (${movesLeft})`, value: movesLeft * SCORE.perMoveLeft },
      { label: "No-revive bonus", value: revives === 0 ? SCORE.noRevive : 0 },
      { label: "Perfect completion", value: perfect ? SCORE.perfect : 0 },
    ];
    const score = breakdown.reduce((n, b) => n + b.value, 0);
    if (!daily) recordLocalClear(level.id, stars);
    const base: ResultInfo = { score, stars, perfect, breakdown, coinsEarned: 0, historyId: null, doubledScore: false, doubledCoins: false, syncPending: false, firstClear: false, achievements: [], rejected: null };
    setRun((cur) => ({ ...cur, status: "won", result: base }));
    sfx("portal"); window.setTimeout(() => sfx("complete"), 350);
    if (!user) return;
    const rescued = level.items.filter((i) => i.kind === "rescue" && s.eaten.includes(i.id)).length;
    const offline = () => { if (!daily) queueProgress({ level_id: level.id, score: 0, moves: s.moves, stars, apples: s.applesEaten, golden: s.golden, perfect, completed: true } satisfies ProgressIn); setRun((cur) => (cur.result ? { ...cur, result: { ...cur.result, syncPending: true } } : cur)); };
    if (!sid) { offline(); return; }
    const body: RunIn = { session_id: sid, moves: s.moves, apples: s.applesEaten, golden: s.golden, rescued, revives, undos: r.undos, bonus_moves: s.bonusMoves, move_limit: level.moveLimit, score };
    try {
      const saved = await apiPost<RunOut>(daily ? "/daily/complete" : `/levels/${level.id}/complete`, body);
      setRun((cur) => (cur.result ? { ...cur, result: { ...cur.result, score: saved.score, stars: saved.stars, perfect: saved.perfect, coinsEarned: saved.coins_earned, historyId: saved.history_id, firstClear: saved.first_clear, achievements: saved.new_achievements } } : cur));
      if (saved.coins_earned) window.setTimeout(() => sfx("coin"), 900);
      saved.new_achievements.forEach((a, i) => window.setTimeout(() => { sfx("achievement"); toast.success(`Achievement unlocked: ${a}!`, { icon: "🏅" }); }, 1600 + i * 900));
      ["me", "progress", "daily", "leaderboard", "achievements"].forEach((key) => void qc.invalidateQueries({ queryKey: [key] }));
    } catch (e) {
      const detail = apiMessage(e, "");
      if (detail) setRun((cur) => (cur.result ? { ...cur, result: { ...cur.result, rejected: detail } } : cur));
      else offline();
    }
  }, [level, user, qc, sid, daily]);

  const move = (dir: Dir) => {
    if (paused) return;
    const r = step(level, run.state, dir);
    if (r.outcome === "blocked") {
      setRun((cur) => ({ ...cur, state: r.state, shake: cur.shake + 1 }));
      r.events.forEach((e) => EVENT_SOUND[e] && sfx(EVENT_SOUND[e]!));
      if (!r.events.length) sfx("bump");
      toast(r.reason, { id: "blocked", duration: 1600 });
      return;
    }
    if (r.outcome === "dead") { sfx("fail"); setRun((cur) => ({ ...cur, status: "dead", reason: r.reason ?? "", shake: cur.shake + 1, hint: [], danger: [] })); return; }
    const head = r.state.worm[r.state.worm.length - 1];
    const followHint = run.hint.length > 0 && head.x === run.hint[0].x && head.y === run.hint[0].y;
    const special = r.events.filter((e) => EVENT_SOUND[e]);
    if (special.length) special.forEach((e) => sfx(EVENT_SOUND[e]!)); else sfx("move");
    const label = r.events.includes("golden") ? ["+50", "#d99a0b"] : r.events.includes("mega") ? ["+3 🐛", "#c0262d"] : r.events.includes("time") ? ["+8s", "#1f6fae"] : r.events.includes("mystery") ? ["?!", "#137a6c"] : r.events.includes("apple") ? ["+10", "#e5483b"] : r.events.includes("rescue") ? ["🐞 +10", "#b52b22"] : r.events.includes("key") ? ["🔑", "#8a5a00"] : null;
    if (label) { const f = { id: Date.now() + Math.random(), x: head.x, y: head.y, text: label[0], color: label[1] }; setFx((cur) => [...cur, f]); window.setTimeout(() => setFx((cur) => cur.filter((x) => x.id !== f.id)), 950); }
    if (r.mystery) toast.success({ grow: "Mystery apple: your worm grew 2 extra segments!", shrink: "Mystery apple: your worm got a little shorter!", shield: "Mystery apple: a magic shield protects your next crash!", bonus: level.mode === "timed" ? "Mystery apple: +10 seconds!" : "Mystery apple: +3 bonus moves!" }[r.mystery], { id: "mystery" });
    if (r.events.includes("time")) toast.success(`Time apple: +${TIME_APPLE_SECONDS} seconds!`, { id: "time" });
    if (r.events.includes("key")) toast.success("You found the key — the gates are open!", { id: "key" });
    const next: Run = { ...run, state: r.state, history: [...run.history.slice(-60), run.state], hint: followHint ? run.hint.slice(1) : [], danger: followHint ? run.danger : [], timeLeft: run.timeLeft === null ? null : run.timeLeft + (r.state.bonusSeconds - run.state.bonusSeconds), status: r.outcome === "outOfMoves" ? "outOfMoves" : "playing", reason: r.outcome === "outOfMoves" ? "You ran out of moves!" : "" };
    setRun(next);
    if (r.outcome === "won") void finish(r.state, next);
  };
  const moveRef = useRef(move); moveRef.current = move;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { const d = KEYS[e.key]; if (d) { e.preventDefault(); moveRef.current(d); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);

  const restart = () => { setRun(fresh(level)); setSheet(null); };
  const undo = () => {
    if (paused || !run.history.length) return;
    setRun((cur) => ({ ...cur, state: cur.history[cur.history.length - 1], history: cur.history.slice(0, -1), undos: cur.undos + 1, hint: [], danger: [] }));
  };

  // ---- rewards ----
  const ctx = { level_id: daily ? 1 : level.id, attempt_id: sid ?? run.attempt };
  const spend = async (item: SpendItem, apply: () => void) => {
    try {
      await apiPost<SpendOut>("/wallet/spend", { item, ...ctx });
      void qc.invalidateQueries({ queryKey: ["me"] }); sfx("coin"); apply();
    } catch (e) { toast.error(apiMessage(e, "Couldn't use coins right now.")); }
  };
  const revive = (kind: "free" | "paid") => { sfx("revive"); setReviving(true); window.setTimeout(() => setReviving(false), 2500); toast.success("Revived! Back to your last safe spot."); setRun((cur) => ({ ...cur, status: "playing", reason: "", freeRevives: cur.freeRevives + (kind === "free" ? 1 : 0), adRevives: cur.adRevives + (kind === "paid" ? 1 : 0) })); };
  const showHint = () => {
    const path = solve(level, run.state);
    if (!path) return;
    const head = run.state.worm[run.state.worm.length - 1];
    const danger = Object.values(DIRS).map((d) => ({ x: head.x + d.x, y: head.y + d.y })).filter((c) => level.walls.some((w) => k(w) === k(c)) || level.spikes.some((w) => k(w) === k(c)) || run.state.worm.some((w) => k(w) === k(c)));
    sfx("hint"); toast.success(`Hint: move ${path[0].toLowerCase()} and follow the glowing steps.`, { id: "hint" });
    setRun((cur) => ({ ...cur, hints: cur.hints + 1, hint: routeCells(level, cur.state, path, 5), danger }));
  };
  const hintSolvable = useMemo(() => (sheet === "hint" ? !!solve(level, run.state) : true), [sheet, level, run.state]);
  const addShield = () => { sfx("booster"); toast.success("Magic shield ready — your next crash is blocked!"); setRun((cur) => ({ ...cur, boosters: cur.boosters + 1, state: { ...cur.state, shield: true } })); };
  const openAd = (req: AdRequest) => { setSheet(null); setAd(req); };

  const askRevive = () => openAd({ placement: "REVIVE", title: "Revive your worm", reward: "Continue from your last safe spot", context: ctx, onGranted: () => revive("paid") });
  const askExtra = () => openAd({ placement: "EXTRA_MOVES", title: run.status === "timeout" ? "Get extra time" : "Get extra moves", reward: run.status === "timeout" ? `+${eco.extra_seconds} seconds` : `+${eco.extra_moves} moves`, context: ctx, onGranted: (r) => { sfx("booster"); setRun((cur) => (cur.status === "timeout" ? { ...cur, status: "playing", extras: cur.extras + 1, timeLeft: (cur.timeLeft ?? 0) + r.extra_seconds } : { ...cur, status: "playing", extras: cur.extras + 1, state: { ...cur.state, bonusMoves: cur.state.bonusMoves + r.extra_moves } })); } });
  const askHintAd = () => openAd({ placement: "HINT", title: "Get a free hint", reward: "Shows your next 5 safe steps", context: ctx, onGranted: showHint });
  const askBoosterAd = () => openAd({ placement: "BOOSTER", title: "Magic shield booster", reward: "Blocks your next crash", context: ctx, onGranted: addShield });
  const askDouble = (placement: "DOUBLE_SCORE" | "DOUBLE_COINS") => {
    const res = run.result; if (!res?.historyId) return;
    openAd({ placement, title: placement === "DOUBLE_SCORE" ? "Double your score" : "Double your coins", reward: placement === "DOUBLE_SCORE" ? `${res.score} → ${res.score * eco.double_score_multiplier} points` : `+${res.coinsEarned * (eco.double_coins_multiplier - 1)} bonus coins`, context: { history_id: res.historyId }, onGranted: (r) => {
      sfx("double"); void qc.invalidateQueries({ queryKey: ["me"] });
      setRun((cur) => (cur.result ? { ...cur, result: placement === "DOUBLE_SCORE" ? { ...cur.result, score: r.new_score ?? cur.result.score, doubledScore: true } : { ...cur.result, coinsEarned: cur.result.coinsEarned + r.coins_granted, doubledCoins: true } } : cur));
    } });
  };

  const hintsLeft = Math.max(0, eco.max_hints_per_level - run.hints);
  const boostersLeft = Math.max(0, eco.max_boosters_per_level - run.boosters);
  const present = legendFor(level);

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,#d4f1fb_0%,#dff5ee_45%,#d3f0e1_100%)] text-[#174b3a]">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-4 sm:px-5">
        <Link to="/levels" className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-sm font-bold shadow-sm backdrop-blur" data-testid="game-levels-link"><MapIcon size={16} /> <span className="hidden sm:inline">Forest map</span></Link>
        <div className="flex items-center gap-2">
          {user && <Link to="/dashboard" className="flex items-center gap-1.5 rounded-full bg-[#fff4cb] px-3 py-2 text-sm font-bold text-[#8c6914]" data-testid="game-coins-badge"><Coins size={16} /> {user.coins.toLocaleString()}</Link>}
          <AudioToggles />
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-12 sm:px-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-bold tracking-[.22em] text-[#4d9675]"><span data-testid="game-difficulty">{level.difficulty}</span> · <span className="rounded-full bg-white px-2 py-0.5 tracking-normal text-[#174b3a]" data-testid="game-mode-badge">{mode.emoji} {mode.label}</span></p>
              <h1 className="font-display mt-1 text-3xl font-bold sm:text-4xl" data-testid="game-level-title">{daily ? "Daily Challenge" : `Level ${String(level.id).padStart(2, "0")}`}</h1>
            </div>
            <div className="flex flex-wrap gap-2 text-sm font-bold">
              <Stat testid="game-moves" icon={<Footprints size={15} />} warn={limit - run.state.moves <= 3}>{run.state.moves}/{limit}</Stat>
              {run.timeLeft !== null && <Stat testid="game-timer" icon={<Clock size={15} />} warn={run.timeLeft <= 10}>{run.timeLeft}s</Stat>}
              <Stat testid="game-score" icon={<Sparkles size={15} className="text-[#e0a21b]" />}>{run.state.score}</Stat>
              <Stat testid="game-length" icon={<span className="h-3 w-3 rounded-full bg-[#4fb86a]" />}>{run.state.worm.length}</Stat>
            </div>
          </div>
          <div className="mx-auto max-w-[min(640px,calc(100vh-150px))]">
            <div key={run.shake} className={run.shake ? "animate-[shake_.35s_ease-in-out]" : ""}><Board level={level} state={run.state} hint={run.hint} danger={run.danger} onSwipe={move} fx={fx} colors={look.colors} hat={look.hat} reviving={reviving} /></div>
            <div className="mt-4 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
              <div className="flex gap-2">
                <IconBtn onClick={restart} testid="restart-button" label="Restart"><RotateCcw size={19} /></IconBtn>
                <IconBtn onClick={undo} testid="undo-button" label="Undo" disabled={!run.history.length || paused}><Undo2 size={19} /></IconBtn>
                <button onClick={() => setSheet("hint")} disabled={paused} className="flex items-center gap-1.5 rounded-2xl bg-[#ffdf78] px-3.5 py-3 font-bold shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-50" data-testid="hint-button"><Lightbulb size={18} /> Hint</button>
                <button onClick={() => setSheet("booster")} disabled={paused || run.state.shield} className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-3 font-bold shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-60 ${run.state.shield ? "bg-sky-200 text-sky-900" : "bg-white"}`} data-testid="booster-button"><Shield size={18} /> <span className="hidden sm:inline">{run.state.shield ? "Shield on" : "Booster"}</span></button>
              </div>
              <div className="grid grid-cols-3 gap-1.5" data-testid="dpad">
                <Arrow d="UP" onMove={move} className="col-start-2"><ArrowUp size={18} /></Arrow>
                <Arrow d="LEFT" onMove={move} className="col-start-1 row-start-2"><ArrowLeft size={18} /></Arrow>
                <Arrow d="DOWN" onMove={move} className="col-start-2 row-start-2"><ArrowDown size={18} /></Arrow>
                <Arrow d="RIGHT" onMove={move} className="col-start-3 row-start-2"><ArrowRight size={18} /></Arrow>
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-[#5d7c70]">Swipe on the board, use the arrows, or press arrow keys / WASD.</p>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.75rem] bg-[#174b3a] p-5 text-white shadow-xl" data-testid="mission-card">
            <p className="text-[11px] font-bold tracking-[.2em] text-[#a7dfb9]">THE MISSION · {mode.label.toUpperCase()}</p>
            <h2 className="font-display mt-1 text-xl font-bold leading-snug" data-testid="mission-objective">{objectiveText(level)}</h2>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#f1ae2d] transition-[width] duration-300" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 100}%` }} /></div>
            <div className="mt-2 flex justify-between text-sm"><span data-testid="mission-progress">{progress.done} / {progress.total}</span><span className={progress.met ? "font-bold text-[#9ff0b4]" : "text-[#b4e6c9]"} data-testid="portal-status">{progress.met ? "Portal open! 🌀" : "Portal sleeping"}</span></div>
            {run.state.shield && <p className="mt-3 flex items-center gap-2 rounded-xl bg-sky-300/20 px-3 py-2 text-sm text-sky-100" data-testid="shield-active"><Shield size={15} /> Magic shield active</p>}
          </div>
          <div className="rounded-[1.75rem] bg-white/90 p-5 shadow-sm backdrop-blur" data-testid="legend-card">
            <p className="text-[11px] font-bold tracking-[.2em] text-[#4d9675]">ON THIS PATH</p>
            <ul className="mt-3 space-y-2.5">{present.map((p) => <li key={p.name} className="flex items-center gap-3 text-sm"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#effaf4]">{p.icon}</span><span><b>{p.name}</b> <span className="text-[#5d7c70]">· {p.effect}</span></span></li>)}</ul>
          </div>
          <div className="rounded-[1.75rem] bg-white/90 p-5 text-sm shadow-sm">
            <p className="text-[11px] font-bold tracking-[.2em] text-[#4d9675]">SCORING</p>
            <ul className="mt-2 grid grid-cols-2 gap-1 text-[#40614f]"><li>Apple +10</li><li>Golden +50</li><li>Complete +100</li><li>Perfect +250</li></ul>
          </div>
        </aside>
      </section>

      {sheet === "hint" && (
        <ChoiceSheet title="Need a hint?" subtitle={hintSolvable ? `Reveal your next safe steps. ${hintsLeft} hint${hintsLeft === 1 ? "" : "s"} left on this level.` : "There's no safe route from here. Try Undo or Restart first."} icon={<Lightbulb className="text-[#e0a21b]" />} onClose={() => setSheet(null)} testid="hint-sheet"
          options={[
            { label: "Get free hint", sub: `Watch a short ${eco.short_ad_seconds}s rewarded ad`, onClick: askHintAd, disabled: !hintSolvable || hintsLeft === 0, testid: "hint-watch-ad-button", primary: true },
            { label: `Use ${eco.hint_cost} coins`, sub: user ? `You have ${user.coins} coins` : "Sign in to use coins", onClick: () => { setSheet(null); void spend("HINT", showHint); }, disabled: !user || user.coins < eco.hint_cost || !hintSolvable || hintsLeft === 0, testid: "hint-coins-button" },
          ]} />
      )}
      {sheet === "booster" && (
        <ChoiceSheet title="Magic shield booster" subtitle={`Blocks your next crash into a wall, thorns or your tail. ${boostersLeft} left on this level.`} icon={<Shield className="text-sky-600" />} onClose={() => setSheet(null)} testid="booster-sheet"
          options={[
            { label: "Watch ad for booster", sub: `Full ${eco.long_ad_seconds}s rewarded ad`, onClick: askBoosterAd, disabled: boostersLeft === 0, testid: "booster-watch-ad-button", primary: true },
            { label: `Use ${eco.booster_cost} coins`, sub: user ? `You have ${user.coins} coins` : "Sign in to use coins", onClick: () => { setSheet(null); void spend("BOOSTER", addShield); }, disabled: !user || user.coins < eco.booster_cost || boostersLeft === 0, testid: "booster-coins-button" },
          ]} />
      )}

      {run.status !== "playing" && !ad && (
        <GameOverlay daily={!!daily} status={run.status} reason={run.reason} level={level} result={run.result} eco={eco} user={user}
          canFreeRevive={run.freeRevives < eco.free_revives_per_level} canAdRevive={run.adRevives < eco.rewarded_revives_per_level} canExtra={run.extras < eco.max_extra_moves_per_level}
          onFreeRevive={() => revive("free")} onAdRevive={askRevive} onCoinRevive={() => void spend("REVIVE", () => revive("paid"))} onExtra={askExtra}
          onDouble={askDouble} onRetry={restart} onNext={() => navigate(`/game/${level.id + 1}`)} onMap={() => navigate("/levels")} />
      )}
      {ad && <RewardAdModal placement={ad.placement} title={ad.title} reward={ad.reward} context={ad.context} isGuest={!user} onClose={() => setAd(null)} onGranted={(r) => { setAd(null); ad.onGranted(r); r.new_achievements?.forEach((n) => { sfx("achievement"); toast.success(`Achievement unlocked: ${n}!`, { icon: "🏅" }); }); }} />}
    </main>
  );
}

function legendFor(level: Level) {
  const out: { name: string; effect: string; icon: React.ReactNode }[] = [];
  const kinds = [...new Set(level.items.map((i) => i.kind))];
  kinds.forEach((kind) => out.push({ ...ITEM_INFO[kind], icon: <ItemIcon kind={kind} size={24} /> }));
  if (level.walls.length) out.push({ ...TILE_INFO.wall, icon: <span>🪨</span> });
  if (level.spikes.length) out.push({ ...TILE_INFO.spike, icon: <span className="flex h-6 w-6 items-center justify-center"><Spikes /></span> });
  if (level.pits.length) out.push({ ...TILE_INFO.pit, icon: <span className="h-5 w-5 rounded-full bg-[radial-gradient(circle,#4a3322_35%,#7a5a3c_75%)]" /> });
  if (level.gates.length) out.push({ ...TILE_INFO.gate, icon: <span>🔒</span> });
  if (level.logs.length) out.push({ ...TILE_INFO.log, icon: <span className="h-5 w-5 rounded-full border-2 border-[#5e3b1c] bg-[#b98149]" /> });
  if (level.teleporters.length) out.push({ ...TILE_INFO.teleporter, icon: <span className="h-5 w-5 rounded-full border-4 border-dotted border-[#2f8fd0]" /> });
  out.push({ ...TILE_INFO.portal, icon: <span>🌀</span> });
  return out.filter((o, i) => out.findIndex((x) => x.name === o.name) === i && (o.name !== "Apple" || level.items.some((it) => isApple(it.kind))));
}

function Stat({ children, icon, testid, warn }: { children: React.ReactNode; icon: React.ReactNode; testid: string; warn?: boolean }) {
  return <span className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 shadow-sm transition-colors ${warn ? "bg-[#ffe1d6] text-[#a0401c]" : "bg-white"}`} data-testid={testid}>{icon}{children}</span>;
}
function IconBtn({ children, onClick, testid, label, disabled }: { children: React.ReactNode; onClick: () => void; testid: string; label: string; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} title={label} aria-label={label} className="rounded-2xl bg-white p-3 shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-40" data-testid={testid}>{children}</button>;
}
function Arrow({ d, onMove, className, children }: { d: Dir; onMove: (d: Dir) => void; className: string; children: React.ReactNode }) {
  return <button onClick={() => onMove(d)} data-sfx="none" aria-label={`Move ${d.toLowerCase()}`} className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm transition-transform active:scale-90 sm:h-12 sm:w-12 ${className}`} data-testid={`move-${d.toLowerCase()}-button`}>{children}</button>;
}


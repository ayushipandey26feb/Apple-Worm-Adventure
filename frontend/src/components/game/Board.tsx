import { useRef } from "react";
import { type Cell, type Dir, type GameState, type Level, k, logPositions, objectiveProgress, same } from "@/lib/engine";
import { ItemIcon, Spikes } from "./Icons";
import { Burst } from "@/components/fx";

export type Fx = { id: number; x: number; y: number; text: string; color: string };

type Props = { level: Level; state: GameState; hint: Cell[]; danger: Cell[]; onSwipe: (d: Dir) => void; fx?: Fx[]; colors?: string[]; hat?: string | null; reviving?: boolean };

export function Board({ level, state, hint, danger, onSwipe, fx = [], colors = ["#4fb86a", "#5cc777"], hat = null, reviving = false }: Props) {
  const touch = useRef<{ x: number; y: number } | null>(null);
  const { cols, rows } = level;
  const walls = new Set(level.walls.map(k)), spikes = new Set(level.spikes.map(k)), pits = new Set(level.pits.map(k)), gates = new Set(level.gates.map(k));
  const tele = new Map<number, number>(); level.teleporters.forEach(([a, b], i) => { tele.set(k(a), i); tele.set(k(b), i); });
  const items = new Map(level.items.filter((i) => !state.eaten.includes(i.id)).map((i) => [k(i), i]));
  const hintAt = new Map(hint.map((c, i) => [k(c), i]));
  const dangerSet = new Set(danger.map(k));
  const portalOpen = objectiveProgress(level, state).met;
  const logs = logPositions(level, state.moves);
  const pos = (c: Cell) => ({ left: `${(c.x / cols) * 100}%`, top: `${(c.y / rows) * 100}%`, width: `${100 / cols}%`, height: `${100 / rows}%` });
  const head = state.worm[state.worm.length - 1];
  const neck = state.worm[state.worm.length - 2] ?? head;
  const rot = head.x > neck.x ? 0 : head.x < neck.x ? 180 : head.y > neck.y ? 90 : head.y < neck.y ? -90 : 0;

  const end = (e: React.TouchEvent) => {
    const s = touch.current; const t = e.changedTouches[0]; touch.current = null;
    if (!s || !t) return; const dx = t.clientX - s.x, dy = t.clientY - s.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    onSwipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "RIGHT" : "LEFT") : dy > 0 ? "DOWN" : "UP");
  };

  return (
    <div className={`relative w-full touch-none select-none rounded-[2rem] border-[6px] border-[#7fcfa8] bg-gradient-to-br from-[#bfeaf7] via-[#c4efd9] to-[#a9e0c4] p-2 shadow-[0_24px_50px_-18px_rgba(23,75,58,.45)] sm:border-8 sm:p-3`}
      onTouchStart={(e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; }} onTouchEnd={end} data-testid="game-board">
      <div className="relative w-full" style={{ aspectRatio: `${cols} / ${rows}` }}>
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
          {Array.from({ length: cols * rows }, (_, i) => {
            const c = { x: i % cols, y: Math.floor(i / cols) }; const ck = k(c);
            const item = items.get(ck); const h = hintAt.get(ck);
            const base = (c.x + c.y) % 2 ? "bg-[#c9f0dc]" : "bg-[#d6f5e6]";
            return (
              <div key={ck} className="relative p-[3px]" data-testid={`tile-${c.x}-${c.y}`}>
                <div className={`relative flex h-full w-full items-center justify-center rounded-[22%] ${walls.has(ck) ? "bg-gradient-to-b from-[#7d918a] to-[#55685f] shadow-[inset_0_-4px_0_rgba(0,0,0,.18)]" : pits.has(ck) ? "bg-[radial-gradient(circle,#4a3322_35%,#7a5a3c_75%)]" : spikes.has(ck) ? "bg-[#f4dccf]" : base} ${dangerSet.has(ck) ? "ring-4 ring-red-400/80 animate-pulse" : ""}`}>
                  {walls.has(ck) && <span className="text-[min(4.2vw,26px)] opacity-80">🪨</span>}
                  {spikes.has(ck) && <Spikes />}
                  {gates.has(ck) && <span className={`flex h-[86%] w-[86%] items-center justify-center rounded-lg border-[3px] text-[min(3.6vw,20px)] transition-opacity duration-500 ${state.hasKey ? "border-dashed border-[#c99a5b]/50 opacity-40" : "border-[#8a5a2b] bg-[repeating-linear-gradient(90deg,#b77b43_0_6px,#9a6334_6px_9px)]"}`} data-testid="gate-tile">{state.hasKey ? "" : "🔒"}</span>}
                  {tele.has(ck) && <span className="h-[72%] w-[72%] animate-[spin_3s_linear_infinite] rounded-full border-4 border-dotted border-[#2f8fd0] bg-[#d3efff]" />}
                  {same(c, level.portal) && <span className={`text-[min(6vw,34px)] ${portalOpen ? "animate-[spin_2.4s_linear_infinite,glow_1.4s_ease-in-out_infinite]" : "opacity-40 grayscale"}`} data-testid="portal-tile">🌀</span>}
                  {item && <span className={item.kind === "key" || item.kind === "rescue" ? "" : "animate-[bob_2.2s_ease-in-out_infinite]"}><ItemIcon kind={item.kind} size={Math.min(34, 260 / cols)} /></span>}
                  {h !== undefined && <span className="absolute inset-[18%] z-[5] flex items-center justify-center rounded-full border-2 border-[#e0a21b] bg-[#ffd75e] text-[11px] font-black text-[#6b4300] shadow-[0_0_12px_rgba(241,174,45,.9)] animate-pulse" data-testid="hint-step">{h + 1}</span>}
                </div>
              </div>
            );
          })}
        </div>
        {logs.map((c, i) => <div key={`log-${i}`} className="absolute z-10 flex items-center justify-center transition-[left,top] duration-200 ease-out" style={pos(c)} data-testid="log-block"><div className="h-[82%] w-[82%] rounded-full border-2 border-[#5e3b1c] bg-[repeating-radial-gradient(circle,#b98149_0_3px,#8f5d2d_3px_5px)] shadow-md" /></div>)}
        {state.worm.map((_, i) => {
          const seg = state.worm[state.worm.length - 1 - i]; const isHead = i === 0;
          const scale = isHead ? 0.92 : Math.max(0.62, 0.84 - i * 0.015);
          const color = colors[i % colors.length];
          return (
            <div key={i} className={`absolute z-20 flex items-center justify-center rounded-full transition-[left,top] duration-150 ease-out ${reviving && isHead ? "animate-[revive_.8s_ease-out_3]" : ""}`} style={pos(seg)} data-testid={isHead ? "worm-head" : "worm-segment"}>
              <div className={`relative rounded-full border-2 border-black/20 animate-[grow_.35s_ease-out] ${state.shield && isHead ? "ring-4 ring-sky-300 shadow-[0_0_14px_rgba(125,211,252,.9)]" : ""}`} style={{ width: `${scale * 100}%`, height: `${scale * 100}%`, background: isHead ? `radial-gradient(circle at 35% 30%, #ffffff66, ${color} 55%)` : color, transform: isHead ? `rotate(${rot}deg)` : undefined }}>
                {isHead && <><span className="absolute right-[14%] top-[16%] h-[28%] w-[28%] rounded-full bg-white"><span className="absolute right-[15%] top-[25%] h-1/2 w-1/2 rounded-full bg-[#173b2a]" /></span><span className="absolute bottom-[16%] right-[14%] h-[28%] w-[28%] rounded-full bg-white"><span className="absolute right-[15%] top-[25%] h-1/2 w-1/2 rounded-full bg-[#173b2a]" /></span>{!hat && <span className="absolute -left-[6%] top-[-14%] h-[22%] w-[22%] rounded-full bg-[#f1ae2d]" />}</>}
                {!isHead && <span className="absolute left-1/2 top-[18%] h-[22%] w-[22%] -translate-x-1/2 rounded-full bg-white/40" />}
              </div>
              {isHead && hat && <span className="pointer-events-none absolute -top-[38%] left-1/2 -translate-x-1/2 text-[min(5vw,26px)] drop-shadow" data-testid="worm-hat">{hat}</span>}
            </div>
          );
        })}
        {fx.map((f) => (
          <div key={f.id} className="pointer-events-none absolute z-30" style={pos(f)}>
            <Burst count={10} spread={34} size={6} colors={[f.color, "#fff3b0", "#ffffff"]} />
            <span className="absolute left-1/2 top-0 whitespace-nowrap rounded-full px-1.5 text-sm font-black animate-[floatup_.9s_ease-out_forwards] [text-shadow:0_1px_0_#fff]" style={{ color: f.color }} data-testid="fx-float">{f.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

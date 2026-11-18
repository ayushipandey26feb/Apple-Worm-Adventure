// 50 data-driven levels. Layouts are generated from a fixed seed per level and only published
// once the solver proves them solvable, so every visit to level N is identical and beatable.
import { type Cell, type Difficulty, type Item, type ItemKind, type Level, type Mode, initialState, k, solve } from "@/lib/engine";

export const LEVEL_COUNT = 50;
export type { Level } from "@/lib/engine";

const MODE_CYCLE: Mode[] = ["classic", "collection", "key", "length", "timed", "rescue", "limited"];
// Levels 1-10 introduce each mode once (tutorial order); afterwards they rotate so neighbours differ.
const INTRO: Mode[] = ["classic", "classic", "collection", "length", "classic", "key", "rescue", "limited", "timed", "classic"];

export const MODE_INFO: Record<Mode, { label: string; emoji: string; blurb: string }> = {
  classic: { label: "Classic", emoji: "🍎", blurb: "Eat every apple, then reach the portal." },
  collection: { label: "Collection", emoji: "🧺", blurb: "Collect the required number of apples." },
  length: { label: "Length", emoji: "📏", blurb: "Grow your worm to a target length." },
  rescue: { label: "Rescue", emoji: "🐞", blurb: "Rescue every lost ladybug." },
  key: { label: "Key & Gate", emoji: "🔑", blurb: "Grab the key to open the gates." },
  limited: { label: "Limited moves", emoji: "👣", blurb: "Finish within a tight move limit." },
  timed: { label: "Timed", emoji: "⏱️", blurb: "Beat the clock — time apples help!" },
};

export function levelMeta(id: number): { id: number; mode: Mode; difficulty: Difficulty; tier: number } {
  const tier = Math.min(4, Math.floor((id - 1) / 10));
  const mode = id <= 10 ? INTRO[id - 1] : MODE_CYCLE[(id * 3) % MODE_CYCLE.length];
  return { id, mode, tier, difficulty: (["BEGINNER", "EASY", "MEDIUM", "HARD", "EXPERT"] as Difficulty[])[tier] };
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

type Meta = { mode: Mode; tier: number; difficulty: Difficulty };
function build(id: number, seed: number, override?: Meta): Level | null {
  const { mode, tier, difficulty } = override ?? levelMeta(id);
  const r = rng(seed);
  const int = (n: number) => Math.floor(r() * n);
  const size = [7, 8, 9, 9, 10][tier];
  const cols = size, rows = size;
  const taken = new Set<number>();
  const free = (c: Cell) => c.x >= 0 && c.y >= 0 && c.x < cols && c.y < rows && !taken.has(k(c));
  const pick = (minDistFrom?: Cell, dist = 0): Cell | null => {
    for (let i = 0; i < 200; i++) {
      const c = { x: int(cols), y: int(rows) };
      if (free(c) && (!minDistFrom || Math.abs(c.x - minDistFrom.x) + Math.abs(c.y - minDistFrom.y) >= dist)) return c;
    }
    return null;
  };

  // Worm starts horizontally, facing right, with breathing room ahead.
  const len = tier === 0 ? 2 : 3;
  const wy = 1 + int(rows - 2), wx = int(Math.max(1, cols - len - 3));
  const worm = Array.from({ length: len }, (_, i) => ({ x: wx + i, y: wy }));
  worm.forEach((c) => taken.add(k(c)));
  const head = worm[len - 1];
  [1, 2].forEach((d) => taken.add(k({ x: head.x + d, y: head.y })));

  const portal = pick(head, Math.floor(size * 0.8));
  if (!portal) return null;
  taken.add(k(portal));
  const gates: Cell[] = [];
  if (mode === "key") {
    for (const d of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
      const g = { x: portal.x + d.x, y: portal.y + d.y };
      if (free(g)) { gates.push(g); taken.add(k(g)); }
    }
  }

  const items: Item[] = [];
  const addItem = (kind: ItemKind) => { const c = pick(); if (c) { items.push({ ...c, id: items.length + 1, kind }); taken.add(k(c)); } };
  const appleCount = 2 + tier + (id % 3 === 0 ? 1 : 0) + (mode === "collection" ? 2 : 0);
  const kinds: ItemKind[] = [];
  if (id >= 5) kinds.push("golden");
  if (id >= 8 || mode === "length") kinds.push("mega");
  if (id >= 12) kinds.push("mystery");
  if (mode === "timed") kinds.push("time", "time");
  if (mode === "rescue") { for (let i = 0; i < 2 + Math.min(tier, 2); i++) addItem("rescue"); }
  for (let i = 0; i < (mode === "rescue" ? 2 : appleCount); i++) addItem(kinds[i] ?? "normal");
  if (mode === "key") addItem("key");

  const scatter = (count: number, list: Cell[]) => { for (let i = 0; i < count; i++) { const c = pick(); if (c) { list.push(c); taken.add(k(c)); } } };
  const walls: Cell[] = [];
  const wallRuns = id === 1 ? 0 : 1 + tier + int(2);
  for (let i = 0; i < wallRuns; i++) {
    const start = pick(); if (!start) continue;
    const horizontal = r() < 0.5; const length = 1 + int(3);
    for (let j = 0; j < length; j++) { const c = horizontal ? { x: start.x + j, y: start.y } : { x: start.x, y: start.y + j }; if (free(c)) { walls.push(c); taken.add(k(c)); } }
  }
  const spikes: Cell[] = []; scatter(id >= 4 ? tier + 1 + int(2) : 0, spikes);
  const pits: Cell[] = []; scatter(id >= 11 ? tier + int(2) : 0, pits);

  const logs: Cell[][] = [];
  const logCount = id >= 16 ? (tier >= 3 ? 2 : 1) : 0;
  for (let i = 0; i < logCount; i++) {
    for (let tries = 0; tries < 40; tries++) {
      const start = pick(); if (!start) break;
      const horizontal = r() < 0.5;
      const path = [0, 1, 2].map((j) => (horizontal ? { x: start.x + j, y: start.y } : { x: start.x, y: start.y + j }));
      if (path.every(free)) { logs.push(path); path.forEach((c) => taken.add(k(c))); break; }
    }
  }
  const teleporters: [Cell, Cell][] = [];
  if (id >= 24) { const a = pick(); if (a) { taken.add(k(a)); const b = pick(a, Math.floor(size * 0.7)); if (b) { taken.add(k(b)); teleporters.push([a, b]); } } }

  const apples = items.filter((i) => i.kind !== "key" && i.kind !== "rescue");
  const target = mode === "collection" ? Math.max(2, apples.length - 2) : mode === "length" ? len + Math.max(3, Math.floor(apples.reduce((n, a) => n + (a.kind === "mega" ? 3 : 1), 0) * 0.75)) : null;
  const draft: Level = { id, difficulty, mode, rows, cols, worm, items, portal, walls, spikes, pits, gates, logs, teleporters, par: 0, moveLimit: 100000, timeLimit: null, target };
  const solution = solve(draft, initialState(draft));
  if (!solution || solution.length < Math.min(6 + tier * 3, 8 + id)) return null;
  const par = solution.length;
  const moveLimit = mode === "limited" ? par + Math.max(2, 6 - tier) : Math.ceil(par * (2 - tier * 0.15)) + 8;
  const timeLimit = mode === "timed" ? Math.ceil(par * (1.7 - tier * 0.1)) + 12 : null;
  return { ...draft, par, moveLimit, timeLimit };
}

const built = new Map<number, Level>();
export function getLevel(id: number): Level {
  const safe = Math.min(LEVEL_COUNT, Math.max(1, Math.floor(id) || 1));
  let level = built.get(safe);
  if (!level) {
    for (let attempt = 0; attempt < 400 && !level; attempt++) level = build(safe, safe * 7919 + attempt * 104729) ?? undefined;
    if (!level) throw new Error(`Level ${safe} could not be generated`);
    built.set(safe, level);
  }
  return level;
}

/** Daily challenge: one puzzle per server date, same for every player. Uses level id 0. */
const dailyCache = new Map<string, Level>();
export function getDailyLevel(date: string): Level {
  let level = dailyCache.get(date);
  if (level) return level;
  const h = [...date].reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 7);
  const modes: Mode[] = ["collection", "classic", "rescue", "key", "length", "limited"];
  const meta: Meta = { mode: modes[h % modes.length], tier: 1 + (h % 2), difficulty: h % 2 ? "MEDIUM" : "EASY" };
  for (let attempt = 0; attempt < 400 && !level; attempt++) level = build(26, h + attempt * 104729, meta) ?? undefined;
  if (!level) throw new Error("Daily level could not be generated");
  level = { ...level, id: 0 };
  dailyCache.set(date, level);
  return level;
}

export function objectiveText(level: Level): string {
  const bugs = level.items.filter((i) => i.kind === "rescue").length;
  switch (level.mode) {
    case "collection": return `Collect ${level.target} apples, then reach the portal.`;
    case "length": return `Grow to ${level.target} segments long, then reach the portal.`;
    case "rescue": return `Rescue all ${bugs} lost ladybugs, then reach the portal.`;
    case "key": return "Grab the key to unlock the gates, eat every apple, then reach the portal.";
    case "limited": return `Eat every apple and reach the portal within ${level.moveLimit} moves.`;
    case "timed": return `Beat the clock! Eat every apple and reach the portal in ${level.timeLimit}s.`;
    default: return "Eat every apple, then slide into the portal.";
  }
}

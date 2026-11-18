// Pure game rules: one step() function used by the game, the level generator and the hint solver,
// so every published level is proven solvable by the exact same rules the player plays with.

export type Cell = { x: number; y: number };
export type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";
export type AppleKind = "normal" | "golden" | "mega" | "mystery" | "time";
export type ItemKind = AppleKind | "key" | "rescue";
export type Item = Cell & { id: number; kind: ItemKind };
export type Mode = "classic" | "collection" | "length" | "rescue" | "key" | "limited" | "timed";
export type Difficulty = "BEGINNER" | "EASY" | "MEDIUM" | "HARD" | "EXPERT";
export type MysteryEffect = "grow" | "shrink" | "bonus" | "shield";

export type Level = {
  id: number; difficulty: Difficulty; mode: Mode; rows: number; cols: number;
  worm: Cell[]; items: Item[]; portal: Cell;
  walls: Cell[]; spikes: Cell[]; pits: Cell[]; gates: Cell[]; logs: Cell[][]; teleporters: [Cell, Cell][];
  par: number; moveLimit: number; timeLimit: number | null; target: number | null;
};

export type GameState = {
  worm: Cell[]; pending: number; eaten: number[]; moves: number; hasKey: boolean; shield: boolean;
  score: number; applesEaten: number; golden: number; bonusMoves: number; bonusSeconds: number;
};

export type GameEvent = "move" | "teleport" | "apple" | "golden" | "mega" | "mystery" | "time" | "key" | "rescue" | "shield";
export type Outcome = "moved" | "blocked" | "dead" | "won" | "outOfMoves";
export type StepResult = { outcome: Outcome; state: GameState; events: GameEvent[]; reason?: string; mystery?: MysteryEffect };

export const DIRS: Record<Dir, Cell> = { UP: { x: 0, y: -1 }, DOWN: { x: 0, y: 1 }, LEFT: { x: -1, y: 0 }, RIGHT: { x: 1, y: 0 } };
export const DIR_LIST: Dir[] = ["UP", "RIGHT", "DOWN", "LEFT"];
export const SCORE = { apple: 10, golden: 50, rescue: 10, completion: 100, perfect: 250, noRevive: 50, perMoveLeft: 2 };
export const TIME_APPLE_SECONDS = 8;
export const MYSTERY_BONUS_MOVES = 3;
export const MYSTERY_BONUS_SECONDS = 10;

export const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
export const k = (c: Cell) => c.y * 100 + c.x;
export const isApple = (kind: ItemKind): kind is AppleKind => kind !== "key" && kind !== "rescue";

/** Mystery apples trigger one of a fixed set of effects, chosen deterministically per level+apple. */
export function mysteryEffect(levelId: number, itemId: number): MysteryEffect {
  const effects: MysteryEffect[] = ["grow", "bonus", "shield", "shrink"];
  return effects[(levelId * 7 + itemId * 3) % effects.length];
}

type Index = { walls: Set<number>; spikes: Set<number>; pits: Set<number>; gates: Set<number>; tele: Map<number, Cell>; items: Map<number, Item> };
const cache = new WeakMap<object, Index>();
function index(level: Level): Index {
  let idx = cache.get(level.items);
  if (!idx) {
    const tele = new Map<number, Cell>();
    level.teleporters.forEach(([a, b]) => { tele.set(k(a), b); tele.set(k(b), a); });
    idx = { walls: new Set(level.walls.map(k)), spikes: new Set(level.spikes.map(k)), pits: new Set(level.pits.map(k)), gates: new Set(level.gates.map(k)), tele, items: new Map(level.items.map((i) => [k(i), i])) };
    cache.set(level.items, idx);
  }
  return idx;
}

/** Rolling logs ping-pong along their path, one tile per move. */
export function logPositions(level: Level, time: number): Cell[] {
  return level.logs.map((path) => {
    const cycle = path.length < 2 ? [0] : [...path.keys(), ...[...path.keys()].slice(1, -1).reverse()];
    return path[cycle[time % cycle.length]];
  });
}

export function initialState(level: Level): GameState {
  return { worm: level.worm.map((c) => ({ ...c })), pending: 0, eaten: [], moves: 0, hasKey: false, shield: false, score: 0, applesEaten: 0, golden: 0, bonusMoves: 0, bonusSeconds: 0 };
}

export function objectiveProgress(level: Level, s: GameState): { done: number; total: number; met: boolean } {
  const apples = level.items.filter((i) => isApple(i.kind));
  const eatenApples = apples.filter((a) => s.eaten.includes(a.id)).length;
  switch (level.mode) {
    case "collection": return { done: Math.min(s.applesEaten, level.target ?? 0), total: level.target ?? 0, met: s.applesEaten >= (level.target ?? 0) };
    case "length": { const len = s.worm.length + s.pending; return { done: Math.min(len, level.target ?? 0), total: level.target ?? 0, met: len >= (level.target ?? 0) }; }
    case "rescue": { const bugs = level.items.filter((i) => i.kind === "rescue"); const got = bugs.filter((b) => s.eaten.includes(b.id)).length; return { done: got, total: bugs.length, met: got === bugs.length }; }
    case "key": return { done: eatenApples + (s.hasKey ? 1 : 0), total: apples.length + 1, met: s.hasKey && eatenApples === apples.length };
    default: return { done: eatenApples, total: apples.length, met: eatenApples === apples.length };
  }
}

const DEATH: Record<string, string> = { edge: "You bumped the forest edge!", wall: "Ouch! You crashed into a stone wall.", spike: "Prickly thorns got you!", self: "Tangled! You bit your own tail." };

export function step(level: Level, s: GameState, dir: Dir): StepResult {
  const idx = index(level);
  const head = s.worm[s.worm.length - 1];
  const d = DIRS[dir];
  let next = { x: head.x + d.x, y: head.y + d.y };
  const time = s.moves + 1;
  const logs = new Set(logPositions(level, time).map(k));
  const inside = (c: Cell) => c.x >= 0 && c.y >= 0 && c.x < level.cols && c.y < level.rows;
  const blocked = (reason: string): StepResult => ({ outcome: "blocked", state: s, events: [], reason });

  let teleported = false;
  if (inside(next)) {
    if (idx.pits.has(k(next))) return blocked("Sticky mud pit — find another way around.");
    if (idx.gates.has(k(next)) && !s.hasKey) return blocked("The gate is locked. Find the key first!");
    if (logs.has(k(next))) return blocked("A rolling log is in the way — wait for it to pass.");
    const dest = idx.tele.get(k(next));
    if (dest) {
      if (logs.has(k(dest)) || idx.pits.has(k(dest)) || s.worm.some((c) => same(c, dest))) return blocked("The teleporter exit is blocked right now.");
      next = dest; teleported = true;
    }
  }
  const fatal = !inside(next) ? "edge" : idx.walls.has(k(next)) ? "wall" : idx.spikes.has(k(next)) ? "spike" : s.worm.some((c) => same(c, next)) ? "self" : null;
  if (fatal) {
    if (s.shield) return { outcome: "blocked", state: { ...s, shield: false }, events: ["shield"], reason: "Your magic shield saved you!" };
    return { outcome: "dead", state: s, events: [], reason: DEATH[fatal] };
  }

  const ns: GameState = { ...s, worm: [...s.worm, next], eaten: [...s.eaten], moves: time };
  const events: GameEvent[] = [teleported ? "teleport" : "move"];
  let mystery: MysteryEffect | undefined;
  let shrink = false;
  const item = idx.items.get(k(next));
  if (item && !s.eaten.includes(item.id)) {
    ns.eaten.push(item.id);
    if (isApple(item.kind)) { ns.applesEaten += 1; ns.score += item.kind === "golden" ? SCORE.golden : SCORE.apple; }
    switch (item.kind) {
      case "normal": ns.pending += 1; events.push("apple"); break;
      case "golden": ns.pending += 1; ns.golden += 1; events.push("golden"); break;
      case "mega": ns.pending += 3; events.push("mega"); break;
      case "time": ns.pending += 1; ns.bonusSeconds += TIME_APPLE_SECONDS; events.push("time"); break;
      case "mystery":
        mystery = mysteryEffect(level.id, item.id); events.push("mystery");
        if (mystery === "grow") ns.pending += 2;
        else if (mystery === "shrink") shrink = true;
        else if (mystery === "shield") ns.shield = true;
        else if (level.mode === "timed") ns.bonusSeconds += MYSTERY_BONUS_SECONDS;
        else ns.bonusMoves += MYSTERY_BONUS_MOVES;
        break;
      case "key": ns.hasKey = true; events.push("key"); break;
      case "rescue": ns.score += SCORE.rescue; events.push("rescue"); break;
    }
  }
  if (ns.pending > 0) ns.pending -= 1; else ns.worm.shift();
  if (shrink && ns.worm.length > 2) ns.worm.shift();

  if (same(next, level.portal) && objectiveProgress(level, ns).met) return { outcome: "won", state: ns, events, mystery };
  if (ns.moves >= level.moveLimit + ns.bonusMoves) return { outcome: "outOfMoves", state: ns, events, mystery };
  return { outcome: "moved", state: ns, events, mystery };
}

// ---------- Solver: greedy BFS between targets with small backtracking, verified by step() ----------

function remainingTargets(level: Level, s: GameState): Item[] {
  const open = level.items.filter((i) => !s.eaten.includes(i.id));
  const apples = open.filter((i) => isApple(i.kind));
  const p = objectiveProgress(level, s);
  switch (level.mode) {
    case "collection": case "length": return p.met ? [] : apples;
    case "rescue": return open.filter((i) => i.kind === "rescue");
    case "key": return [...apples, ...open.filter((i) => i.kind === "key")];
    default: return apples;
  }
}

function bfs(level: Level, s: GameState, goal: Cell, avoid: Set<number>): Dir[] | null {
  const idx = index(level);
  const start = s.worm[s.worm.length - 1];
  const bodyAt = new Map(s.worm.map((c, i) => [k(c), i]));
  const prev = new Map<number, { from: number; dir: Dir }>();
  const seen = new Set([k(start)]);
  let frontier: Cell[] = [start];
  for (let dist = 0; frontier.length && dist < 120; dist++) {
    const t = dist + 1;
    const logs = new Set(logPositions(level, s.moves + t).map(k));
    const removedBefore = Math.max(0, t - 1 - s.pending);
    const nextFrontier: Cell[] = [];
    for (const cell of frontier) {
      for (const dir of DIR_LIST) {
        let n = { x: cell.x + DIRS[dir].x, y: cell.y + DIRS[dir].y };
        if (n.x < 0 || n.y < 0 || n.x >= level.cols || n.y >= level.rows) continue;
        const bad = (c: Cell) => idx.walls.has(k(c)) || idx.spikes.has(k(c)) || idx.pits.has(k(c)) || logs.has(k(c)) || (!s.hasKey && idx.gates.has(k(c)));
        if (bad(n)) continue;
        const dest = idx.tele.get(k(n));
        if (dest) { if (bad(dest)) continue; n = dest; }
        const nk = k(n);
        const bi = bodyAt.get(nk);
        if (seen.has(nk) || (bi !== undefined && bi >= removedBefore)) continue;
        if (avoid.has(nk) && !same(n, goal)) continue;
        seen.add(nk); prev.set(nk, { from: k(cell), dir });
        if (same(n, goal)) {
          const path: Dir[] = []; let cur = nk;
          while (cur !== k(start)) { const p = prev.get(cur)!; path.unshift(p.dir); cur = p.from; }
          return path;
        }
        nextFrontier.push(n);
      }
    }
    frontier = nextFrontier;
  }
  return null;
}

function replay(level: Level, s: GameState, path: Dir[]): { state: GameState; won: boolean } | null {
  let cur = s;
  for (let i = 0; i < path.length; i++) {
    const r = step(level, cur, path[i]);
    if (r.outcome === "won") return i === path.length - 1 ? { state: r.state, won: true } : null;
    if (r.outcome !== "moved") return null;
    cur = r.state;
  }
  return { state: cur, won: false };
}

/** Returns a full move list that wins from state `s`, or null. Ignores the move limit. */
export function solve(level: Level, s: GameState, budget = 250): Dir[] | null {
  const free = { ...level, moveLimit: 100000 };
  let calls = 0;
  const dfs = (cur: GameState, depth: number): Dir[] | null => {
    if (++calls > budget || depth > 30) return null;
    const targets = remainingTargets(free, cur);
    const blockers = new Set([...free.items.filter((i) => !cur.eaten.includes(i.id)).map(k), k(free.portal)]);
    if (!targets.length) {
      blockers.delete(k(free.portal));
      const path = bfs(free, cur, free.portal, blockers);
      const r = path && replay(free, cur, path);
      return r && r.won ? path : null;
    }
    const head = cur.worm[cur.worm.length - 1];
    const ranked = [...targets].sort((a, b) => Math.abs(a.x - head.x) + Math.abs(a.y - head.y) - (Math.abs(b.x - head.x) + Math.abs(b.y - head.y))).slice(0, 3);
    for (const t of ranked) {
      const path = bfs(free, cur, t, blockers);
      if (!path) continue;
      const r = replay(free, cur, path);
      if (!r || r.won) continue;
      const rest = dfs(r.state, depth + 1);
      if (rest) return [...path, ...rest];
    }
    return null;
  };
  return dfs(s, 0);
}

/** Cells the worm head will visit following a move list (for drawing the hint route). */
export function routeCells(level: Level, s: GameState, path: Dir[], limit: number): Cell[] {
  const cells: Cell[] = []; let cur = s;
  for (const dir of path.slice(0, limit)) {
    const r = step({ ...level, moveLimit: 100000 }, cur, dir);
    if (r.outcome !== "moved" && r.outcome !== "won") break;
    cur = r.state; cells.push(cur.worm[cur.worm.length - 1]);
  }
  return cells;
}

export function starsFor(level: Level, moves: number, revives: number): number {
  let stars = 3;
  if (moves > Math.ceil(level.par * 1.35)) stars--;
  if (moves > Math.ceil(level.par * 1.9)) stars--;
  if (revives > 0) stars--;
  return Math.max(1, stars);
}

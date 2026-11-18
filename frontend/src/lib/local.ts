// Local (offline / guest) storage: unlocked levels, per-level stars, a guest id and an outbox
// of progress saves made while offline, flushed to the server once the connection is back.
import { apiPost } from "./api";
import type { ProgressIn } from "./types";

const UNLOCK = "apple-worm-unlocked";
const STARS = "apple-worm-stars";
const GUEST = "apple-worm-guest";
const OUTBOX = "apple-worm-outbox";

const read = <T,>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) || "") as T; } catch { return fallback; } };

export function guestId(): string {
  let id = localStorage.getItem(GUEST);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(GUEST, id); }
  return id;
}

export const localUnlocked = () => Math.min(50, Math.max(1, Number(localStorage.getItem(UNLOCK) || 1)));
export const localStars = (): Record<number, number> => read(STARS, {});

export function recordLocalClear(levelId: number, stars: number) {
  localStorage.setItem(UNLOCK, String(Math.max(localUnlocked(), Math.min(50, levelId + 1))));
  const all = localStars(); all[levelId] = Math.max(all[levelId] ?? 0, stars);
  localStorage.setItem(STARS, JSON.stringify(all));
}

export function queueProgress(body: ProgressIn) {
  const box = read<ProgressIn[]>(OUTBOX, []); box.push(body);
  localStorage.setItem(OUTBOX, JSON.stringify(box.slice(-50)));
}

export async function flushOutbox(): Promise<number> {
  const box = read<ProgressIn[]>(OUTBOX, []);
  if (!box.length || !navigator.onLine) return 0;
  const left: ProgressIn[] = []; let sent = 0;
  for (const body of box) {
    try { await apiPost("/progress", body); sent++; } catch { left.push(body); }
  }
  localStorage.setItem(OUTBOX, JSON.stringify(left));
  return sent;
}

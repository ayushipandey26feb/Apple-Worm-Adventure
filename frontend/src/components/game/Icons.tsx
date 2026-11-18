import type { ItemKind } from "@/lib/engine";

const COLORS: Record<string, { body: string; shade: string }> = {
  normal: { body: "#e5483b", shade: "#b52b22" },
  golden: { body: "#f7c62f", shade: "#d99a0b" },
  mega: { body: "#d2302f", shade: "#8f1c1c" },
  mystery: { body: "#22b3a0", shade: "#137a6c" },
  time: { body: "#3ba3e6", shade: "#1f6fae" },
};

export const ITEM_INFO: Record<ItemKind, { name: string; effect: string }> = {
  normal: { name: "Apple", effect: "+1 segment · +10 pts" },
  golden: { name: "Golden apple", effect: "+50 pts · +10 coins" },
  mega: { name: "Mega apple", effect: "+3 segments · +10 pts" },
  mystery: { name: "Mystery apple", effect: "Surprise effect · +10 pts" },
  time: { name: "Time apple", effect: "+8 seconds · +10 pts" },
  key: { name: "Gate key", effect: "Unlocks every gate" },
  rescue: { name: "Lost ladybug", effect: "Rescue it · +10 pts" },
};

export function ItemIcon({ kind, size = 34 }: { kind: ItemKind; size?: number }) {
  if (kind === "key") return <span style={{ fontSize: size * 0.8 }} className="drop-shadow-sm">🔑</span>;
  if (kind === "rescue") return <span style={{ fontSize: size * 0.8 }} className="animate-[wiggle_1.6s_ease-in-out_infinite] drop-shadow-sm">🐞</span>;
  const c = COLORS[kind];
  const s = kind === "mega" ? size * 1.15 : size;
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" className="drop-shadow-[0_3px_2px_rgba(23,75,58,.25)]" aria-hidden>
      {kind === "golden" && <circle cx="20" cy="22" r="18" fill="#fff3b0" opacity=".55" className="animate-pulse" />}
      <path d="M20 12c-3-3-11-3-13 4-2 8 3 18 8 19 2 .4 3-1 5-1s3 1.4 5 1c5-1 10-11 8-19-2-7-10-7-13-4z" fill={c.body} stroke={c.shade} strokeWidth="1.5" />
      <path d="M14 17c-2 2-2 5-1 7" stroke="#fff" strokeOpacity=".55" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M20 12c0-3 1-5 3-7" stroke="#6b4a24" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M22 8c3-3 7-3 9-1-2 3-6 4-9 1z" fill="#4fae5c" />
      {kind === "mega" && <text x="20" y="28" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">+3</text>}
      {kind === "mystery" && <text x="20" y="29" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff">?</text>}
      {kind === "golden" && <text x="20" y="28" textAnchor="middle" fontSize="11" fontWeight="800" fill="#8a5a00">★</text>}
      {kind === "time" && <g stroke="#fff" strokeWidth="2" strokeLinecap="round"><circle cx="20" cy="24" r="6" fill="none" /><path d="M20 24v-3.5M20 24l2.5 1.5" /></g>}
    </svg>
  );
}

export const TILE_INFO = {
  wall: { name: "Stone wall", effect: "Crash = fail" },
  spike: { name: "Thorns", effect: "Touch = fail" },
  pit: { name: "Mud pit", effect: "Can't cross — go around" },
  gate: { name: "Locked gate", effect: "Opens with the key" },
  log: { name: "Rolling log", effect: "Moves each turn, blocks you" },
  teleporter: { name: "Teleporter", effect: "Warps you to its twin" },
  portal: { name: "Portal", effect: "Exit once the goal is done" },
};

export function Spikes() {
  return <svg viewBox="0 0 40 40" className="h-[78%] w-[78%]" aria-hidden><g fill="#a5452e" stroke="#6e2a1a" strokeWidth="1"><path d="M4 34 10 14 16 34z" /><path d="M14 34 20 8 26 34z" /><path d="M24 34 30 14 36 34z" /></g></svg>;
}

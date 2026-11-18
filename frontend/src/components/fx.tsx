import { useEffect, useMemo, useState } from "react";

const COLORS = ["#f1ae2d", "#e5483b", "#4fb86a", "#3ba3e6", "#f7c62f", "#ee7aa8"];

/** Radial particle burst (apple pop, reward claim, achievement). Pure CSS, positioned by the parent. */
export function Burst({ count = 12, colors = COLORS, size = 8, spread = 60 }: { count?: number; colors?: string[]; size?: number; spread?: number }) {
  const parts = useMemo(() => Array.from({ length: count }, (_, i) => { const a = (i / count) * Math.PI * 2 + Math.random() * 0.5; const d = spread * (0.6 + Math.random() * 0.5); return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, c: colors[i % colors.length], r: Math.random() * 0.15 }; }), [count, colors, spread]);
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      {parts.map((p, i) => <span key={i} className="absolute rounded-full animate-[burst_.7s_ease-out_forwards]" style={{ width: size, height: size, background: p.c, animationDelay: `${p.r}s`, ["--dx" as string]: `${p.dx}px`, ["--dy" as string]: `${p.dy}px` }} />)}
    </span>
  );
}

/** Falling confetti over the whole viewport for celebrations. */
export function Confetti({ pieces = 60 }: { pieces?: number }) {
  const parts = useMemo(() => Array.from({ length: pieces }, (_, i) => ({ left: Math.random() * 100, delay: Math.random() * 0.8, dur: 1.8 + Math.random() * 1.4, c: COLORS[i % COLORS.length], rot: Math.random() * 360, w: 6 + Math.random() * 6 })), [pieces]);
  return <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden data-testid="confetti">{parts.map((p, i) => <span key={i} className="absolute -top-4 block animate-[fall_linear_forwards]" style={{ left: `${p.left}%`, width: p.w, height: p.w * 0.45, background: p.c, transform: `rotate(${p.rot}deg)`, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }} />)}</div>;
}

/** Animated number that counts from its previous value to `value`. */
export function CountUp({ value, ms = 900 }: { value: number; ms?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const from = shown; const start = performance.now(); let raf = 0;
    const tick = (t: number) => { const p = Math.min(1, (t - start) / ms); setShown(Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, ms]);
  return <>{shown.toLocaleString()}</>;
}

/** Small coins that fly upward from a point (coin collection). */
export function FlyingCoins({ n = 6 }: { n?: number }) {
  return <span className="pointer-events-none absolute inset-0" aria-hidden>{Array.from({ length: n }, (_, i) => <span key={i} className="absolute left-1/2 top-1/2 text-lg animate-[coinfly_1s_ease-out_forwards]" style={{ animationDelay: `${i * 0.08}s`, ["--dx" as string]: `${(i - n / 2) * 18}px` }}>🪙</span>)}</span>;
}

// All sound is synthesised with the Web Audio API, so it works fully offline with no media files.
type Prefs = { music: boolean; sound: boolean };
const KEY = "apple-worm-audio";
let prefs: Prefs = (() => { try { return { music: true, sound: true, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { music: true, sound: true }; } })();
const listeners = new Set<() => void>();
let ctx: AudioContext | null = null;
let musicTimer: number | null = null;
let musicGain: GainNode | null = null;

function ac(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, dur = 0.12, opts: { type?: OscillatorType; gain?: number; delay?: number; slide?: number; out?: AudioNode } = {}) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + (opts.delay ?? 0);
  const o = c.createOscillator(); const g = c.createGain();
  o.type = opts.type ?? "sine"; o.frequency.setValueAtTime(freq, t);
  if (opts.slide) o.frequency.exponentialRampToValueAtTime(opts.slide, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.06, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(opts.out ?? c.destination); o.start(t); o.stop(t + dur + 0.05);
}
const seq = (notes: number[], gap: number, dur: number, type: OscillatorType = "triangle", gain = 0.06) => notes.forEach((n, i) => tone(n, dur, { type, gain, delay: i * gap }));

const SFX = {
  click: () => tone(720, 0.06, { type: "triangle", gain: 0.035, slide: 980 }),
  move: () => tone(300, 0.07, { type: "sine", gain: 0.035, slide: 360 }),
  bump: () => tone(140, 0.14, { type: "square", gain: 0.03, slide: 90 }),
  apple: () => seq([660, 880], 0.06, 0.1),
  golden: () => seq([880, 1108, 1318, 1760], 0.055, 0.14, "triangle", 0.055),
  mega: () => seq([330, 440, 554, 660], 0.06, 0.12, "sawtooth", 0.03),
  mystery: () => seq([523, 784, 622, 932], 0.07, 0.12, "sine", 0.06),
  time: () => seq([988, 740, 988], 0.07, 0.09, "square", 0.025),
  key: () => seq([1046, 1318, 1568], 0.06, 0.16),
  rescue: () => seq([784, 988], 0.07, 0.12, "sine"),
  teleport: () => tone(260, 0.3, { type: "sine", gain: 0.06, slide: 1400 }),
  portal: () => tone(400, 0.5, { type: "sine", gain: 0.07, slide: 1600 }),
  fail: () => seq([392, 330, 262, 196], 0.11, 0.2, "triangle", 0.06),
  revive: () => seq([262, 392, 523, 784], 0.08, 0.18, "sine", 0.07),
  booster: () => seq([523, 659, 784, 1046, 1318], 0.05, 0.14, "triangle", 0.05),
  hint: () => seq([880, 1174], 0.09, 0.2, "sine", 0.05),
  coin: () => seq([988, 1318], 0.06, 0.12, "square", 0.025),
  double: () => seq([523, 659, 784, 1046, 784, 1046], 0.07, 0.14, "triangle", 0.055),
  complete: () => seq([523, 659, 784, 1046, 1318], 0.1, 0.25, "triangle", 0.06),
  star: () => tone(1568, 0.25, { type: "sine", gain: 0.06, slide: 2093 }),
  achievement: () => seq([784, 988, 1174, 1568], 0.09, 0.3, "sine", 0.06),
  shield: () => seq([600, 900], 0.05, 0.2, "sine", 0.06),
  adDone: () => seq([659, 880, 1046], 0.08, 0.18, "triangle", 0.05),
};
export type SfxName = keyof typeof SFX;

export function sfx(name: SfxName) { if (prefs.sound) SFX[name](); }

// Gentle generative forest music: a soft pentatonic melody over slow pad chords.
const MELODY = [392, 440, 523, 587, 523, 440, 392, 330, 392, 523, 587, 659, 587, 523, 440, 392];
const PADS = [[196, 247, 294], [175, 220, 262], [165, 196, 247], [175, 220, 294]];
function startMusicLoop() {
  const c = ac(); if (!c || musicTimer !== null) return;
  musicGain = c.createGain(); musicGain.gain.value = 0.55; musicGain.connect(c.destination);
  let beat = 0;
  const tick = () => {
    if (!musicGain) return;
    if (beat % 2 === 0 || beat % 3 === 0) tone(MELODY[beat % MELODY.length], 0.9, { type: "sine", gain: 0.03, out: musicGain });
    if (beat % 8 === 0) PADS[(beat / 8) % PADS.length].forEach((f) => tone(f, 4.2, { type: "triangle", gain: 0.012, out: musicGain! }));
    beat++;
  };
  tick(); musicTimer = window.setInterval(tick, 560);
}
function stopMusicLoop() {
  if (musicTimer !== null) window.clearInterval(musicTimer);
  musicTimer = null; musicGain?.disconnect(); musicGain = null;
}

/** Call from any user gesture; browsers only allow audio after one. */
export function ensureMusic() { if (prefs.music) startMusicLoop(); }

function save(next: Prefs) { prefs = next; localStorage.setItem(KEY, JSON.stringify(prefs)); listeners.forEach((l) => l()); }
export function toggleMusic() { save({ ...prefs, music: !prefs.music }); if (prefs.music) startMusicLoop(); else stopMusicLoop(); }
export function toggleSound() { save({ ...prefs, sound: !prefs.sound }); }
export const audioStore = { subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); }, get: () => prefs };

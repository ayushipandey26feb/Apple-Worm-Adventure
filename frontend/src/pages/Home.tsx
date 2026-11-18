import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Apple, ArrowRight, CloudSun, LogIn, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { ApiError, apiPost } from "@/lib/api";
import { beginSession } from "@/lib/session";
import { GAME_NAME } from "@/config/gameConfig";
import { useMe } from "@/lib/hooks";
import { MODE_INFO } from "@/data/levels";
import { ITEM_INFO, ItemIcon, Spikes, TILE_INFO } from "@/components/game/Icons";
import { AudioToggles } from "@/components/AudioToggles";
import type { ItemKind } from "@/lib/engine";

const APPLES: ItemKind[] = ["normal", "golden", "mega", "mystery", "time"];

export default function Home() {
  const [params, setParams] = useSearchParams();
  const modal = params.get("auth") === "login" ? "login" : params.get("auth") === "register" ? "register" : null;
  const setModal = (m: "login" | "register" | null) => setParams(m ? { auth: m } : {}, { replace: true });
  const { user } = useMe();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try { await apiPost(`/auth/${modal}`, { email, password, name }); beginSession(); window.location.href = "/levels"; }
    catch (e) { toast.error(e instanceof ApiError && e.status === 409 ? "That email is already registered." : e instanceof ApiError && e.status === 422 ? "Use a valid email and a password of 8+ characters." : !navigator.onLine ? "You're offline — you can still play as a guest!" : "Email or password is incorrect."); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_right,#cdeefa_0%,#dff5ee_45%,#d6f2e3_100%)] text-[#174b3a]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-5 sm:px-5">
        <Link to="/" className="font-display flex items-center gap-2 text-lg font-bold" data-testid="home-logo-link"><span className="rounded-xl bg-[#f8b73b] p-2">🍎</span><span className="hidden sm:inline">{GAME_NAME}</span></Link>
        <div className="flex items-center gap-2">
          <AudioToggles />
          {user ? <Link to="/dashboard" className="rounded-full bg-[#174b3a] px-5 py-2 text-sm font-bold text-white" data-testid="home-dashboard-link">My grove</Link> : <>
            <button onClick={() => setModal("login")} className="rounded-full px-4 py-2 text-sm font-bold" data-testid="login-open-button">Log in</button>
            <button onClick={() => setModal("register")} className="rounded-full bg-[#174b3a] px-5 py-2 text-sm font-bold text-white" data-testid="register-open-button">Create account</button>
          </>}
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-6 sm:px-5 lg:grid-cols-[1.05fr_.95fr]">
        <div className="relative z-10">
          <p className="mb-4 flex items-center gap-2 text-xs font-bold tracking-[.3em] text-[#4d9675]"><CloudSun size={18} /> A FOREST PUZZLE ADVENTURE</p>
          <h1 className="font-display max-w-xl text-6xl font-bold leading-[.95] tracking-tight md:text-8xl">Eat.<br /><span className="text-[#48a76a]">Grow.</span><br /><span className="text-[#3ba3e6]">Solve.</span></h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-[#4f6f62]">Guide your caterpillar through 50 forest paths. Munch magical apples, dodge thorns and rolling logs, rescue ladybugs and find the portal home.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={user ? "/levels" : "/game/1"} className="flex items-center gap-3 rounded-2xl bg-[#f1ae2d] px-7 py-4 font-bold shadow-lg shadow-[#f1ae2d]/30 transition-transform hover:-translate-y-1" data-testid="play-now-button">{user ? "Continue playing" : "Play as guest"} <ArrowRight size={20} /></Link>
            <Link to="/levels" className="rounded-2xl bg-white px-7 py-4 font-bold shadow-sm transition-transform hover:-translate-y-1" data-testid="explore-levels-link">Explore 50 levels</Link>
            <Link to="/daily" className="rounded-2xl bg-[#174b3a] px-7 py-4 font-bold text-white shadow-sm transition-transform hover:-translate-y-1" data-testid="home-daily-link">📅 Daily challenge</Link>
          </div>
          <p className="mt-4 text-sm text-[#5d7c70]">Works offline once loaded · Music & sound toggles up top</p>
        </div>
        <div className="relative flex min-h-[420px] items-center justify-center">
          <div className="absolute h-[380px] w-[380px] rounded-full bg-[#b7e9cf]" />
          <div className="absolute right-0 top-6 text-7xl opacity-70">🌳</div><div className="absolute bottom-8 left-2 text-6xl opacity-70">🌿</div>
          <div className="relative w-[300px] rotate-[-6deg] rounded-[40%] border-[16px] border-[#79cda4] bg-[#c8f0dc] p-9 shadow-2xl">
            <div className="grid grid-cols-5 gap-2">{Array.from({ length: 25 }, (_, i) => <span key={i} className={`flex aspect-square items-center justify-center rounded-lg ${[7, 8, 13].includes(i) ? "bg-[#7d918a]" : "bg-[#b3e7c8]"}`}>{i === 4 ? "🌀" : i === 12 ? <ItemIcon kind="golden" size={22} /> : i === 17 ? <ItemIcon kind="normal" size={22} /> : i === 21 ? <ItemIcon kind="mystery" size={22} /> : i === 9 ? "🐛" : i === 18 ? "🐞" : ""}</span>)}</div>
            <div className="absolute -bottom-5 -right-5 rounded-2xl bg-white px-4 py-3 text-sm font-bold shadow-lg">Find the portal ✨</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-5" data-testid="field-guide">
        <p className="text-xs font-bold tracking-[.25em] text-[#4d9675]">FIELD GUIDE</p>
        <h2 className="font-display mt-2 text-4xl font-bold">What lives in the forest</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[2rem] bg-white p-6 shadow-sm"><h3 className="font-display text-xl font-bold">Apples</h3><ul className="mt-3 space-y-3">{APPLES.map((a) => <li key={a} className="flex items-center gap-3"><ItemIcon kind={a} size={30} /><span><b>{ITEM_INFO[a].name}</b><br /><span className="text-sm text-[#5d7c70]">{ITEM_INFO[a].effect}</span></span></li>)}</ul></div>
          <div className="rounded-[2rem] bg-white p-6 shadow-sm"><h3 className="font-display text-xl font-bold">Obstacles</h3><ul className="mt-3 space-y-3 text-sm">
            <li className="flex items-center gap-3"><span className="text-2xl">🪨</span><span><b>{TILE_INFO.wall.name}</b> · {TILE_INFO.wall.effect}</span></li>
            <li className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center"><Spikes /></span><span><b>{TILE_INFO.spike.name}</b> · {TILE_INFO.spike.effect}</span></li>
            <li className="flex items-center gap-3"><span className="h-7 w-7 rounded-full bg-[radial-gradient(circle,#4a3322_35%,#7a5a3c_75%)]" /><span><b>{TILE_INFO.pit.name}</b> · {TILE_INFO.pit.effect}</span></li>
            <li className="flex items-center gap-3"><span className="text-2xl">🔒</span><span><b>{TILE_INFO.gate.name}</b> · {TILE_INFO.gate.effect}</span></li>
            <li className="flex items-center gap-3"><span className="h-7 w-7 rounded-full border-2 border-[#5e3b1c] bg-[#b98149]" /><span><b>{TILE_INFO.log.name}</b> · {TILE_INFO.log.effect}</span></li>
            <li className="flex items-center gap-3"><span className="h-7 w-7 rounded-full border-4 border-dotted border-[#2f8fd0]" /><span><b>{TILE_INFO.teleporter.name}</b> · {TILE_INFO.teleporter.effect}</span></li>
          </ul></div>
          <div className="rounded-[2rem] bg-[#174b3a] p-6 text-white shadow-sm"><h3 className="font-display text-xl font-bold">Seven challenge modes</h3><ul className="mt-3 space-y-2.5 text-sm">{Object.values(MODE_INFO).map((m) => <li key={m.label} className="flex gap-3"><span className="text-xl">{m.emoji}</span><span><b>{m.label}</b> <span className="text-[#b4e6c9]">· {m.blurb}</span></span></li>)}</ul></div>
        </div>
      </section>
      <footer className="border-t border-[#b9e5d0] py-6 text-center text-sm text-[#5d7c70]">A gentle puzzle for curious minds · {GAME_NAME}</footer>

      {modal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#174b3a]/50 p-5" data-testid="auth-modal">
          <form className="w-full max-w-md rounded-[2rem] bg-[#fffdf4] p-8 shadow-2xl animate-[pop_.25s_ease-out]" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            <div className="flex justify-between"><div><Apple className="mb-3 text-[#e63e32]" /><h2 className="font-display text-3xl font-bold">{modal === "login" ? "Welcome back" : "Join the grove"}</h2><p className="mt-1 text-sm text-[#5d7c70]">Save your progress, stars and coins.</p></div><button type="button" onClick={() => setModal(null)} data-testid="auth-close-button" aria-label="Close"><X /></button></div>
            {modal === "register" && <input className="mt-6 w-full rounded-xl border border-[#cfe7da] bg-white px-4 py-3" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} data-testid="auth-name-input" />}
            <input className="mt-3 w-full rounded-xl border border-[#cfe7da] bg-white px-4 py-3" placeholder="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="auth-email-input" />
            <input className="mt-3 w-full rounded-xl border border-[#cfe7da] bg-white px-4 py-3" placeholder="Password (8+ characters)" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} data-testid="auth-password-input" />
            <button type="submit" disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#174b3a] px-5 py-3 font-bold text-white disabled:opacity-60" data-testid="auth-submit-button">{modal === "login" ? <LogIn size={18} /> : <UserPlus size={18} />} {modal === "login" ? "Log in" : "Create my account"}</button>
            <button type="button" onClick={() => setModal(modal === "login" ? "register" : "login")} className="mt-3 w-full text-sm font-bold text-[#4d9675]" data-testid="auth-switch-button">{modal === "login" ? "New here? Create an account" : "Already have an account? Log in"}</button>
          </form>
        </div>
      )}
    </main>
  );
}

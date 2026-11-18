import { useEffect, useRef, useState } from "react";
import { Gift, Loader2, PlayCircle, ShieldCheck, Sparkles, WifiOff, X } from "lucide-react";
import { Burst } from "@/components/fx";
import { adBreak, loadAdSense } from "@/lib/adsense";
import { useAdsConfig } from "@/lib/hooks";
import { ApiError, apiPost } from "@/lib/api";
import { sfx } from "@/lib/audio";
import { guestId } from "@/lib/local";
import type { AdPlacement, OpportunityOut, VerifyOut } from "@/lib/types";

export type AdContext = { level_id?: number; attempt_id?: string; history_id?: string };
type Props = { placement: AdPlacement; context?: AdContext; title: string; reward: string; isGuest: boolean; onGranted: (r: VerifyOut) => void; onClose: () => void };
type Phase = "loading" | "ready" | "watching" | "verifying" | "granted" | "error" | "nofill";

const SLIDES = [
  { emoji: "🌲", title: "Leafy Learning Co.", line: "Tiny lessons that grow big minds." },
  { emoji: "🦉", title: "Owl Night Stories", line: "Bedtime tales from the forest." },
  { emoji: "🚲", title: "Pinecone Bikes", line: "Roll through every trail in style." },
  { emoji: "🍓", title: "Berry Bright Juice", line: "Fresh from the meadow, no added sugar." },
];

const errorText = (e: unknown) => {
  if (!navigator.onLine) return "You're offline. Rewarded ads need an internet connection to be verified.";
  if (e instanceof ApiError) { const d = (e.body as { detail?: unknown } | null)?.detail; return typeof d === "string" ? d : "This reward isn't available right now."; }
  return "Couldn't reach the reward server. Please try again.";
};

export function RewardAdModal({ placement, context, title, reward, isGuest, onGranted, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [opp, setOpp] = useState<OpportunityOut | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<VerifyOut | null>(null);
  const started = useRef(false);
  const verifying = useRef(false);
  const guest = isGuest ? guestId() : undefined;

  const ads = useAdsConfig();
  const [provider, setProvider] = useState<"demo" | "adsense">(ads.provider);
  const showAd = useRef<(() => void) | null>(null);

  const verifyNow = (o: OpportunityOut) => {
    if (verifying.current) return; verifying.current = true; setPhase("verifying");
    apiPost<VerifyOut>("/rewards/verify", { opportunity_id: o.opportunity_id, event_id: crypto.randomUUID(), guest_id: guest })
      .then((r) => { setResult(r); setPhase("granted"); sfx("adDone"); })
      .catch((e) => { setError(errorText(e)); setPhase("error"); });
  };

  useEffect(() => {
    if (started.current) return; started.current = true;
    if (provider === "adsense") loadAdSense(ads.publisher_id, ads.test_mode);
    apiPost<OpportunityOut>("/rewards/opportunity", { placement, provider, ...context, guest_id: guest })
      .then((o) => {
        setOpp(o);
        if (provider === "demo") { setPhase("watching"); return; }
        // Real network: reward only on adViewed; dismissed or no-fill never grants anything.
        const abandon = () => void apiPost("/rewards/abandon", { opportunity_id: o.opportunity_id, guest_id: guest }).catch(() => undefined);
        let viewed = false;
        const ok = adBreak({ type: "reward", name: placement.toLowerCase(),
          beforeReward: (fn) => { showAd.current = fn; setPhase("ready"); },
          adDismissed: () => { abandon(); setError("Reward not completed. You closed the ad before it finished."); setPhase("error"); },
          adViewed: () => { viewed = true; verifyNow(o); },
          adBreakDone: (info) => { if (!viewed && info.breakStatus !== "dismissed") { abandon(); setPhase("nofill"); } } });
        if (!ok) { abandon(); setPhase("nofill"); }
      })
      .catch((e) => { setError(errorText(e)); setPhase("error"); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement, context, guest, provider]);

  const useDemo = () => { started.current = false; verifying.current = false; setOpp(null); setElapsed(0); setPhase("loading"); setProvider("demo"); };

  // Only visible time counts — switching tabs pauses the ad.
  useEffect(() => {
    if (phase !== "watching" || confirmLeave) return;
    const id = window.setInterval(() => { if (document.visibilityState === "visible") setElapsed((v) => v + 0.2); }, 200);
    return () => window.clearInterval(id);
  }, [phase, confirmLeave]);

  useEffect(() => {
    if (!opp || provider !== "demo" || phase !== "watching" || elapsed < opp.required_seconds) return;
    verifyNow(opp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, opp, phase, provider]);

  const leave = () => {
    if (opp && (phase === "watching" || phase === "verifying")) void apiPost("/rewards/abandon", { opportunity_id: opp.opportunity_id, guest_id: guest }).catch(() => undefined);
    onClose();
  };
  const close = () => { if (phase === "granted" && result) onGranted(result); else if (phase === "watching") setConfirmLeave(true); else leave(); };

  const total = opp?.required_seconds ?? 1;
  const remaining = Math.max(0, Math.ceil(total - elapsed));
  const slide = SLIDES[Math.floor(elapsed / Math.max(2, total / SLIDES.length)) % SLIDES.length];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f2f24]/70 p-4 backdrop-blur-sm" data-testid="reward-ad-modal">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-[#fffdf4] shadow-2xl animate-[pop_.25s_ease-out]">
        <div className="flex items-center justify-between border-b border-[#e3f0e6] px-6 py-4">
          <div><p className="text-[11px] font-bold tracking-[.2em] text-[#4d9675]">{provider === "adsense" ? "REWARDED AD · GOOGLE" : "REWARDED AD · DEMO (MOCKED)"}</p><h2 className="font-display mt-0.5 text-2xl font-bold" data-testid="reward-ad-title">{title}</h2></div>
          <button onClick={close} className="rounded-full p-2 transition-colors hover:bg-[#eaf6ef]" aria-label="Close ad" data-testid="reward-close-button"><X /></button>
        </div>
        <div className="p-6">
          {phase === "error" ? (
            <div className="rounded-2xl bg-[#fff1e6] p-6 text-center" data-testid="reward-error">
              {navigator.onLine ? <Gift className="mx-auto text-[#d97a1f]" size={36} /> : <WifiOff className="mx-auto text-[#d97a1f]" size={36} />}
              <p className="mt-3 font-bold text-[#7a3f0c]">{error}</p>
              <button onClick={onClose} className="mt-5 w-full rounded-xl bg-[#174b3a] px-5 py-3 font-bold text-white" data-testid="reward-error-close-button">Back to the forest</button>
            </div>
          ) : phase === "nofill" ? (
            <div className="rounded-2xl bg-[#fff1e6] p-6 text-center" data-testid="reward-nofill">
              <Gift className="mx-auto text-[#d97a1f]" size={36} />
              <p className="mt-3 font-bold text-[#7a3f0c]">Unable to load reward ad. Please try again.</p>
              <p className="mt-1 text-sm text-[#7a3f0c]/80">Nothing was charged or used up.</p>
              <button onClick={useDemo} className="mt-5 w-full rounded-xl bg-[#174b3a] px-5 py-3 font-bold text-white" data-testid="reward-use-demo-button">Watch a demo ad instead</button>
            </div>
          ) : phase === "ready" ? (
            <div className="rounded-2xl bg-[#eaf8ef] p-6 text-center" data-testid="reward-ready">
              <PlayCircle className="mx-auto text-[#2f8a5f]" size={40} />
              <p className="mt-3 font-bold">Your reward: {reward}</p>
              <button onClick={() => { setPhase("watching"); showAd.current?.(); }} className="mt-5 w-full rounded-xl bg-[#f1ae2d] px-5 py-3 font-bold text-[#174b3a]" data-testid="reward-watch-button">Watch ad</button>
            </div>
          ) : phase === "granted" && result ? (
            <div className="relative rounded-2xl bg-[#eaf8ef] p-6 text-center animate-[pop_.35s_ease-out]" data-testid="reward-granted">
              <Burst count={16} spread={110} />
              <Sparkles className="mx-auto text-[#f1ae2d] animate-[wiggle_1s_ease-in-out_infinite]" size={40} />
              <p className="font-display mt-3 text-2xl font-bold">Reward unlocked!</p>
              <p className="mt-1 text-[#5d7c70]">{reward}{result.coins_granted ? ` · +${result.coins_granted} coins` : ""}</p>
              <button onClick={() => onGranted(result)} className="mt-5 w-full rounded-xl bg-[#f1ae2d] px-5 py-3 font-bold text-[#174b3a] transition-transform hover:-translate-y-0.5" data-testid="reward-collect-button">Collect reward</button>
            </div>
          ) : (
            <>
              <div className="relative h-48 overflow-hidden rounded-2xl bg-gradient-to-br from-[#bfeaf7] to-[#bde9cf]" data-testid="reward-ad-creative">
                {phase === "loading" ? <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-[#4d9675]" /></div> : (
                  <div key={slide.title} className="flex h-full flex-col items-center justify-center text-center animate-[pop_.35s_ease-out]">
                    <span className="text-6xl">{slide.emoji}</span><p className="font-display mt-2 text-xl font-bold">{slide.title}</p><p className="text-sm text-[#4f6f62]">{slide.line}</p>
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-[#4d9675]">SPONSORED · DEMO</span>
                <span className="absolute right-3 top-3 rounded-full bg-[#174b3a] px-3 py-1 text-xs font-bold text-white" data-testid="reward-countdown">{phase === "verifying" ? "Verifying…" : `${remaining}s`}</span>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#e3f0e6]"><div className="h-full rounded-full bg-[#f1ae2d] transition-[width] duration-200" style={{ width: `${Math.min(100, (elapsed / total) * 100)}%` }} /></div>
              <p className="mt-3 text-center text-sm font-bold text-[#174b3a]">Reward: {reward}</p>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-[#5d7c70]"><ShieldCheck size={14} className="text-[#4d9675]" /> Watch the whole ad — leaving early gives no reward.</p>
            </>
          )}
        </div>
        {confirmLeave && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#fffdf4]/95 p-6" data-testid="reward-leave-confirm">
            <div className="text-center"><p className="font-display text-2xl font-bold">Leave the ad?</p><p className="mt-2 text-[#5d7c70]">You still have {remaining}s left. If you leave now you won't get the reward.</p>
              <div className="mt-5 grid gap-2"><button onClick={() => setConfirmLeave(false)} className="rounded-xl bg-[#174b3a] px-5 py-3 font-bold text-white" data-testid="reward-keep-watching-button">Keep watching</button><button onClick={leave} className="rounded-xl bg-[#fde2d6] px-5 py-3 font-bold text-[#a0401c]" data-testid="reward-leave-button">Leave without reward</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

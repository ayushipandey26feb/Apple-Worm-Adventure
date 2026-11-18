// Google AdSense H5 Games Ads (Ad Placement API). Loaded only when a publisher id is configured.
export type BreakStatus = "notReady" | "timeout" | "invalid" | "error" | "noAdPreloaded" | "frequencyCapped" | "ignored" | "other" | "dismissed" | "viewed";
type PlacementInfo = { breakType: string; breakName?: string; breakStatus: BreakStatus };
export type RewardBreak = { type: "reward"; name: string; beforeAd?: () => void; afterAd?: () => void; beforeReward: (showAdFn: () => void) => void; adDismissed: () => void; adViewed: () => void; adBreakDone: (info: PlacementInfo) => void };
type AdWindow = Window & { adsbygoogle?: unknown[]; adBreak?: (c: RewardBreak | Record<string, unknown>) => void; adConfig?: (c: Record<string, unknown>) => void };

let loaded = false;
export function loadAdSense(publisherId: string, test: boolean): void {
  if (loaded || !publisherId) return;
  loaded = true;
  const w = window as AdWindow;
  w.adsbygoogle = w.adsbygoogle || [];
  w.adBreak = w.adConfig = (o) => { w.adsbygoogle!.push(o); };
  const s = document.createElement("script");
  s.async = true; s.dataset.adClient = publisherId;
  if (test) s.dataset.adbreakTest = "on";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(publisherId)}`;
  s.crossOrigin = "anonymous";
  document.head.appendChild(s);
  w.adConfig({ sound: "on", preloadAdBreaks: "on" });
}

export function adBreak(config: RewardBreak): boolean {
  const w = window as AdWindow;
  if (!w.adBreak) return false;
  w.adBreak(config);
  return true;
}

import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import Game from "@/pages/Game";
import Levels from "@/pages/Levels";
import Dashboard from "@/pages/Dashboard";
import AdminEconomy from "@/pages/AdminEconomy";
import Daily from "@/pages/Daily";
import Leaderboard from "@/pages/Leaderboard";
import Shop from "@/pages/Shop";
import { ensureMusic, sfx } from "@/lib/audio";
import { flushOutbox } from "@/lib/local";
import { queryClient } from "@/lib/queryClient";
import { useAdsConfig } from "@/lib/hooks";
import { loadAdSense } from "@/lib/adsense";

export default function App() {
  const ads = useAdsConfig();
  // Preload Google rewarded ads early so an ad is ready by the time a player asks for one.
  useEffect(() => { if (ads.provider === "adsense") loadAdSense(ads.publisher_id, ads.test_mode); }, [ads.provider, ads.publisher_id, ads.test_mode]);
  useEffect(() => {
    // Every tap on a button or link plays a click; the first gesture also starts the forest music.
    const onClick = (e: MouseEvent) => {
      ensureMusic();
      const el = (e.target as HTMLElement | null)?.closest("button, a, [role=button]");
      if (el && el.getAttribute("data-sfx") !== "none") sfx("click");
    };
    const onKey = () => ensureMusic();
    const sync = () => void flushOutbox().then((n) => { if (n) { toast.success(`Synced ${n} offline result${n > 1 ? "s" : ""}.`); void queryClient.invalidateQueries(); } });
    const offline = () => toast("You're offline — keep playing! Progress syncs when you reconnect.", { id: "net" });
    document.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKey, { once: true });
    window.addEventListener("online", sync); window.addEventListener("offline", offline);
    sync();
    return () => { document.removeEventListener("click", onClick, true); window.removeEventListener("keydown", onKey); window.removeEventListener("online", sync); window.removeEventListener("offline", offline); };
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:levelId" element={<Game />} />
        <Route path="/levels" element={<Levels />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin/economy" element={<AdminEconomy />} />
        <Route path="/daily" element={<Daily />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </>
  );
}

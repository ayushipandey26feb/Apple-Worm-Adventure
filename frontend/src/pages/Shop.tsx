import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Coins, Lock } from "lucide-react";
import { toast } from "sonner";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { sfx } from "@/lib/audio";
import { useMe } from "@/lib/hooks";
import type { ShopItem, ShopOut } from "@/lib/types";
import { AudioToggles } from "@/components/AudioToggles";
import { Burst } from "@/components/fx";

function Preview({ item, hat }: { item?: ShopItem; hat?: string | null }) {
  const colors = item?.kind === "skin" ? item.preview.split(",") : ["#4fb86a", "#5cc777"];
  return (
    <div className="relative flex h-20 items-center justify-center gap-0.5">
      {[4, 3, 2, 1, 0].map((i) => <span key={i} className="rounded-full border-2 border-black/15" style={{ width: i === 0 ? 34 : 26 - i, height: i === 0 ? 34 : 26 - i, background: colors[i % colors.length] }} />)}
      {(hat ?? (item?.kind === "hat" ? item.preview : null)) && <span className="absolute -top-0.5 right-[calc(50%-58px)] text-2xl">{hat ?? item?.preview}</span>}
    </div>
  );
}

export default function Shop() {
  const { user } = useMe();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["shop"], queryFn: () => apiGet<ShopOut>("/shop") });
  const [busy, setBusy] = useState<string | null>(null);
  const [bought, setBought] = useState<string | null>(null);
  const items = q.data?.items ?? [];
  const equippedSkin = items.find((i) => i.kind === "skin" && i.equipped);
  const equippedHat = items.find((i) => i.kind === "hat" && i.equipped);

  const act = async (item: ShopItem, path: "buy" | "equip") => {
    if (!user) { toast("Sign in to buy and wear cosmetics."); return; }
    setBusy(item.id);
    try {
      const next = await apiPost<ShopOut>(`/shop/${path}`, { item_id: item.id });
      qc.setQueryData(["shop"], next); void qc.invalidateQueries({ queryKey: ["me"] });
      if (path === "buy") { sfx("coin"); sfx("achievement"); setBought(item.id); window.setTimeout(() => setBought(null), 900); toast.success(`${item.name} is yours!`); } else sfx("booster");
    } catch (e) { toast.error(e instanceof ApiError && e.status === 402 ? "Not enough coins yet — keep playing!" : "Couldn't do that right now."); }
    finally { setBusy(null); }
  };
  const unequipHat = () => void apiPost<ShopOut>("/shop/equip", { item_id: "hat-none" }).then((n) => { qc.setQueryData(["shop"], n); void qc.invalidateQueries({ queryKey: ["me"] }); });

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,#d4f1fb_0%,#dff5ee_50%)] px-4 py-5 text-[#174b3a] sm:px-5">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-2">
        <Link to="/levels" className="flex items-center gap-2 font-bold" data-testid="shop-back-link"><ArrowLeft size={18} /> Forest map</Link>
        <div className="flex items-center gap-2"><span className="flex items-center gap-1.5 rounded-full bg-[#fff4cb] px-4 py-2 font-bold text-[#8c6914]" data-testid="shop-coins"><Coins size={16} /> {user ? (q.data?.coins ?? 0).toLocaleString() : "—"}</span><AudioToggles /></div>
      </header>
      <section className="mx-auto max-w-6xl py-10">
        <div className="grid items-end gap-6 lg:grid-cols-[1fr_320px]">
          <div><p className="text-xs font-bold tracking-[.25em] text-[#4d9675]">WORM WARDROBE</p><h1 className="font-display mt-2 text-5xl font-bold">Skins & hats</h1><p className="mt-2 text-[#5d7c70]">Spend the coins you earn in the forest. Your look shows up in every level.</p>{!user && <p className="mt-2 text-sm font-bold"><Link to="/?auth=login" className="underline" data-testid="shop-login-link">Log in</Link> to shop.</p>}</div>
          <div className="rounded-[2rem] bg-white p-5 text-center shadow-sm" data-testid="shop-current-look"><p className="text-xs font-bold tracking-[.2em] text-[#4d9675]">YOUR WORM</p><Preview item={equippedSkin} hat={equippedHat?.preview ?? null} />{equippedHat && <button onClick={unequipHat} className="text-xs font-bold text-[#4d9675] underline" data-testid="shop-remove-hat-button">Remove hat</button>}</div>
        </div>
        {(["skin", "hat"] as const).map((kind) => (
          <div key={kind} className="mt-8">
            <h2 className="font-display text-2xl font-bold">{kind === "skin" ? "Body colours" : "Hats"}</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.filter((i) => i.kind === kind).map((item, idx) => {
                const short = !!user && !item.owned && (q.data?.coins ?? 0) < item.price;
                return (
                  <div key={item.id} className={`relative rounded-3xl bg-white p-4 shadow-sm transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-lg animate-[rise_.4s_ease-out_both] ${item.equipped ? "ring-4 ring-[#79cda4]" : ""}`} style={{ animationDelay: `${idx * 0.04}s` }} data-testid={`shop-item-${item.id}`}>
                    {bought === item.id && <Burst count={18} spread={80} />}
                    <Preview item={item} />
                    <p className="mt-1 font-bold">{item.name}</p>
                    <p className="text-sm text-[#8c6914]">{item.price ? `${item.price} coins` : "Free"}</p>
                    {item.owned ? (
                      <button onClick={() => void act(item, "equip")} disabled={item.equipped || busy === item.id} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#effaf4] px-3 py-2 text-sm font-bold disabled:opacity-60" data-testid={`shop-equip-${item.id}`}>{item.equipped ? <><Check size={15} /> Wearing</> : "Wear"}</button>
                    ) : (
                      <button onClick={() => void act(item, "buy")} disabled={busy === item.id || short} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#174b3a] px-3 py-2 text-sm font-bold text-white disabled:opacity-45" data-testid={`shop-buy-${item.id}`}>{short ? <><Lock size={14} /> Need {item.price - (q.data?.coins ?? 0)} more</> : <><Coins size={14} /> Buy</>}</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

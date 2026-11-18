import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowLeft, Coins, Gauge, HeartPulse, RefreshCw, ShieldCheck, ShieldX, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { ApiError, apiGet, apiPut } from "@/lib/api";
import { GAME_NAME } from "@/config/gameConfig";
import type { AdminMetrics, EconomyConfig } from "@/lib/types";

const GROUPS: { title: string; fields: [keyof EconomyConfig, string][] }[] = [
  { title: "Coin rewards", fields: [["level_completion_coins", "Level clear coins"], ["replay_coins", "Replay coins"], ["golden_apple_coins", "Golden apple coins"], ["three_star_bonus", "3-star bonus"], ["wallet_ad_coins", "Wallet ad coins"]] },
  { title: "Multipliers & extras", fields: [["double_coins_multiplier", "Double coins ×"], ["double_score_multiplier", "Double score ×"], ["extra_moves", "Extra moves"], ["extra_seconds", "Extra seconds"]] },
  { title: "Ad pacing (anti-spam)", fields: [["short_ad_seconds", "Short ad (s)"], ["long_ad_seconds", "Full ad (s)"], ["max_ads_per_day", "Max ads / day"], ["max_ads_per_hour", "Max ads / hour"], ["min_seconds_between_ads", "Gap between ads (s)"]] },
  { title: "Per-level caps", fields: [["free_revives_per_level", "Free revives"], ["rewarded_revives_per_level", "Rewarded revives"], ["max_hints_per_level", "Hints"], ["max_extra_moves_per_level", "Extra-move grants"], ["max_boosters_per_level", "Boosters"]] },
  { title: "Coin prices & daily", fields: [["hint_cost", "Hint cost"], ["booster_cost", "Booster cost"], ["revive_cost", "Revive cost"], ["daily_challenge_coins", "Daily challenge coins"]] },
];

export default function AdminEconomy() {
  const qc = useQueryClient();
  const metrics = useQuery({ queryKey: ["admin-economy"], queryFn: () => apiGet<AdminMetrics>("/admin/economy"), retry: false });
  const [form, setForm] = useState<EconomyConfig | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (metrics.data && !form) setForm(metrics.data.economy); }, [metrics.data, form]);

  if (metrics.isError) {
    const status = metrics.error instanceof ApiError ? metrics.error.status : 0;
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#dff5ee] p-6 text-[#174b3a]">
        <div className="max-w-sm rounded-[2rem] bg-white p-8 text-center shadow-xl" data-testid="admin-denied"><ShieldX className="mx-auto text-[#d0553a]" size={40} /><h1 className="font-display mt-3 text-3xl font-bold">Admins only</h1><p className="mt-2 text-[#5d7c70]">{status === 401 ? "Please log in with an admin account." : "This economy dashboard is restricted to admin accounts."}</p><Link to={status === 401 ? "/?auth=login" : "/dashboard"} className="mt-6 block rounded-xl bg-[#174b3a] px-5 py-3 font-bold text-white" data-testid="admin-denied-back-link">{status === 401 ? "Log in" : "Back to my grove"}</Link></div>
      </main>
    );
  }
  const m = metrics.data;
  if (!m || !form) return <main className="flex min-h-screen items-center justify-center bg-[#dff5ee] text-[#174b3a]">Loading economy…</main>;

  const save = async () => {
    setSaving(true);
    try { const next = await apiPut<EconomyConfig>("/admin/economy", form); setForm(next); toast.success("Economy rules saved — live for new rewards."); void qc.invalidateQueries({ queryKey: ["config"] }); void metrics.refetch(); }
    catch (e) { toast.error(e instanceof ApiError && e.status === 422 ? "One of the values is out of range." : "Couldn't save the rules."); }
    finally { setSaving(false); }
  };

  return (
    <main className="min-h-screen bg-[#e6f6f0] px-4 py-5 text-[#174b3a] sm:px-5">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 font-bold" data-testid="admin-back-link"><ArrowLeft size={18} /> {GAME_NAME}</Link>
        <div className="flex items-center gap-2"><button onClick={() => void metrics.refetch()} className="rounded-full bg-white p-2.5" title="Refresh" data-testid="admin-refresh-button"><RefreshCw size={17} className={metrics.isFetching ? "animate-spin" : ""} /></button><span className="rounded-full bg-[#174b3a] px-4 py-2 text-xs font-bold text-white">ADMIN · ECONOMY</span></div>
      </header>
      <section className="mx-auto max-w-6xl py-10">
        <p className="text-xs font-bold tracking-[.25em] text-[#4d9675]">VELOOP CONTROL ROOM · {m.date}</p>
        <h1 className="font-display mt-2 text-5xl font-bold">Economy health</h1>
        <p className="mt-2 max-w-xl text-[#5d7c70]">Today's rewarded-ad funnel and reward liability. Ads are a MOCKED demo provider; every grant is server-timed, capped and ledgered.</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={<Activity />} label="Ad opportunities today" value={m.ad_opportunities} test="metric-opportunities" />
          <Metric icon={<ShieldCheck />} label="Completed rewarded ads" value={m.completed_ads} test="metric-completed" />
          <Metric icon={<ShieldX />} label="Left early / rejected" value={m.failed_ads} test="metric-failed" />
          <Metric icon={<Gauge />} label="Completion rate" value={`${m.completion_rate}%`} test="metric-rate" />
          <Metric icon={<Coins />} label="Coins granted today" value={m.coins_granted.toLocaleString()} test="metric-coins-granted" />
          <Metric icon={<Wallet />} label="Coins spent today" value={m.coins_spent.toLocaleString()} test="metric-coins-spent" />
          <Metric icon={<Users />} label="Avg ads / ad user" value={m.avg_ads_per_user} test="metric-avg-ads" />
          <Metric icon={<Coins />} label="Avg reward / user" value={m.avg_reward_per_user} test="metric-avg-reward" />
          <Metric icon={<HeartPulse />} label="Revives today" value={m.revives} test="metric-revives" />
          <Metric icon={<Activity />} label="Double-score uses" value={m.double_score_uses} test="metric-double-score" />
          <Metric icon={<Coins />} label="Double-coin uses" value={m.double_coin_uses} test="metric-double-coins" />
          <Metric icon={<Users />} label="Registered players" value={m.players} test="metric-players" />
          <Metric icon={<ShieldX />} label="Anti-cheat flags today" value={m.cheat_flags_today} test="metric-cheat-flags" />
          <Metric icon={<Coins />} label="Cosmetics sold today" value={m.cosmetics_sold_today} test="metric-cosmetics" />
          <Metric icon={<Activity />} label="Daily challenge players" value={m.daily_completions_today} test="metric-daily" />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <section className="rounded-[2rem] bg-white p-6 shadow-sm">
            <p className="text-xs font-bold tracking-[.2em] text-[#4d9675]">BY PLACEMENT · TODAY</p>
            <table className="mt-4 w-full text-sm" data-testid="placement-table">
              <thead className="text-left text-[#6b8c7d]"><tr><th className="pb-2">Placement</th><th className="pb-2 text-right">Shown</th><th className="pb-2 text-right">Granted</th><th className="pb-2 text-right">Failed</th></tr></thead>
              <tbody>{m.by_placement.map((p) => <tr key={p.placement} className="border-t border-[#eaf3ee]" data-testid={`placement-row-${p.placement.toLowerCase()}`}><td className="py-2 font-bold">{p.placement.replace("_", " ").toLowerCase()}</td><td className="py-2 text-right">{p.opportunities}</td><td className="py-2 text-right text-[#2f8a5f]">{p.granted}</td><td className="py-2 text-right text-[#d0553a]">{p.failed}</td></tr>)}</tbody>
            </table>
            <p className="mt-6 text-xs font-bold tracking-[.2em] text-[#4d9675]">RECENT ANTI-CHEAT FLAGS</p>
            <ul className="mt-2 space-y-1.5 text-sm" data-testid="cheat-flags-list">{m.recent_flags.length ? m.recent_flags.map((f) => <li key={f.id} className="rounded-xl bg-[#fdf0ea] px-3 py-2 text-[#a0401c]">{f.reason} <span className="text-xs text-[#6b8c7d]">· {f.created_at.slice(11, 16)}</span></li>) : <li className="text-[#6b8c7d]">No suspicious results.</li>}</ul>
            <p className="mt-4 text-xs text-[#6b8c7d]">All time: {m.all_time_granted} granted of {m.all_time_opportunities} opportunities · {m.active_ad_users} ad users today</p>
          </section>
          <section className="rounded-[2rem] bg-white p-6 shadow-sm">
            <p className="text-xs font-bold tracking-[.2em] text-[#4d9675]">REMOTE RULES</p><h2 className="font-display mt-1 text-2xl font-bold">Tune reward liability</h2>
            <div className="mt-4 space-y-5">
              {GROUPS.map((g) => (
                <div key={g.title}><p className="mb-2 text-sm font-bold text-[#40614f]">{g.title}</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{g.fields.map(([key, label]) => (
                    <label key={key} className="text-xs font-bold text-[#5d7c70]">{label}
                      <input type="number" min={0} value={form[key]} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-[#cfe7da] bg-[#f7fcf9] px-3 py-2 text-base text-[#174b3a] focus:outline-none focus:ring-2 focus:ring-[#79cda4]" data-testid={`economy-${key}-input`} />
                    </label>))}</div>
                </div>
              ))}
            </div>
            <button onClick={save} disabled={saving} className="mt-6 rounded-xl bg-[#174b3a] px-6 py-3 font-bold text-white disabled:opacity-50" data-testid="economy-save-button">{saving ? "Saving…" : "Save economy rules"}</button>
          </section>
        </div>
      </section>
    </main>
  );
}

function Metric({ icon, label, value, test }: { icon: ReactNode; label: string; value: string | number; test: string }) {
  return <div className="rounded-[1.5rem] bg-white p-5 shadow-sm" data-testid={test}><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#e9f5c9] text-[#57934e]">{icon}</div><p className="text-sm text-[#6b8c7d]">{label}</p><p className="font-display mt-1 text-3xl font-bold">{value}</p></div>;
}

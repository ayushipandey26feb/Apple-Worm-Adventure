import type { ReactNode } from "react";
import { X } from "lucide-react";

export type Choice = { label: string; sub: string; onClick: () => void; disabled?: boolean; testid: string; primary?: boolean };

export function ChoiceSheet({ title, subtitle, icon, options, onClose, testid }: { title: string; subtitle: string; icon: ReactNode; options: Choice[]; onClose: () => void; testid: string }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#0f2f24]/55 p-4 backdrop-blur-[2px] sm:items-center" onClick={onClose} data-testid={testid}>
      <div className="w-full max-w-md rounded-[2rem] bg-[#fffdf4] p-6 shadow-2xl animate-[rise_.25s_ease-out]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff4cb]">{icon}</span><div><h2 className="font-display text-2xl font-bold">{title}</h2><p className="mt-1 text-sm text-[#5d7c70]">{subtitle}</p></div></div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-[#eaf6ef]" aria-label="Close" data-testid={`${testid}-close-button`}><X size={20} /></button>
        </div>
        <div className="mt-5 grid gap-2.5">
          {options.map((o) => (
            <button key={o.testid} onClick={o.onClick} disabled={o.disabled} className={`rounded-2xl px-5 py-3.5 text-left transition-[transform,background-color] hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 ${o.primary ? "bg-[#174b3a] text-white" : "bg-[#effaf4] text-[#174b3a]"}`} data-testid={o.testid}>
              <span className="block font-bold">{o.label}</span><span className={`text-sm ${o.primary ? "text-[#b4e6c9]" : "text-[#5d7c70]"}`}>{o.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

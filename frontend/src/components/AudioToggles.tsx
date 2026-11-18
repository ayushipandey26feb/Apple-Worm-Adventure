import { Music, Volume2, VolumeX } from "lucide-react";
import { toggleMusic, toggleSound } from "@/lib/audio";
import { useAudioPrefs } from "@/lib/hooks";

export function AudioToggles() {
  const prefs = useAudioPrefs();
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={toggleMusic} className={`rounded-full p-2.5 transition-colors ${prefs.music ? "bg-white text-[#2f8a5f]" : "bg-white/50 text-slate-400"}`} title={prefs.music ? "Music on" : "Music off"} aria-pressed={prefs.music} data-testid="music-toggle-button"><Music size={18} /></button>
      <button onClick={toggleSound} className={`rounded-full p-2.5 transition-colors ${prefs.sound ? "bg-white text-[#2f8a5f]" : "bg-white/50 text-slate-400"}`} title={prefs.sound ? "Sound on" : "Sound off"} aria-pressed={prefs.sound} data-testid="sound-toggle-button">{prefs.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
    </div>
  );
}

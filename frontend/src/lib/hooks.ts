import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./api";
import { audioStore } from "./audio";
import { type AdsConfig, DEFAULT_ECONOMY, type EconomyConfig, type PublicConfig, type PublicUser, type ShopOut } from "./types";

/** The signed-in player, or null for guests / when offline. */
export function useMe() {
  const q = useQuery({ queryKey: ["me"], queryFn: () => apiGet<PublicUser>("/auth/me").catch(() => null), staleTime: 30_000 });
  return { user: q.data ?? null, loading: q.isPending };
}

/** Remote economy rules, falling back to defaults offline. */
export function useEconomy(): EconomyConfig {
  const q = useQuery({ queryKey: ["config"], queryFn: () => apiGet<PublicConfig>("/config"), staleTime: 60_000 });
  return q.data?.economy ?? DEFAULT_ECONOMY;
}

export const useAudioPrefs = () => useSyncExternalStore(audioStore.subscribe, audioStore.get);

export function useAdsConfig(): AdsConfig {
  const q = useQuery({ queryKey: ["config"], queryFn: () => apiGet<PublicConfig>("/config"), staleTime: 60_000 });
  return q.data?.ads ?? { provider: "demo", publisher_id: "", test_mode: true };
}

const CLASSIC = ["#4fb86a", "#5cc777"];
/** Equipped skin colours + hat emoji for the board (classic when signed out / offline). */
export function useLook(user: PublicUser | null): { colors: string[]; hat: string | null } {
  const q = useQuery({ queryKey: ["shop"], queryFn: () => apiGet<ShopOut>("/shop"), enabled: !!user, staleTime: 60_000 });
  const items = q.data?.items ?? [];
  const skin = items.find((i) => i.id === user?.skin);
  const hat = items.find((i) => i.id === user?.hat);
  return { colors: skin ? skin.preview.split(",") : CLASSIC, hat: hat?.preview ?? null };
}

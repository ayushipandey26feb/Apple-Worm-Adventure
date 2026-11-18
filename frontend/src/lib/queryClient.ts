import { QueryClient } from "@tanstack/react-query";

// Exported so lib/session can wipe it at session boundaries — cached data outlives logout.
// networkMode "always": offline requests fail fast (guest fallback) instead of pausing forever.
export const queryClient = new QueryClient({ defaultOptions: { queries: { networkMode: "always", retry: 1, refetchOnWindowFocus: false }, mutations: { networkMode: "always" } } });

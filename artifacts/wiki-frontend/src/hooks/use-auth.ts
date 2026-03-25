import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { AuthUser } from "@/lib/types";

export function useAuth() {
  return useQuery<AuthUser>({
    queryKey: ["auth", "me"],
    queryFn: () => apiFetch<AuthUser>("/auth/me"),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

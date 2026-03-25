import { useAuthMe, getAuthMeQueryKey } from "@workspace/api-client-react";

export function useAuth() {
  return useAuthMe({
    query: {
      queryKey: getAuthMeQueryKey(),
      staleTime: 5 * 60_000,
      retry: false,
    },
  });
}

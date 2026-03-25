import { useAuthMe } from "@workspace/api-client-react";

export function useAuth() {
  /* eslint-disable @typescript-eslint/no-explicit-any --
     Orval generated hooks require queryKey; staleTime/retry are runtime-safe. */
  return useAuthMe({
    query: { staleTime: 5 * 60_000, retry: false } as any,
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

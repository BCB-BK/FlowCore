import { QueryClient } from "@tanstack/react-query";

const DEV_PRINCIPAL_ID = "00000000-0000-0000-0000-000000000001";
const IS_DEV = import.meta.env.DEV;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function getBasePath(): string {
  const base = import.meta.env.BASE_URL || "/";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export function apiUrl(path: string): string {
  return `${getBasePath()}/api${path}`;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (IS_DEV) {
    headers.set("X-Dev-Principal-Id", DEV_PRINCIPAL_ID);
  }

  const res = await fetch(apiUrl(path), { ...options, headers });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

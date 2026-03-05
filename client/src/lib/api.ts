import { QueryClient } from "@tanstack/react-query";
import { getToken } from "./auth";

const THIRTY_SECONDS = 30_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: THIRTY_SECONDS,
      retry: 1,
    },
  },
});

export async function fetchApi<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    ...(options?.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options?.headers,
  };

  const res = await fetch(path, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((body as { message?: string }).message || res.statusText);
  }

  return res.json() as Promise<T>;
}

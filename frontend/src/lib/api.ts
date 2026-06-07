/**
 * Shared API client.
 *
 * Wraps `fetch` with:
 *  - Automatic `Authorization: Bearer <token>` header injection
 *  - Base URL resolution from `VITE_API_URL` env variable
 *  - `credentials: 'include'` for cookie-based auth (SSR / OAuth)
 *  - Typed response helpers (`json<T>`, `ok`)
 *
 * Usage:
 *   import { apiFetch } from '@/lib/api'
 *   const data = await apiFetch('/api/media?page=1').json<ApiPage>()
 */

import { useAuthStore } from '@/stores/auth';

const BASE = import.meta.env.VITE_API_URL ?? '';

export interface ApiResponse {
  /** Parsed JSON body — throws if the status is not 2xx */
  json<T = any>(): Promise<T>;
  /** Raw fetch Response (for status checks, headers, etc.) */
  raw: Response;
  /** True when status is 2xx */
  ok: boolean;
  status: number;
}

/**
 * Perform an authenticated fetch against the application API.
 *
 * @param path   Path relative to the API base (e.g. `/api/media`)
 * @param init   Standard `RequestInit` options (method, body, signal, …)
 * @param token  Optional override token — uses the auth store by default
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<ApiResponse> {
  // Resolve auth token — prefer explicit argument, then store
  let authToken = token;
  if (authToken === undefined) {
    try {
      // Lazy-resolve so this utility can be imported at module load time
      // (stores are not yet initialised at that point)
      const authStore = useAuthStore();
      authToken = authStore.authToken;
    } catch {
      authToken = null;
    }
  }

  const headers = new Headers(init.headers as HeadersInit | undefined);

  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const response = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers,
  });

  return {
    raw: response,
    ok: response.ok,
    status: response.status,
    async json<T = unknown>(): Promise<T> {
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message =
          body?.error?.message ??
          body?.error ??
          body?.message ??
          `HTTP ${response.status}`;
        throw new Error(String(message));
      }
      return response.json() as Promise<T>;
    },
  };
}

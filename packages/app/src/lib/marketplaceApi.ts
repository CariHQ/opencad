/**
 * Marketplace API client — typed wrapper for `/api/v1/marketplace` endpoints.
 *
 * Auth: Firebase ID token attached via Authorization header.
 * Base URL: `VITE_API_BASE_URL` + `/api/v1/marketplace` (falls back to `/api/v1/marketplace`).
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Plugin {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  icon?: string;
  rating: number;
  downloadCount: number;
  price: number | 'free';
  installed: boolean;
}

export interface InstallResult {
  pluginId: string;
  installedAt: string;
}

// ── Token provider (injected by auth layer at runtime) ────────────────────────

let _getToken: (() => Promise<string | null>) | null = null;

export function registerMarketplaceTokenProvider(fn: () => Promise<string | null>): void {
  _getToken = fn;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function baseUrl(): string {
  const viteBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
  return `${viteBase}/api/v1/marketplace`;
}

async function authHeaders(): Promise<HeadersInit> {
  const token = _getToken ? await _getToken().catch(() => null) : null;
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const url = `${baseUrl()}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { ...headers, ...(init?.headers ?? {}) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Marketplace API network error: ${message}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Marketplace API ${res.status}: ${text}`);
  }
  // 204 No Content (uninstall)
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function listPlugins(options?: { category?: string; search?: string }): Promise<Plugin[]> {
  const params = new URLSearchParams();
  if (options?.category) params.set('category', options.category);
  if (options?.search) params.set('search', options.search);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<Plugin[]>(`/plugins${qs}`);
}

export function getPlugin(id: string): Promise<Plugin> {
  return apiFetch<Plugin>(`/plugins/${encodeURIComponent(id)}`);
}

export function installPlugin(id: string): Promise<InstallResult> {
  return apiFetch<InstallResult>(`/plugins/${encodeURIComponent(id)}/install`, {
    method: 'POST',
  });
}

export function uninstallPlugin(id: string): Promise<void> {
  return apiFetch<void>(`/plugins/${encodeURIComponent(id)}/uninstall`, {
    method: 'DELETE',
  });
}

export function listInstalled(): Promise<Plugin[]> {
  return apiFetch<Plugin[]>('/plugins/installed');
}

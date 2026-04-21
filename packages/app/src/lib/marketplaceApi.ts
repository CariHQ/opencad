/**
 * Marketplace API client — typed wrapper for `/api/v1/marketplace` endpoints.
 *
 * Auth: Firebase ID token attached via Authorization header.
 * Base URL: `VITE_API_BASE_URL` + `/api/v1/marketplace` (falls back to `/api/v1/marketplace`).
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type PluginPermission = 'network' | 'storage' | 'ui' | 'document';

/** Public catalogue entry. Matches `PluginView` in server/src/routes/plugins.rs. */
export interface Plugin {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  icon?: string;
  /** URL of the plugin bundle (or `inline:<key>` for built-in examples). */
  entrypoint: string;
  /** Optional SRI hash (sha384-…) for bundle integrity verification. */
  sriHash?: string;
  permissions: PluginPermission[];
  rating: number;
  downloadCount: number;
  price: number | 'free';
  installed: boolean;
}

/** A plugin the current user has installed. Includes the version the user
 *  locally has so we can prompt for updates when `version !== installedVersion`. */
export interface InstalledPlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  installedVersion: string;
  author: string;
  category: string;
  icon?: string;
  entrypoint: string;
  sriHash?: string;
  permissions: PluginPermission[];
  priceCents: number;
  rating: number;
  revoked: boolean;
  revokedReason?: string;
  installedAt: string;
}

export interface InstallResult {
  pluginId: string;
  version: string;
  installedAt: string;
}

export interface PluginReportBody {
  reason: 'malware' | 'broken' | 'spam' | 'policy' | 'other';
  details?: string;
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

export function listInstalled(): Promise<InstalledPlugin[]> {
  return apiFetch<InstalledPlugin[]>('/plugins/installed');
}

export function reportPlugin(id: string, body: PluginReportBody): Promise<void> {
  return apiFetch<void>(`/plugins/${encodeURIComponent(id)}/report`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ── Publisher submission ─────────────────────────────────────────────────────

export interface SubmitPluginBody {
  id: string;
  name: string;
  description?: string;
  version: string;
  category?: string;
  icon?: string;
  entrypoint: string;
  sriHash?: string;
  permissions: PluginPermission[];
  priceCents?: number;
}

export function submitPlugin(body: SubmitPluginBody): Promise<Plugin> {
  return apiFetch<Plugin>('/plugins', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ── Admin ────────────────────────────────────────────────────────────────────

export function adminListQueue(): Promise<Plugin[]> {
  return apiFetch<Plugin[]>('/admin/queue');
}

export function adminSetModeration(
  id: string,
  status: 'pending' | 'approved' | 'rejected',
  notes?: string,
): Promise<Plugin> {
  return apiFetch<Plugin>(`/admin/plugins/${encodeURIComponent(id)}/moderation`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes }),
  });
}

export function adminRevoke(
  id: string,
  revoked: boolean,
  reason?: string,
): Promise<Plugin> {
  return apiFetch<Plugin>(`/admin/plugins/${encodeURIComponent(id)}/revoke`, {
    method: 'PATCH',
    body: JSON.stringify({ revoked, reason }),
  });
}

// ── Publishers ───────────────────────────────────────────────────────────────

export interface Publisher {
  firebaseUid: string;
  displayName: string;
  contactEmail: string;
  stripeAccountId?: string;
  stripeOnboarded: boolean;
  payoutsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export function registerPublisher(body: {
  displayName: string;
  contactEmail: string;
}): Promise<Publisher> {
  return apiFetch<Publisher>('/publishers', {
    method: 'POST',
    body: JSON.stringify({
      display_name: body.displayName,
      contact_email: body.contactEmail,
    }),
  });
}

export function getPublisher(): Promise<Publisher> {
  return apiFetch<Publisher>('/publishers/me');
}

export function getOnboardingUrl(): Promise<{ url: string }> {
  return apiFetch<{ url: string }>('/publishers/me/onboarding-url');
}

// ── Bundle upload ────────────────────────────────────────────────────────────

/** Upload a plugin's JS bundle. Server hashes it (SHA-384) and stores
 *  it under plugin-bundles/{id}/{version}/. Returns the final
 *  entrypoint URL and SRI hash the manifest will reference. */
export async function uploadBundle(
  pluginId: string,
  bundle: File,
): Promise<{ entrypoint: string; sriHash: string }> {
  const url = `${baseUrl()}/plugins/${encodeURIComponent(pluginId)}/bundle`;
  const token = _getToken ? await _getToken().catch(() => null) : null;
  const form = new FormData();
  form.append('bundle', bundle);
  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Bundle upload ${res.status}: ${text}`);
  }
  return res.json() as Promise<{ entrypoint: string; sriHash: string }>;
}

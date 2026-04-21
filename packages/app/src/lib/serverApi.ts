/**
 * Server API client — all calls to the OpenCAD backend.
 *
 * Auth: Firebase ID token attached via Authorization header.
 * Base URL: proxied through Vite dev server; uses /api prefix in production.
 */

/**
 * Token provider — injected at runtime by the auth layer so serverApi.ts
 * doesn't have a hard compile-time dependency on firebase.
 */
let _getToken: (() => Promise<string | null>) | null = null;

export function registerTokenProvider(fn: () => Promise<string | null>): void {
  _getToken = fn;
}

async function authHeaders(): Promise<HeadersInit> {
  const token = _getToken ? await _getToken().catch(() => null) : null;
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

/** Authenticated JSON fetch against /api/v1. Exported as `serverFetch`
 *  for use by other modules (e.g. branches.ts) that want the same auth
 *  + baseUrl + error-handling wrapper without reaching in privately. */
export async function serverFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(path, init);
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Feedback ──────────────────────────────────────────────────────────────────

export type FeedbackCategory = 'bug' | 'feature' | 'question';

export interface FeedbackItem {
  id: number;
  title: string;
  feasibility: string;
  prd_label: string | null;
  github_issue_url: string | null;
  github_issue_number: number | null;
}

export const feedbackApi = {
  submit: (
    category: FeedbackCategory,
    title: string,
    description: string,
  ): Promise<FeedbackItem> =>
    apiFetch<FeedbackItem>('/feedback', {
      method: 'POST',
      body: JSON.stringify({ category, title, description }),
    }),
};

// ── Documents ─────────────────────────────────────────────────────────────────

export interface DocumentMeta {
  id: string;
  name: string;
  updatedAt: number;
}

export const documentsApi = {
  list: (): Promise<DocumentMeta[]> => apiFetch<DocumentMeta[]>('/documents'),
  save: (projectId: string, schema: unknown): Promise<void> =>
    apiFetch<void>(`/documents/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(schema),
    }),
};

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  email: string;
  role: string;
  trialEndsAt: number | null;
}

export const authApi = {
  // Server route is POST /api/v1/auth/me — it upserts the user row in Postgres
  // as a side-effect of returning the profile.
  me: (): Promise<UserProfile> => apiFetch<UserProfile>('/auth/me', { method: 'POST' }),
};

// ── Server health ─────────────────────────────────────────────────────────────

/** Base URL for HTTP API requests (without trailing slash). */
export const SERVER_URL = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? '';

/** WebSocket URL for real-time sync. */
export const SERVER_WS_URL = (import.meta.env.VITE_SERVER_WS_URL as string | undefined)
  ?? (SERVER_URL ? SERVER_URL.replace(/^http/, 'ws') : 'ws://localhost:47821');

/**
 * Returns true if the OpenCAD backend is reachable.
 * Server exposes /health at the root (not under /api/v1) — matches the
 * Cloud Run liveness probe path in server/src/routes/mod.rs.
 */
export async function isServerAvailable(): Promise<boolean> {
  try {
    const res = await fetch('/health', { method: 'GET', signal: AbortSignal.timeout(3000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

// ── Projects ──────────────────────────────────────────────────────────────────

export interface ProjectServerMeta {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export const projectsApi = {
  list: (): Promise<ProjectServerMeta[]> => apiFetch<ProjectServerMeta[]>('/projects'),
  create: (name: string, id?: string): Promise<ProjectServerMeta> =>
    apiFetch<ProjectServerMeta>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, id }),
    }),
  update: (id: string, name: string): Promise<ProjectServerMeta> =>
    apiFetch<ProjectServerMeta>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
  delete: (id: string): Promise<void> =>
    apiFetch<void>(`/projects/${id}`, { method: 'DELETE' }),
};

// ── Subscriptions ─────────────────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'trial' | 'pro' | 'business';

/** Derived by the server from tier + Stripe subscription state. Drives
 *  read-only-mode gating on the client. */
export type AccessMode = 'active' | 'trial' | 'grace' | 'expired';

/** Mirrors Stripe's subscription.status, or null when the user has never
 *  subscribed. See
 *  https://docs.stripe.com/api/subscriptions/object#subscription_object-status */
export type StripeSubscriptionStatus =
  | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
  | 'incomplete' | 'incomplete_expired' | 'paused';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  subscriptionStatus: StripeSubscriptionStatus | null;
  /** Milliseconds since epoch for the end of the current paid (or trial)
   *  period, or null if the user has no time-bound access. */
  validUntil: number | null;
  cancelAtPeriodEnd: boolean;
  accessMode: AccessMode;
}

export interface Invoice {
  id: string;
  number: string | null;
  /** Seconds since epoch (Stripe uses seconds, not ms). */
  created: number;
  amountPaid: number;   // cents
  currency: string;     // ISO code, lowercase
  status: string;       // Stripe invoice status
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
}

export const subscriptionApi = {
  getStatus: (): Promise<SubscriptionStatus> =>
    apiFetch<SubscriptionStatus>('/subscription/status'),

  createCheckout: (tier: 'pro' | 'business'): Promise<{ url: string }> =>
    apiFetch<{ url: string }>('/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify({ tier }),
    }),

  openPortal: (): Promise<{ url: string }> =>
    apiFetch<{ url: string }>('/subscription/portal', { method: 'POST' }),

  listInvoices: (): Promise<Invoice[]> =>
    apiFetch<Invoice[]>('/subscription/invoices'),
};

/**
 * Thin client for the OpenCAD REST API server.
 *
 * Default base URL: http://localhost:8081 (local dev).
 * Override via VITE_SERVER_URL env var.
 *
 * All methods gracefully return null / throw on failure — callers decide
 * whether to fall back to local storage.
 */

const SERVER_URL: string =
  (import.meta.env?.VITE_SERVER_URL as string | undefined) ?? 'http://localhost:47821';

/** WebSocket base URL derived from the HTTP URL (http→ws, https→wss). */
export const SERVER_WS_URL: string = SERVER_URL.replace(/^http/, 'ws');

// ── Types ────────────────────────────────────────────────────────────────────

export interface ServerProject {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ServerDocument {
  project_id: string;
  data: string;
  version: number;
}

// ── Internal fetch helper ─────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SERVER_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${path} → HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Health ────────────────────────────────────────────────────────────────────

/** Returns true if the server is reachable within 2 s. */
export async function isServerAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${SERVER_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Projects ──────────────────────────────────────────────────────────────────

export const projectsApi = {
  list: (): Promise<ServerProject[]> =>
    request<ServerProject[]>('/api/v1/projects'),

  /**
   * Create a project on the server.
   * Pass `id` to preserve the client UUID (used during reconciliation so that
   * locally-created projects keep the same ID when pushed to the server).
   */
  create: (name: string, id?: string): Promise<ServerProject> =>
    request<ServerProject>('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify(id ? { id, name } : { name }),
    }),

  update: (id: string, name: string): Promise<ServerProject> =>
    request<ServerProject>(`/api/v1/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  delete: (id: string): Promise<void> =>
    request<void>(`/api/v1/projects/${id}`, { method: 'DELETE' }),
};

// ── Documents ─────────────────────────────────────────────────────────────────

export const documentsApi = {
  get: (projectId: string): Promise<ServerDocument | null> =>
    request<ServerDocument>(`/api/v1/projects/${projectId}/document`).catch(() => null),

  save: (projectId: string, data: string): Promise<ServerDocument> =>
    request<ServerDocument>(`/api/v1/projects/${projectId}/document`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    }),
};

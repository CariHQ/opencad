/**
 * T-DOC-010: Projects API — list, create, delete, rename
 *
 * Wraps /api/v1/projects endpoints using the same `apiFetch` pattern as
 * serverApi.ts.  A separate module so it can be mocked independently in tests.
 */

let _getToken: (() => Promise<string | null>) | null = null;

export function registerProjectsTokenProvider(fn: () => Promise<string | null>): void {
  _getToken = fn;
}

async function authHeaders(): Promise<HeadersInit> {
  const token = _getToken ? await _getToken().catch(() => null) : null;
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
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
  // DELETE returns 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;       // Unix ms
  elementCount: number;
  thumbnail?: string;      // data URL or undefined
  tags: string[];
}

export const projectsApi = {
  list(): Promise<ProjectSummary[]> {
    return apiFetch<ProjectSummary[]>('/projects');
  },

  create(name: string, templateId?: string): Promise<{ id: string }> {
    return apiFetch<{ id: string }>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, templateId }),
    });
  },

  delete(id: string): Promise<void> {
    return apiFetch<void>(`/projects/${id}`, { method: 'DELETE' });
  },

  rename(id: string, name: string): Promise<void> {
    return apiFetch<void>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },
};

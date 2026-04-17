import { create } from 'zustand';
import { isServerAvailable, projectsApi } from '../lib/serverApi';

export interface ProjectMeta {
  id: string;
  name: string;
  thumbnail: string | null;
  createdAt: number;
  updatedAt: number;
  collaborators: string[];
  starred: boolean;
}

type SortBy = 'lastEdited' | 'created' | 'name' | 'size';
type FilterBy = 'all' | 'mine' | 'shared' | 'starred';
type ViewMode = 'grid' | 'list';

interface ProjectState {
  projects: ProjectMeta[];
  activeProjectId: string | null;
  viewMode: ViewMode;
  sortBy: SortBy;
  filterBy: FilterBy;
  searchQuery: string;
  serverOnline: boolean;

  createProject: (name: string) => string;
  openProject: (id: string) => void;
  closeProject: () => void;
  deleteProject: (id: string) => void;
  starProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  updateThumbnail: (id: string, thumbnail: string) => void;

  setViewMode: (mode: ViewMode) => void;
  setSortBy: (sortBy: SortBy) => void;
  setFilterBy: (filterBy: FilterBy) => void;
  setSearchQuery: (query: string) => void;

  /** Reconcile local projects with the server. Call once on app mount. */
  syncFromServer: () => Promise<void>;

  getFilteredProjects: () => ProjectMeta[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Matches the standard 8-4-4-4-12 UUID v4 format. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(s: string): boolean {
  return UUID_RE.test(s);
}

// ── Local persistence ─────────────────────────────────────────────────────────

function loadProjects(): ProjectMeta[] {
  try {
    const raw = localStorage.getItem('opencad-projects');
    if (raw) return JSON.parse(raw) as ProjectMeta[];
  } catch { /* ignore */ }
  return [];
}

function saveProjects(projects: ProjectMeta[]): void {
  try {
    localStorage.setItem('opencad-projects', JSON.stringify(projects));
  } catch { /* ignore */ }
}

// Prevents React Strict Mode's double-invocation from running two concurrent syncs.
let _syncInProgress = false;

// ── Store ─────────────────────────────────────────────────────────────────────

export const useProjectStore = create<ProjectState>()((set, get) => ({
  projects: loadProjects(),
  activeProjectId: null,
  viewMode: 'grid',
  sortBy: 'lastEdited',
  filterBy: 'all',
  searchQuery: '',
  serverOnline: false,

  // ── Reconciliation ──────────────────────────────────────────────────────────

  syncFromServer: async () => {
    // Guard: React Strict Mode double-invokes effects. Prevent concurrent syncs.
    if (_syncInProgress) return;
    _syncInProgress = true;

    try {
      const online = await isServerAvailable();
      set({ serverOnline: online });
      if (!online) return;

      try {
        let local = get().projects;

        // Step 1: Migrate any legacy non-UUID IDs (proj-xxx format) to real UUIDs
        // so they can be pushed to the server. Patch in place and save immediately.
        const migrated = local.map((p) => {
          if (!isUUID(p.id)) {
            return { ...p, id: crypto.randomUUID() };
          }
          return p;
        });
        if (migrated.some((p, i) => p.id !== local[i].id)) {
          saveProjects(migrated);
          set({ projects: migrated });
          local = migrated;
        }

        // Step 2: Fetch current server state.
        let serverProjects = await projectsApi.list();
        const serverById = new Map(serverProjects.map((s) => [s.id, s]));

        // Step 3: Push any local-only projects to server (preserving UUIDs).
        // Use live state (get().projects) to catch projects created while the
        // health check / server fetch was in flight.
        const liveBeforePush = get().projects;
        const localOnly = liveBeforePush.filter((p) => !serverById.has(p.id));
        if (localOnly.length > 0) {
          await Promise.allSettled(
            localOnly.map((p) => projectsApi.create(p.name, p.id))
          );
          // Re-fetch to get the authoritative list after pushes complete.
          serverProjects = await projectsApi.list();
        }

        // Step 4: Server is the source of truth for which projects exist.
        // Overlay local-only UI state (starred, thumbnail) on top of server data.
        // Use live state again so any projects created mid-sync are preserved,
        // not silently dropped by overwriting the store with a stale snapshot.
        const liveNow = get().projects;
        const liveById = new Map(liveNow.map((p) => [p.id, p]));
        const finalServerById = new Map(serverProjects.map((s) => [s.id, s]));

        const merged: ProjectMeta[] = [
          // Every project the server knows about (authoritative list).
          ...serverProjects.map((s) => {
            const localMeta = liveById.get(s.id);
            return {
              id: s.id,
              name: s.name,
              thumbnail: localMeta?.thumbnail ?? null,
              createdAt: new Date(s.created_at).getTime(),
              updatedAt: new Date(s.updated_at).getTime(),
              collaborators: [],
              starred: localMeta?.starred ?? false,
            };
          }),
          // Keep any local-only projects whose push failed — retry on next sync.
          ...liveNow.filter((p) => !finalServerById.has(p.id)),
        ];

        saveProjects(merged);
        set({ projects: merged });
      } catch {
        // Server error — keep working with local data.
      }
    } finally {
      _syncInProgress = false;
    }
  },

  // ── CRUD ───────────────────────────────────────────────────────────────────

  createProject: (name) => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const project: ProjectMeta = {
      id,
      name,
      thumbnail: null,
      createdAt: now,
      updatedAt: now,
      collaborators: [],
      starred: false,
    };
    const projects = [...get().projects, project];
    saveProjects(projects);
    set({ projects });

    // Fire-and-forget push to server; pass the same UUID so IDs stay stable.
    if (get().serverOnline) {
      projectsApi.create(name, id).catch(() => {});
    }

    return id;
  },

  openProject: (id) => set({ activeProjectId: id }),

  closeProject: () => set({ activeProjectId: null }),

  deleteProject: (id) => {
    const projects = get().projects.filter((p) => p.id !== id);
    saveProjects(projects);
    set({
      projects,
      activeProjectId: get().activeProjectId === id ? null : get().activeProjectId,
    });
    if (get().serverOnline) {
      projectsApi.delete(id).catch(() => {});
    }
  },

  starProject: (id) => {
    // Starred state is a local UI preference — not synced to server.
    const projects = get().projects.map((p) =>
      p.id === id ? { ...p, starred: !p.starred } : p
    );
    saveProjects(projects);
    set({ projects });
  },

  renameProject: (id, name) => {
    const projects = get().projects.map((p) =>
      p.id === id ? { ...p, name, updatedAt: Date.now() } : p
    );
    saveProjects(projects);
    set({ projects });
    if (get().serverOnline) {
      projectsApi.update(id, name).catch(() => {});
    }
  },

  updateThumbnail: (id, thumbnail) => {
    const projects = get().projects.map((p) =>
      p.id === id ? { ...p, thumbnail, updatedAt: Date.now() } : p
    );
    saveProjects(projects);
    set({ projects });
  },

  setViewMode: (viewMode) => set({ viewMode }),
  setSortBy: (sortBy) => set({ sortBy }),
  setFilterBy: (filterBy) => set({ filterBy }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  getFilteredProjects: () => {
    const { projects, searchQuery, filterBy, sortBy } = get();
    let filtered = projects;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (filterBy === 'starred') {
      filtered = filtered.filter((p) => p.starred);
    }

    switch (sortBy) {
      case 'name':
        return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
      case 'created':
        return [...filtered].sort((a, b) => b.createdAt - a.createdAt);
      case 'lastEdited':
      default:
        return [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);
    }
  },
}));

import { create } from 'zustand';

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

  getFilteredProjects: () => ProjectMeta[];
}

function loadProjects(): ProjectMeta[] {
  try {
    const raw = localStorage.getItem('opencad-projects');
    if (raw) return JSON.parse(raw) as ProjectMeta[];
  } catch {
    // ignore
  }
  return [];
}

function saveProjects(projects: ProjectMeta[]): void {
  try {
    localStorage.setItem('opencad-projects', JSON.stringify(projects));
  } catch {
    // ignore
  }
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: loadProjects(),
  activeProjectId: null,
  viewMode: 'grid',
  sortBy: 'lastEdited',
  filterBy: 'all',
  searchQuery: '',

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
    return id;
  },

  openProject: (id) => set({ activeProjectId: id }),

  closeProject: () => set({ activeProjectId: null }),

  deleteProject: (id) => {
    const projects = get().projects.filter((p) => p.id !== id);
    saveProjects(projects);
    set({ projects, activeProjectId: get().activeProjectId === id ? null : get().activeProjectId });
  },

  starProject: (id) => {
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
    // 'mine', 'shared' require auth context — no-op for now

    switch (sortBy) {
      case 'name':
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'created':
        filtered = [...filtered].sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'lastEdited':
      default:
        filtered = [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);
        break;
    }

    return filtered;
  },
}));

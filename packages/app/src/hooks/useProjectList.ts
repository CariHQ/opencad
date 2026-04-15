/**
 * T-DOC-005: Project list — manage multiple projects in localStorage
 */
import { useState, useCallback } from 'react';

export interface ProjectEntry {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;
}

const STORAGE_KEY = 'opencad-projects';

function loadProjects(): ProjectEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ProjectEntry[];
  } catch {
    return [];
  }
}

function saveProjects(projects: ProjectEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch { /* ignore storage errors */ }
}

export interface UseProjectListResult {
  projects: ProjectEntry[];
  createProject: (name: string) => ProjectEntry;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  refreshProjects: () => void;
}

export function useProjectList(): UseProjectListResult {
  const [projects, setProjects] = useState<ProjectEntry[]>(() => loadProjects());

  const refreshProjects = useCallback(() => {
    setProjects(loadProjects());
  }, []);

  const createProject = useCallback((name: string): ProjectEntry => {
    const entry: ProjectEntry = {
      id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setProjects((prev) => {
      const next = [...prev, entry];
      saveProjects(next);
      return next;
    });
    return entry;
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveProjects(next);
      return next;
    });
  }, []);

  const renameProject = useCallback((id: string, name: string) => {
    setProjects((prev) => {
      const next = prev.map((p) =>
        p.id === id ? { ...p, name, updatedAt: Date.now() } : p
      );
      saveProjects(next);
      return next;
    });
  }, []);

  return { projects, createProject, deleteProject, renameProject, refreshProjects };
}

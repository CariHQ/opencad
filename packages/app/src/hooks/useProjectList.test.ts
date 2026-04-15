/**
 * T-DOC-005: Project list hook tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjectList } from './useProjectList';

describe('T-DOC-005: useProjectList', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty list when no storage', () => {
    const { result } = renderHook(() => useProjectList());
    expect(result.current.projects).toHaveLength(0);
  });

  it('createProject adds a project', () => {
    const { result } = renderHook(() => useProjectList());
    act(() => {
      result.current.createProject('My House');
    });
    expect(result.current.projects).toHaveLength(1);
    expect(result.current.projects[0]?.name).toBe('My House');
  });

  it('createProject returns the new project entry', () => {
    const { result } = renderHook(() => useProjectList());
    let entry: ReturnType<typeof result.current.createProject> | undefined;
    act(() => {
      entry = result.current.createProject('Office Block');
    });
    expect(entry?.name).toBe('Office Block');
    expect(entry?.id).toBeTruthy();
  });

  it('created project has createdAt and updatedAt', () => {
    const before = Date.now();
    const { result } = renderHook(() => useProjectList());
    act(() => {
      result.current.createProject('Tower');
    });
    const p = result.current.projects[0]!;
    expect(p.createdAt).toBeGreaterThanOrEqual(before);
    expect(p.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it('deleteProject removes the project', () => {
    const { result } = renderHook(() => useProjectList());
    act(() => {
      result.current.createProject('To Delete');
    });
    const id = result.current.projects[0]!.id;
    act(() => {
      result.current.deleteProject(id);
    });
    expect(result.current.projects).toHaveLength(0);
  });

  it('deleteProject with unknown id leaves list intact', () => {
    const { result } = renderHook(() => useProjectList());
    act(() => {
      result.current.createProject('Keep Me');
    });
    act(() => {
      result.current.deleteProject('nonexistent-id');
    });
    expect(result.current.projects).toHaveLength(1);
  });

  it('renameProject updates the name', () => {
    const { result } = renderHook(() => useProjectList());
    act(() => {
      result.current.createProject('Old Name');
    });
    const id = result.current.projects[0]!.id;
    act(() => {
      result.current.renameProject(id, 'New Name');
    });
    expect(result.current.projects[0]?.name).toBe('New Name');
  });

  it('renameProject updates updatedAt', () => {
    const { result } = renderHook(() => useProjectList());
    act(() => {
      result.current.createProject('Proj');
    });
    const id = result.current.projects[0]!.id;
    const before = result.current.projects[0]!.updatedAt;
    act(() => {
      result.current.renameProject(id, 'Renamed');
    });
    expect(result.current.projects[0]?.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useProjectList());
    act(() => {
      result.current.createProject('Persisted');
    });
    const raw = localStorage.getItem('opencad-projects');
    expect(raw).toBeTruthy();
    const stored = JSON.parse(raw!);
    expect(stored[0]?.name).toBe('Persisted');
  });

  it('refreshProjects loads from storage', () => {
    localStorage.setItem('opencad-projects', JSON.stringify([
      { id: 'ext-1', name: 'External', createdAt: 0, updatedAt: 0 },
    ]));
    const { result } = renderHook(() => useProjectList());
    expect(result.current.projects[0]?.name).toBe('External');
  });
});

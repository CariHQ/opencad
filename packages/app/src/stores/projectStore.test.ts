import { describe, it, expect, beforeEach, vi } from 'vitest';

// Reset modules between tests so localStorage is fresh
beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe('T-SYNC-010: projectStore', () => {
  it('starts with an empty project list', async () => {
    const { useProjectStore } = await import('./projectStore');
    const state = useProjectStore.getState();
    expect(state.projects).toHaveLength(0);
  });

  it('createProject adds a project with name, timestamps, and starred=false', async () => {
    const { useProjectStore } = await import('./projectStore');
    const { createProject } = useProjectStore.getState();
    const id = createProject('My House');
    const { projects } = useProjectStore.getState();
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('My House');
    expect(projects[0].id).toBe(id);
    expect(projects[0].starred).toBe(false);
    expect(projects[0].createdAt).toBeGreaterThan(0);
    expect(projects[0].updatedAt).toBeGreaterThan(0);
  });

  it('createProject returns unique ids', async () => {
    const { useProjectStore } = await import('./projectStore');
    const { createProject } = useProjectStore.getState();
    const id1 = createProject('A');
    const id2 = createProject('B');
    expect(id1).not.toBe(id2);
  });

  it('openProject sets activeProjectId', async () => {
    const { useProjectStore } = await import('./projectStore');
    const { createProject, openProject } = useProjectStore.getState();
    const id = createProject('Test');
    openProject(id);
    expect(useProjectStore.getState().activeProjectId).toBe(id);
  });

  it('closeProject clears activeProjectId', async () => {
    const { useProjectStore } = await import('./projectStore');
    const { createProject, openProject, closeProject } = useProjectStore.getState();
    const id = createProject('Test');
    openProject(id);
    closeProject();
    expect(useProjectStore.getState().activeProjectId).toBeNull();
  });

  it('deleteProject removes the project by id', async () => {
    const { useProjectStore } = await import('./projectStore');
    const { createProject, deleteProject } = useProjectStore.getState();
    const id = createProject('To delete');
    createProject('Keep');
    deleteProject(id);
    const { projects } = useProjectStore.getState();
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('Keep');
  });

  it('starProject toggles the starred flag', async () => {
    const { useProjectStore } = await import('./projectStore');
    const { createProject, starProject } = useProjectStore.getState();
    const id = createProject('Fav');
    starProject(id);
    expect(useProjectStore.getState().projects[0].starred).toBe(true);
    starProject(id);
    expect(useProjectStore.getState().projects[0].starred).toBe(false);
  });

  it('renameProject updates the project name', async () => {
    const { useProjectStore } = await import('./projectStore');
    const { createProject, renameProject } = useProjectStore.getState();
    const id = createProject('Old Name');
    renameProject(id, 'New Name');
    expect(useProjectStore.getState().projects[0].name).toBe('New Name');
  });

  it('setViewMode switches between grid and list', async () => {
    const { useProjectStore } = await import('./projectStore');
    useProjectStore.getState().setViewMode('list');
    expect(useProjectStore.getState().viewMode).toBe('list');
    useProjectStore.getState().setViewMode('grid');
    expect(useProjectStore.getState().viewMode).toBe('grid');
  });

  it('setSortBy updates sortBy', async () => {
    const { useProjectStore } = await import('./projectStore');
    useProjectStore.getState().setSortBy('name');
    expect(useProjectStore.getState().sortBy).toBe('name');
  });

  it('setFilterBy updates filterBy', async () => {
    const { useProjectStore } = await import('./projectStore');
    useProjectStore.getState().setFilterBy('starred');
    expect(useProjectStore.getState().filterBy).toBe('starred');
  });

  it('setSearchQuery updates searchQuery', async () => {
    const { useProjectStore } = await import('./projectStore');
    useProjectStore.getState().setSearchQuery('house');
    expect(useProjectStore.getState().searchQuery).toBe('house');
  });

  it('getFilteredProjects filters by search query (case-insensitive)', async () => {
    const { useProjectStore } = await import('./projectStore');
    const { createProject, setSearchQuery, getFilteredProjects } = useProjectStore.getState();
    createProject('My House');
    createProject('Office Building');
    setSearchQuery('house');
    expect(getFilteredProjects()).toHaveLength(1);
    expect(getFilteredProjects()[0].name).toBe('My House');
  });

  it('getFilteredProjects filters starred projects', async () => {
    const { useProjectStore } = await import('./projectStore');
    const { createProject, starProject, setFilterBy, getFilteredProjects } =
      useProjectStore.getState();
    const id1 = createProject('A');
    createProject('B');
    starProject(id1);
    setFilterBy('starred');
    expect(getFilteredProjects()).toHaveLength(1);
    expect(getFilteredProjects()[0].id).toBe(id1);
  });

  it('getFilteredProjects sorts by name', async () => {
    const { useProjectStore } = await import('./projectStore');
    const { createProject, setSortBy, getFilteredProjects } = useProjectStore.getState();
    createProject('Zebra');
    createProject('Apple');
    createProject('Mango');
    setSortBy('name');
    const sorted = getFilteredProjects();
    expect(sorted.map((p) => p.name)).toEqual(['Apple', 'Mango', 'Zebra']);
  });

  it('persists projects to localStorage', async () => {
    const { useProjectStore } = await import('./projectStore');
    useProjectStore.getState().createProject('Saved');
    const raw = localStorage.getItem('opencad-projects');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('Saved');
  });
});

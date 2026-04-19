/**
 * T-DOC-010: ProjectBrowser — list, search, filter, sort projects
 */
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { projectsApi, type ProjectSummary } from '../lib/projectsApi';
import { ConfirmModal } from './ConfirmModal';

type SortKey = 'name-asc' | 'name-desc' | 'recent' | 'oldest';

export interface ProjectBrowserProps {
  /** Called when the user clicks on a project card. */
  onSelect?: (project: ProjectSummary) => void;
}

export function ProjectBrowser({ onSelect }: ProjectBrowserProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchRaw, setSearchRaw] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [pendingDelete, setPendingDelete] = useState<ProjectSummary | null>(null);

  // Debounce search input by 300 ms
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchRaw), 300);
    return () => clearTimeout(timer);
  }, [searchRaw]);

  useEffect(() => {
    let cancelled = false;
    projectsApi
      .list()
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, search]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    switch (sortKey) {
      case 'name-asc':
        return copy.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return copy.sort((a, b) => b.name.localeCompare(a.name));
      case 'recent':
        return copy.sort((a, b) => b.updatedAt - a.updatedAt);
      case 'oldest':
        return copy.sort((a, b) => a.updatedAt - b.updatedAt);
      default:
        return copy;
    }
  }, [filtered, sortKey]);

  const handleNewProject = useCallback(() => {
    const name = window.prompt('Project name:', 'Untitled Project');
    if (name === null) return;
    projectsApi.create(name).then(({ id }) => {
      const newProject: ProjectSummary = {
        id,
        name,
        updatedAt: Date.now(),
        elementCount: 0,
        thumbnail: undefined,
        tags: [],
      };
      setProjects((prev) => [newProject, ...prev]);
    });
  }, []);

  const handleDelete = useCallback((project: ProjectSummary) => {
    setPendingDelete(project);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    projectsApi.delete(pendingDelete.id).then(() => {
      setProjects((prev) => prev.filter((p) => p.id !== pendingDelete.id));
    });
    setPendingDelete(null);
  }, [pendingDelete]);

  if (loading) {
    return <div className="project-browser-loading">Loading projects…</div>;
  }

  return (
    <>
    {pendingDelete && (
      <ConfirmModal
        message={`Delete "${pendingDelete.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    )}
    <div className="project-browser">
      {/* Toolbar */}
      <div className="project-browser-toolbar">
        <input
          data-testid="project-search"
          className="project-search-input"
          placeholder="Search projects…"
          value={searchRaw}
          onChange={(e) => setSearchRaw(e.target.value)}
        />

        <label htmlFor="project-sort-select" className="sr-only">
          Sort by
        </label>
        <select
          id="project-sort-select"
          data-testid="sort-select"
          className="project-sort-select"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
        >
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="recent">Recent first</option>
          <option value="oldest">Oldest first</option>
        </select>

        <button
          data-testid="view-toggle"
          className={`view-toggle-btn${viewMode === 'grid' ? ' active' : ''}`}
          title="Grid view"
          onClick={() => setViewMode('grid')}
        >
          <LayoutGrid size={16} />
        </button>
        <button
          className={`view-toggle-btn${viewMode === 'list' ? ' active' : ''}`}
          title="List view"
          onClick={() => setViewMode('list')}
        >
          <List size={16} />
        </button>

        <button
          data-testid="new-project-btn"
          className="btn-primary"
          onClick={handleNewProject}
        >
          New Project
        </button>
      </div>

      {/* Empty state */}
      {sorted.length === 0 ? (
        <div className="project-browser-empty">
          <p>No projects found.</p>
          <button className="btn-primary" onClick={handleNewProject}>
            Create your first project
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'projects-grid' : 'projects-list'}>
          {sorted.map((project) => (
            <div
              key={project.id}
              data-testid={`project-card-${project.id}`}
              className="project-card"
              role="button"
              tabIndex={0}
              onClick={() => onSelect?.(project)}
              onKeyDown={(e) => e.key === 'Enter' && onSelect?.(project)}
            >
              {/* Thumbnail */}
              <div className="project-card-thumb">
                {project.thumbnail ? (
                  <img src={project.thumbnail} alt={project.name} />
                ) : (
                  <div className="project-thumb-placeholder" />
                )}
              </div>

              {/* Footer */}
              <div className="project-card-footer">
                <span className="project-name">{project.name}</span>
                <div className="project-card-actions">
                  <button
                    aria-label={`Delete ${project.name}`}
                    title="Delete project"
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(project);
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="project-card-meta">
                {new Date(project.updatedAt).toLocaleDateString()}
                {project.elementCount > 0 && ` · ${project.elementCount} elements`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}

import React, { useState, useCallback, useEffect } from 'react';
import { LayoutGrid, List, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { ProjectTemplates } from './ProjectTemplates';
import { isTauri, tauriStartDragging } from '../hooks/useTauri';

export function ProjectDashboard() {
  const navigate = useNavigate();
  const [showTemplates, setShowTemplates] = useState(false);
  const {
    viewMode,
    sortBy,
    filterBy,
    searchQuery,
    createProject,
    openProject,
    deleteProject,
    starProject,
    setViewMode,
    setSortBy,
    setFilterBy,
    setSearchQuery,
    getFilteredProjects,
    syncFromServer,
  } = useProjectStore();

  useEffect(() => {
    void syncFromServer();
  }, [syncFromServer]);

  const projects = getFilteredProjects();

  const handleHeaderMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    if (!(e.target as HTMLElement).closest('button, input, a, select, [role="button"]')) {
      if (isTauri()) tauriStartDragging();
    }
  }, []);

  function handleOpenProject(id: string) {
    openProject(id);
    navigate(`/project/${id}`);
  }

  function handleNewProject() {
    const id = createProject('Untitled Project');
    openProject(id);
    navigate(`/project/${id}`);
  }

  return (
    <div className="project-dashboard">
      <header className="dashboard-header" data-tauri-drag-region onMouseDown={handleHeaderMouseDown}>
        <h1 className="dashboard-title">Projects</h1>
        <button className="btn-secondary" onClick={() => setShowTemplates(true)}>
          From Template
        </button>
        <button className="btn-primary" onClick={handleNewProject}>
          New Project
        </button>
      </header>

      <div className="dashboard-toolbar">
        <div className="filter-tabs">
          {(['all', 'starred', 'mine', 'shared'] as const).map((f) => (
            <button
              key={f}
              className={`filter-tab${filterBy === f ? ' active' : ''}`}
              onClick={() => setFilterBy(f)}
            >
              {f === 'all' ? 'All' : f === 'starred' ? 'Starred' : f === 'mine' ? 'Mine' : 'Shared'}
            </button>
          ))}
        </div>

        <div className="dashboard-controls">
          <input
            className="search-input"
            placeholder="Search projects…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <label htmlFor="sort-select" className="sr-only">
            Sort by
          </label>
          <select
            id="sort-select"
            aria-label="Sort by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="sort-select"
          >
            <option value="lastEdited">Last edited</option>
            <option value="created">Created</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
          </select>

          <button
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
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="dashboard-empty">
          <div className="empty-hero">
            <h2 className="empty-title">No projects yet</h2>
            <p className="empty-subtitle">Start with a blank canvas or choose a template below.</p>
            <button className="btn-primary" onClick={handleNewProject}>
              New Blank Project
            </button>
          </div>
          <div className="empty-templates-section">
            <p className="empty-templates-label">Or start from a template</p>
            <ProjectTemplates
              onSelect={(tmpl) => {
                const id = createProject(tmpl.name);
                openProject(id);
                navigate(`/project/${id}`);
              }}
            />
          </div>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'projects-grid' : 'projects-list'}>
          {projects.map((project) => (
            <div key={project.id} className="project-card">
              <div
                className="project-card-thumb"
                onClick={() => handleOpenProject(project.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleOpenProject(project.id)}
              >
                {project.thumbnail ? (
                  <img src={project.thumbnail} alt={project.name} />
                ) : (
                  <div className="project-thumb-placeholder" />
                )}
              </div>
              <div className="project-card-footer">
                <span
                  className="project-name"
                  onClick={() => handleOpenProject(project.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleOpenProject(project.id)}
                >
                  {project.name}
                </span>
                <div className="project-card-actions">
                  <button
                    className={`star-btn${project.starred ? ' starred' : ''}`}
                    title={project.starred ? 'Unstar project' : 'Star project'}
                    onClick={(e) => {
                      e.stopPropagation();
                      starProject(project.id);
                    }}
                  >
                    <Star size={14} fill={project.starred ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    className="delete-btn"
                    title="Delete project"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
                        deleteProject(project.id);
                      }
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="project-card-meta">
                {new Date(project.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {showTemplates && (
        <div className="templates-overlay" onClick={() => setShowTemplates(false)}>
          <div className="templates-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="templates-close"
              aria-label="Close templates"
              onClick={() => setShowTemplates(false)}
            >
              ×
            </button>
            <ProjectTemplates
              onSelect={(tmpl) => {
                const id = createProject(tmpl.name);
                openProject(id);
                navigate(`/project/${id}`);
                setShowTemplates(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

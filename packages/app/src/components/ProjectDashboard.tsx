import React from 'react';
import { LayoutGrid, List, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';

export function ProjectDashboard() {
  const navigate = useNavigate();
  const {
    viewMode,
    sortBy,
    filterBy,
    searchQuery,
    createProject,
    openProject,
    starProject,
    setViewMode,
    setSortBy,
    setFilterBy,
    setSearchQuery,
    getFilteredProjects,
  } = useProjectStore();

  const projects = getFilteredProjects();

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
      <header className="dashboard-header">
        <h1 className="dashboard-title">Projects</h1>
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
          <p>No projects yet. Create one to get started.</p>
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
              </div>
              <div className="project-card-meta">
                {new Date(project.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

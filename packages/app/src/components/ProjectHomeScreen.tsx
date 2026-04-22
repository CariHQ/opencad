/**
 * ProjectHomeScreen — full-screen panel shown in AppLayout when no project is loaded.
 *
 * Features:
 * - Header: logo + "New Project" button + sign-in placeholder
 * - Recent projects grid: cards from localStorage `opencad-recent-projects`
 * - Templates row: Blank, Residential Unit, Commercial Office, Site Plan
 * - Import button: IFC / DWG / PDF file picker
 * - Empty state when no recent projects
 *
 * Tests: T-DASH-001, T-DASH-002, T-DASH-003
 */
import React, { useEffect, useState, useRef } from 'react';
import { FolderOpen, User, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../stores/documentStore';
import { useNavigate } from 'react-router-dom';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RecentProject {
  id: string;
  name: string;
  updatedAt: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const RECENT_PROJECTS_KEY = 'opencad-recent-projects';

const TEMPLATES: Array<{ id: string; name: string; description: string }> = [
  { id: 'blank', name: 'Blank', description: 'Start from scratch' },
  { id: 'residential', name: 'Residential Unit', description: 'Single-family home layout' },
  { id: 'commercial', name: 'Commercial Office', description: 'Open-plan office with meeting rooms' },
  { id: 'site-plan', name: 'Site Plan', description: 'Topographic site with building outlines' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function loadRecentProjects(): RecentProject[] {
  try {
    const raw = localStorage.getItem(RECENT_PROJECTS_KEY);
    if (raw) return JSON.parse(raw) as RecentProject[];
  } catch { /* ignore corrupt data */ }
  return [];
}

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface ProjectHomeScreenProps {
  /** Called when the user picks a file to import (receives the File object). */
  onImport?: (file: File) => void;
}

export function ProjectHomeScreen({ onImport }: ProjectHomeScreenProps): React.JSX.Element {
  const { t } = useTranslation('common');
  const { initProject } = useDocumentStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  // T-DASH-003: load recent projects from localStorage on mount
  useEffect(() => {
    setRecentProjects(loadRecentProjects());
  }, []);

  // T-DASH-002: clicking "New Project" calls documentStore.initProject()
  function handleNewProject(templateId = 'blank'): void {
    const projectId = crypto.randomUUID();
    const templateName = TEMPLATES.find((t) => t.id === templateId)?.name ?? 'Untitled Project';
    const projectName = templateId === 'blank' ? 'Untitled Project' : templateName;
    initProject(projectId, 'user-1');
    navigate(`/project/${projectId}`);
    // Persist to recent projects list
    const updated: RecentProject[] = [
      { id: projectId, name: projectName, updatedAt: Date.now() },
      ...recentProjects.filter((p) => p.id !== projectId),
    ].slice(0, 20);
    try {
      localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
    } catch { /* ignore storage errors */ }
  }

  function handleOpenRecent(project: RecentProject): void {
    initProject(project.id, 'user-1');
    navigate(`/project/${project.id}`);
  }

  function handleImportClick(): void {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    onImport?.(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  }

  return (
    <div className="project-home-screen" data-testid="project-home-screen">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="project-home-header">
        <div className="project-home-brand">
          <img src="/favicon.svg" alt="OpenCAD" className="brand-logo-img" />
          <span className="project-home-brand-name">OpenCAD</span>
        </div>
        <div className="project-home-header-actions">
          <button
            data-testid="new-project-btn"
            className="btn-primary project-home-new-btn"
            onClick={() => handleNewProject('blank')}
          >
            <Plus size={14} strokeWidth={2.5} />
            {t('home.newProject', { defaultValue: 'New Project' })}
          </button>
          <button className="toolbar-btn" title={t('home.signIn', { defaultValue: 'Sign In' })} aria-label={t('home.signIn', { defaultValue: 'Sign In' })}>
            <User size={15} />
          </button>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="project-home-body">

        {/* Recent Projects */}
        <section className="project-home-section" aria-labelledby="recent-heading">
          <div className="project-home-section-header">
            <h2 id="recent-heading" className="project-home-section-title">{t('home.recentProjects', { defaultValue: 'Recent Projects' })}</h2>
            <button
              className="project-home-import-btn"
              title={t('home.importIfcDwgPdf', { defaultValue: 'Import IFC / DWG / PDF' })}
              onClick={handleImportClick}
            >
              <FolderOpen size={15} />
              <span>{t('home.importIfcDwgPdf', { defaultValue: 'Import IFC / DWG / PDF' })}</span>
            </button>
          </div>

          {recentProjects.length === 0 ? (
            <div className="project-home-empty" data-testid="recent-empty-state">
              <p className="project-home-empty-text">{t('home.emptyText', { defaultValue: 'Start a new project or import a file' })}</p>
              <div className="project-home-empty-actions">
                <button className="btn-primary" onClick={() => handleNewProject('blank')}>{t('home.newBlankProject', { defaultValue: 'New Blank Project' })}</button>
                <button className="btn-secondary" onClick={handleImportClick}>{t('home.importFile', { defaultValue: 'Import a File' })}</button>
              </div>
            </div>
          ) : (
            <div className="projects-grid" data-testid="recent-projects-grid">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="project-card"
                  data-testid={`recent-project-${project.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenRecent(project)}
                  onKeyDown={(e) => e.key === 'Enter' && handleOpenRecent(project)}
                >
                  <div className="project-card-thumb">
                    <div className="project-thumb-placeholder" />
                  </div>
                  <div className="project-card-footer">
                    <span className="project-name">{project.name}</span>
                  </div>
                  <div className="project-card-meta">{formatDate(project.updatedAt)}</div>
                  <div className="project-card-hover-overlay">
                    <button
                      className="btn-primary project-card-open-btn"
                      onClick={(e) => { e.stopPropagation(); handleOpenRecent(project); }}
                    >
                      {t('home.open', { defaultValue: 'Open' })}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Templates */}
        <section className="project-home-section" aria-labelledby="templates-heading">
          <h2 id="templates-heading" className="project-home-section-title">{t('home.startFromTemplate', { defaultValue: 'Start from a Template' })}</h2>
          <div className="project-home-templates" data-testid="templates-row">
            {TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                className="project-template-card"
                data-testid={`template-${tmpl.id}`}
                onClick={() => handleNewProject(tmpl.id)}
              >
                <div className="template-thumb-placeholder" />
                <span className="template-card-name">{tmpl.name}</span>
                <span className="template-card-desc">{tmpl.description}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ifc,.dwg,.pdf,.dxf,.rvt,.skp,.pln"
        style={{ display: 'none' }}
        data-testid="file-import-input"
        onChange={handleFileChange}
      />
    </div>
  );
}

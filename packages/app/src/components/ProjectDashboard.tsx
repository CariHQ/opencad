import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  LayoutGrid,
  List,
  Star,
  Settings as SettingsIcon,
  LogOut,
  CreditCard,
  ChevronDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { useAuthStore } from '../stores/authStore';
import { ProjectTemplates } from './ProjectTemplates';
import { isTauri, tauriStartDragging } from '../hooks/useTauri';
import { ConfirmModal } from './ConfirmModal';
import { APIKeyPanel } from './APIKeyPanel';
import { PermissionsPanel } from './PermissionsPanel';
import { SSOSettingsPanel, type SSOConfig } from './SSOSettingsPanel';
import { BillingPanel } from './BillingPanel';
import { SubscriptionModal } from './SubscriptionModal';

const SSO_STORAGE_KEY = 'opencad-sso-config';
function loadSSOConfig(): SSOConfig | undefined {
  try {
    const raw = localStorage.getItem(SSO_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SSOConfig) : undefined;
  } catch { return undefined; }
}
function saveSSOConfig(cfg: SSOConfig): void {
  try { localStorage.setItem(SSO_STORAGE_KEY, JSON.stringify(cfg)); } catch { /* quota */ }
}

type SettingsTab = 'apikeys' | 'permissions' | 'sso' | 'billing';

export function ProjectDashboard() {
  const navigate = useNavigate();
  const [showTemplates, setShowTemplates] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('apikeys');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { signOut: authSignOut } = useAuthStore();

  // Apply stored theme (same key AppLayout uses) so dashboard matches the app
  useEffect(() => {
    const stored = localStorage.getItem('opencad-theme');
    const systemDark = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
    const theme = stored ? (JSON.parse(stored) as string) : (systemDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  }, []);
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
    hydrateThumbnails,
  } = useProjectStore();

  useEffect(() => {
    void syncFromServer();
    void hydrateThumbnails();
  }, [syncFromServer, hydrateThumbnails]);

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
    <>
    {pendingDeleteId && (
      <ConfirmModal
        message={`Delete "${pendingDeleteName}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => { deleteProject(pendingDeleteId); setPendingDeleteId(null); }}
        onCancel={() => setPendingDeleteId(null)}
      />
    )}
    <div className="project-dashboard">
      <header className="dashboard-header" data-tauri-drag-region onMouseDown={handleHeaderMouseDown}>
        <h1 className="dashboard-title">Projects</h1>
        <div className="dashboard-header-spacer" />
        <button className="btn-secondary" onClick={() => setShowTemplates(true)}>
          From Template
        </button>
        <button className="btn-primary" onClick={handleNewProject}>
          New Project
        </button>
        <DashboardUserMenu
          onOpenSettings={() => setShowSettings(true)}
          onOpenBilling={() => { setSettingsTab('billing'); setShowSettings(true); }}
          onOpenUpgrade={() => setShowUpgrade(true)}
        />
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
                      setPendingDeleteId(project.id);
                      setPendingDeleteName(project.name);
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

      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h2 className="settings-modal-title">Settings</h2>
              <div className="settings-header-actions">
                <button
                  className="settings-signout"
                  aria-label="Sign out"
                  onClick={() => { setShowSettings(false); void authSignOut(); }}
                >
                  Sign out
                </button>
                <button
                  className="settings-close"
                  aria-label="Close settings"
                  onClick={() => setShowSettings(false)}
                >
                  ×
                </button>
              </div>
            </div>
            <div className="settings-tabs">
              <button className={`settings-tab-btn${settingsTab === 'apikeys' ? ' active' : ''}`} onClick={() => setSettingsTab('apikeys')}>API Keys</button>
              <button className={`settings-tab-btn${settingsTab === 'permissions' ? ' active' : ''}`} onClick={() => setSettingsTab('permissions')}>Permissions</button>
              <button className={`settings-tab-btn${settingsTab === 'sso' ? ' active' : ''}`} onClick={() => setSettingsTab('sso')}>SSO</button>
              <button className={`settings-tab-btn${settingsTab === 'billing' ? ' active' : ''}`} onClick={() => setSettingsTab('billing')}>Billing</button>
            </div>
            <div className="settings-content">
              {settingsTab === 'apikeys' && <APIKeyPanel />}
              {settingsTab === 'permissions' && <PermissionsPanel />}
              {settingsTab === 'sso' && (
                <SSOSettingsPanel
                  config={loadSSOConfig()}
                  onSave={(cfg) => saveSSOConfig(cfg)}
                />
              )}
              {settingsTab === 'billing' && (
                <BillingPanel onUpgrade={() => { setShowSettings(false); setShowUpgrade(true); }} />
              )}
            </div>
          </div>
        </div>
      )}

      {showUpgrade && <SubscriptionModal onClose={() => setShowUpgrade(false)} />}
    </div>
    </>
  );
}

// ─── User menu ────────────────────────────────────────────────────────────────

interface DashboardUserMenuProps {
  onOpenSettings: () => void;
  onOpenBilling: () => void;
  onOpenUpgrade: () => void;
}

function DashboardUserMenu({ onOpenSettings, onOpenBilling, onOpenUpgrade }: DashboardUserMenuProps): React.JSX.Element | null {
  const { status, profile, signOut } = useAuthStore();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Click-outside close.
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (status !== 'authenticated' || !profile) return null;

  const initial = (profile.name || profile.email || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="dashboard-user-menu" ref={rootRef}>
      <button
        className="dashboard-user-chip"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="dashboard-user-avatar">{initial}</span>
        <span className="dashboard-user-label">
          <span className="dashboard-user-name">{profile.name || profile.email}</span>
          <span className={`dashboard-user-plan dashboard-user-plan--${profile.plan}`}>
            {profile.plan === 'free' ? 'Free' : profile.plan === 'trial' ? 'Trial' : profile.plan === 'pro' ? 'Pro' : 'Team'}
          </span>
        </span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="dashboard-user-dropdown" role="menu">
          <div className="dashboard-user-dropdown-header">
            <span className="dashboard-user-dropdown-name">{profile.name || 'Unnamed'}</span>
            <span className="dashboard-user-dropdown-email">{profile.email}</span>
          </div>
          <button className="dashboard-user-dropdown-item" onClick={() => { setOpen(false); onOpenSettings(); }}>
            <SettingsIcon size={14} />
            <span>Settings</span>
          </button>
          <button className="dashboard-user-dropdown-item" onClick={() => { setOpen(false); onOpenBilling(); }}>
            <CreditCard size={14} />
            <span>Billing</span>
          </button>
          {profile.plan === 'free' && (
            <button className="dashboard-user-dropdown-item dashboard-user-dropdown-upgrade" onClick={() => { setOpen(false); onOpenUpgrade(); }}>
              <span>Upgrade to Pro</span>
              <span className="dashboard-user-dropdown-arrow">→</span>
            </button>
          )}
          <div className="dashboard-user-dropdown-divider" />
          <button className="dashboard-user-dropdown-item" onClick={() => { setOpen(false); void signOut(); }}>
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}

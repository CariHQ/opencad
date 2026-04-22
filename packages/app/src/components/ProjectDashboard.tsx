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
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../stores/projectStore';
import { useAuthStore } from '../stores/authStore';
import { ProjectTemplates } from './ProjectTemplates';
import { isTauri, tauriStartDragging } from '../hooks/useTauri';
import { ConfirmModal } from './ConfirmModal';
import { APIKeyPanel } from './APIKeyPanel';
import { PermissionsPanel } from './PermissionsPanel';
import { SSOSettingsPanel, type SSOConfig } from './SSOSettingsPanel';
import { LanguageSettingsPanel } from './LanguageSettingsPanel';
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

type SettingsTab = 'language' | 'apikeys' | 'permissions' | 'sso' | 'billing';

export function ProjectDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const [showTemplates, setShowTemplates] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('language');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const ssoEnabled = (import.meta.env.VITE_SSO_ENABLED as string | undefined) === 'true';
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState<string>('');
  const renameInputRef = useRef<HTMLInputElement>(null);
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
    renameProject,
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

  function startRename(id: string, currentName: string) {
    setRenamingId(id);
    setRenameDraft(currentName);
    setTimeout(() => renameInputRef.current?.select(), 0);
  }

  function commitRename() {
    if (!renamingId) return;
    const trimmed = renameDraft.trim();
    if (trimmed) renameProject(renamingId, trimmed);
    setRenamingId(null);
    setRenameDraft('');
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameDraft('');
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
        message={t('dashboard.confirmDelete', { name: pendingDeleteName, defaultValue: 'Delete "{{name}}"? This cannot be undone.' })}
        confirmLabel={t('action.delete')}
        onConfirm={() => { deleteProject(pendingDeleteId); setPendingDeleteId(null); }}
        onCancel={() => setPendingDeleteId(null)}
      />
    )}
    <div className="project-dashboard">
      <header className="dashboard-header" data-tauri-drag-region onMouseDown={handleHeaderMouseDown}>
        <h1 className="dashboard-title">{t('dashboard.title')}</h1>
        <div className="dashboard-header-spacer" />
        <button className="btn-secondary" onClick={() => setShowTemplates(true)}>
          {t('dashboard.fromTemplate')}
        </button>
        <button className="btn-primary" onClick={handleNewProject}>
          {t('dashboard.newProject')}
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
              {t(`dashboard.filter.${f}`)}
            </button>
          ))}
        </div>

        <div className="dashboard-controls">
          <input
            className="search-input"
            placeholder={t('dashboard.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <label htmlFor="sort-select" className="sr-only">
            {t('dashboard.sortBy')}
          </label>
          <select
            id="sort-select"
            aria-label={t('dashboard.sortBy')}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="sort-select"
          >
            <option value="lastEdited">{t('dashboard.sort.lastEdited')}</option>
            <option value="created">{t('dashboard.sort.created')}</option>
            <option value="name">{t('dashboard.sort.name')}</option>
            <option value="size">{t('dashboard.sort.size')}</option>
          </select>

          <button
            className={`view-toggle-btn${viewMode === 'grid' ? ' active' : ''}`}
            title={t('dashboard.gridView')}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            className={`view-toggle-btn${viewMode === 'list' ? ' active' : ''}`}
            title={t('dashboard.listView')}
            onClick={() => setViewMode('list')}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="dashboard-empty">
          <div className="empty-hero">
            <h2 className="empty-title">{t('dashboard.empty.title')}</h2>
            <p className="empty-subtitle">{t('dashboard.empty.subtitle')}</p>
            <button className="btn-primary" onClick={handleNewProject}>
              {t('dashboard.newBlankProject')}
            </button>
          </div>
          <div className="empty-templates-section">
            <p className="empty-templates-label">{t('dashboard.empty.orTemplate')}</p>
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
                {renamingId === project.id ? (
                  <input
                    ref={renameInputRef}
                    className="project-name-input project-name-inline"
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                      else if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span
                    className="project-name"
                    onClick={() => handleOpenProject(project.id)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startRename(project.id, project.name);
                    }}
                    title={t('dashboard.card.clickToOpen')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleOpenProject(project.id);
                      else if (e.key === 'F2') { e.preventDefault(); startRename(project.id, project.name); }
                    }}
                  >
                    {project.name}
                  </span>
                )}
                <div className="project-card-actions">
                  <button
                    className={`star-btn${project.starred ? ' starred' : ''}`}
                    title={project.starred ? t('dashboard.card.unstar') : t('dashboard.card.star')}
                    onClick={(e) => {
                      e.stopPropagation();
                      starProject(project.id);
                    }}
                  >
                    <Star size={14} fill={project.starred ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    className="delete-btn"
                    title={t('dashboard.card.delete')}
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
              aria-label={t('dashboard.closeTemplates')}
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
              <h2 className="settings-modal-title">{t('settings.title')}</h2>
              <div className="settings-header-actions">
                <button
                  className="settings-signout"
                  aria-label={t('dashboard.signOut')}
                  onClick={() => { setShowSettings(false); void authSignOut(); }}
                >
                  {t('dashboard.signOut')}
                </button>
                <button
                  className="settings-close"
                  aria-label={t('dashboard.closeSettings')}
                  onClick={() => setShowSettings(false)}
                >
                  ×
                </button>
              </div>
            </div>
            <div className="settings-tabs">
              <button className={`settings-tab-btn${settingsTab === 'language' ? ' active' : ''}`} onClick={() => setSettingsTab('language')}>{t('settings.tabs.language')}</button>
              <button className={`settings-tab-btn${settingsTab === 'apikeys' ? ' active' : ''}`} onClick={() => setSettingsTab('apikeys')}>{t('settings.tabs.apiKeys')}</button>
              <button className={`settings-tab-btn${settingsTab === 'permissions' ? ' active' : ''}`} onClick={() => setSettingsTab('permissions')}>{t('settings.tabs.permissions')}</button>
              {ssoEnabled && (
                <button className={`settings-tab-btn${settingsTab === 'sso' ? ' active' : ''}`} onClick={() => setSettingsTab('sso')}>{t('settings.tabs.sso')}</button>
              )}
              <button className={`settings-tab-btn${settingsTab === 'billing' ? ' active' : ''}`} onClick={() => setSettingsTab('billing')}>{t('settings.tabs.billing')}</button>
            </div>
            <div className="settings-content">
              {settingsTab === 'language' && <LanguageSettingsPanel />}
              {settingsTab === 'apikeys' && <APIKeyPanel />}
              {settingsTab === 'permissions' && <PermissionsPanel />}
              {settingsTab === 'sso' && ssoEnabled && (
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
  const { t } = useTranslation('common');
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
            <span>{t('nav.settings')}</span>
          </button>
          <button className="dashboard-user-dropdown-item" onClick={() => { setOpen(false); onOpenBilling(); }}>
            <CreditCard size={14} />
            <span>{t('nav.billing')}</span>
          </button>
          {profile.plan === 'free' && (
            <button className="dashboard-user-dropdown-item dashboard-user-dropdown-upgrade" onClick={() => { setOpen(false); onOpenUpgrade(); }}>
              <span>{t('dashboard.upgradeToPro')}</span>
              <span className="dashboard-user-dropdown-arrow">→</span>
            </button>
          )}
          <div className="dashboard-user-dropdown-divider" />
          <button className="dashboard-user-dropdown-item" onClick={() => { setOpen(false); void signOut(); }}>
            <LogOut size={14} />
            <span>{t('dashboard.signOut')}</span>
          </button>
        </div>
      )}
    </div>
  );
}

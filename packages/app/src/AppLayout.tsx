import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  FolderOpen,
  FileDown,
  Bot,
  Home,
  Sun,
  Moon,
  PanelLeft,
  PanelRight,
  Settings2,
  Table2,
  LayoutDashboard,
  AlertTriangle,
  Camera,
  Sheet,
  MessageSquareWarning,
  Blocks,
  MessageCircle,
  Leaf,
  DollarSign,
  Palette,
  Waypoints,
  Slice,
  SunMedium,
  MapPin,
  FileText,
  Image,
  Store,
  Wind,
  User,
  History,
  MessageCirclePlus,
  HelpCircle,
  Shield,
  Zap,
  GitBranch,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { ToolShelf } from './components/ToolShelf';
import { Navigator } from './components/Navigator';

import { PropertiesPanel } from './components/PropertiesPanel';
import { StatusBar } from './components/StatusBar';
import { AIChatPanel } from './components/AIChatPanel';
import { LevelManager } from './components/LevelManager';
import { ImportExportModal } from './components/ImportExportModal';
import { ColumnBeamPanel } from './components/ColumnBeamPanel';
import { StairRailingPanel } from './components/StairRailingPanel';
import { useDocumentStore } from './stores/documentStore';
import { useLocalStorage } from './hooks/useLocalStorage';
import { WallToolPanel } from './components/WallToolPanel';
import { CurtainWallPanel } from './components/CurtainWallPanel';
import { SlabToolPanel } from './components/SlabToolPanel';
import { DoorWindowPanel } from './components/DoorWindowPanel';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useAutoSave } from './hooks/useAutoSave';
import { useRole } from './hooks/useRole';
import { PanelErrorBoundary } from './components/ErrorBoundary';
import { SchedulePanel } from './components/SchedulePanel';
import { SpacePanel } from './components/SpacePanel';
import { ClashDetectionPanel } from './components/ClashDetectionPanel';
import { CompliancePanel } from './components/CompliancePanel';
import { RenderPanel } from './components/RenderPanel';
import { SheetPanel } from './components/SheetPanel';
import { BCFPanel } from './components/BCFPanel';
import { parseBCF, serializeBCF, type BCFFile, type BCFTopic } from '@opencad/document';
import { MaterialLibrary } from './components/MaterialLibrary';
import { PresenceOverlay } from './components/PresenceOverlay';
import { CommandPalette } from './components/CommandPalette';
import { CommentsPanel } from './components/CommentsPanel';
import { CarbonPanel, type CarbonEntry } from './components/CarbonPanel';
import { CostPanel, type CostItem } from './components/CostPanel';
import { computeTakeoff } from './lib/quantityTakeoff';
import { BUILT_IN_MATERIALS } from './lib/materials';
import {
  pluginHost,
  onPluginNotification,
  onPluginCommandsChange,
  listPluginCommands,
  type PluginNotification,
  type PluginCommand,
} from './plugins/pluginHost';
import type { AdminMember } from './components/AdminPanel';
import type { SSOConfig } from './components/SSOSettingsPanel';
import type { RoleName } from './config/roles';

// ─── Persistent admin / SSO storage ──────────────────────────────────────────
// These are local-first for now — once a real server-backed org API lands
// they'll move to HTTP endpoints. For this build the admin changes persist
// per-browser so at least the UI state survives a refresh.

const SSO_STORAGE_KEY = 'opencad-sso-config';
const MEMBERS_STORAGE_KEY = 'opencad-project-members';
const BCF_STORAGE_KEY = 'opencad-bcf-topics';

// Synchronous localStorage view of the async orgStore. We use the async
// version for writes; for reads we shadow into localStorage directly so
// panels can render without a load-spinner flash.
function loadOrgMembersForProject(projectId: string | null): AdminMember[] | undefined {
  if (!projectId) return undefined;
  try {
    const raw = localStorage.getItem('opencad-org-state');
    if (!raw) return undefined;
    const state = JSON.parse(raw) as { orgs: Record<string, { members: AdminMember[] }>; projectOrg: Record<string, string> };
    const orgId = state.projectOrg?.[projectId];
    if (!orgId) return undefined;
    const members = state.orgs?.[orgId]?.members;
    return members && members.length > 0 ? members : undefined;
  } catch { return undefined; }
}

function loadBCFTopics(): BCFTopic[] {
  try {
    const raw = localStorage.getItem(BCF_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BCFTopic[]) : [];
  } catch { return []; }
}
function saveBCFTopics(topics: BCFTopic[]): void {
  try { localStorage.setItem(BCF_STORAGE_KEY, JSON.stringify(topics)); } catch { /* quota */ }
}

function loadSSOConfig(): SSOConfig | undefined {
  try {
    const raw = localStorage.getItem(SSO_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SSOConfig) : undefined;
  } catch { return undefined; }
}
function saveSSOConfig(cfg: SSOConfig): void {
  try { localStorage.setItem(SSO_STORAGE_KEY, JSON.stringify(cfg)); } catch { /* quota */ }
}
function loadMembers(): AdminMember[] | undefined {
  try {
    const raw = localStorage.getItem(MEMBERS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AdminMember[]) : undefined;
  } catch { return undefined; }
}
function saveMemberRole(userId: string, role: RoleName): void {
  try {
    const raw = localStorage.getItem(MEMBERS_STORAGE_KEY);
    const existing = raw ? (JSON.parse(raw) as AdminMember[]) : [];
    const next = existing.some((m) => m.id === userId)
      ? existing.map((m) => (m.id === userId ? { ...m, role } : m))
      : [...existing, { id: userId, name: userId, role }];
    localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(next));
  } catch { /* quota */ }
}
import { HatchPanel } from './components/HatchPanel';
import { SymbolLibrary } from './components/SymbolLibrary';
import { ShadowAnalysisPanel } from './components/ShadowAnalysisPanel';
import { SectionBoxPanel } from './components/SectionBoxPanel';
import { SiteImportPanel } from './components/SiteImportPanel';
import { SpecWritingPanel } from './components/SpecWritingPanel';
import { PhotoToModelPanel } from './components/PhotoToModelPanel';
import { MarketplacePanel } from './components/MarketplacePanel';
import { WindAnalysisPanel } from './components/WindAnalysisPanel';
import { SplitViewport } from './components/SplitViewport';
import { AuthModal } from './components/AuthModal';
import { VersionHistoryPanel } from './components/VersionHistoryPanel';
import { BranchPanel } from './components/BranchPanel';
import { UnderlayPanel } from './components/UnderlayPanel';
import { ReviewPanel } from './components/ReviewPanel';
import { UpdateBanner } from './components/UpdateBanner';
import { useAuthStore } from './stores/authStore';
import { APIKeyPanel } from './components/APIKeyPanel';
import { PermissionsPanel } from './components/PermissionsPanel';
import { SSOSettingsPanel } from './components/SSOSettingsPanel';
import { BillingPanel } from './components/BillingPanel';
import { SubscriptionModal } from './components/SubscriptionModal';
import { MobileViewer } from './components/MobileViewer';
import { FeedbackWidget } from './components/FeedbackWidget';
import { HelpPanel } from './components/HelpPanel';
import { GuidedTour, hasSeenTour, markTourSeen } from './components/GuidedTour';
import { AdminPanel } from './components/AdminPanel';
import { PanelResizer } from './components/PanelResizer';
import { ProjectHomeScreen } from './components/ProjectHomeScreen';
import {
  isTauri,
  tauriToggleMaximize,
} from './hooks/useTauri';
import type { TauriUpdateInfo } from './hooks/useTauri';
import { usePresence } from './hooks/usePresence';
import './styles/app.css';

type RightPanelTab =
  | 'properties'
  | 'schedule'
  | 'spaces'
  | 'clash'
  | 'render'
  | 'sheets'
  | 'bcf'
  | 'materials'
  | 'comments'
  | 'carbon'
  | 'cost'
  | 'hatch'
  | 'symbols'
  | 'shadow'
  | 'section'
  | 'site'
  | 'specs'
  | 'photo'
  | 'marketplace'
  | 'wind'
  | 'admin'
  | 'history'
  | 'review'
  | 'layers'
  | 'compliance'
  | 'branches'
  | 'underlay';

const RIGHT_PANEL_TABS: { id: RightPanelTab; title: string; icon: React.ReactNode }[] = [
  { id: 'properties', title: 'Properties', icon: <Settings2 size={16} strokeWidth={2} /> },
  { id: 'schedule', title: 'Schedule', icon: <Table2 size={16} strokeWidth={2} /> },
  { id: 'spaces', title: 'Spaces', icon: <LayoutDashboard size={16} strokeWidth={2} /> },
  { id: 'clash', title: 'Clash', icon: <AlertTriangle size={16} strokeWidth={2} /> },
  { id: 'compliance', title: 'Compliance', icon: <Shield size={16} strokeWidth={2} /> },
  { id: 'render', title: 'Render', icon: <Camera size={16} strokeWidth={2} /> },
  { id: 'sheets', title: 'Sheets', icon: <Sheet size={16} strokeWidth={2} /> },
  { id: 'bcf', title: 'Issues', icon: <MessageSquareWarning size={16} strokeWidth={2} /> },
  { id: 'materials', title: 'Materials', icon: <Blocks size={16} strokeWidth={2} /> },
  { id: 'comments', title: 'Comments', icon: <MessageCircle size={16} strokeWidth={2} /> },
  { id: 'carbon', title: 'Carbon', icon: <Leaf size={16} strokeWidth={2} /> },
  { id: 'cost', title: 'Cost', icon: <DollarSign size={16} strokeWidth={2} /> },
  { id: 'hatch', title: 'Hatch', icon: <Palette size={16} strokeWidth={2} /> },
  { id: 'symbols', title: 'Symbols', icon: <Waypoints size={16} strokeWidth={2} /> },
  { id: 'shadow', title: 'Shadow', icon: <SunMedium size={16} strokeWidth={2} /> },
  { id: 'section', title: 'Section', icon: <Slice size={16} strokeWidth={2} /> },
  { id: 'site', title: 'Site Import', icon: <MapPin size={16} strokeWidth={2} /> },
  { id: 'specs', title: 'Specs', icon: <FileText size={16} strokeWidth={2} /> },
  { id: 'photo', title: 'Photo to Model', icon: <Image size={16} strokeWidth={2} /> },
  { id: 'marketplace', title: 'Marketplace', icon: <Store size={16} strokeWidth={2} /> },
  { id: 'wind', title: 'Wind Analysis', icon: <Wind size={16} strokeWidth={2} /> },
  { id: 'history', title: 'History', icon: <History size={16} strokeWidth={2} /> },
  { id: 'branches', title: 'Branches', icon: <GitBranch size={16} strokeWidth={2} /> },
  { id: 'underlay', title: 'PDF Underlay', icon: <FileText size={16} strokeWidth={2} /> },
];

/** Build CostPanel items from the document using quantityTakeoff + material rates. */
function computeCostItems(doc: NonNullable<ReturnType<typeof useDocumentStore.getState>['document']>): CostItem[] {
  const rows = computeTakeoff(doc);
  // Per-type fallback rates when elements have no applied material.
  const typeRates: Record<string, number> = {
    wall: 120, slab: 85, roof: 110, column: 180, beam: 160,
    door: 450, window: 380, stair: 950, railing: 110,
    curtain_wall: 280,
  };
  const out: CostItem[] = [];
  for (const row of rows) {
    if (row.count === 0) continue;
    const quantity = row.totalArea && row.totalArea > 0
      ? row.totalArea / 1e6     // mm² → m²
      : row.totalLength && row.totalLength > 0
        ? row.totalLength / 1000 // mm → m
        : row.count;
    const unit = row.totalArea ? 'm²' : row.totalLength ? 'm' : 'ea';
    const rate = typeRates[row.type] ?? 0;
    out.push({
      id: `cost-${row.type}`,
      elementType: row.type,
      description: `${row.type.charAt(0).toUpperCase()}${row.type.slice(1)} — ${row.count} item${row.count === 1 ? '' : 's'}`,
      quantity: Math.round(quantity * 100) / 100,
      unit,
      unitRate: rate,
      total: Math.round(quantity * rate),
    });
  }
  return out;
}

/** Build CarbonPanel entries from the document using material embodied-carbon data. */
function computeCarbonEntries(doc: NonNullable<ReturnType<typeof useDocumentStore.getState>['document']>): CarbonEntry[] {
  const rows = computeTakeoff(doc);
  const byMat = new Map<string, { quantity: number; mat: (typeof BUILT_IN_MATERIALS)[number] }>();

  for (const el of Object.values(doc.content.elements)) {
    const matName =
      (el.properties['Material']?.value as string | undefined) ??
      (el.properties['MaterialId']?.value as string | undefined);
    if (!matName) continue;
    const mat = BUILT_IN_MATERIALS.find((m) => m.name === matName);
    if (!mat || mat.embodiedCarbon === undefined || mat.density === undefined) continue;

    const row = rows.find((r) => r.type === el.type);
    const volumeM3 = row?.totalVolume ? row.totalVolume / 1e9 : 0;
    if (volumeM3 <= 0) continue;

    const existing = byMat.get(matName);
    if (existing) existing.quantity += volumeM3;
    else byMat.set(matName, { quantity: volumeM3, mat });
  }

  const out: CarbonEntry[] = [];
  for (const [name, { quantity, mat }] of byMat) {
    const massKg = quantity * (mat.density ?? 0);
    const kgCO2e = massKg * (mat.embodiedCarbon ?? 0);
    out.push({
      id: `carbon-${mat.id}`,
      material: name,
      quantity: Math.round(quantity * 100) / 100,
      unit: 'm³',
      kgCO2ePerUnit: Math.round((mat.embodiedCarbon ?? 0) * (mat.density ?? 0) * 100) / 100,
      totalKgCO2e: Math.round(kgCO2e),
      stage: 'A1-A3',
    });
  }
  return out;
}

export function AppLayout() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { document: doc, initProject, activeTool, selectedIds, setActiveTool, undo, redo, canUndo, canRedo, loadDocumentSchema, setElementMaterial, renameProject } = useDocumentStore();
  const leftPanelRef = React.useRef<HTMLElement>(null);
  const _rightPanelRef = React.useRef<HTMLElement>(null);
  void _rightPanelRef;
  const [isRenamingProject, setIsRenamingProject] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState('');
  const renameInputRef = React.useRef<HTMLInputElement>(null);
  const [showUpgrade, setShowUpgrade] = React.useState(false);
  const [showFeedback, setShowFeedback] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);
  const [showTour, setShowTour] = React.useState(false);

  // Auto-launch the guided tour on the user's first visit. Marked seen
  // when the user closes / completes it; replayable from Help.
  React.useEffect(() => {
    if (!hasSeenTour()) {
      const t = setTimeout(() => setShowTour(true), 800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []);

  // Wire browser online/offline events into the document store so the
  // StatusBar (and offline-queue flush on reconnect) react to real
  // connectivity, not a value that was frozen at `true` on load.
  React.useEffect(() => {
    const setOnline  = useDocumentStore.getState().setOnlineStatus;
    setOnline(navigator.onLine);
    const onOnline  = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // ? shortcut opens Help (when not typing in an input)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowHelp((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [tauriUpdateInfo, setTauriUpdateInfo] = React.useState<TauriUpdateInfo | null>(null);

  useUndoRedo({ undo, redo, canUndo, canRedo });
  useAutoSave();

  // Boot the plugin host once — loads every installed plugin into a worker
  // sandbox and keeps them in sync as the registry changes.
  React.useEffect(() => { void pluginHost.startAll(); }, []);

  // BCF panel re-mount nonce so imports surface immediately.
  const [bcfVersion, setBcfVersion] = React.useState(0);

  // Plugin-registered commands — rendered as entries in the Plugins menu.
  const [pluginCommands, setPluginCommands] = React.useState<PluginCommand[]>(() =>
    listPluginCommands(),
  );
  React.useEffect(() => onPluginCommandsChange(setPluginCommands), []);
  const [showPluginsMenu, setShowPluginsMenu] = React.useState(false);

  // Plugin notifications → transient toasts.
  const [pluginToasts, setPluginToasts] = React.useState<PluginNotification[]>([]);
  React.useEffect(() => {
    return onPluginNotification((n) => {
      setPluginToasts((prev) => [...prev, n]);
      setTimeout(() => {
        setPluginToasts((prev) => prev.filter((x) => x.id !== n.id));
      }, 4000);
    });
  }, []);

  // Stable local user ID from localStorage so it survives refreshes
  const localUserId = React.useMemo(() => {
    const stored = localStorage.getItem('opencad-local-uid');
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem('opencad-local-uid', id);
    return id;
  }, []);
  const { users: presenceUsers } = usePresence({ userId: localUserId, displayName: 'You' });
  const { can, allowedViews } = useRole();
  const [showAIChat, setShowAIChat] = useLocalStorage('opencad-showAIChat', false);
  const [activeView, setActiveView] = useLocalStorage<'floor-plan' | '3d' | 'section'>(
    'opencad-activeView',
    '3d'
  );
  const [selectedLevel, setSelectedLevel] = useLocalStorage<string | null>(
    'opencad-selectedLevel',
    null
  );
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('opencad-theme', systemTheme);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);
  const [showLeftPanel, setShowLeftPanel] = useLocalStorage('opencad-showLeftPanel', true);
  const [showRightPanel, setShowRightPanel] = useLocalStorage('opencad-showRightPanel', true);
  const [focusMode, setFocusMode] = useState(false);
  const [showModal, setShowModal] = useState<'import' | 'export' | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showAuth, setShowAuth] = useState<'login' | 'register' | null>(null);
  const { status: authStatus, profile: authProfile, signOut: authSignOut } = useAuthStore();
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'apikeys' | 'permissions' | 'sso' | 'billing'>('apikeys');
  const [rightPanelTab, setRightPanelTab] = useLocalStorage<RightPanelTab>(
    'opencad-rightPanelTab',
    'properties'
  );

  const [leftPanelWidth, setLeftPanelWidth] = useLocalStorage('opencad-leftPanelWidth', 260);
  const [rightPanelWidth, setRightPanelWidth] = useLocalStorage('opencad-rightPanelWidth', 260);
  const resizingRef = useRef<{ side: 'left' | 'right'; startX: number; startWidth: number } | null>(null);

  const startResize = useCallback((side: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = {
      side,
      startX: e.clientX,
      startWidth: side === 'left' ? leftPanelWidth : rightPanelWidth,
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [leftPanelWidth, rightPanelWidth]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { side, startX, startWidth } = resizingRef.current;
      const delta = e.clientX - startX;
      if (side === 'left') {
        setLeftPanelWidth(Math.max(180, Math.min(480, startWidth + delta)));
      } else {
        setRightPanelWidth(Math.max(220, Math.min(520, startWidth - delta)));
      }
    };
    const onMouseUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [setLeftPanelWidth, setRightPanelWidth]);

  const leftVisible = showLeftPanel && !focusMode;
  const rightVisible = showRightPanel && !focusMode;
  const chromeVisible = !focusMode;

  // Auto-switch to first allowed view if current view is locked out by role
  useEffect(() => {
    if (!allowedViews.includes(activeView)) {
      const first = allowedViews[0] as typeof activeView | undefined;
      if (first) setActiveView(first);
    }
  }, [allowedViews, activeView, setActiveView]);

  // Auto-switch right panel tab to first allowed tab if current tab is locked out
  useEffect(() => {
    if (!can(`panel:${rightPanelTab}`)) {
      const first = RIGHT_PANEL_TABS.find((t) => can(`panel:${t.id}`));
      if (first) setRightPanelTab(first.id);
    }
  }, [can, rightPanelTab, setRightPanelTab]);

  // When an element is selected from the Layers tab, auto-switch to Properties.
  // Do NOT override if the user is already on any other panel (e.g. Materials).
  useEffect(() => {
    if (selectedIds.length > 0 && can('panel:properties') && rightPanelTab === 'layers') {
      setRightPanelTab('properties');
    }
  }, [selectedIds, can, rightPanelTab, setRightPanelTab]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) metaThemeColor.setAttribute('content', theme === 'light' ? '#f0f0f0' : '#1e1e1e');
    window.dispatchEvent(new Event('theme-change'));
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  useEffect(() => {
    if (projectId) initProject(projectId, 'user-1');
  }, [projectId, initProject]);

  useEffect(() => {
    if (doc?.organization.levels && Object.keys(doc.organization.levels).length > 0 && !selectedLevel) {
      setSelectedLevel(Object.keys(doc.organization.levels)[0]);
    }
  }, [doc, selectedLevel, setSelectedLevel]);

  useEffect(() => {
    const TOOL_SHORTCUTS: Record<string, string> = {
      v: 'select', l: 'line', r: 'rectangle', c: 'circle', a: 'arc',
      p: 'polygon', w: 'wall', k: 'column', b: 'beam', s: 'slab',
      o: 'roof', t: 'stair', d: 'door', n: 'window', g: 'railing',
      m: 'dimension', x: 'text',
    };

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) {
        if ((e.metaKey || e.ctrlKey) && e.key === '[') {
          e.preventDefault();
          setShowLeftPanel((v) => !v);
        }
        if ((e.metaKey || e.ctrlKey) && e.key === ']') {
          e.preventDefault();
          setShowRightPanel((v) => !v);
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          setShowCommandPalette((v) => !v);
        }
        return;
      }

      if (e.key === '\\') {
        setFocusMode((f) => !f);
        return;
      }

      const toolId = TOOL_SHORTCUTS[e.key.toLowerCase()];
      if (toolId) {
        e.preventDefault();
        setActiveTool(toolId as Parameters<typeof setActiveTool>[0]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setShowLeftPanel, setShowRightPanel, setActiveTool]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleAIChat = () => setShowAIChat(!showAIChat);

  function handleCommandExecute(command: { id: string; label: string; category: string; action: () => void }) {
    setShowCommandPalette(false);
    const toolIds = [
      'select', 'wall', 'door', 'window', 'slab', 'column', 'beam',
      'stair', 'railing', 'line', 'rectangle', 'circle', 'arc',
      'polyline', 'text', 'dimension', 'polygon',
    ];
    if (toolIds.includes(command.id)) {
      setActiveTool(command.id as Parameters<typeof setActiveTool>[0]);
    } else {
      switch (command.id) {
        case 'undo': undo(); break;
        case 'redo': redo(); break;
        case 'view-3d': setActiveView('3d'); break;
        case 'view-top': setActiveView('floor-plan'); break;
        case 'view-section': setActiveView('section'); break;
        case 'toggle-ai': toggleAIChat(); break;
        case 'import': setShowModal('import'); break;
        case 'export': setShowModal('export'); break;
        case 'focus-mode': setFocusMode((f) => !f); break;
        case 'panel-left': setShowLeftPanel((v) => !v); break;
        case 'panel-right': setShowRightPanel((v) => !v); break;
        case 'history': setRightPanelTab('history'); setShowRightPanel(true); break;

        case 'properties': setRightPanelTab('properties'); setShowRightPanel(true); break;
        default: break;
      }
    }
  }

  if (isMobile) {
    const levels = doc?.organization.levels ? Object.values(doc.organization.levels).map((l) => ({ id: l.id, name: l.name })) : [];
    const elementCount = doc?.content.elements ? Object.keys(doc.content.elements).length : undefined;
    return <MobileViewer projectName={doc?.name ?? 'Project'} levels={levels} elementCount={elementCount} />;
  }

  // No active project → show the full-screen project browser / home screen
  if (!doc) {
    return (
      <ProjectHomeScreen
        onImport={(file) => {
          // Attempt to parse as JSON schema; fall back to import modal for binary formats
          void (async () => {
            const text = await file.text();
            try {
              loadDocumentSchema(JSON.parse(text));
            } catch {
              setShowModal('import');
            }
          })();
        }}
      />
    );
  }

  return (
    <div className={`app-container${focusMode ? ' focus-mode' : ''}`}>
      {chromeVisible && (
        <header
          className={`app-toolbar${isTauri() && navigator.platform.includes('Mac') ? ' tauri-macos' : ''}`}
          onDoubleClick={(e) => {
            // Only trigger on the drag region — not on buttons/inputs
            if ((e.target as HTMLElement).closest('button, a, input, select')) return;
            if (isTauri()) {
              tauriToggleMaximize();
            } else {
              // Browser: toggle fullscreen
              if (!document.fullscreenElement) {
                void document.documentElement.requestFullscreen().catch(() => {});
              } else {
                void document.exitFullscreen().catch(() => {});
              }
            }
          }}
        >
          <div className="toolbar-left">
            <button
              className={`toolbar-btn panel-toggle-btn${leftVisible ? ' panel-on' : ''}`}
              onClick={() => setShowLeftPanel((v) => !v)}
              title="Toggle navigator (⌘[)"
            >
              <span className="tool-icon">
                <PanelLeft size={15} strokeWidth={2} />
              </span>
            </button>
            <img src="/favicon.svg" alt="OpenCAD" className="brand-logo-img" />
            <button
              className="toolbar-btn"
              onClick={() => navigate('/')}
              title="Home — back to projects"
            >
              <span className="tool-icon">
                <Home size={15} strokeWidth={2} />
              </span>
            </button>
            {isRenamingProject ? (
              <input
                ref={renameInputRef}
                className="project-name-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => {
                  const trimmed = renameValue.trim();
                  if (trimmed) renameProject(trimmed);
                  setIsRenamingProject(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const trimmed = renameValue.trim();
                    if (trimmed) renameProject(trimmed);
                    setIsRenamingProject(false);
                  } else if (e.key === 'Escape') {
                    setIsRenamingProject(false);
                  }
                }}
                autoFocus
              />
            ) : (
              <button
                className="toolbar-btn project-name-btn"
                title="Click to rename project"
                onClick={() => {
                  setRenameValue(doc?.name ?? 'Untitled Project');
                  setIsRenamingProject(true);
                  setTimeout(() => renameInputRef.current?.select(), 0);
                }}
              >
                <span className="project-name-text">{doc?.name ?? 'Untitled Project'}</span>
              </button>
            )}
          </div>

          <div className="toolbar-tabs" data-tour="view-tabs">
            {allowedViews.includes('floor-plan') && (
              <button className={`tab-btn${activeView === 'floor-plan' ? ' active' : ''}`} onClick={() => setActiveView('floor-plan')}>Floor Plan</button>
            )}
            {allowedViews.includes('3d') && (
              <button className={`tab-btn${activeView === '3d' ? ' active' : ''}`} onClick={() => setActiveView('3d')}>3D View</button>
            )}
            {allowedViews.includes('section') && (
              <button className={`tab-btn${activeView === 'section' ? ' active' : ''}`} onClick={() => setActiveView('section')}>Section</button>
            )}
          </div>

          <div className="toolbar-right">
            <button className="toolbar-btn" onClick={() => setShowFeedback(true)} title="Send feedback" style={{ color: 'var(--accent-primary)' }}><span className="tool-icon"><MessageCirclePlus size={15} /></span></button>
            <button className="toolbar-btn" data-tour="help" onClick={() => setShowHelp(true)} title="Help (?)"><span className="tool-icon"><HelpCircle size={15} /></span></button>
            <button className="toolbar-btn" onClick={toggleTheme} title="Toggle Theme"><span className="tool-icon">{theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}</span></button>
            <button className="toolbar-btn" onClick={() => setShowModal('import')} title="Import IFC"><span className="tool-icon"><FolderOpen size={15} /></span></button>
            <button className="toolbar-btn" onClick={() => setShowModal('export')} title="Export IFC"><span className="tool-icon"><FileDown size={15} /></span></button>
            {can('panel:ai') && (
              <button className="toolbar-btn" onClick={toggleAIChat} title="AI Assistant"><span className="tool-icon"><Bot size={15} /></span></button>
            )}
            {authStatus === 'authenticated' && authProfile ? (
              <button
                className="toolbar-btn toolbar-btn--user"
                onClick={() => setShowSettings(true)}
                title={authProfile.name || authProfile.email}
              >
                <span className="tool-icon user-avatar">
                  {(authProfile.name || authProfile.email).charAt(0).toUpperCase()}
                </span>
              </button>
            ) : (
              <button className="toolbar-btn" onClick={() => setShowAuth('login')} title="Sign In"><span className="tool-icon"><User size={15} /></span></button>
            )}
            <div className="toolbar-sep" />
            <button
              className={`toolbar-btn panel-toggle-btn${rightVisible ? ' panel-on' : ''}`}
              onClick={() => setShowRightPanel((v) => !v)}
              title="Toggle properties (⌘])"
            >
              <span className="tool-icon">
                <PanelRight size={15} strokeWidth={2} />
              </span>
            </button>
          </div>
        </header>
      )}

      {tauriUpdateInfo && (
        <UpdateBanner info={tauriUpdateInfo} onDismiss={() => setTauriUpdateInfo(null)} />
      )}
      <div className="app-body">
        <aside
          className={`app-left-panel${leftVisible ? '' : ' panel-collapsed'}`}
          data-tour="navigator"
          style={leftVisible ? { width: leftPanelWidth, minWidth: leftPanelWidth } : undefined}
        >
          <Navigator />
          <LevelManager />
          {leftVisible && (
            <div
              className="panel-resize-handle"
              onMouseDown={(e) => startResize('left', e)}
              title="Drag to resize"
            />
          )}
        </aside>
        {leftVisible && <PanelResizer panelRef={leftPanelRef} side="right" minWidth={180} maxWidth={480} />}

        <div
          className={`app-toolshelf-container${chromeVisible ? '' : ' panel-collapsed'}`}
          data-tour="tools"
        >
          <ToolShelf />
        </div>

        <main className="app-main" data-tour="canvas">
          <PanelErrorBoundary>
            <div className="viewport-wrapper">
              <SplitViewport viewType={activeView} />
              <PresenceOverlay
                collaborators={presenceUsers
                  .filter((u) => u.cursor !== null)
                  .map((u) => ({
                    userId: u.userId,
                    name: u.displayName,
                    color: u.color,
                    cursor: u.cursor!,
                    activeTool: u.activeTool,
                  }))}
              />
              {/* Door/Window parameters live in DoorWindowPanel in the right
                  panel (Properties tab); the old floating PlacementPanel was
                  a redundant duplicate with a separate unsynced state. */}
              {focusMode && <div className="focus-hint">Press <kbd>\</kbd> to exit focus mode</div>}
            </div>
          </PanelErrorBoundary>
        </main>

        <aside
          className={`app-right-panel${rightVisible ? '' : ' panel-collapsed'}`}
          data-tour="properties"
          style={rightVisible ? { width: rightPanelWidth, minWidth: rightPanelWidth } : undefined}
        >
          {rightVisible && (
            <div
              className="panel-resize-handle"
              onMouseDown={(e) => startResize('right', e)}
              title="Drag to resize"
            />
          )}
          <div className="right-panel-tab-bar">
            {RIGHT_PANEL_TABS.filter((tab) => can(`panel:${tab.id}`)).map((tab) => (
              <button key={tab.id} className={`right-panel-tab-btn${rightPanelTab === tab.id ? ' active' : ''}`} onClick={() => setRightPanelTab(tab.id)} title={tab.title} aria-label={tab.title}>
                {tab.icon}
              </button>
            ))}
          </div>

          <div className="right-panel-content">
            <PanelErrorBoundary>
              {rightPanelTab === 'properties' && (
                <>
                  {activeTool === 'wall' && <WallToolPanel />}
                  {activeTool === 'curtain_wall' && <CurtainWallPanel />}
                  {activeTool === 'slab' && <SlabToolPanel />}
                  {(activeTool === 'door' || activeTool === 'window') && <DoorWindowPanel />}
                  {(activeTool === 'column' || activeTool === 'beam') && <ColumnBeamPanel />}
                  {(activeTool === 'stair' || activeTool === 'railing') && <StairRailingPanel />}
                  <PropertiesPanel />
                </>
              )}
              {rightPanelTab === 'schedule' && <SchedulePanel />}
              {rightPanelTab === 'spaces' && <SpacePanel />}
              {rightPanelTab === 'clash' && <ClashDetectionPanel />}
              {rightPanelTab === 'compliance' && <CompliancePanel />}
              {rightPanelTab === 'render' && <RenderPanel />}
              {rightPanelTab === 'sheets' && <SheetPanel />}
              {rightPanelTab === 'bcf' && (
                <BCFPanel
                  key={`bcf-${bcfVersion}`}
                  initialTopics={loadBCFTopics()}
                  onImport={async (file) => {
                    const text = await file.text();
                    try {
                      const parsed = parseBCF(text);
                      saveBCFTopics(parsed.topics);
                      setBcfVersion((v) => v + 1);
                    } catch { /* surfaced via BCFPanel's own error UI */ }
                  }}
                  onExport={(topics) => {
                    const file: BCFFile = {
                      version: '3.0',
                      project: doc ? { project_id: doc.id, project_name: doc.name } : undefined,
                      topics,
                    };
                    const blob = new Blob([serializeBCF(file)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = Object.assign(document.createElement('a'), {
                      href: url,
                      download: `${doc?.name ?? 'issues'}.bcf.json`,
                    });
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                />
              )}
              {rightPanelTab === 'materials' && (
                <MaterialLibrary
                  selectedCount={selectedIds.length}
                  currentMaterialName={
                    selectedIds.length > 0 && doc
                      ? ((doc.content.elements[selectedIds[0]]?.properties?.['Material']?.value as string | undefined)
                        ?? (doc.content.elements[selectedIds[0]]?.properties?.['MaterialId']?.value as string | undefined))
                      : undefined
                  }
                  onSelect={(mat) => {
                    // Canonical key: 'Material' property. setElementMaterial
                    // drops any legacy 'MaterialId' carried by older documents.
                    selectedIds.forEach((id) => setElementMaterial(id, mat.name));
                  }}
                />
              )}
              {rightPanelTab === 'comments' && <CommentsPanel />}
              {rightPanelTab === 'carbon' && (
                <CarbonPanel entries={doc ? computeCarbonEntries(doc) : []} />
              )}
              {rightPanelTab === 'cost' && (
                <CostPanel items={doc ? computeCostItems(doc) : []} />
              )}
              {rightPanelTab === 'hatch' && <HatchPanel />}
              {rightPanelTab === 'symbols' && <SymbolLibrary />}
              {rightPanelTab === 'shadow' && <ShadowAnalysisPanel />}
              {rightPanelTab === 'section' && <SectionBoxPanel />}
              {rightPanelTab === 'site' && <SiteImportPanel />}
              {rightPanelTab === 'specs' && <SpecWritingPanel />}
              {rightPanelTab === 'photo' && <PhotoToModelPanel />}
              {rightPanelTab === 'marketplace' && <MarketplacePanel />}
              {rightPanelTab === 'wind' && <WindAnalysisPanel />}
              {rightPanelTab === 'admin' && (
                <AdminPanel
                  can={can}
                  members={loadOrgMembersForProject(doc?.id ?? null) ?? loadMembers()}
                  onSetRole={(userId, role) => saveMemberRole(userId, role)}
                />
              )}
              {rightPanelTab === 'history' && <VersionHistoryPanel />}
              {rightPanelTab === 'branches' && <BranchPanel />}
              {rightPanelTab === 'underlay' && <UnderlayPanel />}
              {rightPanelTab === 'review' && <ReviewPanel />}
            </PanelErrorBoundary>
          </div>
        </aside>

        {showAIChat && can('panel:ai') && (
          <aside className={`app-ai-panel${chromeVisible ? '' : ' panel-collapsed'}`}>
            <AIChatPanel onClose={() => setShowAIChat(false)} />
          </aside>
        )}
      </div>

      {chromeVisible && <StatusBar viewType={activeView} />}

      {pluginToasts.length > 0 && (
        <div className="plugin-toast-stack" role="status" aria-live="polite">
          {pluginToasts.map((t) => (
            <div key={t.id} className={`plugin-toast plugin-toast--${t.type}`}>
              <span className="plugin-toast-source">{t.pluginId}</span>
              <span className="plugin-toast-msg">{t.message}</span>
            </div>
          ))}
        </div>
      )}

      {pluginCommands.length > 0 && (
        <div className="plugin-menu-root">
          <button
            className="plugin-menu-trigger"
            aria-haspopup="menu"
            aria-expanded={showPluginsMenu}
            onClick={() => setShowPluginsMenu((v) => !v)}
            title="Plugin commands"
          >
            <Zap size={14} />
            Plugins
            <span className="plugin-menu-count">{pluginCommands.length}</span>
          </button>
          {showPluginsMenu && (
            <div
              className="plugin-menu-list"
              role="menu"
              onClick={() => setShowPluginsMenu(false)}
            >
              {pluginCommands.map((cmd) => (
                <button
                  key={`${cmd.pluginId}:${cmd.id}`}
                  role="menuitem"
                  className="plugin-menu-item"
                  onClick={() => pluginHost.runCommand(cmd.pluginId, cmd.id)}
                >
                  <span className="plugin-menu-item-label">{cmd.label}</span>
                  <span className="plugin-menu-item-source">{cmd.pluginId}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <FeedbackWidget open={showFeedback} onClose={() => setShowFeedback(false)} />
      <HelpPanel
        open={showHelp}
        onClose={() => setShowHelp(false)}
        onStartTour={() => { setShowHelp(false); setShowTour(true); }}
      />
      <GuidedTour
        open={showTour}
        onClose={() => { setShowTour(false); markTourSeen(); }}
      />

      {showModal && <ImportExportModal mode={showModal} onClose={() => setShowModal(null)} />}

      {showCommandPalette && (
        <div className="command-palette-overlay" onClick={() => setShowCommandPalette(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <CommandPalette onClose={() => setShowCommandPalette(false)} onExecute={handleCommandExecute} />
          </div>
        </div>
      )}

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(null)} />
      )}

      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h2 className="settings-modal-title">Settings</h2>
              <div className="settings-header-actions">
                <button className="settings-signout" aria-label="Sign out" onClick={() => { setShowSettings(false); void authSignOut(); }}>Sign out</button>
                <button className="settings-close" aria-label="Close settings" onClick={() => setShowSettings(false)}>×</button>
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
  );
}

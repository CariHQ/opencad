/**
 * T-DSK-007: Native OS Menu Bar event handler hook.
 *
 * Listens for Tauri `"menu"` events (emitted from Rust via `app.emit("menu", id)`)
 * and dispatches the corresponding actions to the document store or fires
 * browser-level side-effects (zoom, panel visibility, theme, dialogs).
 *
 * The hook is a no-op when running outside the Tauri desktop shell so the
 * browser app is unaffected.
 */

import { useEffect } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { isTauri } from './useTauri';

/** Subset of menu item IDs that the frontend handles. */
export type MenuItemId =
  // File
  | 'file-new'
  | 'file-open'
  | 'file-save'
  | 'file-save-as'
  | 'import-ifc'
  | 'import-dwg'
  | 'import-pdf'
  | 'import-revit'
  | 'import-sketchup'
  | 'file-export'
  | 'file-close'
  // Edit
  | 'edit-undo'
  | 'edit-redo'
  | 'edit-delete'
  // View
  | 'view-zoom-in'
  | 'view-zoom-out'
  | 'view-zoom-fit'
  | 'view-toggle-2d-3d'
  | 'view-panel-layers'
  | 'view-panel-properties'
  | 'view-panel-ai-chat'
  | 'view-dark-mode'
  | 'view-light-mode'
  // Tools
  | 'tool-select'
  | 'tool-line'
  | 'tool-rectangle'
  | 'tool-circle'
  | 'tool-arc'
  | 'tool-wall'
  | 'tool-door'
  | 'tool-window'
  | 'tool-dimension'
  | 'tool-text'
  // Help
  | 'help-about'
  | 'help-check-updates'
  | 'help-docs';

/** Tool IDs that map directly to documentStore.setActiveTool() values. */
const TOOL_MENU_MAP: Partial<Record<MenuItemId, string>> = {
  'tool-select': 'select',
  'tool-line': 'line',
  'tool-rectangle': 'rectangle',
  'tool-circle': 'circle',
  'tool-arc': 'arc',
  'tool-wall': 'wall',
  'tool-door': 'door',
  'tool-window': 'window',
  'tool-dimension': 'dimension',
  'tool-text': 'text',
};

export interface MenuBarHandlers {
  /** Override the default "file-new" handler. */
  onNewProject?: () => void;
  /** Override the default "file-open" handler. */
  onOpenFile?: () => void;
  /** Override the default "file-save" handler. */
  onSaveFile?: () => void;
  /** Override the default "file-save-as" handler. */
  onSaveFileAs?: () => void;
  /** Receives the format string: 'ifc' | 'dwg' | 'pdf' | 'revit' | 'sketchup'. */
  onImport?: (format: string) => void;
  /** Called when the user chooses File > Export. */
  onExport?: () => void;
  /** Called for view toggle events: 'layers' | 'properties' | 'ai-chat'. */
  onTogglePanel?: (panel: string) => void;
  /** Called when user zooms via menu: 'in' | 'out' | 'fit'. */
  onZoom?: (direction: 'in' | 'out' | 'fit') => void;
}

/**
 * Dispatch a single menu event ID to the document store or a provided handler.
 * Exported for unit testing without React lifecycle overhead.
 */
export function dispatchMenuEvent(
  id: string,
  store: {
    undo: () => void;
    redo: () => void;
    setActiveTool: (tool: string) => void;
  },
  handlers: MenuBarHandlers = {}
): void {
  const menuId = id as MenuItemId;

  // ── Tool selection ─────────────────────────────────────────────────────────
  const toolName = TOOL_MENU_MAP[menuId];
  if (toolName !== undefined) {
    store.setActiveTool(toolName);
    return;
  }

  switch (menuId) {
    // ── File ──────────────────────────────────────────────────────────────
    case 'file-new':
      handlers.onNewProject?.();
      break;

    case 'file-open':
      handlers.onOpenFile?.();
      break;

    case 'file-save':
      handlers.onSaveFile?.();
      break;

    case 'file-save-as':
      handlers.onSaveFileAs?.();
      break;

    case 'import-ifc':
      handlers.onImport?.('ifc');
      break;

    case 'import-dwg':
      handlers.onImport?.('dwg');
      break;

    case 'import-pdf':
      handlers.onImport?.('pdf');
      break;

    case 'import-revit':
      handlers.onImport?.('revit');
      break;

    case 'import-sketchup':
      handlers.onImport?.('sketchup');
      break;

    case 'file-export':
      handlers.onExport?.();
      break;

    case 'file-close':
      if (typeof window !== 'undefined') {
        window.close();
      }
      break;

    // ── Edit ──────────────────────────────────────────────────────────────
    case 'edit-undo':
      store.undo();
      break;

    case 'edit-redo':
      store.redo();
      break;

    // ── View ──────────────────────────────────────────────────────────────
    case 'view-zoom-in':
      handlers.onZoom?.('in');
      break;

    case 'view-zoom-out':
      handlers.onZoom?.('out');
      break;

    case 'view-zoom-fit':
      handlers.onZoom?.('fit');
      break;

    case 'view-toggle-2d-3d':
      // Dispatch a custom DOM event so the Viewport component can respond.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('opencad:toggle-view'));
      }
      break;

    case 'view-panel-layers':
      handlers.onTogglePanel?.('layers');
      break;

    case 'view-panel-properties':
      handlers.onTogglePanel?.('properties');
      break;

    case 'view-panel-ai-chat':
      handlers.onTogglePanel?.('ai-chat');
      break;

    case 'view-dark-mode':
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', 'dark');
        try {
          localStorage.setItem('theme', 'dark');
        } catch { /* ignore */ }
      }
      break;

    case 'view-light-mode':
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', 'light');
        try {
          localStorage.setItem('theme', 'light');
        } catch { /* ignore */ }
      }
      break;

    // ── Help ──────────────────────────────────────────────────────────────
    case 'help-about':
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('opencad:show-about'));
      }
      break;

    case 'help-check-updates':
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('opencad:check-updates'));
      }
      break;

    case 'help-docs':
      if (typeof window !== 'undefined') {
        window.open('https://opencad.archi/docs', '_blank');
      }
      break;

    default:
      break;
  }
}

/** Tauri v2 event API shape (accessed through the window global). */
interface TauriEventApi {
  listen: <T>(
    event: string,
    handler: (payload: { payload: T }) => void
  ) => Promise<() => void>;
}

/** Extended Tauri window global that includes the event submodule. */
interface TauriWithEvent {
  core: { invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T> };
  event?: TauriEventApi;
}

/**
 * React hook that registers the Tauri menu event listener.
 * Call once at the application root (e.g. in AppLayout).
 *
 * @param handlers - Optional overrides for file/view/panel actions.
 */
export function useMenuBar(handlers: MenuBarHandlers = {}): void {
  const undo = useDocumentStore((s) => s.undo);
  const redo = useDocumentStore((s) => s.redo);
  const setActiveTool = useDocumentStore((s) => s.setActiveTool);

  useEffect(() => {
    if (!isTauri()) return;

    // Access the Tauri event API through the window global to avoid a hard
    // dependency on @tauri-apps/api in the app package.  Cast to the extended
    // type so TypeScript knows about the optional `event` submodule.
    const tauri = window.__TAURI__ as TauriWithEvent | undefined;
    const tauriEvent = tauri?.event;
    if (!tauriEvent) return;

    let unlisten: (() => void) | undefined;

    tauriEvent
      .listen<string>('menu', (evt) => {
        dispatchMenuEvent(evt.payload, { undo, redo, setActiveTool }, handlers);
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {
        // Tauri event API unavailable — silently ignore.
      });

    return () => {
      unlisten?.();
    };
    // handlers is intentionally excluded so the effect doesn't re-run on every
    // render if consumers pass an inline object literal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, setActiveTool]);
}

/**
 * T-DSK-007: Native OS Menu Bar — unit tests
 *
 * These tests verify that `dispatchMenuEvent` routes each menu item ID to the
 * correct store action or side-effect handler, without needing a real Tauri
 * runtime or a React component tree.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dispatchMenuEvent } from './useMenuBar';

// ── Minimal store mock ────────────────────────────────────────────────────────
function makeStore() {
  return {
    undo: vi.fn(),
    redo: vi.fn(),
    setActiveTool: vi.fn(),
  };
}

// ── Helper: reset DOM globals between tests ───────────────────────────────────
beforeEach(() => {
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-DSK-007-01  Edit → Undo calls store.undo()
// ═══════════════════════════════════════════════════════════════════════════════
describe('T-DSK-007-01: edit-undo', () => {
  it('calls store.undo()', () => {
    const store = makeStore();
    dispatchMenuEvent('edit-undo', store);
    expect(store.undo).toHaveBeenCalledOnce();
    expect(store.redo).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-DSK-007-02  Edit → Redo calls store.redo()
// ═══════════════════════════════════════════════════════════════════════════════
describe('T-DSK-007-02: edit-redo', () => {
  it('calls store.redo()', () => {
    const store = makeStore();
    dispatchMenuEvent('edit-redo', store);
    expect(store.redo).toHaveBeenCalledOnce();
    expect(store.undo).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-DSK-007-03  Tool menu items → store.setActiveTool()
// ═══════════════════════════════════════════════════════════════════════════════
describe('T-DSK-007-03: tool menu → setActiveTool', () => {
  const cases: Array<[string, string]> = [
    ['tool-select', 'select'],
    ['tool-line', 'line'],
    ['tool-rectangle', 'rectangle'],
    ['tool-circle', 'circle'],
    ['tool-arc', 'arc'],
    ['tool-wall', 'wall'],
    ['tool-door', 'door'],
    ['tool-window', 'window'],
    ['tool-dimension', 'dimension'],
    ['tool-text', 'text'],
  ];

  it.each(cases)('menu id "%s" sets active tool "%s"', (menuId, expectedTool) => {
    const store = makeStore();
    dispatchMenuEvent(menuId, store);
    expect(store.setActiveTool).toHaveBeenCalledWith(expectedTool);
    expect(store.undo).not.toHaveBeenCalled();
    expect(store.redo).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-DSK-007-04  File menu items → handler callbacks
// ═══════════════════════════════════════════════════════════════════════════════
describe('T-DSK-007-04: file menu → handler callbacks', () => {
  it('file-new calls onNewProject', () => {
    const store = makeStore();
    const onNewProject = vi.fn();
    dispatchMenuEvent('file-new', store, { onNewProject });
    expect(onNewProject).toHaveBeenCalledOnce();
  });

  it('file-open calls onOpenFile', () => {
    const store = makeStore();
    const onOpenFile = vi.fn();
    dispatchMenuEvent('file-open', store, { onOpenFile });
    expect(onOpenFile).toHaveBeenCalledOnce();
  });

  it('file-save calls onSaveFile', () => {
    const store = makeStore();
    const onSaveFile = vi.fn();
    dispatchMenuEvent('file-save', store, { onSaveFile });
    expect(onSaveFile).toHaveBeenCalledOnce();
  });

  it('file-save-as calls onSaveFileAs', () => {
    const store = makeStore();
    const onSaveFileAs = vi.fn();
    dispatchMenuEvent('file-save-as', store, { onSaveFileAs });
    expect(onSaveFileAs).toHaveBeenCalledOnce();
  });

  it('file-export calls onExport', () => {
    const store = makeStore();
    const onExport = vi.fn();
    dispatchMenuEvent('file-export', store, { onExport });
    expect(onExport).toHaveBeenCalledOnce();
  });

  it('file-new does NOT call store.undo/redo', () => {
    const store = makeStore();
    dispatchMenuEvent('file-new', store, {});
    expect(store.undo).not.toHaveBeenCalled();
    expect(store.redo).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-DSK-007-05  Import submenu → onImport(format)
// ═══════════════════════════════════════════════════════════════════════════════
describe('T-DSK-007-05: import menu → onImport(format)', () => {
  const importCases: Array<[string, string]> = [
    ['import-ifc', 'ifc'],
    ['import-dwg', 'dwg'],
    ['import-pdf', 'pdf'],
    ['import-revit', 'revit'],
    ['import-sketchup', 'sketchup'],
  ];

  it.each(importCases)('menu id "%s" calls onImport("%s")', (menuId, format) => {
    const store = makeStore();
    const onImport = vi.fn();
    dispatchMenuEvent(menuId, store, { onImport });
    expect(onImport).toHaveBeenCalledWith(format);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-DSK-007-06  View zoom menu → onZoom(direction)
// ═══════════════════════════════════════════════════════════════════════════════
describe('T-DSK-007-06: view zoom menu → onZoom', () => {
  it('view-zoom-in calls onZoom("in")', () => {
    const store = makeStore();
    const onZoom = vi.fn();
    dispatchMenuEvent('view-zoom-in', store, { onZoom });
    expect(onZoom).toHaveBeenCalledWith('in');
  });

  it('view-zoom-out calls onZoom("out")', () => {
    const store = makeStore();
    const onZoom = vi.fn();
    dispatchMenuEvent('view-zoom-out', store, { onZoom });
    expect(onZoom).toHaveBeenCalledWith('out');
  });

  it('view-zoom-fit calls onZoom("fit")', () => {
    const store = makeStore();
    const onZoom = vi.fn();
    dispatchMenuEvent('view-zoom-fit', store, { onZoom });
    expect(onZoom).toHaveBeenCalledWith('fit');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-DSK-007-07  View panel toggle → onTogglePanel(panel)
// ═══════════════════════════════════════════════════════════════════════════════
describe('T-DSK-007-07: view panel toggle → onTogglePanel', () => {
  const panelCases: Array<[string, string]> = [
    ['view-panel-layers', 'layers'],
    ['view-panel-properties', 'properties'],
    ['view-panel-ai-chat', 'ai-chat'],
  ];

  it.each(panelCases)('menu id "%s" calls onTogglePanel("%s")', (menuId, panel) => {
    const store = makeStore();
    const onTogglePanel = vi.fn();
    dispatchMenuEvent(menuId, store, { onTogglePanel });
    expect(onTogglePanel).toHaveBeenCalledWith(panel);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-DSK-007-08  View dark / light mode → data-theme attribute + localStorage
// ═══════════════════════════════════════════════════════════════════════════════
describe('T-DSK-007-08: view dark/light mode', () => {
  it('view-dark-mode sets data-theme="dark" and saves to localStorage', () => {
    const store = makeStore();
    dispatchMenuEvent('view-dark-mode', store);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('view-light-mode sets data-theme="light" and saves to localStorage', () => {
    const store = makeStore();
    dispatchMenuEvent('view-light-mode', store);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-DSK-007-09  View toggle 2D/3D → dispatches CustomEvent on window
// ═══════════════════════════════════════════════════════════════════════════════
describe('T-DSK-007-09: view-toggle-2d-3d', () => {
  it('dispatches "opencad:toggle-view" on window', () => {
    const store = makeStore();
    const handler = vi.fn();
    window.addEventListener('opencad:toggle-view', handler);

    dispatchMenuEvent('view-toggle-2d-3d', store);
    expect(handler).toHaveBeenCalledOnce();

    window.removeEventListener('opencad:toggle-view', handler);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-DSK-007-10  Help menu → custom window events
// ═══════════════════════════════════════════════════════════════════════════════
describe('T-DSK-007-10: help menu', () => {
  it('help-about dispatches "opencad:show-about" on window', () => {
    const store = makeStore();
    const handler = vi.fn();
    window.addEventListener('opencad:show-about', handler);

    dispatchMenuEvent('help-about', store);
    expect(handler).toHaveBeenCalledOnce();

    window.removeEventListener('opencad:show-about', handler);
  });

  it('help-check-updates dispatches "opencad:check-updates" on window', () => {
    const store = makeStore();
    const handler = vi.fn();
    window.addEventListener('opencad:check-updates', handler);

    dispatchMenuEvent('help-check-updates', store);
    expect(handler).toHaveBeenCalledOnce();

    window.removeEventListener('opencad:check-updates', handler);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-DSK-007-11  Unknown menu IDs are silently ignored
// ═══════════════════════════════════════════════════════════════════════════════
describe('T-DSK-007-11: unknown menu IDs', () => {
  it('does not throw for an unrecognised menu event id', () => {
    const store = makeStore();
    expect(() => dispatchMenuEvent('totally-unknown-id', store)).not.toThrow();
    expect(store.undo).not.toHaveBeenCalled();
    expect(store.redo).not.toHaveBeenCalled();
    expect(store.setActiveTool).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-DSK-007-12  Handlers are optional — no error when omitted
// ═══════════════════════════════════════════════════════════════════════════════
describe('T-DSK-007-12: optional handlers', () => {
  it('file-new with no handlers does not throw', () => {
    const store = makeStore();
    expect(() => dispatchMenuEvent('file-new', store)).not.toThrow();
  });

  it('import-ifc with no handlers does not throw', () => {
    const store = makeStore();
    expect(() => dispatchMenuEvent('import-ifc', store)).not.toThrow();
  });

  it('view-zoom-in with no handlers does not throw', () => {
    const store = makeStore();
    expect(() => dispatchMenuEvent('view-zoom-in', store)).not.toThrow();
  });
});

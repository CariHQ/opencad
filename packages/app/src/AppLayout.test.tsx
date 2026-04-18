/**
 * T-UI-006: AppLayout integration tests
 *
 * Verifies: the full layout renders without crash, toolbar tabs switch views,
 * theme toggle works, AI panel toggle works, panel collapse/focus mode.
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { useDocumentStore } from './stores/documentStore';
import type { RoleId } from './config/roles';

// jsdom doesn't implement scrollIntoView or matchMedia
window.HTMLElement.prototype.scrollIntoView = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.mock('./hooks/useThreeViewport', () => ({
  useThreeViewport: () => ({
    containerRef: { current: null },
    setViewPreset: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    zoomToFit: vi.fn(),
    sectionBox: false,
    setSectionBox: vi.fn(),
  }),
}));

vi.mock('./hooks/useViewport', () => ({
  useViewport: () => ({
    canvasRef: { current: null },
    containerRef: { current: null },
    handleCanvasMouseDown: vi.fn(),
    handleCanvasMouseMove: vi.fn(),
    handleCanvasMouseUp: vi.fn(),
    handleCanvasDoubleClick: vi.fn(),
    activeTool: 'select',
    drawingState: null,
  }),
}));

function setRole(role: RoleId | null) {
  useDocumentStore.setState({ userRole: role });
}

describe('T-UI-006: AppLayout', () => {
  beforeEach(() => {
    // Clear localStorage so tests don't bleed state
    localStorage.clear();
    useDocumentStore.getState().initProject('test', 'user');
    setRole(null); // architect default
  });

  afterEach(() => {
    setRole(null);
  });

  it('renders brand name', () => {
    render(<MemoryRouter initialEntries={['/project/test']}><AppLayout /></MemoryRouter>);
    expect(screen.getByText('OpenCAD')).toBeInTheDocument();
  });

  it('renders view tabs', () => {
    render(<MemoryRouter initialEntries={['/project/test']}><AppLayout /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Floor Plan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3D View' })).toBeInTheDocument();
    // 'Section' now also appears as a right-panel tab; use getAllByRole
    expect(screen.getAllByRole('button', { name: 'Section' }).length).toBeGreaterThan(0);
  });

  it('renders Navigator panel', () => {
    render(<MemoryRouter initialEntries={['/project/test']}><AppLayout /></MemoryRouter>);
    expect(screen.getByText('Navigator')).toBeInTheDocument();
  });

  it('renders Layers panel', () => {
    render(<MemoryRouter initialEntries={['/project/test']}><AppLayout /></MemoryRouter>);
    const layerPanelTitle = document.querySelector('.panel-title');
    expect(layerPanelTitle).not.toBeNull();
    const layersTitles = screen.getAllByText('Layers');
    expect(layersTitles.length).toBeGreaterThanOrEqual(1);
  });

  it('renders StatusBar', () => {
    render(<MemoryRouter initialEntries={['/project/test']}><AppLayout /></MemoryRouter>);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('switches to Floor Plan view when Floor Plan tab is clicked', () => {
    render(<MemoryRouter initialEntries={['/project/test']}><AppLayout /></MemoryRouter>);
    const floorPlanTab = screen.getByRole('button', { name: 'Floor Plan' });
    fireEvent.click(floorPlanTab);
    expect(floorPlanTab).toHaveClass('active');
  });

  it('shows AI chat panel when Bot button is clicked', () => {
    render(<MemoryRouter initialEntries={['/project/test']}><AppLayout /></MemoryRouter>);
    const aiBtn = screen.getByTitle('AI Assistant');
    fireEvent.click(aiBtn);
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('closes AI chat panel when close button is clicked', () => {
    render(<MemoryRouter initialEntries={['/project/test']}><AppLayout /></MemoryRouter>);
    fireEvent.click(screen.getByTitle('AI Assistant'));
    const closeBtn = screen.getByRole('button', { name: 'Close AI chat' });
    fireEvent.click(closeBtn);
    expect(screen.queryByText('AI Assistant')).not.toBeInTheDocument();
  });

  it('opens import modal when import button is clicked', () => {
    render(<MemoryRouter initialEntries={['/project/test']}><AppLayout /></MemoryRouter>);
    fireEvent.click(screen.getByTitle('Import IFC'));
    expect(screen.getByText(/Import/)).toBeInTheDocument();
  });

  // Panel collapse
  it('renders left and right panel toggle buttons', () => {
    render(<MemoryRouter initialEntries={['/project/test']}><AppLayout /></MemoryRouter>);
    expect(screen.getByTitle('Toggle navigator (⌘[)')).toBeInTheDocument();
    expect(screen.getByTitle('Toggle properties (⌘])')).toBeInTheDocument();
  });

  it('collapses left panel when toggle button is clicked', () => {
    render(<MemoryRouter initialEntries={['/project/test']}><AppLayout /></MemoryRouter>);
    fireEvent.click(screen.getByTitle('Toggle navigator (⌘[)'));
    expect(document.querySelector('.app-left-panel')).toHaveClass('panel-collapsed');
  });

  it('collapses right panel when toggle button is clicked', () => {
    render(<MemoryRouter initialEntries={['/project/test']}><AppLayout /></MemoryRouter>);
    fireEvent.click(screen.getByTitle('Toggle properties (⌘])'));
    expect(document.querySelector('.app-right-panel')).toHaveClass('panel-collapsed');
  });

  it('re-expands left panel on second toggle click', () => {
    render(<MemoryRouter initialEntries={['/project/test']}><AppLayout /></MemoryRouter>);
    const btn = screen.getByTitle('Toggle navigator (⌘[)');
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(document.querySelector('.app-left-panel')).not.toHaveClass('panel-collapsed');
  });

  // Focus mode
  it('enters focus mode on \\ keypress and hides toolbar', () => {
    render(<MemoryRouter initialEntries={['/project/test']}><AppLayout /></MemoryRouter>);
    fireEvent.keyDown(window, { key: '\\' });
    expect(document.querySelector('.app-toolbar')).toBeNull();
    expect(screen.getByText(/exit focus mode/i)).toBeInTheDocument();
  });

  // T-ROLE-003: panel gating tests
  describe('role-based panel gating (T-ROLE-003)', () => {
    it('architect sees AI Assistant button', () => {
      setRole('architect');
      render(<MemoryRouter initialEntries={['/project/test']}><AppLayout /></MemoryRouter>);
      expect(screen.getByTitle('AI Assistant')).toBeInTheDocument();
    });

    it('structural engineer does not see AI Assistant button', () => {
      setRole('structural');
      render(<MemoryRouter initialEntries={['/project/test']}><AppLayout /></MemoryRouter>);
      expect(screen.queryByTitle('AI Assistant')).not.toBeInTheDocument();
    });

    it('owner does not see AI Assistant button', () => {
      setRole('owner');
      render(<MemoryRouter initialEntries={['/project/test']}><AppLayout /></MemoryRouter>);
      expect(screen.queryByTitle('AI Assistant')).not.toBeInTheDocument();
    });
  });

  it('exits focus mode on second \\ keypress', () => {
    render(<MemoryRouter initialEntries={['/project/test']}><AppLayout /></MemoryRouter>);
    fireEvent.keyDown(window, { key: '\\' });
    fireEvent.keyDown(window, { key: '\\' });
    expect(document.querySelector('.app-toolbar')).not.toBeNull();
  });

  // Floating level selector
  it('renders level selector inside viewport-wrapper', () => {
    render(<MemoryRouter initialEntries={['/project/test']}><AppLayout /></MemoryRouter>);
    const floatingSelector = document.querySelector('.floating-level-selector');
    expect(floatingSelector).not.toBeNull();
    const wrapper = document.querySelector('.viewport-wrapper');
    expect(wrapper).toContainElement(floatingSelector as HTMLElement);
  });
});

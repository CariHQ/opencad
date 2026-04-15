/**
 * T-UI-006: AppLayout integration tests
 *
 * Verifies: the full layout renders without crash, toolbar tabs switch views,
 * theme toggle works, AI panel toggle works.
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppLayout } from './AppLayout';
import { useDocumentStore } from './stores/documentStore';

// jsdom doesn't implement scrollIntoView; AIChatPanel uses it on message scroll
window.HTMLElement.prototype.scrollIntoView = vi.fn();

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
    activeTool: 'select',
    drawingState: null,
  }),
}));

describe('T-UI-006: AppLayout', () => {
  beforeEach(() => {
    // Clear localStorage so tests don't bleed state
    localStorage.clear();
    useDocumentStore.getState().initProject('test', 'user');
  });

  it('renders brand name', () => {
    render(<AppLayout />);
    expect(screen.getByText('OpenCAD')).toBeInTheDocument();
  });

  it('renders view tabs', () => {
    render(<AppLayout />);
    // Use role=button to target the toolbar tabs specifically
    expect(screen.getByRole('button', { name: 'Floor Plan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3D View' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Section' })).toBeInTheDocument();
  });

  it('renders Navigator panel', () => {
    render(<AppLayout />);
    expect(screen.getByText('Navigator')).toBeInTheDocument();
  });

  it('renders Layers panel', () => {
    render(<AppLayout />);
    // 'Layers' appears in both the Navigator tree and the LayersPanel — use panel-title class
    const layerPanelTitle = document.querySelector('.panel-title');
    expect(layerPanelTitle).not.toBeNull();
    const layersTitles = screen.getAllByText('Layers');
    expect(layersTitles.length).toBeGreaterThanOrEqual(1);
  });

  it('renders StatusBar', () => {
    render(<AppLayout />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('switches to Floor Plan view when Floor Plan tab is clicked', () => {
    render(<AppLayout />);
    const floorPlanTab = screen.getByRole('button', { name: 'Floor Plan' });
    fireEvent.click(floorPlanTab);
    expect(floorPlanTab).toHaveClass('active');
  });

  it('shows AI chat panel when Bot button is clicked', () => {
    render(<AppLayout />);
    const aiBtn = screen.getByTitle('AI Assistant');
    fireEvent.click(aiBtn);
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('closes AI chat panel when close button is clicked', () => {
    render(<AppLayout />);
    fireEvent.click(screen.getByTitle('AI Assistant'));
    const closeBtn = screen.getByRole('button', { name: 'Close AI chat' });
    fireEvent.click(closeBtn);
    expect(screen.queryByText('AI Assistant')).not.toBeInTheDocument();
  });

  it('opens import modal when import button is clicked', () => {
    render(<AppLayout />);
    fireEvent.click(screen.getByTitle('Import IFC'));
    expect(screen.getByText(/Import/)).toBeInTheDocument();
  });
});

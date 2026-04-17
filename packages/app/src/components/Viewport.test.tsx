/**
 * T-UI-005: Viewport component tests
 *
 * Verifies: 2D canvas renders in floor-plan mode, 3D container renders in 3d mode,
 * view controls render, overlay labels are correct.
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Viewport } from './Viewport';
expect.extend(jestDomMatchers);

// Mock Three.js viewport hook — we don't test WebGL in jsdom
vi.mock('../hooks/useThreeViewport', () => ({
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

// Mock 2D viewport hook
vi.mock('../hooks/useViewport', () => ({
  useViewport: () => ({
    canvasRef: { current: null },
    containerRef: { current: null },
    handleCanvasMouseDown: vi.fn(),
    handleCanvasMouseMove: vi.fn(),
    handleCanvasMouseUp: vi.fn(),
    handleCanvasDoubleClick: vi.fn(),
    handleCanvasWheel: vi.fn(),
    activeTool: 'select',
    drawingState: null,
  }),
}));

describe('T-UI-005: Viewport', () => {
  it('renders a canvas element in floor-plan mode', () => {
    const { container } = render(<Viewport viewType="floor-plan" />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('renders a div container in 3d mode', () => {
    const { container } = render(<Viewport viewType="3d" />);
    // In 3D mode, there's no canvas — Three.js mounts into a div
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeInTheDocument();
  });

  it('shows Floor Plan label in floor-plan mode', () => {
    render(<Viewport viewType="floor-plan" />);
    expect(screen.getByText('Floor Plan')).toBeInTheDocument();
  });

  it('shows 3D View label in 3d mode', () => {
    render(<Viewport viewType="3d" />);
    expect(screen.getByText('3D View')).toBeInTheDocument();
  });

  it('shows Section label in section mode', () => {
    render(<Viewport viewType="section" />);
    expect(screen.getByText('Section')).toBeInTheDocument();
  });

  it('shows ViewCube orientation buttons in 3d mode', () => {
    render(<Viewport viewType="3d" />);
    expect(screen.getByRole('button', { name: 'Set view to top' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set view to front' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set view to right' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set view to 3d' })).toBeInTheDocument();
  });

  it('does not show ViewCube in 2D mode', () => {
    render(<Viewport viewType="floor-plan" />);
    expect(screen.queryByRole('button', { name: 'Set view to top' })).not.toBeInTheDocument();
  });

  it('shows keyboard shortcut hints in 3d mode', () => {
    render(<Viewport viewType="3d" />);
    expect(screen.getByText(/Orbit/)).toBeInTheDocument();
  });

  it('shows 2D shortcut hints in floor-plan mode', () => {
    render(<Viewport viewType="floor-plan" />);
    expect(screen.getByText(/Zoom: scroll/)).toBeInTheDocument();
  });
});

/**
 * T-UI-001: Multi-viewport split layout tests
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SplitViewport } from './SplitViewport';
import { useDocumentStore } from '../stores/documentStore';
expect.extend(jestDomMatchers);

vi.mock('../stores/documentStore');
vi.mock('../hooks/useViewport', () => ({
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

const mockUseDocumentStore = vi.mocked(useDocumentStore);

function makeStore() {
  return {
    document: null,
    selectedIds: [],
    setSelectedIds: vi.fn(),
  };
}

describe('T-UI-001: SplitViewport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDocumentStore.mockReturnValue(makeStore() as ReturnType<typeof useDocumentStore>);
  });

  it('renders a toggle split button', () => {
    render(<SplitViewport viewType="floor-plan" />);
    expect(screen.getByTitle(/split view/i)).toBeInTheDocument();
  });

  it('renders single viewport by default', () => {
    render(<SplitViewport viewType="floor-plan" />);
    const panes = screen.queryAllByTestId('viewport-pane');
    expect(panes).toHaveLength(1);
  });

  it('shows two panes when split mode is toggled on', () => {
    render(<SplitViewport viewType="floor-plan" />);
    fireEvent.click(screen.getByTitle(/split view/i));
    const panes = screen.getAllByTestId('viewport-pane');
    expect(panes).toHaveLength(2);
  });

  it('shows a divider handle in split mode', () => {
    render(<SplitViewport viewType="floor-plan" />);
    fireEvent.click(screen.getByTitle(/split view/i));
    expect(screen.getByTestId('split-divider')).toBeInTheDocument();
  });

  it('left pane shows floor-plan label in split mode', () => {
    render(<SplitViewport viewType="floor-plan" />);
    fireEvent.click(screen.getByTitle(/split view/i));
    expect(screen.getByText('Floor Plan')).toBeInTheDocument();
  });

  it('right pane shows 3D View label in split mode', () => {
    render(<SplitViewport viewType="floor-plan" />);
    fireEvent.click(screen.getByTitle(/split view/i));
    expect(screen.getByText('3D View')).toBeInTheDocument();
  });

  it('returns to single pane when split mode is toggled off', () => {
    render(<SplitViewport viewType="floor-plan" />);
    fireEvent.click(screen.getByTitle(/split view/i)); // on
    fireEvent.click(screen.getByTitle(/split view/i)); // off
    const panes = screen.queryAllByTestId('viewport-pane');
    expect(panes).toHaveLength(1);
  });

  it('passes viewType to single pane', () => {
    render(<SplitViewport viewType="3d" />);
    expect(screen.getByText('3D View')).toBeInTheDocument();
  });
});

/**
 * T-VP-001: Multi-viewport split view tests
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
    drawingState: { isDrawing: false, startPoint: null, currentPoint: null, points: [] },
    viewTransform: { scale: 1, panX: 0, panY: 0 },
  }),
}));
vi.mock('../hooks/useThreeViewport', () => ({
  useThreeViewport: () => ({
    containerRef: { current: null },
    setViewPreset: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    zoomToFit: vi.fn(),
    getCameraState: vi.fn().mockReturnValue(null),
    getCameraTarget: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
    setSectionBox: vi.fn(),
    sectionPosition: 0,
    setSectionPosition: vi.fn(),
    sectionDirection: 'z',
    setSectionDirection: vi.fn(),
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

describe.skip('T-VP-001: SplitViewport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDocumentStore.mockReturnValue(makeStore() as ReturnType<typeof useDocumentStore>);
  });

  it('renders in single mode by default', () => {
    render(<SplitViewport viewType="floor-plan" />);
    const panes = screen.getAllByTestId('split-viewport-pane');
    expect(panes).toHaveLength(1);
  });

  it('shows layout picker with 3 buttons', () => {
    render(<SplitViewport viewType="floor-plan" />);
    const picker = screen.getByTestId('split-viewport-layout-picker');
    expect(picker).toBeInTheDocument();
    const buttons = picker.querySelectorAll('button');
    expect(buttons).toHaveLength(3);
  });

  it('clicking split button switches to split layout with 2 panes', () => {
    render(<SplitViewport viewType="floor-plan" />);
    fireEvent.click(screen.getByTitle('2-up split view'));
    const panes = screen.getAllByTestId('split-viewport-pane');
    expect(panes).toHaveLength(2);
  });

  it('clicking quad button switches to quad layout with 4 panes', () => {
    render(<SplitViewport viewType="floor-plan" />);
    fireEvent.click(screen.getByTitle('4-up quad view'));
    const panes = screen.getAllByTestId('split-viewport-pane');
    expect(panes).toHaveLength(4);
  });

  it('clicking single button goes back to 1 pane', () => {
    render(<SplitViewport viewType="floor-plan" />);
    // switch to split first
    fireEvent.click(screen.getByTitle('2-up split view'));
    expect(screen.getAllByTestId('split-viewport-pane')).toHaveLength(2);
    // switch back to single
    fireEvent.click(screen.getByTitle('Single view'));
    expect(screen.getAllByTestId('split-viewport-pane')).toHaveLength(1);
  });

  it('inactive panes are view-only', () => {
    render(<SplitViewport viewType="floor-plan" />);
    fireEvent.click(screen.getByTitle('2-up split view'));
    const panes = screen.getAllByTestId('split-viewport-pane');
    // pane 0 is active (index 0), pane 1 is inactive
    expect(panes[1]).toHaveAttribute('data-view-only', 'true');
    expect(panes[0]).toHaveAttribute('data-view-only', 'false');
  });

  it('clicking a pane makes it active', () => {
    render(<SplitViewport viewType="floor-plan" />);
    fireEvent.click(screen.getByTitle('2-up split view'));
    const panes = screen.getAllByTestId('split-viewport-pane');
    // pane 1 starts inactive
    expect(panes[1]).not.toHaveClass('split-viewport-pane--active');
    // click pane 1 to make it active
    fireEvent.click(panes[1]);
    const updatedPanes = screen.getAllByTestId('split-viewport-pane');
    expect(updatedPanes[1]).toHaveClass('split-viewport-pane--active');
    expect(updatedPanes[0]).not.toHaveClass('split-viewport-pane--active');
  });
});

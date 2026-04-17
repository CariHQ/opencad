/**
 * ThreeViewportInner component tests
 * T-3D-008: Three.js viewport controls render and interact correctly
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThreeViewportInner } from './ThreeViewportInner';

const mockZoomIn = vi.fn();
const mockZoomOut = vi.fn();
const mockZoomToFit = vi.fn();
const mockSetViewPreset = vi.fn();
const mockSetSectionBox = vi.fn();
const mockSetSectionPosition = vi.fn();
const mockSetSectionDirection = vi.fn();
const mockSaveSectionView = vi.fn();

let mockSectionBox = false;

vi.mock('../hooks/useThreeViewport', () => ({
  useThreeViewport: vi.fn(() => ({
    containerRef: { current: null },
    setViewPreset: mockSetViewPreset,
    zoomIn: mockZoomIn,
    zoomOut: mockZoomOut,
    zoomToFit: mockZoomToFit,
    sectionBox: mockSectionBox,
    setSectionBox: mockSetSectionBox,
    sectionPosition: { x: 0, y: 0, z: 0 },
    setSectionPosition: mockSetSectionPosition,
    sectionDirection: { x: 0, y: 1, z: 0 },
    setSectionDirection: mockSetSectionDirection,
    saveSectionView: mockSaveSectionView,
  })),
}));

vi.mock('./SectionBoxPanel', () => ({
  SectionBoxPanel: ({ onToggle }: { onToggle: (v: boolean) => void }) => (
    <div data-testid="section-box-panel">
      <button onClick={() => onToggle(false)}>Close Section Box</button>
    </div>
  ),
}));

describe('T-3D-008: ThreeViewportInner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSectionBox = false;
  });

  it('renders the viewport canvas container', () => {
    render(<ThreeViewportInner />);
    const canvas = document.querySelector('.viewport-canvas');
    expect(canvas).toBeTruthy();
  });

  it('renders view preset buttons', () => {
    render(<ThreeViewportInner />);
    expect(screen.getByTitle('top View')).toBeInTheDocument();
    expect(screen.getByTitle('front View')).toBeInTheDocument();
    expect(screen.getByTitle('right View')).toBeInTheDocument();
    expect(screen.getByTitle('3d View')).toBeInTheDocument();
  });

  it('renders Zoom In button', () => {
    render(<ThreeViewportInner />);
    expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
  });

  it('renders Zoom Out button', () => {
    render(<ThreeViewportInner />);
    expect(screen.getByTitle('Zoom Out')).toBeInTheDocument();
  });

  it('renders Fit button', () => {
    render(<ThreeViewportInner />);
    expect(screen.getByTitle('Fit')).toBeInTheDocument();
  });

  it('renders Section Box button', () => {
    render(<ThreeViewportInner />);
    expect(screen.getByTitle('Section Box')).toBeInTheDocument();
  });

  it('clicking Zoom In calls zoomIn', () => {
    render(<ThreeViewportInner />);
    fireEvent.click(screen.getByTitle('Zoom In'));
    expect(mockZoomIn).toHaveBeenCalledTimes(1);
  });

  it('clicking Zoom Out calls zoomOut', () => {
    render(<ThreeViewportInner />);
    fireEvent.click(screen.getByTitle('Zoom Out'));
    expect(mockZoomOut).toHaveBeenCalledTimes(1);
  });

  it('clicking Fit calls zoomToFit', () => {
    render(<ThreeViewportInner />);
    fireEvent.click(screen.getByTitle('Fit'));
    expect(mockZoomToFit).toHaveBeenCalledTimes(1);
  });

  it('clicking Top preset calls setViewPreset with "top"', () => {
    render(<ThreeViewportInner />);
    fireEvent.click(screen.getByTitle('top View'));
    expect(mockSetViewPreset).toHaveBeenCalledWith('top');
  });

  it('clicking Front preset calls setViewPreset with "front"', () => {
    render(<ThreeViewportInner />);
    fireEvent.click(screen.getByTitle('front View'));
    expect(mockSetViewPreset).toHaveBeenCalledWith('front');
  });

  it('clicking 3D preset calls setViewPreset with "3d"', () => {
    render(<ThreeViewportInner />);
    fireEvent.click(screen.getByTitle('3d View'));
    expect(mockSetViewPreset).toHaveBeenCalledWith('3d');
  });

  it('calls onViewChange callback when preset is selected', () => {
    const onViewChange = vi.fn();
    render(<ThreeViewportInner onViewChange={onViewChange} />);
    fireEvent.click(screen.getByTitle('right View'));
    expect(onViewChange).toHaveBeenCalledWith('right');
  });

  it('does not render SectionBoxPanel when sectionBox is false', () => {
    render(<ThreeViewportInner />);
    expect(screen.queryByTestId('section-box-panel')).not.toBeInTheDocument();
  });

  it('clicking Section Box calls setSectionBox with true', () => {
    render(<ThreeViewportInner />);
    fireEvent.click(screen.getByTitle('Section Box'));
    expect(mockSetSectionBox).toHaveBeenCalledWith(true);
  });

  it('renders 3D label for 3D preset button', () => {
    render(<ThreeViewportInner />);
    const btn = screen.getByTitle('3d View');
    expect(btn.textContent).toBe('3D');
  });

  it('renders first-letter uppercase for non-3d presets', () => {
    render(<ThreeViewportInner />);
    expect(screen.getByTitle('top View').textContent).toBe('T');
    expect(screen.getByTitle('front View').textContent).toBe('F');
    expect(screen.getByTitle('right View').textContent).toBe('R');
  });
});

describe('ThreeViewportInner with section box open', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSectionBox = true;
  });

  it('renders SectionBoxPanel overlay when sectionBox is true', () => {
    render(<ThreeViewportInner />);
    expect(screen.getByTestId('section-box-panel')).toBeInTheDocument();
  });

  it('Section Box button has active class when section box is enabled', () => {
    render(<ThreeViewportInner />);
    const sectionBoxBtn = screen.getByTitle('Section Box');
    expect(sectionBoxBtn).toHaveClass('active');
  });

  it('SectionBoxPanel onToggle calls setSectionBox', () => {
    render(<ThreeViewportInner />);
    fireEvent.click(screen.getByText('Close Section Box'));
    expect(mockSetSectionBox).toHaveBeenCalledWith(false);
  });
});

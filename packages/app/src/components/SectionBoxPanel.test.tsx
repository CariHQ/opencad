import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SectionBoxPanel } from './SectionBoxPanel';

describe('T-BIM-007: SectionBoxPanel', () => {
  const defaultProps = {
    enabled: false,
    position: 0,
    direction: 'x' as const,
    onToggle: vi.fn(),
    onPositionChange: vi.fn(),
    onDirectionChange: vi.fn(),
    onSaveView: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Section Box panel header', () => {
    render(<SectionBoxPanel {...defaultProps} />);
    expect(screen.getByText('Section View')).toBeInTheDocument();
  });

  it('shows enable/disable toggle', () => {
    render(<SectionBoxPanel {...defaultProps} />);
    expect(screen.getByRole('checkbox', { name: /enable/i })).toBeInTheDocument();
  });

  it('toggle is unchecked when enabled=false', () => {
    render(<SectionBoxPanel {...defaultProps} />);
    expect(screen.getByRole('checkbox', { name: /enable/i })).not.toBeChecked();
  });

  it('toggle is checked when enabled=true', () => {
    render(<SectionBoxPanel {...defaultProps} enabled={true} />);
    expect(screen.getByRole('checkbox', { name: /enable/i })).toBeChecked();
  });

  it('calls onToggle when checkbox clicked', () => {
    render(<SectionBoxPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable/i }));
    expect(defaultProps.onToggle).toHaveBeenCalled();
  });

  it('shows direction select when enabled', () => {
    render(<SectionBoxPanel {...defaultProps} enabled={true} />);
    expect(screen.getByLabelText(/direction/i)).toBeInTheDocument();
  });

  it('direction select has X, Y, Z options', () => {
    render(<SectionBoxPanel {...defaultProps} enabled={true} />);
    const select = screen.getByLabelText(/direction/i);
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
    expect(options).toContain('X (Left/Right)');
    expect(options).toContain('Y (Front/Back)');
    expect(options).toContain('Z (Top/Bottom)');
  });

  it('calls onDirectionChange when direction changes', () => {
    render(<SectionBoxPanel {...defaultProps} enabled={true} />);
    const select = screen.getByLabelText(/direction/i);
    fireEvent.change(select, { target: { value: 'y' } });
    expect(defaultProps.onDirectionChange).toHaveBeenCalledWith('y');
  });

  it('shows position slider when enabled', () => {
    render(<SectionBoxPanel {...defaultProps} enabled={true} />);
    expect(screen.getByLabelText(/position/i)).toBeInTheDocument();
  });

  it('position slider is a range input', () => {
    render(<SectionBoxPanel {...defaultProps} enabled={true} />);
    const slider = screen.getByLabelText(/position/i);
    expect(slider).toHaveAttribute('type', 'range');
  });

  it('calls onPositionChange when slider moves', () => {
    render(<SectionBoxPanel {...defaultProps} enabled={true} />);
    const slider = screen.getByLabelText(/position/i);
    fireEvent.change(slider, { target: { value: '500' } });
    expect(defaultProps.onPositionChange).toHaveBeenCalledWith(500);
  });

  it('shows save view button when enabled', () => {
    render(<SectionBoxPanel {...defaultProps} enabled={true} />);
    expect(screen.getByRole('button', { name: /save.*view/i })).toBeInTheDocument();
  });

  it('calls onSaveView when save button clicked', () => {
    render(<SectionBoxPanel {...defaultProps} enabled={true} />);
    fireEvent.click(screen.getByRole('button', { name: /save.*view/i }));
    expect(defaultProps.onSaveView).toHaveBeenCalled();
  });

  it('hides controls when not enabled', () => {
    render(<SectionBoxPanel {...defaultProps} enabled={false} />);
    expect(screen.queryByLabelText(/direction/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/position/i)).not.toBeInTheDocument();
  });

  it('shows current position value', () => {
    render(<SectionBoxPanel {...defaultProps} enabled={true} position={750} />);
    expect(screen.getByText(/750/)).toBeInTheDocument();
  });
});

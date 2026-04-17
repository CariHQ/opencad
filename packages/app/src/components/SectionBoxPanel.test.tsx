import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SectionBoxPanel } from './SectionBoxPanel';
expect.extend(jestDomMatchers);

describe('T-BIM-007: SectionBoxPanel', () => {
  const onToggle = vi.fn();
  const onPositionChange = vi.fn();
  const onDirectionChange = vi.fn();
  const onSaveView = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Section Box panel header', () => {
    render(<SectionBoxPanel />);
    expect(screen.getByText('Section View')).toBeInTheDocument();
  });

  it('shows enable/disable toggle', () => {
    render(<SectionBoxPanel />);
    expect(screen.getByRole('checkbox', { name: /enable/i })).toBeInTheDocument();
  });

  it('toggle is unchecked by default', () => {
    render(<SectionBoxPanel />);
    expect(screen.getByRole('checkbox', { name: /enable/i })).not.toBeChecked();
  });

  it('checking the toggle shows direction and position controls', () => {
    render(<SectionBoxPanel />);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable/i }));
    expect(screen.getByLabelText(/direction/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/position/i)).toBeInTheDocument();
  });

  it('calls onToggle callback when checkbox clicked', () => {
    render(<SectionBoxPanel onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable/i }));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('shows direction select when enabled', () => {
    render(<SectionBoxPanel />);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable/i }));
    expect(screen.getByLabelText(/direction/i)).toBeInTheDocument();
  });

  it('direction select has X, Y, Z options', () => {
    render(<SectionBoxPanel />);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable/i }));
    const select = screen.getByLabelText(/direction/i);
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
    expect(options).toContain('X (Left/Right)');
    expect(options).toContain('Y (Front/Back)');
    expect(options).toContain('Z (Top/Bottom)');
  });

  it('calls onDirectionChange when direction changes', () => {
    render(<SectionBoxPanel onDirectionChange={onDirectionChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable/i }));
    const select = screen.getByLabelText(/direction/i);
    fireEvent.change(select, { target: { value: 'y' } });
    expect(onDirectionChange).toHaveBeenCalledWith('y');
  });

  it('shows position slider when enabled', () => {
    render(<SectionBoxPanel />);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable/i }));
    expect(screen.getByLabelText(/position/i)).toBeInTheDocument();
  });

  it('position slider is a range input', () => {
    render(<SectionBoxPanel />);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable/i }));
    const slider = screen.getByLabelText(/position/i);
    expect(slider).toHaveAttribute('type', 'range');
  });

  it('calls onPositionChange when slider moves', () => {
    render(<SectionBoxPanel onPositionChange={onPositionChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable/i }));
    const slider = screen.getByLabelText(/position/i);
    fireEvent.change(slider, { target: { value: '500' } });
    expect(onPositionChange).toHaveBeenCalledWith(500);
  });

  it('shows save view button when enabled', () => {
    render(<SectionBoxPanel />);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable/i }));
    expect(screen.getByRole('button', { name: /save.*view/i })).toBeInTheDocument();
  });

  it('calls onSaveView when save button clicked', () => {
    render(<SectionBoxPanel onSaveView={onSaveView} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable/i }));
    fireEvent.click(screen.getByRole('button', { name: /save.*view/i }));
    expect(onSaveView).toHaveBeenCalled();
  });

  it('hides controls when not enabled', () => {
    render(<SectionBoxPanel />);
    expect(screen.queryByLabelText(/direction/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/position/i)).not.toBeInTheDocument();
  });

  it('shows default position value of 0', () => {
    render(<SectionBoxPanel />);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable/i }));
    expect(screen.getByText(/0mm/)).toBeInTheDocument();
  });
});

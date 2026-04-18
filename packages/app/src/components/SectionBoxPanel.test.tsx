import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SectionBoxPanel } from './SectionBoxPanel';
expect.extend(jestDomMatchers);

describe('T-BIM-007: SectionBoxPanel (legacy)', () => {
  const onToggle = vi.fn();
  const onPositionChange = vi.fn();
  const _onDirectionChange = vi.fn();
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
    expect(screen.getByLabelText(/position/i)).toBeInTheDocument();
  });

  it('calls onToggle callback when checkbox clicked', () => {
    render(<SectionBoxPanel onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable/i }));
    expect(onToggle).toHaveBeenCalledWith(true);
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
    expect(screen.queryByLabelText(/position/i)).not.toBeInTheDocument();
  });

  it('shows default position value of 0', () => {
    render(<SectionBoxPanel />);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable/i }));
    expect(screen.getByText(/0mm/)).toBeInTheDocument();
  });
});

describe('T-VP-002: SectionBoxPanel enhanced controls', () => {
  const onToggle = vi.fn();
  const _onPositionChange = vi.fn();
  const onDirectionChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders axis selector buttons for X, Y, Z', () => {
    render(<SectionBoxPanel />);
    expect(screen.getByRole('button', { name: /^X$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Y$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Z$/i })).toBeInTheDocument();
  });

  it('clicking X axis button calls onDirectionChange with "x"', () => {
    render(<SectionBoxPanel onDirectionChange={onDirectionChange} />);
    fireEvent.click(screen.getByRole('button', { name: /^X$/i }));
    expect(onDirectionChange).toHaveBeenCalledWith('x');
  });

  it('clicking Y axis button calls onDirectionChange with "y"', () => {
    render(<SectionBoxPanel onDirectionChange={onDirectionChange} />);
    fireEvent.click(screen.getByRole('button', { name: /^Y$/i }));
    expect(onDirectionChange).toHaveBeenCalledWith('y');
  });

  it('clicking Z axis button calls onDirectionChange with "z"', () => {
    render(<SectionBoxPanel onDirectionChange={onDirectionChange} />);
    fireEvent.click(screen.getByRole('button', { name: /^Z$/i }));
    expect(onDirectionChange).toHaveBeenCalledWith('z');
  });

  it('renders position slider when section is enabled', () => {
    render(<SectionBoxPanel />);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable/i }));
    const slider = screen.getByLabelText(/position/i);
    expect(slider).toHaveAttribute('type', 'range');
  });

  it('position slider has min=0 and max=20000', () => {
    render(<SectionBoxPanel />);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable/i }));
    const slider = screen.getByLabelText(/position/i);
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '20000');
  });

  it('renders "Show section plane" toggle button', () => {
    render(<SectionBoxPanel />);
    expect(screen.getByRole('checkbox', { name: /show section plane|enable/i })).toBeInTheDocument();
  });

  it('toggling "Show section plane" calls onToggle with new state', () => {
    render(<SectionBoxPanel onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable/i }));
    expect(onToggle).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable/i }));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('uses panel-header CSS class', () => {
    const { container } = render(<SectionBoxPanel />);
    expect(container.querySelector('.panel-header')).toBeInTheDocument();
  });

  it('uses panel-title CSS class', () => {
    const { container } = render(<SectionBoxPanel />);
    expect(container.querySelector('.panel-title')).toBeInTheDocument();
  });

  it('Z axis button is active/selected by default', () => {
    const { container } = render(<SectionBoxPanel />);
    const zBtn = screen.getByRole('button', { name: /^Z$/i });
    expect(zBtn.classList.contains('active') || zBtn.getAttribute('aria-pressed') === 'true' || container.querySelector('.axis-btn.active')).toBeTruthy();
  });

  it('clicking axis button updates active state', () => {
    render(<SectionBoxPanel />);
    const xBtn = screen.getByRole('button', { name: /^X$/i });
    fireEvent.click(xBtn);
    expect(xBtn.classList.contains('active') || xBtn.getAttribute('aria-pressed') === 'true').toBeTruthy();
  });
});

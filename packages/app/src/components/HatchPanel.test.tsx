import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { HatchPanel } from './HatchPanel';

describe('T-2D-009: HatchPanel', () => {
  const defaultProps = { onApply: vi.fn() };
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders Hatch Patterns header', () => {
    render(<HatchPanel {...defaultProps} />);
    expect(screen.getByText('Hatch Patterns')).toBeInTheDocument();
  });

  it('shows hatch pattern options', () => {
    render(<HatchPanel {...defaultProps} />);
    expect(screen.getAllByRole('radio').length).toBeGreaterThan(0);
  });

  it('has at least 10 built-in patterns', () => {
    render(<HatchPanel {...defaultProps} />);
    expect(screen.getAllByRole('radio').length).toBeGreaterThanOrEqual(10);
  });

  it('includes Concrete pattern', () => {
    render(<HatchPanel {...defaultProps} />);
    expect(screen.getByText(/concrete/i)).toBeInTheDocument();
  });

  it('includes Brick pattern', () => {
    render(<HatchPanel {...defaultProps} />);
    expect(screen.getByText(/brick/i)).toBeInTheDocument();
  });

  it('includes Sand/Earth pattern', () => {
    render(<HatchPanel {...defaultProps} />);
    expect(screen.getAllByText(/sand|earth/i).length).toBeGreaterThan(0);
  });

  it('shows scale input', () => {
    render(<HatchPanel {...defaultProps} />);
    expect(screen.getByLabelText(/scale/i)).toBeInTheDocument();
  });

  it('shows angle input', () => {
    render(<HatchPanel {...defaultProps} />);
    expect(screen.getByLabelText(/angle/i)).toBeInTheDocument();
  });

  it('shows Apply button', () => {
    render(<HatchPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
  });

  it('calls onApply with selected pattern when Apply clicked', () => {
    render(<HatchPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    expect(defaultProps.onApply).toHaveBeenCalledWith(
      expect.objectContaining({ pattern: expect.any(String), scale: expect.any(Number), angle: expect.any(Number) })
    );
  });

  it('selecting a pattern radio updates selection', () => {
    render(<HatchPanel {...defaultProps} />);
    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[2]!);
    expect(radios[2]).toBeChecked();
  });

  it('shows spacing input', () => {
    render(<HatchPanel {...defaultProps} />);
    expect(screen.getByLabelText(/spacing/i)).toBeInTheDocument();
  });
});

/**
 * T-UI-007: ViewCube orientation widget tests
 *
 * Verifies: renders face labels, clicking each face calls setViewPreset with
 * the correct preset string, and each button has an accessible aria-label.
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewCube } from './ViewCube';
expect.extend(jestDomMatchers);

describe('T-UI-007: ViewCube', () => {
  let mockSetViewPreset: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetViewPreset = vi.fn();
  });

  it('renders without crashing', () => {
    const { container } = render(<ViewCube setViewPreset={mockSetViewPreset} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders face labels TOP, FRONT, RIGHT', () => {
    render(<ViewCube setViewPreset={mockSetViewPreset} />);
    expect(screen.getByText('TOP')).toBeInTheDocument();
    expect(screen.getByText('FRONT')).toBeInTheDocument();
    expect(screen.getByText('RIGHT')).toBeInTheDocument();
  });

  it('renders 3D face label', () => {
    render(<ViewCube setViewPreset={mockSetViewPreset} />);
    expect(screen.getByText('3D')).toBeInTheDocument();
  });

  it('clicking TOP face calls setViewPreset("top")', () => {
    render(<ViewCube setViewPreset={mockSetViewPreset} />);
    fireEvent.click(screen.getByRole('button', { name: 'Set view to top' }));
    expect(mockSetViewPreset).toHaveBeenCalledWith('top');
  });

  it('clicking FRONT face calls setViewPreset("front")', () => {
    render(<ViewCube setViewPreset={mockSetViewPreset} />);
    fireEvent.click(screen.getByRole('button', { name: 'Set view to front' }));
    expect(mockSetViewPreset).toHaveBeenCalledWith('front');
  });

  it('clicking RIGHT face calls setViewPreset("right")', () => {
    render(<ViewCube setViewPreset={mockSetViewPreset} />);
    fireEvent.click(screen.getByRole('button', { name: 'Set view to right' }));
    expect(mockSetViewPreset).toHaveBeenCalledWith('right');
  });

  it('clicking 3D face calls setViewPreset("3d")', () => {
    render(<ViewCube setViewPreset={mockSetViewPreset} />);
    fireEvent.click(screen.getByRole('button', { name: 'Set view to 3d' }));
    expect(mockSetViewPreset).toHaveBeenCalledWith('3d');
  });

  it('has correct aria-label on each face button', () => {
    render(<ViewCube setViewPreset={mockSetViewPreset} />);
    expect(screen.getByRole('button', { name: 'Set view to top' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set view to front' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set view to right' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set view to 3d' })).toBeInTheDocument();
  });
});

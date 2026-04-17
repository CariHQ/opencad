/**
 * PlacementPanel component tests
 * T-UI-012: Placement panel for door and window placement
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlacementPanel } from './PlacementPanel';

describe('T-UI-012: PlacementPanel', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Door mode', () => {
    it('renders "Door Properties" title', () => {
      render(<PlacementPanel elementType="door" onClose={onClose} />);
      expect(screen.getByText(/Door Properties/i)).toBeInTheDocument();
    });

    it('renders Width field with default 900', () => {
      render(<PlacementPanel elementType="door" onClose={onClose} />);
      const inputs = screen.getAllByRole('spinbutton');
      const widthInput = inputs.find((i) => (i as HTMLInputElement).value === '900');
      expect(widthInput).toBeTruthy();
    });

    it('renders Height field with default 2100', () => {
      render(<PlacementPanel elementType="door" onClose={onClose} />);
      const inputs = screen.getAllByRole('spinbutton');
      const heightInput = inputs.find((i) => (i as HTMLInputElement).value === '2100');
      expect(heightInput).toBeTruthy();
    });

    it('renders Swing field with default 90', () => {
      render(<PlacementPanel elementType="door" onClose={onClose} />);
      const inputs = screen.getAllByRole('spinbutton');
      const swingInput = inputs.find((i) => (i as HTMLInputElement).value === '90');
      expect(swingInput).toBeTruthy();
    });

    it('does not show Sill Height for door', () => {
      render(<PlacementPanel elementType="door" onClose={onClose} />);
      expect(screen.queryByText(/Sill Height/i)).not.toBeInTheDocument();
    });

    it('shows placement hint for door', () => {
      render(<PlacementPanel elementType="door" onClose={onClose} />);
      expect(screen.getByText(/Click in the viewport to place the door/i)).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      render(<PlacementPanel elementType="door" onClose={onClose} />);
      fireEvent.click(screen.getByRole('button'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('updating width changes input value', () => {
      render(<PlacementPanel elementType="door" onClose={onClose} />);
      const inputs = screen.getAllByRole('spinbutton');
      const widthInput = inputs[0];
      fireEvent.change(widthInput, { target: { value: '1200' } });
      expect((widthInput as HTMLInputElement).value).toBe('1200');
    });
  });

  describe('Window mode', () => {
    it('renders "Window Properties" title', () => {
      render(<PlacementPanel elementType="window" onClose={onClose} />);
      expect(screen.getByText(/Window Properties/i)).toBeInTheDocument();
    });

    it('renders Width field with default 1200', () => {
      render(<PlacementPanel elementType="window" onClose={onClose} />);
      const inputs = screen.getAllByRole('spinbutton');
      const widthInput = inputs.find((i) => (i as HTMLInputElement).value === '1200');
      expect(widthInput).toBeTruthy();
    });

    it('renders Sill Height field for window', () => {
      render(<PlacementPanel elementType="window" onClose={onClose} />);
      expect(screen.getByText(/Sill Height/i)).toBeInTheDocument();
    });

    it('renders Sill Height with default 900', () => {
      render(<PlacementPanel elementType="window" onClose={onClose} />);
      const inputs = screen.getAllByRole('spinbutton');
      const sillInput = inputs.find((i) => (i as HTMLInputElement).value === '900');
      expect(sillInput).toBeTruthy();
    });

    it('does not show Swing for window', () => {
      render(<PlacementPanel elementType="window" onClose={onClose} />);
      expect(screen.queryByText(/Swing/i)).not.toBeInTheDocument();
    });

    it('shows placement hint for window', () => {
      render(<PlacementPanel elementType="window" onClose={onClose} />);
      expect(screen.getByText(/Click in the viewport to place the window/i)).toBeInTheDocument();
    });

    it('shows Width and Height labels', () => {
      render(<PlacementPanel elementType="window" onClose={onClose} />);
      expect(screen.getByText('Width (mm)')).toBeInTheDocument();
      expect(screen.getByText('Height (mm)')).toBeInTheDocument();
    });
  });
});

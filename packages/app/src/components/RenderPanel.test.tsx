import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { RenderPanel } from './RenderPanel';

describe('T-RENDER-001: RenderPanel', () => {
  it('renders Render Settings header', () => {
    render(<RenderPanel />);
    expect(screen.getByText(/render settings/i)).toBeInTheDocument();
  });

  it('shows ambient occlusion toggle', () => {
    render(<RenderPanel />);
    expect(screen.getByLabelText(/ambient occlusion/i)).toBeInTheDocument();
  });

  it('shows shadows toggle', () => {
    render(<RenderPanel />);
    expect(screen.getByLabelText(/shadows/i)).toBeInTheDocument();
  });

  it('shows exposure slider', () => {
    render(<RenderPanel />);
    expect(screen.getByLabelText(/exposure/i)).toBeInTheDocument();
  });

  it('shows tone mapping select', () => {
    render(<RenderPanel />);
    expect(screen.getByLabelText(/tone mapping/i)).toBeInTheDocument();
  });

  it('shows environment map select', () => {
    render(<RenderPanel />);
    expect(screen.getByLabelText(/environment/i)).toBeInTheDocument();
  });

  it('toggles ambient occlusion', () => {
    render(<RenderPanel />);
    const checkbox = screen.getByLabelText(/ambient occlusion/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it('updates exposure slider value', () => {
    render(<RenderPanel />);
    const slider = screen.getByLabelText(/exposure/i) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '1.5' } });
    expect(slider.value).toBe('1.5');
  });

  it('shows bloom toggle', () => {
    render(<RenderPanel />);
    expect(screen.getByLabelText(/bloom/i)).toBeInTheDocument();
  });
});

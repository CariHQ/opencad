import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { RenderPanel } from './RenderPanel';

describe('T-RENDER-001: RenderPanel', () => {
  const onChange = vi.fn();
  beforeEach(() => { vi.clearAllMocks(); });

  const defaultSettings = {
    ambientOcclusion: true,
    shadows: true,
    shadowIntensity: 0.5,
    exposure: 1.0,
    toneMapping: 'aces' as const,
    environmentMap: 'studio' as const,
    groundReflections: false,
    bloomEnabled: false,
    bloomStrength: 0.3,
  };

  it('renders Render Settings header', () => {
    render(<RenderPanel settings={defaultSettings} onChange={onChange} />);
    expect(screen.getByText(/render settings/i)).toBeInTheDocument();
  });

  it('shows ambient occlusion toggle', () => {
    render(<RenderPanel settings={defaultSettings} onChange={onChange} />);
    expect(screen.getByLabelText(/ambient occlusion/i)).toBeInTheDocument();
  });

  it('shows shadows toggle', () => {
    render(<RenderPanel settings={defaultSettings} onChange={onChange} />);
    expect(screen.getByLabelText(/shadows/i)).toBeInTheDocument();
  });

  it('shows exposure slider', () => {
    render(<RenderPanel settings={defaultSettings} onChange={onChange} />);
    expect(screen.getByLabelText(/exposure/i)).toBeInTheDocument();
  });

  it('shows tone mapping select', () => {
    render(<RenderPanel settings={defaultSettings} onChange={onChange} />);
    expect(screen.getByLabelText(/tone mapping/i)).toBeInTheDocument();
  });

  it('shows environment map select', () => {
    render(<RenderPanel settings={defaultSettings} onChange={onChange} />);
    expect(screen.getByLabelText(/environment/i)).toBeInTheDocument();
  });

  it('calls onChange when AO toggled', () => {
    render(<RenderPanel settings={defaultSettings} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/ambient occlusion/i));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ ambientOcclusion: false }));
  });

  it('calls onChange when exposure changed', () => {
    render(<RenderPanel settings={defaultSettings} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/exposure/i), { target: { value: '1.5' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ exposure: 1.5 }));
  });

  it('shows bloom toggle', () => {
    render(<RenderPanel settings={defaultSettings} onChange={onChange} />);
    expect(screen.getByLabelText(/bloom/i)).toBeInTheDocument();
  });
});

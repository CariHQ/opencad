import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RenderPanel } from './RenderPanel';
expect.extend(jestDomMatchers);

// ─── T-3D-010: PBR Real-Time Rendering Panel ──────────────────────────────────

describe('T-3D-010: PBR Render Panel', () => {
  it('environment dropdown renders with Studio option', () => {
    render(<RenderPanel />);
    const select = screen.getByLabelText(/environment map/i);
    const option = Array.from((select as HTMLSelectElement).options).find(
      (o) => o.text === 'Studio'
    );
    expect(option).toBeDefined();
  });

  it('environment dropdown renders with Outdoor option', () => {
    render(<RenderPanel />);
    const select = screen.getByLabelText(/environment map/i);
    const option = Array.from((select as HTMLSelectElement).options).find(
      (o) => o.text === 'Outdoor'
    );
    expect(option).toBeDefined();
  });

  it('environment dropdown renders with Interior option', () => {
    render(<RenderPanel />);
    const select = screen.getByLabelText(/environment map/i);
    const option = Array.from((select as HTMLSelectElement).options).find(
      (o) => o.text === 'Interior'
    );
    expect(option).toBeDefined();
  });

  it('environment dropdown renders with Night option', () => {
    render(<RenderPanel />);
    const select = screen.getByLabelText(/environment map/i);
    const option = Array.from((select as HTMLSelectElement).options).find(
      (o) => o.text === 'Night'
    );
    expect(option).toBeDefined();
  });

  it('environment dropdown has exactly 4 options', () => {
    render(<RenderPanel />);
    const select = screen.getByLabelText(/environment map/i) as HTMLSelectElement;
    expect(select.options.length).toBe(4);
  });

  it('enableShadows checkbox exists and is toggleable', () => {
    render(<RenderPanel />);
    const checkbox = screen.getByTestId('enable-shadows-checkbox') as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    const initial = checkbox.checked;
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(!initial);
  });

  it('enableAO checkbox exists and is toggleable', () => {
    render(<RenderPanel />);
    const checkbox = screen.getByTestId('enable-ao-checkbox') as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    const initial = checkbox.checked;
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(!initial);
  });

  it('exposure slider has min of 0.5', () => {
    render(<RenderPanel />);
    const slider = screen.getByLabelText(/exposure/i) as HTMLInputElement;
    expect(parseFloat(slider.min)).toBe(0.5);
  });

  it('exposure slider has max of 2.0', () => {
    render(<RenderPanel />);
    const slider = screen.getByLabelText(/exposure/i) as HTMLInputElement;
    expect(parseFloat(slider.max)).toBe(2.0);
  });

  it('exposure slider has default value of 1.0', () => {
    render(<RenderPanel />);
    const slider = screen.getByLabelText(/exposure/i) as HTMLInputElement;
    expect(parseFloat(slider.value)).toBe(1.0);
  });

  it('render quality selector renders with Draft option', () => {
    render(<RenderPanel />);
    const select = screen.getByLabelText(/render quality/i) as HTMLSelectElement;
    const option = Array.from(select.options).find((o) => o.text === 'Draft');
    expect(option).toBeDefined();
  });

  it('render quality selector renders with Standard option', () => {
    render(<RenderPanel />);
    const select = screen.getByLabelText(/render quality/i) as HTMLSelectElement;
    const option = Array.from(select.options).find((o) => o.text === 'Standard');
    expect(option).toBeDefined();
  });

  it('render quality selector renders with High option', () => {
    render(<RenderPanel />);
    const select = screen.getByLabelText(/render quality/i) as HTMLSelectElement;
    const option = Array.from(select.options).find((o) => o.text === 'High');
    expect(option).toBeDefined();
  });

  it('render quality selector has exactly 3 options', () => {
    render(<RenderPanel />);
    const select = screen.getByLabelText(/render quality/i) as HTMLSelectElement;
    expect(select.options.length).toBe(3);
  });

  it('changing environment map updates component state', () => {
    render(<RenderPanel />);
    const select = screen.getByLabelText(/environment map/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'interior' } });
    expect(select.value).toBe('interior');
  });

  it('changing render quality updates component state', () => {
    render(<RenderPanel />);
    const select = screen.getByLabelText(/render quality/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'high' } });
    expect(select.value).toBe('high');
  });

  it('exposure slider changes are reflected in component state', () => {
    render(<RenderPanel />);
    const slider = screen.getByLabelText(/exposure/i) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '1.5' } });
    expect(slider.value).toBe('1.5');
  });
});

// ─── T-RENDER-001 (existing) ──────────────────────────────────────────────────

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

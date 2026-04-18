import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ShadowAnalysisPanel } from './ShadowAnalysisPanel';

describe('T-GIS-002: ShadowAnalysisPanel', () => {
  const onRun = vi.fn();
  const onChange = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });

  it('renders Shadow Analysis header', () => {
    render(<ShadowAnalysisPanel onRun={onRun} onChange={onChange} />);
    expect(screen.getAllByText(/shadow|daylight analysis/i).length).toBeGreaterThan(0);
  });

  it('shows latitude and longitude inputs', () => {
    render(<ShadowAnalysisPanel onRun={onRun} onChange={onChange} />);
    expect(screen.getByLabelText(/latitude/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/longitude/i)).toBeInTheDocument();
  });

  it('shows date input', () => {
    render(<ShadowAnalysisPanel onRun={onRun} onChange={onChange} />);
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
  });

  it('shows time input', () => {
    render(<ShadowAnalysisPanel onRun={onRun} onChange={onChange} />);
    expect(screen.getByLabelText(/time/i)).toBeInTheDocument();
  });

  it('shows sun path toggle', () => {
    render(<ShadowAnalysisPanel onRun={onRun} onChange={onChange} />);
    expect(screen.getByLabelText(/sun path/i)).toBeInTheDocument();
  });

  it('shows shadow map toggle', () => {
    render(<ShadowAnalysisPanel onRun={onRun} onChange={onChange} />);
    expect(screen.getByLabelText(/shadow map/i)).toBeInTheDocument();
  });

  it('shows Run Analysis button', () => {
    render(<ShadowAnalysisPanel onRun={onRun} onChange={onChange} />);
    expect(screen.getByRole('button', { name: /run analysis/i })).toBeInTheDocument();
  });

  it('calls onRun when Run clicked', () => {
    render(<ShadowAnalysisPanel onRun={onRun} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /run analysis/i }));
    expect(onRun).toHaveBeenCalledWith(expect.objectContaining({
      latitude: expect.any(Number),
      longitude: expect.any(Number),
    }));
  });

  it('calls onChange when date updated', () => {
    render(<ShadowAnalysisPanel onRun={onRun} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2024-12-21' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ date: '2024-12-21' }));
  });
});

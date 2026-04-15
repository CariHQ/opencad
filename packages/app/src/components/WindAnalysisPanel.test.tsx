import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { WindAnalysisPanel } from './WindAnalysisPanel';

describe('T-GIS-003: WindAnalysisPanel', () => {
  const onRun = vi.fn();
  const onChange = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });

  const defaultSettings = {
    latitude: 51.5,
    longitude: -0.12,
    prevailingDirection: 225,
    averageSpeedMs: 5.5,
    showWindRose: true,
    showVentilationPotential: true,
  };

  it('renders Wind Analysis header', () => {
    render(<WindAnalysisPanel settings={defaultSettings} onRun={onRun} onChange={onChange} />);
    expect(screen.getByText(/wind.*analysis|microclimate/i)).toBeInTheDocument();
  });

  it('shows prevailing wind direction input', () => {
    render(<WindAnalysisPanel settings={defaultSettings} onRun={onRun} onChange={onChange} />);
    expect(screen.getByLabelText(/wind direction|prevailing/i)).toBeInTheDocument();
  });

  it('shows average wind speed input', () => {
    render(<WindAnalysisPanel settings={defaultSettings} onRun={onRun} onChange={onChange} />);
    expect(screen.getByLabelText(/wind speed|average speed/i)).toBeInTheDocument();
  });

  it('shows wind rose toggle', () => {
    render(<WindAnalysisPanel settings={defaultSettings} onRun={onRun} onChange={onChange} />);
    expect(screen.getByLabelText(/wind rose/i)).toBeInTheDocument();
  });

  it('shows natural ventilation potential toggle', () => {
    render(<WindAnalysisPanel settings={defaultSettings} onRun={onRun} onChange={onChange} />);
    expect(screen.getByLabelText(/ventilation potential/i)).toBeInTheDocument();
  });

  it('shows Run Analysis button', () => {
    render(<WindAnalysisPanel settings={defaultSettings} onRun={onRun} onChange={onChange} />);
    expect(screen.getByRole('button', { name: /run analysis/i })).toBeInTheDocument();
  });

  it('calls onRun with settings when Run clicked', () => {
    render(<WindAnalysisPanel settings={defaultSettings} onRun={onRun} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /run analysis/i }));
    expect(onRun).toHaveBeenCalledWith(defaultSettings);
  });

  it('calls onChange when wind speed updated', () => {
    render(<WindAnalysisPanel settings={defaultSettings} onRun={onRun} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/wind speed|average speed/i), { target: { value: '8.0' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ averageSpeedMs: 8.0 }));
  });

  it('shows compass direction reference', () => {
    render(<WindAnalysisPanel settings={defaultSettings} onRun={onRun} onChange={onChange} />);
    expect(screen.getAllByText(/n|s|e|w|north|south/i).length).toBeGreaterThan(0);
  });
});

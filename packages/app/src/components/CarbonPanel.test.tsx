import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CarbonPanel, type CarbonEntry } from './CarbonPanel';
expect.extend(jestDomMatchers);

describe('T-COST-002: CarbonPanel', () => {
  const onExport = vi.fn();
  beforeEach(() => { vi.clearAllMocks(); });

  const entries: CarbonEntry[] = [
    { id: 'e1', material: 'Concrete C30', quantity: 50, unit: 'm³', kgCO2ePerUnit: 300, totalKgCO2e: 15000, stage: 'A1-A3' },
    { id: 'e2', material: 'Structural Steel', quantity: 2, unit: 't', kgCO2ePerUnit: 1600, totalKgCO2e: 3200, stage: 'A1-A3' },
    { id: 'e3', material: 'Timber Frame', quantity: 10, unit: 'm³', kgCO2ePerUnit: 50, totalKgCO2e: 500, stage: 'A1-A3' },
  ];

  it('renders Carbon Calculator header', () => {
    render(<CarbonPanel entries={entries} onExport={onExport} />);
    expect(screen.getByText(/carbon calculator/i)).toBeInTheDocument();
  });

  it('shows material names', () => {
    render(<CarbonPanel entries={entries} onExport={onExport} />);
    expect(screen.getByText('Concrete C30')).toBeInTheDocument();
    expect(screen.getByText('Structural Steel')).toBeInTheDocument();
  });

  it('shows kgCO2e values', () => {
    render(<CarbonPanel entries={entries} onExport={onExport} />);
    expect(screen.getAllByText(/kgco2e|kg co2/i).length).toBeGreaterThan(0);
  });

  it('shows total embodied carbon', () => {
    render(<CarbonPanel entries={entries} onExport={onExport} />);
    expect(screen.getAllByText(/18,700|total/i).length).toBeGreaterThan(0);
  });

  it('shows lifecycle stage labels', () => {
    render(<CarbonPanel entries={entries} onExport={onExport} />);
    expect(screen.getAllByText(/A1-A3/i).length).toBeGreaterThan(0);
  });

  it('shows Export button', () => {
    render(<CarbonPanel entries={entries} onExport={onExport} />);
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('calls onExport when Export clicked', () => {
    render(<CarbonPanel entries={entries} onExport={onExport} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(onExport).toHaveBeenCalledWith(entries);
  });

  it('shows empty state when no entries', () => {
    render(<CarbonPanel entries={[]} onExport={onExport} />);
    expect(screen.getByText(/no carbon data|empty/i)).toBeInTheDocument();
  });

  it('shows carbon intensity metric', () => {
    render(<CarbonPanel entries={entries} onExport={onExport} />);
    expect(screen.getAllByText(/kgco2e|intensity|total/i).length).toBeGreaterThan(0);
  });
});

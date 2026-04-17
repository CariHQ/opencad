import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CostPanel, type CostItem } from './CostPanel';
expect.extend(jestDomMatchers);

describe('T-COST-001: CostPanel', () => {
  const onExport = vi.fn();
  beforeEach(() => { vi.clearAllMocks(); });

  const items: CostItem[] = [
    { id: 'c1', elementType: 'wall', description: 'External Wall 200mm', quantity: 50, unit: 'm²', unitRate: 120, total: 6000 },
    { id: 'c2', elementType: 'slab', description: 'Ground Floor Slab', quantity: 80, unit: 'm²', unitRate: 95, total: 7600 },
    { id: 'c3', elementType: 'door', description: 'Internal Door', quantity: 8, unit: 'nr', unitRate: 450, total: 3600 },
  ];

  it('renders Cost Estimate header', () => {
    render(<CostPanel items={items} onExport={onExport} />);
    expect(screen.getByText(/cost estimate/i)).toBeInTheDocument();
  });

  it('shows element description', () => {
    render(<CostPanel items={items} onExport={onExport} />);
    expect(screen.getByText('External Wall 200mm')).toBeInTheDocument();
  });

  it('shows quantity and unit', () => {
    render(<CostPanel items={items} onExport={onExport} />);
    expect(screen.getAllByText(/m²|nr/i).length).toBeGreaterThan(0);
  });

  it('shows unit rate', () => {
    render(<CostPanel items={items} onExport={onExport} />);
    expect(screen.getAllByText(/120|95|450/).length).toBeGreaterThan(0);
  });

  it('shows total for each item', () => {
    render(<CostPanel items={items} onExport={onExport} />);
    expect(screen.getAllByText(/6,000|6000/).length).toBeGreaterThan(0);
  });

  it('shows grand total', () => {
    render(<CostPanel items={items} onExport={onExport} />);
    expect(screen.getAllByText(/17,200|total/i).length).toBeGreaterThan(0);
  });

  it('shows Export button', () => {
    render(<CostPanel items={items} onExport={onExport} />);
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('calls onExport when Export clicked', () => {
    render(<CostPanel items={items} onExport={onExport} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(onExport).toHaveBeenCalledWith(items);
  });

  it('shows empty state when no items', () => {
    render(<CostPanel items={[]} onExport={onExport} />);
    expect(screen.getByText(/no cost items|empty/i)).toBeInTheDocument();
  });

  it('shows element type grouping', () => {
    render(<CostPanel items={items} onExport={onExport} />);
    expect(screen.getAllByText(/wall|slab|door/i).length).toBeGreaterThan(0);
  });
});

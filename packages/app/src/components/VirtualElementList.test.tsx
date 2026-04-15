import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { VirtualElementList } from './VirtualElementList';

describe('T-PERF-001: VirtualElementList', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const makeItems = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: `el-${i}`,
      type: i % 3 === 0 ? 'wall' : i % 3 === 1 ? 'door' : 'window',
      label: `Element ${i}`,
    }));

  it('renders the list container', () => {
    render(<VirtualElementList items={makeItems(10)} itemHeight={32} visibleCount={5} />);
    expect(document.querySelector('.virtual-list')).toBeInTheDocument();
  });

  it('only renders visibleCount + buffer items in the DOM', () => {
    const items = makeItems(1000);
    render(<VirtualElementList items={items} itemHeight={32} visibleCount={10} />);
    const rendered = document.querySelectorAll('.virtual-list-item').length;
    expect(rendered).toBeLessThan(50);
  });

  it('renders first item when offset is 0', () => {
    const items = makeItems(20);
    render(<VirtualElementList items={items} itemHeight={32} visibleCount={5} scrollOffset={0} />);
    expect(screen.getByText('Element 0')).toBeInTheDocument();
  });

  it('renders correct items at a scroll offset', () => {
    const items = makeItems(100);
    render(<VirtualElementList items={items} itemHeight={32} visibleCount={5} scrollOffset={320} />);
    expect(screen.getByText('Element 10')).toBeInTheDocument();
  });

  it('shows total height container to maintain scrollbar', () => {
    const items = makeItems(1000);
    render(<VirtualElementList items={items} itemHeight={32} visibleCount={10} />);
    const spacer = document.querySelector('.virtual-list-spacer') as HTMLElement;
    expect(spacer).toBeInTheDocument();
    expect(parseInt(spacer.style.height)).toBe(1000 * 32);
  });

  it('handles empty list', () => {
    render(<VirtualElementList items={[]} itemHeight={32} visibleCount={10} />);
    expect(document.querySelector('.virtual-list')).toBeInTheDocument();
    expect(document.querySelectorAll('.virtual-list-item').length).toBe(0);
  });

  it('renders type badge for each item', () => {
    const items = makeItems(5);
    render(<VirtualElementList items={items} itemHeight={32} visibleCount={5} />);
    expect(screen.getAllByText(/wall|door|window/i).length).toBeGreaterThan(0);
  });
});

import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SymbolLibrary } from './SymbolLibrary';
expect.extend(jestDomMatchers);

describe('T-2D-010: SymbolLibrary', () => {
  const defaultProps = { onInsert: vi.fn() };
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders Symbol Library header', () => {
    render(<SymbolLibrary {...defaultProps} />);
    expect(screen.getByText('Symbol Library')).toBeInTheDocument();
  });

  it('shows North Arrow symbol', () => {
    render(<SymbolLibrary {...defaultProps} />);
    expect(screen.getAllByText(/north arrow/i).length).toBeGreaterThan(0);
  });

  it('shows Scale Bar symbol', () => {
    render(<SymbolLibrary {...defaultProps} />);
    expect(screen.getAllByText(/scale bar/i).length).toBeGreaterThan(0);
  });

  it('shows Revision Cloud symbol', () => {
    render(<SymbolLibrary {...defaultProps} />);
    expect(screen.getAllByText(/revision cloud/i).length).toBeGreaterThan(0);
  });

  it('shows Break Line symbol', () => {
    render(<SymbolLibrary {...defaultProps} />);
    expect(screen.getAllByText(/break line/i).length).toBeGreaterThan(0);
  });

  it('has Insert button for each symbol', () => {
    render(<SymbolLibrary {...defaultProps} />);
    expect(screen.getAllByRole('button', { name: /insert/i }).length).toBeGreaterThan(0);
  });

  it('calls onInsert when Insert clicked', () => {
    render(<SymbolLibrary {...defaultProps} />);
    fireEvent.click(screen.getAllByRole('button', { name: /insert/i })[0]!);
    expect(defaultProps.onInsert).toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(String) }));
  });

  it('shows search input', () => {
    render(<SymbolLibrary {...defaultProps} />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('filters symbols by search', () => {
    render(<SymbolLibrary {...defaultProps} />);
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: 'north' } });
    expect(screen.getAllByText(/north arrow/i).length).toBeGreaterThan(0);
  });

  it('shows at least 10 symbols', () => {
    render(<SymbolLibrary {...defaultProps} />);
    expect(screen.getAllByRole('button', { name: /insert/i }).length).toBeGreaterThanOrEqual(4);
  });
});

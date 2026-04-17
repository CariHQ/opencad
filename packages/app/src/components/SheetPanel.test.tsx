import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SheetPanel } from './SheetPanel';
expect.extend(jestDomMatchers);

describe('T-SHEET-001: SheetPanel', () => {
  const defaultProps = {
    onExportPDF: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Sheet Layout header', () => {
    render(<SheetPanel {...defaultProps} />);
    expect(screen.getByText('Sheet Layout')).toBeInTheDocument();
  });

  it('shows sheet size select', () => {
    render(<SheetPanel {...defaultProps} />);
    expect(screen.getByLabelText(/sheet size/i)).toBeInTheDocument();
  });

  it('sheet size options include A0, A1, A2, A3, A4', () => {
    render(<SheetPanel {...defaultProps} />);
    const select = screen.getByLabelText(/sheet size/i);
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
    expect(options).toContain('A0');
    expect(options).toContain('A1');
    expect(options).toContain('A2');
    expect(options).toContain('A3');
    expect(options).toContain('A4');
  });

  it('shows title block fields', () => {
    render(<SheetPanel {...defaultProps} />);
    expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/drawn by/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sheet number/i)).toBeInTheDocument();
  });

  it('shows orientation select (Portrait/Landscape)', () => {
    render(<SheetPanel {...defaultProps} />);
    expect(screen.getByLabelText(/orientation/i)).toBeInTheDocument();
    const select = screen.getByLabelText(/orientation/i);
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
    expect(options).toContain('Portrait');
    expect(options).toContain('Landscape');
  });

  it('shows scale select', () => {
    render(<SheetPanel {...defaultProps} />);
    expect(screen.getByLabelText(/scale/i)).toBeInTheDocument();
  });

  it('scale options include common architectural scales', () => {
    render(<SheetPanel {...defaultProps} />);
    const select = screen.getByLabelText(/scale/i);
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
    expect(options).toContain('1:50');
    expect(options).toContain('1:100');
  });

  it('shows Export PDF button', () => {
    render(<SheetPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /export.*pdf/i })).toBeInTheDocument();
  });

  it('calls onExportPDF when Export PDF button clicked', () => {
    render(<SheetPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /export.*pdf/i }));
    expect(defaultProps.onExportPDF).toHaveBeenCalled();
  });

  it('calls onExportPDF with sheet config', () => {
    render(<SheetPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /export.*pdf/i }));
    expect(defaultProps.onExportPDF).toHaveBeenCalledWith(
      expect.objectContaining({
        size: expect.any(String),
        orientation: expect.any(String),
        scale: expect.any(String),
      })
    );
  });

  it('shows sheet preview area', () => {
    render(<SheetPanel {...defaultProps} />);
    expect(screen.getByRole('img', { name: /sheet preview/i })).toBeInTheDocument();
  });

  it('shows Add View button', () => {
    render(<SheetPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /add view/i })).toBeInTheDocument();
  });
});

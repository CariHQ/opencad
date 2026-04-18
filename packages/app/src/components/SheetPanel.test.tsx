import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SheetPanel, SheetManager } from './SheetPanel';
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

// T-DOC-020: Sheet Layout Manager — sheet list management
describe('T-DOC-020: SheetManager', () => {
  it('renders with an "Add Sheet" button', () => {
    render(<SheetManager />);
    expect(screen.getByRole('button', { name: /add sheet/i })).toBeInTheDocument();
  });

  it('clicking "Add Sheet" adds a sheet to the list', () => {
    render(<SheetManager />);
    fireEvent.click(screen.getByRole('button', { name: /add sheet/i }));
    // Sheet list should show at least one item
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
  });

  it('clicking a sheet shows its properties', () => {
    render(<SheetManager />);
    fireEvent.click(screen.getByRole('button', { name: /add sheet/i }));
    const sheetItem = screen.getAllByRole('listitem')[0];
    fireEvent.click(sheetItem);
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it('size dropdown has A0, A1, A2, A3, A4 options', () => {
    render(<SheetManager />);
    fireEvent.click(screen.getByRole('button', { name: /add sheet/i }));
    const sheetItem = screen.getAllByRole('listitem')[0];
    fireEvent.click(sheetItem);
    const sizeSelect = screen.getByLabelText(/size/i);
    const options = Array.from(sizeSelect.querySelectorAll('option')).map((o) => o.textContent);
    expect(options).toContain('A0');
    expect(options).toContain('A1');
    expect(options).toContain('A2');
    expect(options).toContain('A3');
    expect(options).toContain('A4');
  });

  it('scale dropdown has common scale options', () => {
    render(<SheetManager />);
    fireEvent.click(screen.getByRole('button', { name: /add sheet/i }));
    const sheetItem = screen.getAllByRole('listitem')[0];
    fireEvent.click(sheetItem);
    const scaleSelect = screen.getByLabelText(/scale/i);
    const options = Array.from(scaleSelect.querySelectorAll('option')).map((o) => o.textContent);
    expect(options).toContain('1:1');
    expect(options).toContain('1:50');
    expect(options).toContain('1:100');
    expect(options).toContain('1:200');
    expect(options).toContain('1:500');
  });

  it('delete button removes the sheet after confirmation', () => {
    // Mock window.confirm to return true
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<SheetManager />);
    fireEvent.click(screen.getByRole('button', { name: /add sheet/i }));
    const sheetItem = screen.getAllByRole('listitem')[0];
    fireEvent.click(sheetItem);
    const deleteBtn = screen.getByRole('button', { name: /delete sheet/i });
    fireEvent.click(deleteBtn);
    expect(confirmSpy).toHaveBeenCalled();
    // Sheet list should be empty again
    expect(screen.queryAllByRole('listitem').length).toBe(0);
    confirmSpy.mockRestore();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CommandPalette } from './CommandPalette';

const _noop = () => {};

describe('T-UI-002: CommandPalette', () => {
  const defaultProps = {
    onClose: vi.fn(),
    onExecute: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the search input', () => {
    render(<CommandPalette {...defaultProps} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('input has placeholder text', () => {
    render(<CommandPalette {...defaultProps} />);
    expect(screen.getByPlaceholderText(/search commands/i)).toBeInTheDocument();
  });

  it('shows default commands on empty query', () => {
    render(<CommandPalette {...defaultProps} />);
    expect(screen.getByText(/wall/i)).toBeInTheDocument();
  });

  it('shows all tool commands in results', () => {
    render(<CommandPalette {...defaultProps} />);
    expect(screen.getByText(/select/i)).toBeInTheDocument();
  });

  it('filters commands by query', () => {
    render(<CommandPalette {...defaultProps} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'wall' } });
    expect(screen.getByText(/wall/i)).toBeInTheDocument();
  });

  it('hides non-matching commands when filtering', () => {
    render(<CommandPalette {...defaultProps} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'zzz_nonexistent' } });
    expect(screen.queryByText(/^wall$/i)).not.toBeInTheDocument();
  });

  it('shows "AI: " prefix in results when query starts with >', () => {
    render(<CommandPalette {...defaultProps} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: '>generate a room' } });
    expect(screen.getByText(/ai:/i)).toBeInTheDocument();
  });

  it('calls onExecute when a result is clicked', () => {
    render(<CommandPalette {...defaultProps} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'wall' } });
    const result = screen.getByText(/wall/i);
    fireEvent.click(result.closest('[role="option"]')!);
    expect(defaultProps.onExecute).toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', () => {
    render(<CommandPalette {...defaultProps} />);
    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onExecute when Enter is pressed on selected item', () => {
    render(<CommandPalette {...defaultProps} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'wall' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(defaultProps.onExecute).toHaveBeenCalled();
  });

  it('navigates down with ArrowDown', () => {
    render(<CommandPalette {...defaultProps} />);
    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const options = screen.getAllByRole('option');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('navigates up with ArrowUp', () => {
    render(<CommandPalette {...defaultProps} />);
    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    const options = screen.getAllByRole('option');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('shows keyboard shortcut hints next to commands', () => {
    render(<CommandPalette {...defaultProps} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'wall' } });
    // The Wall command has shortcut 'W' rendered in a shortcut span
    const shortcutEls = document.querySelectorAll('.command-palette-shortcut');
    const shortcuts = Array.from(shortcutEls).map((el) => el.textContent);
    expect(shortcuts).toContain('W');
  });

  it('shows empty state when no commands match', () => {
    render(<CommandPalette {...defaultProps} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'zzz_nonexistent' } });
    expect(screen.getByText(/no commands found/i)).toBeInTheDocument();
  });

  it('shows a list container with role=listbox', () => {
    render(<CommandPalette {...defaultProps} />);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
});

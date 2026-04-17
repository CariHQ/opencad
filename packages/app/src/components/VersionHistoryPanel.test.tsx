/**
 * VersionHistoryPanel component tests
 * T-UI-013: Version history panel creates and restores versions
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VersionHistoryPanel } from './VersionHistoryPanel';

const mockCreateVersion = vi.fn();
const mockRestoreVersion = vi.fn();
const mockGetVersionList = vi.fn();

vi.mock('../stores/documentStore', () => ({
  useDocumentStore: vi.fn(() => ({
    createVersion: mockCreateVersion,
    restoreVersion: mockRestoreVersion,
    getVersionList: mockGetVersionList,
  })),
}));

describe('T-UI-013: VersionHistoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVersionList.mockReturnValue([]);
  });

  it('renders Version History title', () => {
    render(<VersionHistoryPanel />);
    expect(screen.getByText(/Version History/i)).toBeInTheDocument();
  });

  it('renders version description input', () => {
    render(<VersionHistoryPanel />);
    expect(screen.getByPlaceholderText(/Version description/i)).toBeInTheDocument();
  });

  it('renders Save Version button', () => {
    render(<VersionHistoryPanel />);
    expect(screen.getByRole('button', { name: /Save Version/i })).toBeInTheDocument();
  });

  it('shows empty state message when no versions', () => {
    render(<VersionHistoryPanel />);
    expect(screen.getByText(/No saved versions yet/i)).toBeInTheDocument();
  });

  it('calls createVersion when Save Version is clicked', () => {
    render(<VersionHistoryPanel />);
    fireEvent.click(screen.getByRole('button', { name: /Save Version/i }));
    expect(mockCreateVersion).toHaveBeenCalledTimes(1);
  });

  it('passes the version message to createVersion', () => {
    render(<VersionHistoryPanel />);
    const input = screen.getByPlaceholderText(/Version description/i);
    fireEvent.change(input, { target: { value: 'Phase 1 complete' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Version/i }));
    expect(mockCreateVersion).toHaveBeenCalledWith('Phase 1 complete');
  });

  it('clears input after saving a version', () => {
    render(<VersionHistoryPanel />);
    const input = screen.getByPlaceholderText(/Version description/i);
    fireEvent.change(input, { target: { value: 'My snapshot' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Version/i }));
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('calls createVersion with undefined when message is empty', () => {
    render(<VersionHistoryPanel />);
    fireEvent.click(screen.getByRole('button', { name: /Save Version/i }));
    expect(mockCreateVersion).toHaveBeenCalledWith(undefined);
  });

  it('pressing Enter in input creates a version', () => {
    render(<VersionHistoryPanel />);
    const input = screen.getByPlaceholderText(/Version description/i);
    fireEvent.change(input, { target: { value: 'Enter key version' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockCreateVersion).toHaveBeenCalledWith('Enter key version');
  });

  describe('with existing versions', () => {
    beforeEach(() => {
      mockGetVersionList.mockReturnValue([
        { version: 1, timestamp: 1700000000000, message: 'Initial design' },
        { version: 2, timestamp: 1700001000000, message: 'Added walls' },
        { version: 3, timestamp: 1700002000000, message: undefined },
      ]);
    });

    it('shows version numbers', () => {
      render(<VersionHistoryPanel />);
      expect(screen.getByText('v3')).toBeInTheDocument();
      expect(screen.getByText('v2')).toBeInTheDocument();
      expect(screen.getByText('v1')).toBeInTheDocument();
    });

    it('shows version messages', () => {
      render(<VersionHistoryPanel />);
      expect(screen.getByText('Initial design')).toBeInTheDocument();
      expect(screen.getByText('Added walls')).toBeInTheDocument();
    });

    it('shows Restore buttons for each version', () => {
      render(<VersionHistoryPanel />);
      const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
      expect(restoreButtons).toHaveLength(3);
    });

    it('calls restoreVersion with correct version number on restore click', () => {
      render(<VersionHistoryPanel />);
      const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
      fireEvent.click(restoreButtons[0]);
      expect(mockRestoreVersion).toHaveBeenCalledWith(3); // reversed order, first = latest
    });

    it('does not show empty state when versions exist', () => {
      render(<VersionHistoryPanel />);
      expect(screen.queryByText(/No saved versions yet/i)).not.toBeInTheDocument();
    });

    it('shows versions in reverse order (newest first)', () => {
      render(<VersionHistoryPanel />);
      const versionNumbers = screen.getAllByText(/^v\d+$/);
      expect(versionNumbers[0].textContent).toBe('v3');
      expect(versionNumbers[versionNumbers.length - 1].textContent).toBe('v1');
    });
  });
});

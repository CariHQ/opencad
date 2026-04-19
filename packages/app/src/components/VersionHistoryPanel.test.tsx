/**
 * VersionHistoryPanel component tests
 * T-UI-013: Version history panel creates and restores versions
 * T-HIST-001: Change tracking history
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VersionHistoryPanel } from './VersionHistoryPanel';
import type { ChangeRecord } from '../stores/documentStore';

const mockCreateVersion = vi.fn();
const mockRestoreVersion = vi.fn();
const mockGetVersionList = vi.fn();
let mockChangeHistory: ChangeRecord[] = [];

vi.mock('../stores/documentStore', () => ({
  useDocumentStore: vi.fn(() => ({
    createVersion: mockCreateVersion,
    restoreVersion: mockRestoreVersion,
    getVersionList: mockGetVersionList,
    changeHistory: mockChangeHistory,
  })),
}));

describe('T-UI-013: VersionHistoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVersionList.mockReturnValue([]);
    mockChangeHistory = [];
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

// ─── T-HIST-001: Change history ───────────────────────────────────────────────

describe('T-HIST-001: VersionHistoryPanel — change tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVersionList.mockReturnValue([]);
    mockChangeHistory = [];
  });

  it('renders a Change History section', () => {
    render(<VersionHistoryPanel />);
    expect(screen.getByText(/Change History/i)).toBeInTheDocument();
  });

  it('shows empty state when no change records', () => {
    render(<VersionHistoryPanel />);
    expect(screen.getByText(/No changes recorded yet/i)).toBeInTheDocument();
  });

  it('renders add change record with element type and id', () => {
    mockChangeHistory = [
      {
        id: 'cr-1',
        timestamp: new Date('2024-01-15T12:30:00').getTime(),
        type: 'add',
        elementId: 'wall-001',
        elementType: 'wall',
        userId: 'kenroy',
      },
    ];
    render(<VersionHistoryPanel />);
    expect(screen.getByText(/added/i)).toBeInTheDocument();
    expect(screen.getAllByText(/wall/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/wall-001/i)).toBeInTheDocument();
  });

  it('renders update change record', () => {
    mockChangeHistory = [
      {
        id: 'cr-2',
        timestamp: Date.now(),
        type: 'update',
        elementId: 'door-002',
        elementType: 'door',
        userId: 'kenroy',
      },
    ];
    render(<VersionHistoryPanel />);
    expect(screen.getByText(/updated/i)).toBeInTheDocument();
  });

  it('renders delete change record', () => {
    mockChangeHistory = [
      {
        id: 'cr-3',
        timestamp: Date.now(),
        type: 'delete',
        elementId: 'slab-003',
        elementType: 'slab',
        userId: 'kenroy',
      },
    ];
    render(<VersionHistoryPanel />);
    expect(screen.getByText(/deleted/i)).toBeInTheDocument();
  });

  it('shows last 50 changes', () => {
    mockChangeHistory = Array.from({ length: 60 }, (_, i) => ({
      id: `cr-${i}`,
      timestamp: 1700000000000 + i * 1000,
      type: 'add' as const,
      elementId: `wall-${i}`,
      elementType: 'wall',
      userId: 'kenroy',
    }));
    render(<VersionHistoryPanel />);
    // Should show 50 entries (last 50 of 60)
    const items = screen.getAllByText(/wall-\d+/);
    expect(items.length).toBe(50);
  });

  it('shows the userId for each change', () => {
    mockChangeHistory = [
      {
        id: 'cr-1',
        timestamp: Date.now(),
        type: 'add',
        elementId: 'wall-001',
        elementType: 'wall',
        userId: 'Kenroy',
      },
    ];
    render(<VersionHistoryPanel />);
    expect(screen.getByText(/Kenroy/i)).toBeInTheDocument();
  });
});

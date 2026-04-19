/**
 * T-DOC-010: Project browser — list, search, filter, sort
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

expect.extend(jestDomMatchers);

import type { ProjectSummary } from '../lib/projectsApi';

vi.mock('../lib/projectsApi', () => ({
  projectsApi: {
    list: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    rename: vi.fn(),
  },
}));

import { projectsApi } from '../lib/projectsApi';
import { ProjectBrowser } from './ProjectBrowser';

const MOCK_PROJECTS: ProjectSummary[] = [
  {
    id: 'p1',
    name: 'My House',
    updatedAt: 2000,
    elementCount: 10,
    thumbnail: undefined,
    tags: [],
  },
  {
    id: 'p2',
    name: 'Office Tower',
    updatedAt: 1500,
    elementCount: 30,
    thumbnail: undefined,
    tags: [],
  },
  {
    id: 'p3',
    name: 'Apartment Block',
    updatedAt: 3000,
    elementCount: 50,
    thumbnail: undefined,
    tags: [],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(projectsApi.list).mockResolvedValue(MOCK_PROJECTS);
  vi.mocked(projectsApi.create).mockResolvedValue({ id: 'new-id' });
  vi.mocked(projectsApi.delete).mockResolvedValue(undefined);
  vi.mocked(projectsApi.rename).mockResolvedValue(undefined);
  // Mock prompt for new project name dialog
  vi.stubGlobal('prompt', vi.fn().mockReturnValue('New Project'));
});

describe('T-DOC-010: ProjectBrowser', () => {
  it('T-DOC-010-001: renders project list', async () => {
    await act(async () => { render(<ProjectBrowser />); });
    expect(screen.getByText('My House')).toBeInTheDocument();
    expect(screen.getByText('Office Tower')).toBeInTheDocument();
  });

  it('T-DOC-010-002: search filters by name (case-insensitive)', async () => {
    await act(async () => { render(<ProjectBrowser />); });
    const search = screen.getByTestId('project-search');
    await act(async () => {
      fireEvent.change(search, { target: { value: 'house' } });
    });
    await waitFor(() => {
      expect(screen.getByText('My House')).toBeInTheDocument();
    });
    // Office Tower should not be shown after filtering
    await waitFor(() => {
      expect(screen.queryByTestId('project-card-p2')).not.toBeInTheDocument();
    });
  });

  it('T-DOC-010-003: sort by name A-Z works', async () => {
    await act(async () => { render(<ProjectBrowser />); });
    const sortSelect = screen.getByTestId('sort-select');
    await act(async () => {
      fireEvent.change(sortSelect, { target: { value: 'name-asc' } });
    });
    const cards = screen.getAllByTestId(/^project-card-/);
    // First card should be 'Apartment Block' (A comes before M and O)
    expect(cards[0]).toHaveTextContent('Apartment Block');
  });

  it('T-DOC-010-004: sort by recent works', async () => {
    await act(async () => { render(<ProjectBrowser />); });
    const sortSelect = screen.getByTestId('sort-select');
    await act(async () => {
      fireEvent.change(sortSelect, { target: { value: 'recent' } });
    });
    const cards = screen.getAllByTestId(/^project-card-/);
    // Apartment Block has updatedAt=3000, most recent
    expect(cards[0]).toHaveTextContent('Apartment Block');
  });

  it('T-DOC-010-005: New Project button is visible', async () => {
    await act(async () => { render(<ProjectBrowser />); });
    expect(screen.getByTestId('new-project-btn')).toBeInTheDocument();
  });

  it('T-DOC-010-006: clicking a project card selects it', async () => {
    const onSelect = vi.fn();
    await act(async () => { render(<ProjectBrowser onSelect={onSelect} />); });
    await act(async () => {
      fireEvent.click(screen.getByTestId('project-card-p1'));
    });
    expect(onSelect).toHaveBeenCalledWith(MOCK_PROJECTS[0]);
  });

  it('T-DOC-010-007: empty state shown when no projects', async () => {
    vi.mocked(projectsApi.list).mockResolvedValue([]);
    await act(async () => { render(<ProjectBrowser />); });
    await waitFor(() => {
      expect(screen.getByText(/no projects/i)).toBeInTheDocument();
    });
  });

  it('T-DOC-010-008: delete button calls projectsApi.delete', async () => {
    await act(async () => { render(<ProjectBrowser />); });
    // With default "recent" sort, p3 (updatedAt=3000) is first
    const deleteBtn = screen.getAllByRole('button', { name: /delete/i })[0]!;
    await act(async () => {
      fireEvent.click(deleteBtn);
    });
    // ConfirmModal appears — click the confirm Delete button
    const confirmBtn = screen.getByRole('button', { name: /^delete$/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });
    // Any project's delete was called — just verify the API was invoked
    expect(projectsApi.delete).toHaveBeenCalledTimes(1);
  });
});

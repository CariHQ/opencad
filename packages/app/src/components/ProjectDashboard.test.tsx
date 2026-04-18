import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectDashboard } from './ProjectDashboard';
import { useProjectStore } from '../stores/projectStore';
expect.extend(jestDomMatchers);

// T-DOC-010 tests use window.confirm for delete confirmation
vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));

vi.mock('../stores/projectStore');

function makeStore(overrides = {}) {
  const projects = [
    {
      id: 'p1',
      name: 'My House',
      thumbnail: null,
      createdAt: 1000,
      updatedAt: 2000,
      collaborators: [],
      starred: false,
    },
    {
      id: 'p2',
      name: 'Office Tower',
      thumbnail: null,
      createdAt: 500,
      updatedAt: 1500,
      collaborators: [],
      starred: true,
    },
  ];
  return {
    projects,
    activeProjectId: null,
    viewMode: 'grid' as const,
    sortBy: 'lastEdited' as const,
    filterBy: 'all' as const,
    searchQuery: '',
    createProject: vi.fn().mockReturnValue('new-id'),
    openProject: vi.fn(),
    closeProject: vi.fn(),
    deleteProject: vi.fn(),
    starProject: vi.fn(),
    renameProject: vi.fn(),
    setViewMode: vi.fn(),
    setSortBy: vi.fn(),
    setFilterBy: vi.fn(),
    setSearchQuery: vi.fn(),
    getFilteredProjects: vi.fn().mockReturnValue(projects),
    syncFromServer: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('T-SYNC-010: ProjectDashboard', () => {
  beforeEach(() => {
    vi.mocked(useProjectStore).mockReturnValue(makeStore());
  });

  it('renders the dashboard title', () => {
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('shows New Project button', () => {
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument();
  });

  it('renders project cards for each project', () => {
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    expect(screen.getByText('My House')).toBeInTheDocument();
    expect(screen.getByText('Office Tower')).toBeInTheDocument();
  });

  it('shows search input', () => {
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('calls setSearchQuery when typing in search', () => {
    const store = makeStore();
    vi.mocked(useProjectStore).mockReturnValue(store);
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'house' } });
    expect(store.setSearchQuery).toHaveBeenCalledWith('house');
  });

  it('shows grid/list toggle buttons', () => {
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    expect(screen.getByTitle(/grid view/i)).toBeInTheDocument();
    expect(screen.getByTitle(/list view/i)).toBeInTheDocument();
  });

  it('calls setViewMode when clicking list toggle', () => {
    const store = makeStore();
    vi.mocked(useProjectStore).mockReturnValue(store);
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByTitle(/list view/i));
    expect(store.setViewMode).toHaveBeenCalledWith('list');
  });

  it('calls setViewMode when clicking grid toggle', () => {
    const store = makeStore({ viewMode: 'list' });
    vi.mocked(useProjectStore).mockReturnValue(store);
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByTitle(/grid view/i));
    expect(store.setViewMode).toHaveBeenCalledWith('grid');
  });

  it('shows sort dropdown', () => {
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
  });

  it('calls setSortBy when sort changes', () => {
    const store = makeStore();
    vi.mocked(useProjectStore).mockReturnValue(store);
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/sort by/i), { target: { value: 'name' } });
    expect(store.setSortBy).toHaveBeenCalledWith('name');
  });

  it('shows filter tabs', () => {
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /starred/i })).toBeInTheDocument();
  });

  it('calls setFilterBy when filter tab clicked', () => {
    const store = makeStore();
    vi.mocked(useProjectStore).mockReturnValue(store);
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /starred/i }));
    expect(store.setFilterBy).toHaveBeenCalledWith('starred');
  });

  it('calls openProject when project card clicked', () => {
    const store = makeStore();
    vi.mocked(useProjectStore).mockReturnValue(store);
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByText('My House'));
    expect(store.openProject).toHaveBeenCalledWith('p1');
  });

  it('shows star button on each project card', () => {
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    const starBtns = screen.getAllByTitle(/star/i);
    expect(starBtns.length).toBeGreaterThanOrEqual(2);
  });

  it('calls starProject when star button clicked', () => {
    const store = makeStore();
    vi.mocked(useProjectStore).mockReturnValue(store);
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    const starBtns = screen.getAllByTitle(/star/i);
    fireEvent.click(starBtns[0]);
    expect(store.starProject).toHaveBeenCalledWith('p1');
  });

  it('calls createProject when New Project button clicked', () => {
    const store = makeStore();
    vi.mocked(useProjectStore).mockReturnValue(store);
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /new project/i }));
    expect(store.createProject).toHaveBeenCalled();
    expect(store.openProject).toHaveBeenCalledWith('new-id');
  });

  it('shows empty state when no projects', () => {
    vi.mocked(useProjectStore).mockReturnValue(
      makeStore({ projects: [], getFilteredProjects: vi.fn().mockReturnValue([]) })
    );
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    expect(screen.getByText(/no projects/i)).toBeInTheDocument();
  });

  it('applies list-view class when viewMode is list', () => {
    vi.mocked(useProjectStore).mockReturnValue(makeStore({ viewMode: 'list' }));
    const { container } = render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    expect(container.querySelector('.projects-list')).toBeInTheDocument();
  });

  it('applies grid-view class when viewMode is grid', () => {
    const { container } = render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    expect(container.querySelector('.projects-grid')).toBeInTheDocument();
  });
});

describe('T-DOC-010: ProjectDashboard', () => {
  beforeEach(() => {
    vi.mocked(useProjectStore).mockReturnValue(makeStore());
  });

  it('renders search input', () => {
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('renders filter tabs', () => {
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /starred/i })).toBeInTheDocument();
  });

  it('renders sort dropdown', () => {
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
  });

  it('renders view mode toggle', () => {
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    expect(screen.getByTitle(/grid view/i)).toBeInTheDocument();
    expect(screen.getByTitle(/list view/i)).toBeInTheDocument();
  });

  it('shows empty state when no projects', () => {
    vi.mocked(useProjectStore).mockReturnValue(
      makeStore({ projects: [], getFilteredProjects: vi.fn().mockReturnValue([]) })
    );
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    expect(screen.getByText(/no projects/i)).toBeInTheDocument();
  });

  it('renders project cards for each project', () => {
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    expect(screen.getByText('My House')).toBeInTheDocument();
    expect(screen.getByText('Office Tower')).toBeInTheDocument();
  });

  it('search input calls setSearchQuery', () => {
    const store = makeStore();
    vi.mocked(useProjectStore).mockReturnValue(store);
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'house' } });
    expect(store.setSearchQuery).toHaveBeenCalledWith('house');
  });

  it('filter tab calls setFilterBy', () => {
    const store = makeStore();
    vi.mocked(useProjectStore).mockReturnValue(store);
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /starred/i }));
    expect(store.setFilterBy).toHaveBeenCalledWith('starred');
  });

  it('sort dropdown calls setSortBy', () => {
    const store = makeStore();
    vi.mocked(useProjectStore).mockReturnValue(store);
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/sort by/i), { target: { value: 'name' } });
    expect(store.setSortBy).toHaveBeenCalledWith('name');
  });

  it('clicking a project card calls openProject', () => {
    const store = makeStore();
    vi.mocked(useProjectStore).mockReturnValue(store);
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByText('My House'));
    expect(store.openProject).toHaveBeenCalledWith('p1');
  });

  it('star button calls starProject', () => {
    const store = makeStore();
    vi.mocked(useProjectStore).mockReturnValue(store);
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    const starBtns = screen.getAllByTitle(/star/i);
    fireEvent.click(starBtns[0]);
    expect(store.starProject).toHaveBeenCalledWith('p1');
  });

  it('new project button calls createProject', () => {
    const store = makeStore();
    vi.mocked(useProjectStore).mockReturnValue(store);
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /new project/i }));
    expect(store.createProject).toHaveBeenCalledWith('Untitled Project');
    expect(store.openProject).toHaveBeenCalledWith('new-id');
  });

  it('delete button calls deleteProject after confirmation', () => {
    const store = makeStore();
    vi.mocked(useProjectStore).mockReturnValue(store);
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    const deleteBtns = screen.getAllByTitle(/delete/i);
    expect(deleteBtns.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(deleteBtns[0]);
    expect(store.deleteProject).toHaveBeenCalledWith('p1');
  });

  it('does not delete project when confirmation is cancelled', () => {
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    const store = makeStore();
    vi.mocked(useProjectStore).mockReturnValue(store);
    render(<MemoryRouter><ProjectDashboard /></MemoryRouter>);
    const deleteBtns = screen.getAllByTitle(/delete/i);
    fireEvent.click(deleteBtns[0]);
    expect(store.deleteProject).not.toHaveBeenCalled();
  });
});

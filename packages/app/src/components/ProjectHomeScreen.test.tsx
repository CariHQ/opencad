/**
 * T-DASH-001: ProjectHomeScreen renders when no document is loaded
 * T-DASH-002: Clicking "New Project" calls documentStore.initProject()
 * T-DASH-003: Recent projects load from localStorage on mount
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectHomeScreen } from './ProjectHomeScreen';
import type { RecentProject } from './ProjectHomeScreen';

// ── Mock document store ───────────────────────────────────────────────────────

const { mockInitProject } = vi.hoisted(() => ({
  mockInitProject: vi.fn(),
}));

vi.mock('../stores/documentStore', () => ({
  useDocumentStore: vi.fn().mockReturnValue({
    document: null,
    initProject: mockInitProject,
  }),
}));

// ── Mock react-router navigate ────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderScreen(props = {}) {
  return render(
    <MemoryRouter>
      <ProjectHomeScreen {...props} />
    </MemoryRouter>
  );
}

const RECENT: RecentProject[] = [
  { id: 'p1', name: 'My House', updatedAt: 1700000000000 },
  { id: 'p2', name: 'Office Tower', updatedAt: 1690000000000 },
];

function seedLocalStorage(projects: RecentProject[]) {
  localStorage.setItem('opencad-recent-projects', JSON.stringify(projects));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('T-DASH-001: ProjectHomeScreen renders when no document is loaded', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the home screen container', () => {
    renderScreen();
    expect(screen.getByTestId('project-home-screen')).toBeInTheDocument();
  });

  it('shows the OpenCAD brand name', () => {
    renderScreen();
    expect(screen.getByText('OpenCAD')).toBeInTheDocument();
  });

  it('shows the brand logo image', () => {
    renderScreen();
    expect(screen.getByRole('img', { name: 'OpenCAD' })).toBeInTheDocument();
  });

  it('shows New Project button', () => {
    renderScreen();
    expect(screen.getByTestId('new-project-btn')).toBeInTheDocument();
  });

  it('shows import button', () => {
    renderScreen();
    expect(screen.getByTitle('Import IFC / DWG / PDF')).toBeInTheDocument();
  });

  it('shows templates row', () => {
    renderScreen();
    expect(screen.getByTestId('templates-row')).toBeInTheDocument();
  });

  it('renders all four template cards', () => {
    renderScreen();
    expect(screen.getByTestId('template-blank')).toBeInTheDocument();
    expect(screen.getByTestId('template-residential')).toBeInTheDocument();
    expect(screen.getByTestId('template-commercial')).toBeInTheDocument();
    expect(screen.getByTestId('template-site-plan')).toBeInTheDocument();
  });

  it('shows empty state when no recent projects', () => {
    renderScreen();
    expect(screen.getByTestId('recent-empty-state')).toBeInTheDocument();
    expect(screen.getByText(/start a new project or import a file/i)).toBeInTheDocument();
  });
});

describe('T-DASH-002: clicking "New Project" calls documentStore.initProject()', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('calls initProject when New Project button is clicked', () => {
    renderScreen();
    fireEvent.click(screen.getByTestId('new-project-btn'));
    expect(mockInitProject).toHaveBeenCalledTimes(1);
    // First arg is the generated project id (UUID), second is 'user-1'
    expect(mockInitProject).toHaveBeenCalledWith(expect.any(String), 'user-1');
  });

  it('navigates to /project/:id after creating a new project', () => {
    renderScreen();
    fireEvent.click(screen.getByTestId('new-project-btn'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/^\/project\//));
  });

  it('calls initProject when a template card is clicked', () => {
    renderScreen();
    fireEvent.click(screen.getByTestId('template-residential'));
    expect(mockInitProject).toHaveBeenCalledTimes(1);
    expect(mockInitProject).toHaveBeenCalledWith(expect.any(String), 'user-1');
  });

  it('calls initProject when Blank template is clicked', () => {
    renderScreen();
    fireEvent.click(screen.getByTestId('template-blank'));
    expect(mockInitProject).toHaveBeenCalledTimes(1);
  });
});

describe('T-DASH-003: recent projects load from localStorage on mount', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders recent project cards when localStorage has data', () => {
    seedLocalStorage(RECENT);
    renderScreen();
    expect(screen.getByTestId('recent-projects-grid')).toBeInTheDocument();
    expect(screen.getByTestId('recent-project-p1')).toBeInTheDocument();
    expect(screen.getByTestId('recent-project-p2')).toBeInTheDocument();
  });

  it('shows project names from localStorage', () => {
    seedLocalStorage(RECENT);
    renderScreen();
    expect(screen.getByText('My House')).toBeInTheDocument();
    expect(screen.getByText('Office Tower')).toBeInTheDocument();
  });

  it('shows empty state when localStorage has no recent projects', () => {
    renderScreen();
    expect(screen.getByTestId('recent-empty-state')).toBeInTheDocument();
  });

  it('shows empty state when localStorage key does not exist', () => {
    localStorage.removeItem('opencad-recent-projects');
    renderScreen();
    expect(screen.getByTestId('recent-empty-state')).toBeInTheDocument();
  });

  it('handles corrupt localStorage gracefully and shows empty state', () => {
    localStorage.setItem('opencad-recent-projects', 'NOT VALID JSON{{{');
    renderScreen();
    // Should not throw — corrupt data falls back to empty state
    expect(screen.getByTestId('recent-empty-state')).toBeInTheDocument();
  });

  it('calls initProject and navigates when a recent project card is opened', () => {
    seedLocalStorage(RECENT);
    renderScreen();
    fireEvent.click(screen.getByTestId('recent-project-p1'));
    expect(mockInitProject).toHaveBeenCalledWith('p1', 'user-1');
    expect(mockNavigate).toHaveBeenCalledWith('/project/p1');
  });
});

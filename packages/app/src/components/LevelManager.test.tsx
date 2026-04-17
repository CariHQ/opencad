/**
 * T-BIM-006: Level manager tests
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LevelManager } from './LevelManager';
import { useDocumentStore } from '../stores/documentStore';
expect.extend(jestDomMatchers);

vi.mock('../stores/documentStore');

const mockUseDocumentStore = vi.mocked(useDocumentStore);

const mockLevels = {
  'level-0': { id: 'level-0', name: 'Ground Floor', elevation: 0, height: 3000, order: 0 },
  'level-1': { id: 'level-1', name: 'Level 1', elevation: 3000, height: 3000, order: 1 },
};

function makeStore(overrides = {}) {
  return {
    document: {
      id: 'doc-1',
      content: { elements: {}, spaces: {} },
      organization: { layers: {}, levels: mockLevels },
      presentation: { views: {}, annotations: {} },
      library: { materials: {} },
      metadata: { createdAt: 0, updatedAt: 0, createdBy: 'u1', schemaVersion: '1' },
      projectId: 'p1',
      userId: 'u1',
    },
    addLevel: vi.fn().mockReturnValue('level-new'),
    updateLevel: vi.fn(),
    deleteLevel: vi.fn(),
    pushHistory: vi.fn(),
    ...overrides,
  };
}

describe('T-BIM-006: LevelManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all levels', () => {
    mockUseDocumentStore.mockReturnValue(makeStore() as ReturnType<typeof useDocumentStore>);
    render(<LevelManager />);
    expect(screen.getByDisplayValue('Ground Floor')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Level 1')).toBeInTheDocument();
  });

  it('shows elevation for each level', () => {
    mockUseDocumentStore.mockReturnValue(makeStore() as ReturnType<typeof useDocumentStore>);
    render(<LevelManager />);
    expect(screen.getByDisplayValue('0')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3000')).toBeInTheDocument();
  });

  it('calls addLevel and pushHistory when Add Level button is clicked', () => {
    const store = makeStore();
    mockUseDocumentStore.mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<LevelManager />);
    fireEvent.click(screen.getByTitle(/add level/i));
    expect(store.pushHistory).toHaveBeenCalled();
    expect(store.addLevel).toHaveBeenCalled();
  });

  it('calls deleteLevel and pushHistory when delete button is clicked', () => {
    const store = makeStore();
    mockUseDocumentStore.mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<LevelManager />);
    const deleteButtons = screen.getAllByTitle(/delete level/i);
    fireEvent.click(deleteButtons[0]);
    expect(store.pushHistory).toHaveBeenCalled();
    expect(store.deleteLevel).toHaveBeenCalled();
  });

  it('calls updateLevel and pushHistory when level name is changed', () => {
    const store = makeStore();
    mockUseDocumentStore.mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<LevelManager />);
    const nameInputs = screen.getAllByDisplayValue(/Ground Floor|Level 1/);
    fireEvent.change(nameInputs[0], { target: { value: 'Basement' } });
    fireEvent.blur(nameInputs[0]);
    expect(store.pushHistory).toHaveBeenCalled();
    expect(store.updateLevel).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ name: 'Basement' }));
  });

  it('calls updateLevel and pushHistory when elevation is changed', () => {
    const store = makeStore();
    mockUseDocumentStore.mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<LevelManager />);
    const elevInputs = screen.getAllByDisplayValue('0');
    fireEvent.change(elevInputs[0], { target: { value: '-3000' } });
    fireEvent.blur(elevInputs[0]);
    expect(store.pushHistory).toHaveBeenCalled();
    expect(store.updateLevel).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ elevation: -3000 }));
  });

  it('renders empty state when no document', () => {
    mockUseDocumentStore.mockReturnValue(makeStore({ document: null }) as ReturnType<typeof useDocumentStore>);
    const { container } = render(<LevelManager />);
    expect(container.firstChild).toBeNull();
  });

  it('shows level count in header', () => {
    mockUseDocumentStore.mockReturnValue(makeStore() as ReturnType<typeof useDocumentStore>);
    render(<LevelManager />);
    expect(screen.getByText(/Levels/i)).toBeInTheDocument();
  });
});

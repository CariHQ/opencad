/**
 * T-BIM-001: Wall tool panel tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WallToolPanel } from './WallToolPanel';
import { useDocumentStore } from '../stores/documentStore';

vi.mock('../stores/documentStore');

const mockUseDocumentStore = vi.mocked(useDocumentStore);

function makeStore(overrides = {}) {
  return {
    toolParams: {
      wall: { height: 3000, thickness: 200, material: 'Concrete', wallType: 'interior' },
    },
    setToolParam: vi.fn(),
    ...overrides,
  };
}

describe('T-BIM-001: WallToolPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDocumentStore.mockReturnValue(makeStore() as ReturnType<typeof useDocumentStore>);
  });

  it('renders wall tool panel with title', () => {
    render(<WallToolPanel />);
    expect(screen.getByText('Wall')).toBeInTheDocument();
  });

  it('shows height input with default value', () => {
    render(<WallToolPanel />);
    expect(screen.getByLabelText(/height/i)).toHaveValue(3000);
  });

  it('shows thickness input with default value', () => {
    render(<WallToolPanel />);
    expect(screen.getByLabelText(/thickness/i)).toHaveValue(200);
  });

  it('shows material input', () => {
    render(<WallToolPanel />);
    expect(screen.getByLabelText(/material/i)).toHaveValue('Concrete');
  });

  it('shows wall type select with correct options', () => {
    render(<WallToolPanel />);
    const select = screen.getByLabelText(/type/i);
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /exterior/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /interior/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /partition/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /curtain/i })).toBeInTheDocument();
  });

  it('calls setToolParam when height changes', () => {
    const store = makeStore();
    mockUseDocumentStore.mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<WallToolPanel />);
    fireEvent.change(screen.getByLabelText(/height/i), { target: { value: '4000' } });
    expect(store.setToolParam).toHaveBeenCalledWith('wall', 'height', 4000);
  });

  it('calls setToolParam when thickness changes', () => {
    const store = makeStore();
    mockUseDocumentStore.mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<WallToolPanel />);
    fireEvent.change(screen.getByLabelText(/thickness/i), { target: { value: '300' } });
    expect(store.setToolParam).toHaveBeenCalledWith('wall', 'thickness', 300);
  });

  it('calls setToolParam when wall type changes', () => {
    const store = makeStore();
    mockUseDocumentStore.mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<WallToolPanel />);
    fireEvent.change(screen.getByLabelText(/type/i), { target: { value: 'exterior' } });
    expect(store.setToolParam).toHaveBeenCalledWith('wall', 'wallType', 'exterior');
  });


});

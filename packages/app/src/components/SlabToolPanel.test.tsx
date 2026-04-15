/**
 * T-BIM-002: Slab tool panel tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlabToolPanel } from './SlabToolPanel';
import { useDocumentStore } from '../stores/documentStore';

vi.mock('../stores/documentStore');

const mockUseDocumentStore = vi.mocked(useDocumentStore);

function makeStore(overrides = {}) {
  return {
    toolParams: {
      slab: { thickness: 250, material: 'Concrete', slopeAngle: 0, elevationOffset: 0, slabType: 'floor' },
    },
    setToolParam: vi.fn(),
    ...overrides,
  };
}

describe('T-BIM-002: SlabToolPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDocumentStore.mockReturnValue(makeStore() as ReturnType<typeof useDocumentStore>);
  });

  it('renders slab tool panel with title', () => {
    render(<SlabToolPanel />);
    expect(screen.getByText('Slab')).toBeInTheDocument();
  });

  it('shows thickness input with default value', () => {
    render(<SlabToolPanel />);
    expect(screen.getByLabelText(/thickness/i)).toHaveValue(250);
  });

  it('shows material input', () => {
    render(<SlabToolPanel />);
    expect(screen.getByLabelText(/material/i)).toHaveValue('Concrete');
  });

  it('shows slope angle input', () => {
    render(<SlabToolPanel />);
    expect(screen.getByLabelText(/slope/i)).toHaveValue(0);
  });

  it('shows elevation offset input', () => {
    render(<SlabToolPanel />);
    expect(screen.getByLabelText(/elevation/i)).toHaveValue(0);
  });

  it('shows slab type select with floor/ceiling/roof options', () => {
    render(<SlabToolPanel />);
    const select = screen.getByLabelText(/type/i);
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /floor/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /ceiling/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /roof/i })).toBeInTheDocument();
  });

  it('calls setToolParam when thickness changes', () => {
    const store = makeStore();
    mockUseDocumentStore.mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<SlabToolPanel />);
    fireEvent.change(screen.getByLabelText(/thickness/i), { target: { value: '300' } });
    expect(store.setToolParam).toHaveBeenCalledWith('slab', 'thickness', 300);
  });

  it('calls setToolParam when slab type changes', () => {
    const store = makeStore();
    mockUseDocumentStore.mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<SlabToolPanel />);
    fireEvent.change(screen.getByLabelText(/type/i), { target: { value: 'roof' } });
    expect(store.setToolParam).toHaveBeenCalledWith('slab', 'slabType', 'roof');
  });

  it('shows slope angle when slab type is roof', () => {
    mockUseDocumentStore.mockReturnValue(
      makeStore({ toolParams: { slab: { thickness: 250, material: 'Concrete', slopeAngle: 30, elevationOffset: 0, slabType: 'roof' } } }) as ReturnType<typeof useDocumentStore>
    );
    render(<SlabToolPanel />);
    expect(screen.getByLabelText(/slope/i)).toHaveValue(30);
  });

  it('shows placement hint', () => {
    render(<SlabToolPanel />);
    expect(screen.getByText(/polygon/i)).toBeInTheDocument();
  });
});

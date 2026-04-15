import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { PropertiesPanel } from './PropertiesPanel';
import { useDocumentStore } from '../stores/documentStore';

vi.mock('../stores/documentStore');

const baseElement = {
  id: 'el-1',
  type: 'wall' as const,
  layerId: 'layer-1',
  levelId: null,
  visible: true,
  locked: false,
  properties: {
    height: { type: 'number' as const, value: 3000, unit: 'mm' },
    thickness: { type: 'number' as const, value: 200, unit: 'mm' },
    material: { type: 'string' as const, value: 'Concrete' },
  },
  propertySets: [],
  geometry: { type: 'brep' as const, data: null },
  transform: {
    translation: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 1, y: 1, z: 1 },
  },
  boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
  metadata: { id: 'el-1', createdBy: 'u1', createdAt: 0, updatedAt: 0, version: {} },
};

const makeStore = (overrides = {}) => ({
  document: {
    id: 'doc-1',
    elements: { 'el-1': baseElement },
    layers: {},
    levels: {},
    versions: [],
    vectorClock: {},
  },
  selectedIds: [],
  updateElement: vi.fn(),
  pushHistory: vi.fn(),
  setSelectedIds: vi.fn(),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useDocumentStore).mockReturnValue(makeStore() as ReturnType<typeof useDocumentStore>);
});

describe('T-UI-003: PropertiesPanel', () => {
  it('shows empty state when no element selected', () => {
    render(<PropertiesPanel />);
    expect(screen.getByText(/select an element/i)).toBeInTheDocument();
  });

  it('shows element type when element is selected', () => {
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore({ selectedIds: ['el-1'] }) as ReturnType<typeof useDocumentStore>
    );
    render(<PropertiesPanel />);
    expect(screen.getByText('wall')).toBeInTheDocument();
  });

  it('renders property rows for each element property', () => {
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore({ selectedIds: ['el-1'] }) as ReturnType<typeof useDocumentStore>
    );
    render(<PropertiesPanel />);
    expect(screen.getByText('height')).toBeInTheDocument();
    expect(screen.getByText('thickness')).toBeInTheDocument();
    expect(screen.getByText('material')).toBeInTheDocument();
  });

  it('shows number property value in input', () => {
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore({ selectedIds: ['el-1'] }) as ReturnType<typeof useDocumentStore>
    );
    render(<PropertiesPanel />);
    const heightInput = screen.getByDisplayValue('3000');
    expect(heightInput).toBeInTheDocument();
  });

  it('shows string property value in input', () => {
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore({ selectedIds: ['el-1'] }) as ReturnType<typeof useDocumentStore>
    );
    render(<PropertiesPanel />);
    expect(screen.getByDisplayValue('Concrete')).toBeInTheDocument();
  });

  it('calls updateElement with new number value on blur', () => {
    const store = makeStore({ selectedIds: ['el-1'] });
    vi.mocked(useDocumentStore).mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<PropertiesPanel />);
    const heightInput = screen.getByDisplayValue('3000');
    fireEvent.change(heightInput, { target: { value: '3500' } });
    fireEvent.blur(heightInput);
    expect(store.updateElement).toHaveBeenCalledWith('el-1', expect.objectContaining({
      properties: expect.objectContaining({
        height: expect.objectContaining({ value: 3500 }),
      }),
    }));
  });

  it('calls updateElement with new string value on blur', () => {
    const store = makeStore({ selectedIds: ['el-1'] });
    vi.mocked(useDocumentStore).mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<PropertiesPanel />);
    const matInput = screen.getByDisplayValue('Concrete');
    fireEvent.change(matInput, { target: { value: 'Steel' } });
    fireEvent.blur(matInput);
    expect(store.updateElement).toHaveBeenCalledWith('el-1', expect.objectContaining({
      properties: expect.objectContaining({
        material: expect.objectContaining({ value: 'Steel' }),
      }),
    }));
  });

  it('calls pushHistory after updating element', () => {
    const store = makeStore({ selectedIds: ['el-1'] });
    vi.mocked(useDocumentStore).mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<PropertiesPanel />);
    const heightInput = screen.getByDisplayValue('3000');
    fireEvent.change(heightInput, { target: { value: '4000' } });
    fireEvent.blur(heightInput);
    expect(store.pushHistory).toHaveBeenCalled();
  });

  it('shows unit label next to number property', () => {
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore({ selectedIds: ['el-1'] }) as ReturnType<typeof useDocumentStore>
    );
    render(<PropertiesPanel />);
    const unitLabels = screen.getAllByText('mm');
    expect(unitLabels.length).toBeGreaterThan(0);
  });

  it('shows Add Property button', () => {
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore({ selectedIds: ['el-1'] }) as ReturnType<typeof useDocumentStore>
    );
    render(<PropertiesPanel />);
    expect(screen.getByRole('button', { name: /add property/i })).toBeInTheDocument();
  });

  it('adds a new custom property when Add Property is clicked', () => {
    const store = makeStore({ selectedIds: ['el-1'] });
    vi.mocked(useDocumentStore).mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<PropertiesPanel />);
    fireEvent.click(screen.getByRole('button', { name: /add property/i }));
    expect(store.updateElement).toHaveBeenCalledWith('el-1', expect.objectContaining({
      properties: expect.objectContaining({
        'Custom Property': expect.any(Object),
      }),
    }));
  });

  it('shows multi-select summary when multiple elements selected', () => {
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore({
        selectedIds: ['el-1', 'el-2'],
        document: {
          id: 'doc-1',
          elements: {
            'el-1': baseElement,
            'el-2': { ...baseElement, id: 'el-2' },
          },
          layers: {},
          levels: {},
          versions: [],
          vectorClock: {},
        },
      }) as ReturnType<typeof useDocumentStore>
    );
    render(<PropertiesPanel />);
    expect(screen.getByText(/2 elements selected/i)).toBeInTheDocument();
  });

  it('shows shared properties in multi-select mode', () => {
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore({
        selectedIds: ['el-1', 'el-2'],
        document: {
          id: 'doc-1',
          elements: {
            'el-1': baseElement,
            'el-2': { ...baseElement, id: 'el-2' },
          },
          layers: {},
          levels: {},
          versions: [],
          vectorClock: {},
        },
      }) as ReturnType<typeof useDocumentStore>
    );
    render(<PropertiesPanel />);
    expect(screen.getByText('height')).toBeInTheDocument();
    expect(screen.getByText('material')).toBeInTheDocument();
  });

  it('calls updateElement for all selected elements in multi-select', () => {
    const store = makeStore({
      selectedIds: ['el-1', 'el-2'],
      document: {
        id: 'doc-1',
        elements: {
          'el-1': baseElement,
          'el-2': { ...baseElement, id: 'el-2' },
        },
        layers: {},
        levels: {},
        versions: [],
        vectorClock: {},
      },
    });
    vi.mocked(useDocumentStore).mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<PropertiesPanel />);
    const heightInput = screen.getByDisplayValue('3000');
    fireEvent.change(heightInput, { target: { value: '4000' } });
    fireEvent.blur(heightInput);
    expect(store.updateElement).toHaveBeenCalledWith('el-1', expect.anything());
    expect(store.updateElement).toHaveBeenCalledWith('el-2', expect.anything());
  });

  it('shows location X, Y, Z inputs', () => {
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore({ selectedIds: ['el-1'] }) as ReturnType<typeof useDocumentStore>
    );
    render(<PropertiesPanel />);
    expect(screen.getByLabelText(/^X$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Y$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Z$/i)).toBeInTheDocument();
  });
});

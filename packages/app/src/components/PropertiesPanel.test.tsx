/**
 * T-UI-003: Properties panel inline editing tests
 * T-BIM-009: IFC Property Sets (Psets) display and editing
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertiesPanel } from './PropertiesPanel';
import { useDocumentStore } from '../stores/documentStore';
expect.extend(jestDomMatchers);

vi.mock('../stores/documentStore');

const mockUseDocumentStore = vi.mocked(useDocumentStore);

const mockElement = {
  id: 'el-1',
  type: 'wall' as const,
  properties: {
    height: { type: 'number' as const, value: 3000, unit: 'mm' },
    thickness: { type: 'number' as const, value: 200, unit: 'mm' },
    material: { type: 'string' as const, value: 'Concrete' },
  },
  propertySets: [],
  geometry: { type: 'brep' as const, data: null },
  layerId: 'layer-0',
  levelId: 'level-0',
  transform: {
    translation: { x: 1, y: 2, z: 3 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },
  boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
  metadata: { id: 'el-1', createdBy: 'u1', createdAt: 0, updatedAt: 0, version: { clock: {} } },
  visible: true,
  locked: false,
};

const mockDoc = {
  id: 'doc-1',
  content: { elements: { 'el-1': mockElement }, spaces: {} },
  organization: { layers: {}, levels: {} },
  presentation: { views: {}, annotations: {} },
  library: { materials: {} },
  metadata: { createdAt: 0, updatedAt: 0, createdBy: 'u1', schemaVersion: '1' },
  projectId: 'p1',
  userId: 'u1',
};

function makeStore(overrides = {}) {
  return {
    document: mockDoc,
    selectedIds: ['el-1'],
    updateElement: vi.fn(),
    pushHistory: vi.fn(),
    ...overrides,
  };
}

describe('T-UI-003: PropertiesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when nothing is selected', () => {
    mockUseDocumentStore.mockReturnValue(makeStore({ selectedIds: [] }) as ReturnType<typeof useDocumentStore>);
    render(<PropertiesPanel />);
    expect(screen.getByText(/select an element/i)).toBeInTheDocument();
  });

  it('shows element type when element is selected', () => {
    mockUseDocumentStore.mockReturnValue(makeStore() as ReturnType<typeof useDocumentStore>);
    render(<PropertiesPanel />);
    expect(screen.getByDisplayValue('wall')).toBeInTheDocument();
  });

  it('shows X Y Z translation values', () => {
    mockUseDocumentStore.mockReturnValue(makeStore() as ReturnType<typeof useDocumentStore>);
    render(<PropertiesPanel />);
    expect(screen.getByDisplayValue('1.0')).toBeInTheDocument(); // X
    expect(screen.getByDisplayValue('2.0')).toBeInTheDocument(); // Y
    expect(screen.getByDisplayValue('3.0')).toBeInTheDocument(); // Z
  });

  it('shows element properties with values', () => {
    mockUseDocumentStore.mockReturnValue(makeStore() as ReturnType<typeof useDocumentStore>);
    render(<PropertiesPanel />);
    expect(screen.getByDisplayValue('3000 mm')).toBeInTheDocument();
    expect(screen.getByDisplayValue('200 mm')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Concrete')).toBeInTheDocument();
  });

  it('calls updateElement and pushHistory when X is changed', () => {
    const store = makeStore();
    mockUseDocumentStore.mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<PropertiesPanel />);
    const xInput = screen.getByDisplayValue('1.0');
    fireEvent.change(xInput, { target: { value: '5' } });
    fireEvent.blur(xInput);
    expect(store.pushHistory).toHaveBeenCalled();
    expect(store.updateElement).toHaveBeenCalledWith(
      'el-1',
      expect.objectContaining({ transform: expect.objectContaining({}) })
    );
  });

  it('calls updateElement and pushHistory when a property value is changed', () => {
    const store = makeStore();
    mockUseDocumentStore.mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<PropertiesPanel />);
    const heightInput = screen.getByDisplayValue('3000 mm');
    fireEvent.change(heightInput, { target: { value: '4000 mm' } });
    fireEvent.blur(heightInput);
    expect(store.pushHistory).toHaveBeenCalled();
    expect(store.updateElement).toHaveBeenCalled();
  });

  it('shows Add Property button', () => {
    mockUseDocumentStore.mockReturnValue(makeStore() as ReturnType<typeof useDocumentStore>);
    render(<PropertiesPanel />);
    expect(screen.getByTitle(/add property/i)).toBeInTheDocument();
  });

  it('adds a new property row when Add Property is clicked', () => {
    mockUseDocumentStore.mockReturnValue(makeStore() as ReturnType<typeof useDocumentStore>);
    render(<PropertiesPanel />);
    fireEvent.click(screen.getByTitle(/add property/i));
    // New empty property row should appear
    const inputs = screen.getAllByPlaceholderText(/name/i);
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('shows multi-select summary when multiple elements selected', () => {
    const multiDoc = {
      ...mockDoc,
      elements: {
        'el-1': mockElement,
        'el-2': { ...mockElement, id: 'el-2' },
      },
    };
    mockUseDocumentStore.mockReturnValue(
      makeStore({ document: multiDoc, selectedIds: ['el-1', 'el-2'] }) as ReturnType<typeof useDocumentStore>
    );
    render(<PropertiesPanel />);
    expect(screen.getByText(/2 elements selected/i)).toBeInTheDocument();
  });
});

describe('T-BIM-009: IFC Property Sets (Psets)', () => {
  const mockElementWithPsets = {
    ...mockElement,
    propertySets: [
      {
        id: 'pset-1',
        name: 'Pset_WallCommon',
        properties: {
          IsExternal: { type: 'boolean' as const, value: true },
          LoadBearing: { type: 'boolean' as const, value: false },
          FireRating: { type: 'string' as const, value: 'REI 90' },
        },
      },
      {
        id: 'pset-2',
        name: 'Pset_MaterialCommon',
        properties: {
          MassDensity: { type: 'number' as const, value: 2400, unit: 'kg/m³' },
        },
      },
    ],
  };

  const mockDocWithPsets = {
    ...mockDoc,
    content: { elements: { 'el-1': mockElementWithPsets }, spaces: {} },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDocumentStore.mockReturnValue(
      makeStore({ document: mockDocWithPsets }) as ReturnType<typeof useDocumentStore>
    );
  });

  it('renders Pset section heading', () => {
    render(<PropertiesPanel />);
    expect(screen.getAllByText(/Pset|Property Sets/i).length).toBeGreaterThan(0);
  });

  it('displays Pset name Pset_WallCommon', () => {
    render(<PropertiesPanel />);
    expect(screen.getByText('Pset_WallCommon')).toBeInTheDocument();
  });

  it('displays Pset name Pset_MaterialCommon', () => {
    render(<PropertiesPanel />);
    expect(screen.getByText('Pset_MaterialCommon')).toBeInTheDocument();
  });

  it('displays Pset property names', () => {
    render(<PropertiesPanel />);
    expect(screen.getByText('IsExternal')).toBeInTheDocument();
    expect(screen.getByText('FireRating')).toBeInTheDocument();
  });

  it('displays Pset property values', () => {
    render(<PropertiesPanel />);
    expect(screen.getByDisplayValue('REI 90')).toBeInTheDocument();
  });

  it('displays numeric Pset property with unit', () => {
    render(<PropertiesPanel />);
    expect(screen.getByDisplayValue(/2400/)).toBeInTheDocument();
  });

  it('calls updateElement when a Pset property value is edited', () => {
    const store = makeStore({ document: mockDocWithPsets });
    mockUseDocumentStore.mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<PropertiesPanel />);
    const fireRatingInput = screen.getByDisplayValue('REI 90');
    fireEvent.change(fireRatingInput, { target: { value: 'REI 120' } });
    fireEvent.blur(fireRatingInput);
    expect(store.updateElement).toHaveBeenCalledWith(
      'el-1',
      expect.objectContaining({
        propertySets: expect.arrayContaining([
          expect.objectContaining({
            name: 'Pset_WallCommon',
            properties: expect.objectContaining({
              FireRating: expect.objectContaining({ value: 'REI 120' }),
            }),
          }),
        ]),
      })
    );
  });
});

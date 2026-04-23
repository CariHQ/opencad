/**
 * T-UI-003: Properties panel inline editing tests
 * T-BIM-009: IFC Property Sets (Psets) display and editing
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PropertiesPanel } from './PropertiesPanel';
import { useDocumentStore } from '../stores/documentStore';
import * as threeViewport from '../hooks/useThreeViewport';
expect.extend(jestDomMatchers);

vi.mock('../stores/documentStore');
vi.mock('../hooks/useThreeViewport', () => ({
  getSharedSelectedCoords: vi.fn(() => null),
}));

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

  it('saves correct translation offset when liveCoords shows absolute position', async () => {
    // Element with translation.x = 10 placed at base posX = 490 → absolute = 500.
    // User sees "500" in the X field (from liveCoords). Types "600" (wants absolute 600).
    // Expected: translation.x = 600 - 490 = 110 (not 600!).
    vi.useFakeTimers();
    vi.mocked(threeViewport.getSharedSelectedCoords).mockReturnValue({
      elementId: 'el-1',
      x: 500,  // absolute = posX(490) + translation.x(10)
      y: 0,
      z: 0,
    });
    const elementWithOffset = {
      ...mockElement,
      transform: { ...mockElement.transform, translation: { x: 10, y: 0, z: 0 } },
    };
    const docWithOffset = {
      ...mockDoc,
      content: { ...mockDoc.content, elements: { 'el-1': elementWithOffset } },
    };
    const store = makeStore({ document: docWithOffset });
    mockUseDocumentStore.mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<PropertiesPanel />);
    // Advance time so the 100ms interval fires and sets liveCoords
    act(() => { vi.advanceTimersByTime(200); });
    const xInput = screen.getByDisplayValue('500');
    fireEvent.focus(xInput);
    fireEvent.change(xInput, { target: { value: '600' } });
    fireEvent.blur(xInput);
    expect(store.updateElement).toHaveBeenCalledWith(
      'el-1',
      expect.objectContaining({
        transform: expect.objectContaining({
          translation: expect.objectContaining({ x: 110 }),
        }),
      })
    );
    vi.useRealTimers();
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
    expect(screen.getByText('Is External')).toBeInTheDocument();
    expect(screen.getByText('Fire Rating')).toBeInTheDocument();
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

// ─── T-BIM-003: IFC Property Set (Pset) Editing in PropertiesPanel ───────────

describe('T-BIM-003: PropertiesPanel Psets section', () => {
  const mockElementWithPsetProps = {
    ...mockElement,
    properties: {
      ...mockElement.properties,
      'Pset_WallCommon.IsExternal': { type: 'boolean' as const, value: true },
      'Pset_WallCommon.FireRating': { type: 'string' as const, value: 'REI 60' },
      'Pset_ThermalCommon.UValue': { type: 'number' as const, value: 0.35 },
    },
    propertySets: [],
  };

  const mockDocWithPsetProps = {
    ...mockDoc,
    content: { elements: { 'el-1': mockElementWithPsetProps }, spaces: {} },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Psets section when element has Pset_ prefixed properties', () => {
    mockUseDocumentStore.mockReturnValue(
      makeStore({ document: mockDocWithPsetProps }) as ReturnType<typeof useDocumentStore>
    );
    render(<PropertiesPanel />);
    expect(screen.getByText(/psets/i)).toBeInTheDocument();
  });

  it('does not render Psets section when element has no Pset_ properties and no propertySets', () => {
    mockUseDocumentStore.mockReturnValue(makeStore() as ReturnType<typeof useDocumentStore>);
    render(<PropertiesPanel />);
    // mockElement has no Pset_ properties and empty propertySets, so no Psets heading
    expect(screen.queryByText(/^psets$/i)).not.toBeInTheDocument();
  });

  it('Psets section is hidden when multiple elements are selected', () => {
    const multiDoc = {
      ...mockDoc,
      content: {
        elements: {
          'el-1': mockElementWithPsetProps,
          'el-2': { ...mockElementWithPsetProps, id: 'el-2' },
        },
        spaces: {},
      },
    };
    mockUseDocumentStore.mockReturnValue(
      makeStore({ document: multiDoc, selectedIds: ['el-1', 'el-2'] }) as ReturnType<typeof useDocumentStore>
    );
    render(<PropertiesPanel />);
    expect(screen.queryByText(/psets/i)).not.toBeInTheDocument();
  });

  it('displays grouped Pset names for Pset_ properties', () => {
    mockUseDocumentStore.mockReturnValue(
      makeStore({ document: mockDocWithPsetProps }) as ReturnType<typeof useDocumentStore>
    );
    render(<PropertiesPanel />);
    expect(screen.getByText('Pset_WallCommon')).toBeInTheDocument();
    expect(screen.getByText('Pset_ThermalCommon')).toBeInTheDocument();
  });

  it('renders Add Pset button when single element selected', () => {
    mockUseDocumentStore.mockReturnValue(
      makeStore({ document: mockDocWithPsetProps }) as ReturnType<typeof useDocumentStore>
    );
    render(<PropertiesPanel />);
    expect(screen.getByRole('button', { name: /add pset/i })).toBeInTheDocument();
  });

  it('does not render Add Pset button when multiple elements selected', () => {
    const multiDoc = {
      ...mockDoc,
      content: {
        elements: {
          'el-1': mockElementWithPsetProps,
          'el-2': { ...mockElementWithPsetProps, id: 'el-2' },
        },
        spaces: {},
      },
    };
    mockUseDocumentStore.mockReturnValue(
      makeStore({ document: multiDoc, selectedIds: ['el-1', 'el-2'] }) as ReturnType<typeof useDocumentStore>
    );
    render(<PropertiesPanel />);
    expect(screen.queryByRole('button', { name: /add pset/i })).not.toBeInTheDocument();
  });
});

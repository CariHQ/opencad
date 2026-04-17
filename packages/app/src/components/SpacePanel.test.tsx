import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpacePanel } from './SpacePanel';
import { useDocumentStore } from '../stores/documentStore';
expect.extend(jestDomMatchers);

vi.mock('../stores/documentStore');

const makeStore = (overrides = {}) => ({
  document: {
    id: 'doc-1',
    content: {
    elements: {
      'sp1': {
        id: 'sp1',
        type: 'space',
        layerId: 'layer-1',
        levelId: null,
        visible: true,
        locked: false,
        properties: {
          name: { type: 'string', value: 'Living Room' },
          usageType: { type: 'string', value: 'living' },
          requiredArea: { type: 'number', value: 25, unit: 'm²' },
          actualArea: { type: 'number', value: 22, unit: 'm²' },
        },
        propertySets: [],
        geometry: { type: 'brep', data: null },
        transform: { translation: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
        boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 5000, y: 4400, z: 2700 } },
        metadata: { id: 'sp1', createdBy: 'u1', createdAt: 0, updatedAt: 0, version: {} },
      },
      'sp2': {
        id: 'sp2',
        type: 'space',
        layerId: 'layer-1',
        levelId: null,
        visible: true,
        locked: false,
        properties: {
          name: { type: 'string', value: 'Bedroom' },
          usageType: { type: 'string', value: 'bedroom' },
          requiredArea: { type: 'number', value: 12, unit: 'm²' },
          actualArea: { type: 'number', value: 15, unit: 'm²' },
        },
        propertySets: [],
        geometry: { type: 'brep', data: null },
        transform: { translation: { x: 5000, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
        boundingBox: { min: { x: 5000, y: 0, z: 0 }, max: { x: 8000, y: 5000, z: 2700 } },
        metadata: { id: 'sp2', createdBy: 'u1', createdAt: 0, updatedAt: 0, version: {} },
      },
    },
    spaces: {},
    },
    organization: { layers: {}, levels: {} },
    presentation: { views: {}, annotations: {} },
    library: { materials: {} },
    versions: [],
    vectorClock: {},
  },
  selectedIds: [],
  activeTool: 'select',
  setActiveTool: vi.fn(),
  toolParams: { space: { name: 'Room', usageType: 'living', requiredArea: 20 } },
  setToolParam: vi.fn(),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useDocumentStore).mockReturnValue(makeStore() as ReturnType<typeof useDocumentStore>);
});

describe('T-BIM-008: SpacePanel', () => {
  it('renders the Space panel header', () => {
    render(<SpacePanel />);
    expect(screen.getByText('Space Tool')).toBeInTheDocument();
  });

  it('shows room name input', () => {
    render(<SpacePanel />);
    expect(screen.getByLabelText(/room name/i)).toBeInTheDocument();
  });

  it('shows usage type select', () => {
    render(<SpacePanel />);
    expect(screen.getByLabelText(/usage type/i)).toBeInTheDocument();
  });

  it('shows required area input', () => {
    render(<SpacePanel />);
    expect(screen.getByLabelText(/required area/i)).toBeInTheDocument();
  });

  it('shows list of spaces in model', () => {
    render(<SpacePanel />);
    expect(screen.getByText('Living Room')).toBeInTheDocument();
    // "Bedroom" appears in dropdown option + space name — use queryAllByText
    expect(screen.getAllByText('Bedroom').length).toBeGreaterThan(0);
  });

  it('shows actual area for each space', () => {
    render(<SpacePanel />);
    // 22 m² for living room, 15 m² for bedroom
    expect(screen.getByText('22 m²')).toBeInTheDocument();
    expect(screen.getByText('15 m²')).toBeInTheDocument();
  });

  it('shows warning when actualArea < requiredArea by >5%', () => {
    render(<SpacePanel />);
    // Living Room: required 25, actual 22 → 12% deficit → warning
    const warnings = screen.getAllByRole('alert');
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('does not show warning when actualArea >= requiredArea', () => {
    render(<SpacePanel />);
    // Bedroom: required 12, actual 15 → compliant → no alert for bedroom
    const warnings = screen.getAllByRole('alert');
    // Only 1 warning (living room), not 2
    expect(warnings.length).toBe(1);
  });

  it('calls setToolParam when room name changes', () => {
    const store = makeStore({ activeTool: 'space' });
    vi.mocked(useDocumentStore).mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<SpacePanel />);
    const nameInput = screen.getByLabelText(/room name/i);
    fireEvent.change(nameInput, { target: { value: 'Kitchen' } });
    fireEvent.blur(nameInput);
    expect(store.setToolParam).toHaveBeenCalledWith('space', 'name', 'Kitchen');
  });

  it('calls setToolParam when required area changes', () => {
    const store = makeStore({ activeTool: 'space' });
    vi.mocked(useDocumentStore).mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<SpacePanel />);
    const areaInput = screen.getByLabelText(/required area/i);
    fireEvent.change(areaInput, { target: { value: '30' } });
    fireEvent.blur(areaInput);
    expect(store.setToolParam).toHaveBeenCalledWith('space', 'requiredArea', 30);
  });

  it('shows total floor area summary', () => {
    render(<SpacePanel />);
    // 22 + 15 = 37 m²
    expect(screen.getByText(/37/)).toBeInTheDocument();
  });

  it('shows placement hint text', () => {
    render(<SpacePanel />);
    expect(screen.getByText(/click.*place|place.*space/i)).toBeInTheDocument();
  });
});

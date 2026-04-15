import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SchedulePanel } from './SchedulePanel';
import { useDocumentStore } from '../stores/documentStore';

vi.mock('../stores/documentStore');

const makeWall = (id: string, overrides = {}) => ({
  id,
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
  transform: { translation: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
  boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 5000, y: 200, z: 3000 } },
  metadata: { id, createdBy: 'u1', createdAt: 0, updatedAt: 0, version: {} },
  ...overrides,
});

const makeDoor = (id: string) => ({
  ...makeWall(id),
  type: 'door' as const,
  properties: {
    width: { type: 'number' as const, value: 900, unit: 'mm' },
    height: { type: 'number' as const, value: 2100, unit: 'mm' },
    material: { type: 'string' as const, value: 'Timber' },
  },
});

const makeStore = (overrides = {}) => ({
  document: {
    id: 'doc-1',
    elements: {
      'w1': makeWall('w1'),
      'w2': makeWall('w2', { properties: { height: { type: 'number', value: 2700, unit: 'mm' }, thickness: { type: 'number', value: 300, unit: 'mm' }, material: { type: 'string', value: 'Brick' } } }),
      'd1': makeDoor('d1'),
    },
    layers: {},
    levels: {},
    versions: [],
    vectorClock: {},
  },
  selectedIds: [],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useDocumentStore).mockReturnValue(makeStore() as ReturnType<typeof useDocumentStore>);
});

describe('T-SCHED-001: SchedulePanel', () => {
  it('renders the Schedule panel header', () => {
    render(<SchedulePanel />);
    expect(screen.getByText(/schedule/i)).toBeInTheDocument();
  });

  it('shows element type selector', () => {
    render(<SchedulePanel />);
    expect(screen.getByRole('combobox', { name: /element type/i })).toBeInTheDocument();
  });

  it('shows Wall option in type selector', () => {
    render(<SchedulePanel />);
    const select = screen.getByRole('combobox', { name: /element type/i });
    expect(select.querySelector('option[value="wall"]')).toBeInTheDocument();
  });

  it('shows Door option in type selector', () => {
    render(<SchedulePanel />);
    const select = screen.getByRole('combobox', { name: /element type/i });
    expect(select.querySelector('option[value="door"]')).toBeInTheDocument();
  });

  it('shows a table with wall rows when Wall selected', () => {
    render(<SchedulePanel />);
    const select = screen.getByRole('combobox', { name: /element type/i });
    fireEvent.change(select, { target: { value: 'wall' } });
    const rows = screen.getAllByRole('row');
    // header row + 2 wall rows
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  it('shows element IDs in rows', () => {
    render(<SchedulePanel />);
    const select = screen.getByRole('combobox', { name: /element type/i });
    fireEvent.change(select, { target: { value: 'wall' } });
    expect(screen.getByText('w1')).toBeInTheDocument();
    expect(screen.getByText('w2')).toBeInTheDocument();
  });

  it('shows property values in cells', () => {
    render(<SchedulePanel />);
    const select = screen.getByRole('combobox', { name: /element type/i });
    fireEvent.change(select, { target: { value: 'wall' } });
    expect(screen.getByText('Concrete')).toBeInTheDocument();
    expect(screen.getByText('Brick')).toBeInTheDocument();
  });

  it('shows count of elements in totals row', () => {
    render(<SchedulePanel />);
    const select = screen.getByRole('combobox', { name: /element type/i });
    fireEvent.change(select, { target: { value: 'wall' } });
    expect(screen.getByText(/total.*2|2.*wall/i)).toBeInTheDocument();
  });

  it('switches to door schedule when Door selected', () => {
    render(<SchedulePanel />);
    const select = screen.getByRole('combobox', { name: /element type/i });
    fireEvent.change(select, { target: { value: 'door' } });
    expect(screen.getByText('d1')).toBeInTheDocument();
  });

  it('shows column headers for properties', () => {
    render(<SchedulePanel />);
    const select = screen.getByRole('combobox', { name: /element type/i });
    fireEvent.change(select, { target: { value: 'wall' } });
    expect(screen.getByText(/id/i)).toBeInTheDocument();
    expect(screen.getByText(/material/i)).toBeInTheDocument();
  });

  it('shows Export CSV button', () => {
    render(<SchedulePanel />);
    expect(screen.getByRole('button', { name: /export.*csv/i })).toBeInTheDocument();
  });

  it('shows empty state when no elements of type exist', () => {
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore({
        document: { id: 'doc-1', elements: {}, layers: {}, levels: {}, versions: [], vectorClock: {} },
      }) as ReturnType<typeof useDocumentStore>
    );
    render(<SchedulePanel />);
    const select = screen.getByRole('combobox', { name: /element type/i });
    fireEvent.change(select, { target: { value: 'wall' } });
    expect(screen.getByText(/no.*wall|0.*wall/i)).toBeInTheDocument();
  });
});

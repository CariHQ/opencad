import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColumnBeamPanel } from './ColumnBeamPanel';
import { useDocumentStore } from '../stores/documentStore';
expect.extend(jestDomMatchers);

vi.mock('../stores/documentStore');

const _SECTION_PROFILES = ['Circular', 'Rectangular', 'H-Section', 'I-Section', 'IPE', 'HEA', 'RHS'];

function makeStore(activeTool = 'column', toolParams = {}) {
  const defaultParams = {
    column: { height: 3000, sectionType: 'Circular', diameter: 300, material: 'Concrete' },
    beam: { span: 5000, sectionProfile: 'IPE', sectionSize: '200', material: 'Steel' },
  };
  return {
    activeTool,
    toolParams: { ...defaultParams, ...toolParams },
    setToolParam: vi.fn(),
  };
}

describe('T-BIM-004: ColumnBeamPanel', () => {
  beforeEach(() => {
    vi.mocked(useDocumentStore).mockReturnValue(makeStore() as ReturnType<typeof useDocumentStore>);
  });

  it('renders Column panel when activeTool is column', () => {
    render(<ColumnBeamPanel />);
    expect(screen.getByText('Column')).toBeInTheDocument();
  });

  it('renders Beam panel when activeTool is beam', () => {
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore('beam') as ReturnType<typeof useDocumentStore>
    );
    render(<ColumnBeamPanel />);
    expect(screen.getByText('Beam')).toBeInTheDocument();
  });

  // Column inputs
  it('shows column height input', () => {
    render(<ColumnBeamPanel />);
    expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
  });

  it('shows column section type select', () => {
    render(<ColumnBeamPanel />);
    expect(screen.getByLabelText(/section type/i)).toBeInTheDocument();
  });

  it('shows circular diameter input by default', () => {
    render(<ColumnBeamPanel />);
    expect(screen.getByLabelText(/diameter/i)).toBeInTheDocument();
  });

  it('shows column material input', () => {
    render(<ColumnBeamPanel />);
    expect(screen.getByLabelText(/material/i)).toBeInTheDocument();
  });

  it('calls setToolParam when column height changes', () => {
    const store = makeStore();
    vi.mocked(useDocumentStore).mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<ColumnBeamPanel />);
    const input = screen.getByLabelText(/height/i);
    fireEvent.change(input, { target: { value: '4000' } });
    fireEvent.blur(input);
    expect(store.setToolParam).toHaveBeenCalledWith('column', 'height', 4000);
  });

  it('calls setToolParam when column section type changes', () => {
    const store = makeStore();
    vi.mocked(useDocumentStore).mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<ColumnBeamPanel />);
    const select = screen.getByLabelText(/section type/i);
    fireEvent.change(select, { target: { value: 'Rectangular' } });
    expect(store.setToolParam).toHaveBeenCalledWith('column', 'sectionType', 'Rectangular');
  });

  it('section type select has standard options', () => {
    render(<ColumnBeamPanel />);
    const select = screen.getByLabelText(/section type/i);
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
    for (const profile of ['Circular', 'Rectangular', 'H-Section', 'I-Section']) {
      expect(options).toContain(profile);
    }
  });

  // Beam inputs
  it('shows beam span input', () => {
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore('beam') as ReturnType<typeof useDocumentStore>
    );
    render(<ColumnBeamPanel />);
    expect(screen.getByLabelText(/span/i)).toBeInTheDocument();
  });

  it('shows beam section profile select', () => {
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore('beam') as ReturnType<typeof useDocumentStore>
    );
    render(<ColumnBeamPanel />);
    expect(screen.getByLabelText(/section profile/i)).toBeInTheDocument();
  });

  it('shows beam section size input', () => {
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore('beam') as ReturnType<typeof useDocumentStore>
    );
    render(<ColumnBeamPanel />);
    expect(screen.getByLabelText(/section size/i)).toBeInTheDocument();
  });

  it('beam section profile select has IPE, HEA, RHS options', () => {
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore('beam') as ReturnType<typeof useDocumentStore>
    );
    render(<ColumnBeamPanel />);
    const select = screen.getByLabelText(/section profile/i);
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
    for (const profile of ['IPE', 'HEA', 'RHS']) {
      expect(options).toContain(profile);
    }
  });

  it('calls setToolParam when beam span changes', () => {
    const store = makeStore('beam');
    vi.mocked(useDocumentStore).mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<ColumnBeamPanel />);
    const input = screen.getByLabelText(/span/i);
    fireEvent.change(input, { target: { value: '6000' } });
    fireEvent.blur(input);
    expect(store.setToolParam).toHaveBeenCalledWith('beam', 'span', 6000);
  });

  it('calls setToolParam when beam section profile changes', () => {
    const store = makeStore('beam');
    vi.mocked(useDocumentStore).mockReturnValue(store as ReturnType<typeof useDocumentStore>);
    render(<ColumnBeamPanel />);
    const select = screen.getByLabelText(/section profile/i);
    fireEvent.change(select, { target: { value: 'HEA' } });
    expect(store.setToolParam).toHaveBeenCalledWith('beam', 'sectionProfile', 'HEA');
  });

  it('shows placement hint for column', () => {
    render(<ColumnBeamPanel />);
    expect(screen.getByText(/click.*place column/i)).toBeInTheDocument();
  });

  it('shows placement hint for beam', () => {
    vi.mocked(useDocumentStore).mockReturnValue(
      makeStore('beam') as ReturnType<typeof useDocumentStore>
    );
    render(<ColumnBeamPanel />);
    expect(screen.getByText(/click.*place beam|start.*end/i)).toBeInTheDocument();
  });
});

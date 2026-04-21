/**
 * ImportExportModal component tests
 * T-IO-009: Import/export modal renders and handles mode switching
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImportExportModal } from './ImportExportModal';

const mockLoadDocumentSchema = vi.fn();
const mockInitProject = vi.fn();

vi.mock('../stores/documentStore', () => ({
  useDocumentStore: vi.fn(() => ({
    document: {
      id: 'test',
      name: 'Test Project',
      content: { elements: {}, spaces: {} },
      organization: { layers: {}, levels: {} },
      presentation: { annotations: {} },
    },
    loadDocumentSchema: mockLoadDocumentSchema,
    initProject: mockInitProject,
  })),
}));

vi.mock('@opencad/document', async (importOriginal) => {
  const real = await importOriginal<typeof import('@opencad/document')>();
  return {
    ...real,
    parseIFC: vi.fn().mockReturnValue({ id: 'imported', name: 'IFC Import' }),
    serializeIFC: vi.fn().mockReturnValue('IFC_CONTENT'),
    parseDXF: vi.fn().mockReturnValue({ id: 'imported', name: 'DXF Import' }),
    serializeDXF: vi.fn().mockReturnValue('DXF_CONTENT'),
    parseDWG: vi.fn().mockReturnValue({ id: 'imported', name: 'DWG Import' }),
    parseRVT: vi.fn().mockReturnValue({ id: 'imported', name: 'RVT Import' }),
    renderDocumentToPDF: vi.fn().mockReturnValue(new Blob(['%PDF-1.4 CANVAS'], { type: 'application/pdf' })),
    exportToPDFDataURL: vi.fn().mockReturnValue('data:application/pdf;base64,JVBERi0xLjQK'),
  };
});

describe('T-IO-009: ImportExportModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock URL methods used by download trigger
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
    global.URL.revokeObjectURL = vi.fn();
  });

  describe('Import mode', () => {
    it('renders Import File title', () => {
      render(<ImportExportModal mode="import" onClose={onClose} />);
      expect(screen.getByText(/Import File/i)).toBeInTheDocument();
    });

    it('shows file click area', () => {
      render(<ImportExportModal mode="import" onClose={onClose} />);
      expect(screen.getByText(/Click to select a file/i)).toBeInTheDocument();
    });

    it('shows supported formats text', () => {
      render(<ImportExportModal mode="import" onClose={onClose} />);
      expect(screen.getByText(/Supported: IFC, DXF, DWG, RVT/i)).toBeInTheDocument();
    });

    it('has file input accepting correct extensions', () => {
      render(<ImportExportModal mode="import" onClose={onClose} />);
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeTruthy();
      expect(fileInput!.getAttribute('accept')).toContain('.ifc');
      expect(fileInput!.getAttribute('accept')).toContain('.dxf');
    });
  });

  describe('Export mode', () => {
    it('renders Export File title', () => {
      render(<ImportExportModal mode="export" onClose={onClose} />);
      expect(screen.getByText(/Export File/i)).toBeInTheDocument();
    });

    it('shows IFC export button', () => {
      render(<ImportExportModal mode="export" onClose={onClose} />);
      expect(screen.getByText(/IFC \(\.ifc\)/i)).toBeInTheDocument();
    });

    it('shows DXF export button', () => {
      render(<ImportExportModal mode="export" onClose={onClose} />);
      expect(screen.getByText(/DXF \(\.dxf\)/i)).toBeInTheDocument();
    });

    it('shows DWG export button', () => {
      render(<ImportExportModal mode="export" onClose={onClose} />);
      expect(screen.getByText(/DWG \(\.dwg\)/i)).toBeInTheDocument();
    });

    it('shows PDF export button', () => {
      render(<ImportExportModal mode="export" onClose={onClose} />);
      expect(screen.getByText(/PDF \(\.pdf\)/i)).toBeInTheDocument();
    });

    it('clicking IFC export calls onClose', () => {
      render(<ImportExportModal mode="export" onClose={onClose} />);
      // Find IFC button and click it
      const ifcBtn = screen.getAllByRole('button').find((b) => b.textContent?.includes('.ifc'));
      fireEvent.click(ifcBtn!);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Projects mode', () => {
    it('renders New Project title', () => {
      render(<ImportExportModal mode="projects" onClose={onClose} />);
      expect(screen.getByText(/New Project/i)).toBeInTheDocument();
    });

    it('shows template options', () => {
      render(<ImportExportModal mode="projects" onClose={onClose} />);
      expect(screen.getByText('Residential')).toBeInTheDocument();
      expect(screen.getByText('Commercial')).toBeInTheDocument();
      expect(screen.getByText('Interior')).toBeInTheDocument();
      expect(screen.getByText('Blank')).toBeInTheDocument();
    });

    it('clicking a template calls initProject and onClose', () => {
      render(<ImportExportModal mode="projects" onClose={onClose} />);
      fireEvent.click(screen.getByText('Blank'));
      expect(mockInitProject).toHaveBeenCalledWith('blank', 'user-1');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows template descriptions', () => {
      render(<ImportExportModal mode="projects" onClose={onClose} />);
      expect(screen.getByText(/Single-family house template/i)).toBeInTheDocument();
    });
  });

  describe('Common behavior', () => {
    it('renders close button', () => {
      render(<ImportExportModal mode="import" onClose={onClose} />);
      const closeBtn = screen.getByRole('button', { name: '' });
      expect(closeBtn).toBeInTheDocument();
    });

    it('calls onClose when overlay is clicked', () => {
      render(<ImportExportModal mode="import" onClose={onClose} />);
      const overlay = document.querySelector('.modal-overlay');
      fireEvent.click(overlay!);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when modal content is clicked', () => {
      render(<ImportExportModal mode="import" onClose={onClose} />);
      const content = document.querySelector('.modal-content');
      fireEvent.click(content!);
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});

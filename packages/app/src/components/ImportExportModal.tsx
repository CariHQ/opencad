import React, { useState, useRef } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { useDocumentStore } from '../stores/documentStore';
import {
  parseIFC, serializeIFC,
  parseDXF, serializeDXF,
  parseDWG,
  parseRVT,
  serializePDF,
  exportToIFC,
  exportToDXF,
  exportToPDFDataURL,
} from '@opencad/document';

interface ImportExportModalProps {
  mode: 'import' | 'export' | 'projects';
  onClose: () => void;
}

export function ImportExportModal({ mode, onClose }: ImportExportModalProps) {
  const { document: doc, loadDocumentSchema, initProject } = useDocumentStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError(null);

    try {
      const ext = file.name.toLowerCase().split('.').pop();

      if (ext === 'ifc') {
        const content = await file.text();
        loadDocumentSchema(parseIFC(content));
      } else if (ext === 'dxf') {
        const content = await file.text();
        loadDocumentSchema(parseDXF(content));
      } else if (ext === 'dwg') {
        const buffer = await file.arrayBuffer();
        loadDocumentSchema(parseDWG(buffer));
      } else if (ext === 'rvt') {
        const content = await file.text();
        loadDocumentSchema(parseRVT(content));
      } else {
        setError('Unsupported format. Supported: IFC, DXF, DWG, RVT');
        setImporting(false);
        return;
      }
    } catch (err) {
      setError('Failed to import file: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setImporting(false);
      return;
    }

    setImporting(false);
    onClose();
  };

  const triggerDownload = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = (format: 'ifc' | 'dxf' | 'pdf' = 'ifc') => {
    if (!doc) return;
    const name = doc.name || 'export';

    if (format === 'ifc') {
      const ifcContent = exportToIFC(doc) || serializeIFC(doc);
      triggerDownload(ifcContent, `${name}.ifc`, 'text/plain');
    } else if (format === 'dxf') {
      const dxfContent = exportToDXF(doc) || serializeDXF(doc);
      triggerDownload(dxfContent, `${name}.dxf`, 'application/dxf');
    } else if (format === 'pdf') {
      const dataUrl = exportToPDFDataURL(doc);
      const base64 = dataUrl.replace('data:application/pdf;base64,', '');
      let pdfContent: string;
      try {
        pdfContent = atob(base64);
      } catch {
        pdfContent = serializePDF(doc);
      }
      const bytes = new Uint8Array(pdfContent.length);
      for (let i = 0; i < pdfContent.length; i++) {
        bytes[i] = pdfContent.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
      return;
    }

    onClose();
  };

  const templates = [
    { id: 'residential', name: 'Residential', description: 'Single-family house template' },
    { id: 'commercial', name: 'Commercial', description: 'Office building template' },
    { id: 'interior', name: 'Interior', description: 'Interior design template' },
    { id: 'blank', name: 'Blank', description: 'Start from scratch' },
  ];

  const handleCreateProject = (templateId: string) => {
    initProject(templateId, 'user-1');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">
            {mode === 'import' ? 'Import File' : mode === 'export' ? 'Export File' : 'New Project'}
          </span>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {mode === 'import' && (
            <div className="import-area" onClick={() => fileInputRef.current?.click()}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ifc,.dxf,.dwg,.rvt"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <Upload size={48} className="import-icon" />
              <p className="import-text">Click to select a file</p>
              <p className="import-formats">Supported: IFC, DXF, DWG, RVT (Revit)</p>
              {importing && <p className="import-status">Importing...</p>}
              {error && <p className="import-error">{error}</p>}
            </div>
          )}

          {mode === 'export' && (
            <div className="export-options">
              <button className="export-btn" onClick={() => handleExport('ifc')}>
                <FileText size={24} />
                <span>IFC (.ifc)</span>
                <span className="export-desc">Industry Foundation Classes</span>
              </button>
              <button className="export-btn" onClick={() => handleExport('dxf')}>
                <FileText size={24} />
                <span>DXF (.dxf)</span>
                <span className="export-desc">Drawing Exchange Format</span>
              </button>
              <button className="export-btn" onClick={() => handleExport('dxf')} title="DWG exports as DXF (compatible format)">
                <FileText size={24} />
                <span>DWG (.dwg)</span>
                <span className="export-desc">AutoCAD Drawing (DXF-compatible)</span>
              </button>
              <button className="export-btn" onClick={() => handleExport('pdf')}>
                <FileText size={24} />
                <span>PDF (.pdf)</span>
                <span className="export-desc">Portable Document Format</span>
              </button>
            </div>
          )}

          {mode === 'projects' && (
            <div className="project-templates">
              <p className="templates-title">Choose a template to start:</p>
              <div className="templates-grid">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    className="template-card"
                    onClick={() => handleCreateProject(template.id)}
                  >
                    <span className="template-name">{template.name}</span>
                    <span className="template-desc">{template.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

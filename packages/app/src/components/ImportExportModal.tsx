import React, { useState, useRef } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../stores/documentStore';
import {
  parseIFC,
  exportToIFC,
  exportToDXF,
  exportToPDFDataURL,
  renderDocumentToPDF,
} from '@opencad/document';
import { parsePointCloud } from '../lib/pointCloud';

interface ImportExportModalProps {
  mode: 'import' | 'export' | 'projects';
  onClose: () => void;
}

export function ImportExportModal({ mode, onClose }: ImportExportModalProps) {
  const { t } = useTranslation('dialogs');
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
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.ifc')) {
        const content = await file.text();
        const parsed = parseIFC(content);
        loadDocumentSchema(parsed);
      } else if (
        lower.endsWith('.ply') || lower.endsWith('.xyz') || lower.endsWith('.txt') ||
        lower.endsWith('.pts')
      ) {
        const content = await file.text();
        const pc = parsePointCloud(file.name, content);
        if (pc.renderedCount === 0) {
          setError(t('importExport.noPointsError', { defaultValue: 'No points found in file (binary PLY not yet supported).' }));
          setImporting(false);
          return;
        }
        const store = useDocumentStore.getState();
        if (!store.document) store.initProject(crypto.randomUUID(), 'import');
        const layerId = Object.keys(store.document!.organization.layers)[0]!;
        store.addElement({
          type: 'surface',
          layerId,
          properties: {
            Name:   { type: 'string', value: `Point Cloud (${pc.renderedCount.toLocaleString()} pts)` },
            Kind:   { type: 'string', value: 'point_cloud' },
            Points: { type: 'string', value: Array.from(pc.positions).join(',') },
            PointCount: { type: 'number', value: pc.renderedCount },
            ...(pc.colors ? { Colors: { type: 'string', value: Array.from(pc.colors).join(',') } } : {}),
          },
        });
      } else {
        setError(t('importExport.unsupportedFormat', { defaultValue: 'Unsupported file format. Please use .ifc, .ply, or .xyz files.' }));
        setImporting(false);
        return;
      }
    } catch (err) {
      setError(t('importExport.importFailed', { message: err instanceof Error ? err.message : 'Unknown error', defaultValue: 'Failed to import file: {{message}}' }));
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
      triggerDownload(exportToIFC(doc), `${name}.ifc`, 'application/x-step');
    } else if (format === 'dxf') {
      triggerDownload(exportToDXF(doc), `${name}.dxf`, 'application/dxf');
    } else if (format === 'pdf') {
      // Prefer the canvas-aware renderer so the exported PDF embeds the
      // actual viewport image. Fall back to the vector-primitive exporter
      // when no canvas is in the DOM (e.g. viewless export path).
      const canvas = document.querySelector<HTMLCanvasElement>('.viewport-container canvas')
        ?? document.querySelector<HTMLCanvasElement>('canvas');
      let blob: Blob;
      if (canvas) {
        blob = renderDocumentToPDF(doc, canvas, { title: name });
      } else {
        const dataUrl = exportToPDFDataURL(doc);
        const base64 = dataUrl.replace('data:application/pdf;base64,', '');
        const pdfContent = atob(base64);
        const bytes = new Uint8Array(pdfContent.length);
        for (let i = 0; i < pdfContent.length; i++) {
          bytes[i] = pdfContent.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: 'application/pdf' });
      }
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
    { id: 'residential', name: t('importExport.templates.residential.name', { defaultValue: 'Residential' }), description: t('importExport.templates.residential.desc', { defaultValue: 'Single-family house template' }) },
    { id: 'commercial', name: t('importExport.templates.commercial.name', { defaultValue: 'Commercial' }), description: t('importExport.templates.commercial.desc', { defaultValue: 'Office building template' }) },
    { id: 'interior', name: t('importExport.templates.interior.name', { defaultValue: 'Interior' }), description: t('importExport.templates.interior.desc', { defaultValue: 'Interior design template' }) },
    { id: 'blank', name: t('importExport.templates.blank.name', { defaultValue: 'Blank' }), description: t('importExport.templates.blank.desc', { defaultValue: 'Start from scratch' }) },
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
            {mode === 'import'
              ? t('importExport.importTitle', { defaultValue: 'Import File' })
              : mode === 'export'
                ? t('importExport.exportTitle', { defaultValue: 'Export File' })
                : t('importExport.newProject', { defaultValue: 'New Project' })}
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
              <p className="import-text">{t('importExport.clickToSelect', { defaultValue: 'Click to select a file' })}</p>
              <p className="import-formats">{t('importExport.supportedFormatsFull', { defaultValue: 'Supported: IFC, DXF, DWG, RVT (Revit)' })}</p>
              {importing && <p className="import-status">{t('importExport.importing', { defaultValue: 'Importing...' })}</p>}
              {error && <p className="import-error">{error}</p>}
            </div>
          )}

          {mode === 'export' && (
            <div className="export-options">
              <button className="export-btn" onClick={() => handleExport('ifc')}>
                <FileText size={24} />
                <span>IFC (.ifc)</span>
                <span className="export-desc">{t('importExport.formats.ifc', { defaultValue: 'Industry Foundation Classes' })}</span>
              </button>
              <button className="export-btn" onClick={() => handleExport('dxf')}>
                <FileText size={24} />
                <span>DXF (.dxf)</span>
                <span className="export-desc">{t('importExport.formats.dxf', { defaultValue: 'Drawing Exchange Format' })}</span>
              </button>
              <button className="export-btn" onClick={() => handleExport('dxf')} title={t('importExport.dwgTitle', { defaultValue: 'DWG exports as DXF (compatible format)' })}>
                <FileText size={24} />
                <span>DWG (.dwg)</span>
                <span className="export-desc">{t('importExport.formats.dwg', { defaultValue: 'AutoCAD Drawing (DXF-compatible)' })}</span>
              </button>
              <button className="export-btn" onClick={() => handleExport('pdf')}>
                <FileText size={24} />
                <span>PDF (.pdf)</span>
                <span className="export-desc">{t('importExport.formats.pdf', { defaultValue: 'Portable Document Format' })}</span>
              </button>
            </div>
          )}

          {mode === 'projects' && (
            <div className="project-templates">
              <p className="templates-title">{t('importExport.chooseTemplate', { defaultValue: 'Choose a template to start:' })}</p>
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

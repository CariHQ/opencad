/**
 * T-DOC-011: TemplateSelector
 *
 * Renders the 3 project templates (residential, commercial, interior) and calls
 * `loadDocumentSchema` from the document store when the user picks one.
 */
import React from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { PROJECT_TEMPLATES } from '../config/projectTemplates';

interface TemplateSelectorProps {
  onClose: () => void;
}

export function TemplateSelector({ onClose }: TemplateSelectorProps) {
  const { loadDocumentSchema } = useDocumentStore();

  const handleSelect = (index: number) => {
    const template = PROJECT_TEMPLATES[index];
    if (!template) return;
    loadDocumentSchema(template.schema);
    onClose();
  };

  return (
    <div className="template-selector">
      <div className="panel-header">
        <span className="panel-title">Choose a Template</span>
      </div>
      <div className="templates-list">
        {PROJECT_TEMPLATES.map((template, idx) => (
          <div key={template.id} className="template-card">
            <div className="template-info">
              <span className="template-name">{template.name}</span>
              <span className="template-desc">{template.description}</span>
            </div>
            <button
              className="btn-use-template"
              aria-label={`Use template ${template.name}`}
              onClick={() => handleSelect(idx)}
            >
              Use Template
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

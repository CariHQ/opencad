import React from 'react';
import { useTranslation } from 'react-i18next';

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  levels: number;
  category: string;
  elements: { type: string; count: number }[];
}

const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'Start from scratch with an empty project.',
    levels: 1,
    category: 'General',
    elements: [],
  },
  {
    id: 'house-single',
    name: 'Single Storey House',
    description: 'Single-level residential house with living, kitchen, 3 bedrooms and 2 baths.',
    levels: 1,
    category: 'Residential',
    elements: [
      { type: 'wall', count: 24 },
      { type: 'door', count: 8 },
      { type: 'window', count: 12 },
    ],
  },
  {
    id: 'house-double',
    name: 'Double Storey House',
    description: 'Two-level family house with ground floor living and upper floor bedrooms.',
    levels: 2,
    category: 'Residential',
    elements: [
      { type: 'wall', count: 40 },
      { type: 'door', count: 14 },
      { type: 'window', count: 20 },
      { type: 'slab', count: 2 },
    ],
  },
  {
    id: 'apartment',
    name: 'Apartment / Unit',
    description: 'Compact apartment layout with open plan living and one or two bedrooms.',
    levels: 1,
    category: 'Residential',
    elements: [
      { type: 'wall', count: 16 },
      { type: 'door', count: 5 },
      { type: 'window', count: 8 },
    ],
  },
  {
    id: 'apartment-block',
    name: 'Apartment Block',
    description: 'Multi-storey residential building with typical floor plates.',
    levels: 6,
    category: 'Residential',
    elements: [
      { type: 'wall', count: 120 },
      { type: 'slab', count: 6 },
      { type: 'column', count: 24 },
    ],
  },
  {
    id: 'office-open',
    name: 'Open Plan Office',
    description: 'Modern open plan commercial office with meeting rooms and amenities.',
    levels: 1,
    category: 'Commercial',
    elements: [
      { type: 'wall', count: 20 },
      { type: 'door', count: 10 },
      { type: 'window', count: 30 },
    ],
  },
  {
    id: 'office-multi',
    name: 'Multi-Storey Office',
    description: 'Commercial office building with typical floor plan repeated over multiple levels.',
    levels: 5,
    category: 'Commercial',
    elements: [
      { type: 'wall', count: 80 },
      { type: 'column', count: 40 },
      { type: 'slab', count: 5 },
    ],
  },
];

interface ProjectTemplatesProps {
  onSelect: (template: ProjectTemplate) => void;
}

export function ProjectTemplates({ onSelect }: ProjectTemplatesProps) {
  const { t } = useTranslation('common');
  return (
    <div className="project-templates">
      <div className="panel-header">
        <span className="panel-title">{t('home.projectTemplates', { defaultValue: 'Project Templates' })}</span>
      </div>
      <div className="templates-grid">
        {TEMPLATES.map((tmpl) => (
          <div key={tmpl.id} className="template-card">
            <div className="template-info">
              <span className="template-name">{tmpl.name}</span>
              <span className="template-category">{tmpl.category}</span>
              <span className="template-desc">{tmpl.description}</span>
              <span className="template-meta">
                {tmpl.levels} {tmpl.levels === 1 ? 'level' : 'levels'}
                {tmpl.elements.length > 0 && ` · ${tmpl.elements.reduce((s, e) => s + e.count, 0)} elements`}
              </span>
            </div>
            <button
              aria-label={`Use template ${tmpl.name}`}
              className="btn-use-template"
              onClick={() => onSelect(tmpl)}
            >
              Use Template
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

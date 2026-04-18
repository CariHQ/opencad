/**
 * T-DOC-011: Project Templates
 * Tests verifying template catalog and schema validity.
 */
import { describe, it, expect } from 'vitest';
import { PROJECT_TEMPLATES, type ProjectTemplateEntry } from './projectTemplates';

describe('T-DOC-011: Project Templates catalog', () => {
  it('exports exactly 3 templates', () => {
    expect(PROJECT_TEMPLATES).toHaveLength(3);
  });

  it('includes a residential template', () => {
    const t = PROJECT_TEMPLATES.find((x) => x.id === 'residential');
    expect(t).toBeDefined();
  });

  it('includes a commercial template', () => {
    const t = PROJECT_TEMPLATES.find((x) => x.id === 'commercial');
    expect(t).toBeDefined();
  });

  it('includes an interior template', () => {
    const t = PROJECT_TEMPLATES.find((x) => x.id === 'interior');
    expect(t).toBeDefined();
  });

  it('every template has id, name, description', () => {
    for (const t of PROJECT_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
    }
  });

  it('every template schema has a name', () => {
    for (const t of PROJECT_TEMPLATES) {
      expect(t.schema.name).toBeTruthy();
    }
  });

  it('residential template schema has at least one layer', () => {
    const t = PROJECT_TEMPLATES.find((x) => x.id === 'residential')!;
    expect(Object.keys(t.schema.organization.layers).length).toBeGreaterThanOrEqual(1);
  });

  it('commercial template schema has at least one layer', () => {
    const t = PROJECT_TEMPLATES.find((x) => x.id === 'commercial')!;
    expect(Object.keys(t.schema.organization.layers).length).toBeGreaterThanOrEqual(1);
  });

  it('interior template schema has at least one layer', () => {
    const t = PROJECT_TEMPLATES.find((x) => x.id === 'interior')!;
    expect(Object.keys(t.schema.organization.layers).length).toBeGreaterThanOrEqual(1);
  });

  it('residential template schema has at least one element', () => {
    const t = PROJECT_TEMPLATES.find((x) => x.id === 'residential')!;
    expect(Object.keys(t.schema.content.elements).length).toBeGreaterThanOrEqual(1);
  });

  it('commercial template schema has at least one element', () => {
    const t = PROJECT_TEMPLATES.find((x) => x.id === 'commercial')!;
    expect(Object.keys(t.schema.content.elements).length).toBeGreaterThanOrEqual(1);
  });

  it('interior template schema has at least one element', () => {
    const t = PROJECT_TEMPLATES.find((x) => x.id === 'interior')!;
    expect(Object.keys(t.schema.content.elements).length).toBeGreaterThanOrEqual(1);
  });

  it('residential template contains wall elements', () => {
    const t = PROJECT_TEMPLATES.find((x) => x.id === 'residential')!;
    const elements = Object.values(t.schema.content.elements);
    expect(elements.some((el) => el.type === 'wall')).toBe(true);
  });

  it('residential template contains door elements', () => {
    const t = PROJECT_TEMPLATES.find((x) => x.id === 'residential')!;
    const elements = Object.values(t.schema.content.elements);
    expect(elements.some((el) => el.type === 'door')).toBe(true);
  });

  it('residential template contains window elements', () => {
    const t = PROJECT_TEMPLATES.find((x) => x.id === 'residential')!;
    const elements = Object.values(t.schema.content.elements);
    expect(elements.some((el) => el.type === 'window')).toBe(true);
  });

  it('ProjectTemplateEntry type has schema field typed as DocumentSchema', () => {
    // Type-level check: schema must satisfy DocumentSchema structure
    const t = PROJECT_TEMPLATES[0] as ProjectTemplateEntry;
    expect(t.schema.content).toBeDefined();
    expect(t.schema.organization).toBeDefined();
    expect(t.schema.presentation).toBeDefined();
    expect(t.schema.library).toBeDefined();
    expect(t.schema.metadata).toBeDefined();
    expect(t.schema.version).toBeDefined();
  });

  it('all template schemas have content, organization, presentation, library', () => {
    for (const t of PROJECT_TEMPLATES) {
      expect(t.schema.content).toBeDefined();
      expect(t.schema.organization).toBeDefined();
      expect(t.schema.presentation).toBeDefined();
      expect(t.schema.library).toBeDefined();
    }
  });
});

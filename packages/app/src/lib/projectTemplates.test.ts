/**
 * T-DOC-011: Project templates — unit tests
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect } from 'vitest';

expect.extend(jestDomMatchers);

import { PROJECT_TEMPLATES, applyTemplate } from './projectTemplates';

describe('T-DOC-011: Project Templates', () => {
  it('T-DOC-011-001: PROJECT_TEMPLATES has at least 3 entries', () => {
    expect(PROJECT_TEMPLATES.length).toBeGreaterThanOrEqual(3);
  });

  it('T-DOC-011-002: each template has id, name, category, description', () => {
    for (const t of PROJECT_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.category).toBeTruthy();
      expect(t.description).toBeTruthy();
    }
  });

  it('T-DOC-011-003: residential template has at least 5 elements', () => {
    const residential = PROJECT_TEMPLATES.find((t) => t.category === 'residential');
    expect(residential).toBeDefined();
    expect(residential!.elements.length).toBeGreaterThanOrEqual(5);
  });

  it('T-DOC-011-004: applyTemplate returns a valid DocumentSchema', () => {
    const residential = PROJECT_TEMPLATES.find((t) => t.category === 'residential');
    const schema = applyTemplate(residential!.id, 'project-123');
    expect(schema).toHaveProperty('id');
    expect(schema).toHaveProperty('name');
    expect(schema).toHaveProperty('content');
    expect(schema).toHaveProperty('organization');
    expect(schema).toHaveProperty('metadata');
  });

  it('T-DOC-011-005: applyTemplate returns the correct projectId', () => {
    const template = PROJECT_TEMPLATES[0]!;
    const schema = applyTemplate(template.id, 'my-project-id');
    expect(schema.id).toBe('my-project-id');
  });

  it('T-DOC-011-006: all template elements have x, y coordinates', () => {
    for (const template of PROJECT_TEMPLATES) {
      for (const el of template.elements) {
        expect(typeof el.x).toBe('number');
        expect(typeof el.y).toBe('number');
      }
    }
  });

  it('T-DOC-011-007: applying unknown templateId returns a blank document', () => {
    const schema = applyTemplate('nonexistent-template-id', 'proj-blank');
    expect(schema.id).toBe('proj-blank');
    expect(Object.keys(schema.content.elements)).toHaveLength(0);
  });

  it('T-DOC-011-008: template categories are all valid values', () => {
    const validCategories = ['residential', 'commercial', 'interior', 'infrastructure'];
    for (const t of PROJECT_TEMPLATES) {
      expect(validCategories).toContain(t.category);
    }
  });
});

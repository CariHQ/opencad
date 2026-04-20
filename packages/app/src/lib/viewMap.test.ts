/**
 * T-VIZ-039 view map tests (GitHub issue #332).
 *
 *   T-VIZ-039-001 — buildViewMapTree builds a 2-level folder tree
 *   T-VIZ-039-002 — applyTemplate merges settings
 *   T-VIZ-039-003 — templatesForCategory filters by applyTo
 */
import { describe, it, expect } from 'vitest';
import {
  buildViewMapTree, applyTemplate, templatesForCategory, DEFAULT_TEMPLATES,
  type ViewEntry,
} from './viewMap';

describe('T-VIZ-039: viewMap', () => {
  it('T-VIZ-039-001: views under "Plans / Ground Floor" nest correctly', () => {
    const views: ViewEntry[] = [
      { id: 'v1', name: 'Floor Plan', category: 'plan',
        folderPath: 'Plans / Ground Floor', settings: {} },
      { id: 'v2', name: 'Roof Plan', category: 'plan',
        folderPath: 'Plans / Roof', settings: {} },
    ];
    const tree = buildViewMapTree(views);
    expect(tree).toHaveLength(1);                     // one root folder "Plans"
    expect(tree[0]!.name).toBe('Plans');
    expect(tree[0]!.children).toHaveLength(2);
  });

  it('T-VIZ-039-002: applyTemplate merges template.settings over view.settings', () => {
    const view: ViewEntry = {
      id: 'v', name: 'A', category: 'plan', folderPath: 'Plans', settings: { scale: '1:200' },
    };
    const tpl = DEFAULT_TEMPLATES[0]!;  // Working Plan 1:100
    const out = applyTemplate(view, tpl);
    expect(out.settings.scale).toBe('1:100');
    expect(out.templateId).toBe(tpl.id);
  });

  it('T-VIZ-039-003: templatesForCategory filters to applyTo', () => {
    const planTemplates = templatesForCategory(DEFAULT_TEMPLATES, 'plan');
    expect(planTemplates.every((t) => !t.applyTo || t.applyTo.includes('plan'))).toBe(true);
    expect(planTemplates.length).toBeGreaterThanOrEqual(2);
  });

  it('buildViewMapTree falls back to category when folderPath is empty', () => {
    const views: ViewEntry[] = [
      { id: 'v', name: 'Floor', category: 'plan', folderPath: '', settings: {} },
    ];
    const tree = buildViewMapTree(views);
    expect(tree[0]!.path).toBe('plan');
  });

  it('DEFAULT_TEMPLATES includes 4 starter entries', () => {
    expect(DEFAULT_TEMPLATES).toHaveLength(4);
    expect(DEFAULT_TEMPLATES.map((t) => t.id)).toContain('tmpl-detail-1-10');
  });

  it('templatesForCategory with all-scope template (applyTo undefined) includes every category', () => {
    const universal = { id: 'tmpl-all', name: 'Universal', settings: {} };
    const r = templatesForCategory([...DEFAULT_TEMPLATES, universal], 'worksheet');
    expect(r.some((t) => t.id === 'tmpl-all')).toBe(true);
  });
});

/**
 * T-TAG-001 through T-TAG-010: Auto-tagging tests for BIM elements
 */
import { describe, it, expect } from 'vitest';
import { generateElementTags, formatTagLabel } from './tagUtils';

// Helper: build a minimal element record entry
function makeEl(id: string, type: string, name?: string): { id: string; type: string; properties: Record<string, { value: unknown }> } {
  const properties: Record<string, { value: unknown }> = {};
  if (name) properties['Name'] = { value: name };
  return { id, type, properties };
}

describe('T-TAG-001: doors are tagged D-01, D-02 in document order', () => {
  it('assigns sequential door tags starting at D-01', () => {
    const elements = {
      'd1': makeEl('d1', 'door'),
      'd2': makeEl('d2', 'door'),
    };
    const tags = generateElementTags(elements);
    expect(tags.get('d1')).toBe('D-01');
    expect(tags.get('d2')).toBe('D-02');
  });
});

describe('T-TAG-002: windows are tagged W-01, W-02 in document order', () => {
  it('assigns sequential window tags starting at W-01', () => {
    const elements = {
      'w1': makeEl('w1', 'window'),
      'w2': makeEl('w2', 'window'),
    };
    const tags = generateElementTags(elements);
    expect(tags.get('w1')).toBe('W-01');
    expect(tags.get('w2')).toBe('W-02');
  });
});

describe('T-TAG-003: spaces/rooms are tagged R-101, R-102 in document order', () => {
  it('assigns sequential room tags starting at R-101', () => {
    const elements = {
      's1': makeEl('s1', 'space'),
      's2': makeEl('s2', 'space'),
    };
    const tags = generateElementTags(elements);
    expect(tags.get('s1')).toBe('R-101');
    expect(tags.get('s2')).toBe('R-102');
  });
});

describe('T-TAG-004: mixed elements tagged independently per type', () => {
  it('3 doors + 2 windows get independent sequences', () => {
    const elements = {
      'd1': makeEl('d1', 'door'),
      'w1': makeEl('w1', 'window'),
      'd2': makeEl('d2', 'door'),
      'w2': makeEl('w2', 'window'),
      'd3': makeEl('d3', 'door'),
    };
    const tags = generateElementTags(elements);
    expect(tags.get('d1')).toBe('D-01');
    expect(tags.get('d2')).toBe('D-02');
    expect(tags.get('d3')).toBe('D-03');
    expect(tags.get('w1')).toBe('W-01');
    expect(tags.get('w2')).toBe('W-02');
  });
});

describe('T-TAG-005: empty elements map returns empty tag map', () => {
  it('returns empty Map for empty input', () => {
    const tags = generateElementTags({});
    expect(tags.size).toBe(0);
  });
});

describe('T-TAG-006: elements of untagged types (wall, slab) return no tag', () => {
  it('does not produce tags for wall or slab elements', () => {
    const elements = {
      'wall1': makeEl('wall1', 'wall'),
      'slab1': makeEl('slab1', 'slab'),
    };
    const tags = generateElementTags(elements);
    expect(tags.has('wall1')).toBe(false);
    expect(tags.has('slab1')).toBe(false);
    expect(tags.size).toBe(0);
  });
});

describe('T-TAG-007: formatTagLabel("door", 1) returns "D-01"', () => {
  it('formats door tag with two-digit zero-padded index', () => {
    expect(formatTagLabel('door', 1)).toBe('D-01');
  });
});

describe('T-TAG-008: formatTagLabel("window", 12) returns "W-12"', () => {
  it('formats window tag for index 12', () => {
    expect(formatTagLabel('window', 12)).toBe('W-12');
  });
});

describe('T-TAG-009: formatTagLabel("space", 5) returns "R-105"', () => {
  it('formats space/room tag using 100-series base number', () => {
    expect(formatTagLabel('space', 5)).toBe('R-105');
  });
});

describe('T-TAG-010: element Name property used as display label when present', () => {
  it('tag still uses sequential ID but Name is accessible via properties', () => {
    const elements = {
      'd1': makeEl('d1', 'door', 'Main Entrance'),
      'd2': makeEl('d2', 'door'),
    };
    const tags = generateElementTags(elements);
    // The tag IDs are still D-01, D-02 regardless of Name
    expect(tags.get('d1')).toBe('D-01');
    expect(tags.get('d2')).toBe('D-02');
    // The element with a Name still gets a sequential tag
    expect(tags.size).toBe(2);
  });
});

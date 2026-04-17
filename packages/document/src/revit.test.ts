/**
 * Revit Import Tests
 * T-IO-008: Revit RVT import produces valid document
 */
import { describe, it, expect } from 'vitest';
import { parseRVT } from './revit';

const MINIMAL_RVT = `
<RevitModel>
  <Element Id="e001" Category="Walls" Width="200" Height="3000" />
  <Element Id="e002" Category="Doors" Width="900" Height="2100" />
  <Element Id="e003" Category="Windows" Width="1200" Height="1000" />
  <Level Id="l001" Name="Level 1" Elevation="0" />
  <Level Id="l002" Name="Level 2" Elevation="3000" />
  <Family Id="f001" Name="Basic Wall" Category="Walls" />
  <Phase Id="p001" Name="New Construction" />
</RevitModel>
`;

const EMPTY_RVT = '<RevitModel></RevitModel>';

describe('T-IO-008: parseRVT', () => {
  it('returns a DocumentSchema', () => {
    const doc = parseRVT(MINIMAL_RVT);
    expect(doc).toBeDefined();
    expect(doc.id).toBeTruthy();
  });

  it('parses levels from the file', () => {
    const doc = parseRVT(MINIMAL_RVT);
    const levels = Object.values(doc.organization.levels);
    expect(levels).toHaveLength(2);
  });

  it('level names are preserved', () => {
    const doc = parseRVT(MINIMAL_RVT);
    const levelNames = Object.values(doc.organization.levels).map((l) => l.name);
    expect(levelNames).toContain('Level 1');
    expect(levelNames).toContain('Level 2');
  });

  it('level elevations are set correctly', () => {
    const doc = parseRVT(MINIMAL_RVT);
    const levels = Object.values(doc.organization.levels);
    const level1 = levels.find((l) => l.name === 'Level 1');
    expect(level1?.elevation).toBe(0);
  });

  it('parses elements from the file', () => {
    const doc = parseRVT(MINIMAL_RVT);
    expect(Object.keys(doc.content.elements).length).toBeGreaterThan(0);
  });

  it('maps Walls category to wall element type', () => {
    const doc = parseRVT(MINIMAL_RVT);
    const elements = Object.values(doc.content.elements);
    const walls = elements.filter((e) => e.type === 'wall');
    expect(walls.length).toBeGreaterThan(0);
  });

  it('maps Doors category to door element type', () => {
    const doc = parseRVT(MINIMAL_RVT);
    const elements = Object.values(doc.content.elements);
    const doors = elements.filter((e) => e.type === 'door');
    expect(doors.length).toBeGreaterThan(0);
  });

  it('maps Windows category to window element type', () => {
    const doc = parseRVT(MINIMAL_RVT);
    const elements = Object.values(doc.content.elements);
    const windows = elements.filter((e) => e.type === 'window');
    expect(windows.length).toBeGreaterThan(0);
  });

  it('parses families', () => {
    const doc = parseRVT(MINIMAL_RVT);
    const families = Object.values(doc.library.families ?? {});
    expect(families).toHaveLength(1);
    expect(families[0].name).toBe('Basic Wall');
  });

  it('parses phases', () => {
    const doc = parseRVT(MINIMAL_RVT);
    const phases = Object.values(doc.organization.phases ?? {});
    expect(phases).toHaveLength(1);
    expect(phases[0].name).toBe('New Construction');
  });

  it('produces valid document from empty RVT', () => {
    const doc = parseRVT(EMPTY_RVT);
    expect(doc).toBeDefined();
    expect(Object.keys(doc.content.elements)).toHaveLength(0);
  });

  it('includes importReport in metadata', () => {
    const doc = parseRVT(MINIMAL_RVT);
    const meta = doc.metadata as Record<string, unknown>;
    expect(meta.importReport).toBeDefined();
  });

  it('importReport counts correct number of elements', () => {
    const doc = parseRVT(MINIMAL_RVT);
    const report = (doc.metadata as { importReport: { elements: number } }).importReport;
    expect(report.elements).toBe(3);
  });
});

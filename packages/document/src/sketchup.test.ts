/**
 * TDD Tests for SketchUp SKP Import/Export
 *
 * Test IDs: T-SKP-001 through T-SKP-004
 */

import { describe, it, expect } from 'vitest';
import { parseSKP, serializeSKP } from './sketchup';

const SAMPLE_SKP = `<?xml version="1.0" encoding="UTF-8"?>
<SketchUp>
  <Name>My Building Model</Name>
  <Materials>
    <Material Name="Brick" Color="#aa5533" Opacity="1"/>
    <Material Name="Glass" Color="#aaddff" Opacity="0.5"/>
    <Material Name="Concrete" Color="#888888" Opacity="1"/>
  </Materials>
  <Entities>
    <Wall Id="w-001" Name="North Wall" Locked="False"/>
    <Wall Id="w-002" Name="South Wall" Locked="False"/>
    <Slab Id="sl-001" Name="Ground Floor"/>
    <Column Id="c-001" Name="Column A1"/>
    <Component Id="comp-001" Name="Kitchen Cabinet" Definition="cabinet"/>
    <Group Id="grp-001" Name="Furniture Group"/>
  </Entities>
</SketchUp>`;

const SAMPLE_SKP_WITH_LOCKED = `<?xml version="1.0" encoding="UTF-8"?>
<SketchUp>
  <Name>Locked Model</Name>
  <Materials/>
  <Entities>
    <Wall Id="w-locked" Name="Locked Wall" Locked="True"/>
    <Wall Id="w-free" Name="Free Wall" Locked="False"/>
  </Entities>
</SketchUp>`;

describe('T-SKP-001: Import SKP → verify geometry renders', () => {
  it('parseSKP returns a DocumentSchema', () => {
    const doc = parseSKP(SAMPLE_SKP);
    expect(doc).toBeDefined();
    expect(doc.content.elements).toBeDefined();
  });

  it('elements have geometry fields', () => {
    const doc = parseSKP(SAMPLE_SKP);
    const elements = Object.values(doc.content.elements);
    expect(elements.length).toBeGreaterThan(0);
    for (const el of elements) {
      expect(el.geometry).toBeDefined();
      expect(el.boundingBox).toBeDefined();
    }
  });

  it('wall entities are parsed as wall type', () => {
    const doc = parseSKP(SAMPLE_SKP);
    const walls = Object.values(doc.content.elements).filter((e) => e.type === 'wall');
    expect(walls.length).toBe(2);
  });

  it('slab entity is parsed as slab type', () => {
    const doc = parseSKP(SAMPLE_SKP);
    const slabs = Object.values(doc.content.elements).filter((e) => e.type === 'slab');
    expect(slabs.length).toBe(1);
  });

  it('project name is imported', () => {
    const doc = parseSKP(SAMPLE_SKP);
    expect(doc.name).toBe('My Building Model');
  });
});

describe('T-SKP-002: Import SKP → verify materials/colors preserved', () => {
  it('materials are imported from SKP', () => {
    const doc = parseSKP(SAMPLE_SKP);
    const mats = Object.values(doc.library.materials ?? {});
    expect(mats.length).toBe(3);
  });

  it('material names are preserved', () => {
    const doc = parseSKP(SAMPLE_SKP);
    const matNames = Object.values(doc.library.materials ?? {}).map((m) => m.name);
    expect(matNames).toContain('Brick');
    expect(matNames).toContain('Glass');
    expect(matNames).toContain('Concrete');
  });

  it('material colors are parsed from hex', () => {
    const doc = parseSKP(SAMPLE_SKP);
    const brick = Object.values(doc.library.materials ?? {}).find((m) => m.name === 'Brick');
    expect(brick).toBeDefined();
    const color = (brick!.properties as { color?: { r: number; g: number; b: number } }).color;
    expect(color).toBeDefined();
    // #aa5533 → r=170, g=85, b=51
    expect(color!.r).toBe(170);
    expect(color!.g).toBe(85);
    expect(color!.b).toBe(51);
  });

  it('material opacity is preserved', () => {
    const doc = parseSKP(SAMPLE_SKP);
    const glass = Object.values(doc.library.materials ?? {}).find((m) => m.name === 'Glass');
    expect(glass).toBeDefined();
    const transparency = (glass!.properties as { transparency?: number }).transparency;
    expect(transparency).toBe(0.5);
  });
});

describe('T-SKP-003: Import SKP → verify components converted to OpenCAD elements', () => {
  it('Component entities are mapped to component type', () => {
    const doc = parseSKP(SAMPLE_SKP);
    const comps = Object.values(doc.content.elements).filter((e) => e.type === 'component');
    expect(comps.length).toBeGreaterThan(0);
  });

  it('Group entities are mapped to group type', () => {
    const doc = parseSKP(SAMPLE_SKP);
    const groups = Object.values(doc.content.elements).filter((e) => e.type === 'group');
    expect(groups.length).toBeGreaterThan(0);
  });

  it('element names are preserved from SKP', () => {
    const doc = parseSKP(SAMPLE_SKP);
    const names = Object.values(doc.content.elements).map(
      (e) => (e.properties['Name'] as { value: string })?.value
    );
    expect(names).toContain('North Wall');
    expect(names).toContain('Column A1');
  });

  it('locked status is preserved', () => {
    const doc = parseSKP(SAMPLE_SKP_WITH_LOCKED);
    const lockedWall = Object.values(doc.content.elements).find(
      (e) => (e.properties['Name'] as { value: string })?.value === 'Locked Wall'
    );
    const freeWall = Object.values(doc.content.elements).find(
      (e) => (e.properties['Name'] as { value: string })?.value === 'Free Wall'
    );
    expect(lockedWall?.locked).toBe(true);
    expect(freeWall?.locked).toBe(false);
  });

  it('import report is generated', () => {
    const doc = parseSKP(SAMPLE_SKP);
    const meta = doc.metadata as { importReport?: { elements: number; warnings: number } };
    expect(meta.importReport).toBeDefined();
    expect(meta.importReport!.elements).toBeGreaterThan(0);
  });
});

describe('T-SKP-004: Export SKP → verify opens correctly in SketchUp', () => {
  it('serializeSKP returns a string', () => {
    const doc = parseSKP(SAMPLE_SKP);
    const output = serializeSKP(doc);
    expect(typeof output).toBe('string');
  });

  it('output starts with XML declaration', () => {
    const doc = parseSKP(SAMPLE_SKP);
    const output = serializeSKP(doc);
    expect(output).toContain('<?xml version="1.0"');
  });

  it('output contains SketchUp root element', () => {
    const doc = parseSKP(SAMPLE_SKP);
    const output = serializeSKP(doc);
    expect(output).toContain('<SketchUp>');
    expect(output).toContain('</SketchUp>');
  });

  it('output includes document name', () => {
    const doc = parseSKP(SAMPLE_SKP);
    const output = serializeSKP(doc);
    expect(output).toContain('My Building Model');
  });

  it('output includes Materials section', () => {
    const doc = parseSKP(SAMPLE_SKP);
    const output = serializeSKP(doc);
    expect(output).toContain('<Materials>');
    expect(output).toContain('</Materials>');
  });

  it('output includes Entities section', () => {
    const doc = parseSKP(SAMPLE_SKP);
    const output = serializeSKP(doc);
    expect(output).toContain('<Entities>');
    expect(output).toContain('</Entities>');
  });

  it('round-trip preserves element count', () => {
    const doc = parseSKP(SAMPLE_SKP);
    const originalCount = Object.keys(doc.content.elements).length;
    const exported = serializeSKP(doc);
    const reimported = parseSKP(exported);
    expect(Object.keys(reimported.content.elements).length).toBe(originalCount);
  });
});

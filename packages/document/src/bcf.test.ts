/**
 * BCF and COBie Export Tests
 * T-IO-007: BCF issue roundtrip
 * T-IO-008: COBie spreadsheet export
 */

import { describe, it, expect } from 'vitest';
import {
  createBCFTopic,
  addBCFComment,
  serializeBCF,
  parseBCF,
  documentToBCF,
  documentToCOBie,
  serializeCOBieCSV,
  type BCFFile,
  type BCFTopic,
} from './bcf';
import { createProject } from './document';

// ─── T-IO-007: BCF ────────────────────────────────────────────────────────────

describe('T-IO-007: BCF issue roundtrip', () => {
  it('should create a BCF topic with required fields', () => {
    const topic = createBCFTopic({
      title: 'Wall clash with duct',
      author: 'user@opencad.io',
      description: 'The HVAC duct at Grid B-3 clashes with the concrete wall.',
    });
    expect(topic.guid).toBeDefined();
    expect(topic.title).toBe('Wall clash with duct');
    expect(topic.topic_type).toBe('Issue');
    expect(topic.topic_status).toBe('Open');
    expect(topic.creation_author).toBe('user@opencad.io');
    expect(topic.comments).toHaveLength(0);
    expect(topic.viewpoints).toHaveLength(0);
  });

  it('should create topic with custom type and status', () => {
    const topic = createBCFTopic({
      title: 'Missing door schedule',
      author: 'pm@opencad.io',
      type: 'Request',
      status: 'In Progress',
      priority: 'High',
    });
    expect(topic.topic_type).toBe('Request');
    expect(topic.topic_status).toBe('In Progress');
    expect(topic.priority).toBe('High');
  });

  it('should add a comment to a topic', () => {
    const topic = createBCFTopic({ title: 'Issue 1', author: 'a@opencad.io' });
    const withComment = addBCFComment(topic, 'Please review this clash', 'reviewer@opencad.io');
    expect(withComment.comments).toHaveLength(1);
    expect(withComment.comments[0].comment).toBe('Please review this clash');
    expect(withComment.comments[0].author).toBe('reviewer@opencad.io');
    expect(withComment.comments[0].guid).toBeDefined();
  });

  it('should add multiple comments immutably', () => {
    let topic = createBCFTopic({ title: 'Issue 2', author: 'a@opencad.io' });
    topic = addBCFComment(topic, 'First comment', 'a@opencad.io');
    topic = addBCFComment(topic, 'Second comment', 'b@opencad.io');
    expect(topic.comments).toHaveLength(2);
    expect(topic.comments[1].comment).toBe('Second comment');
  });

  it('should serialize and parse BCF file roundtrip', () => {
    const topic = createBCFTopic({ title: 'Clash issue', author: 'a@opencad.io', description: 'desc' });
    const bcfFile: BCFFile = {
      version: '3.0',
      project: { project_id: 'proj-001', project_name: 'Test Project' },
      topics: [topic],
    };
    const json = serializeBCF(bcfFile);
    const parsed = parseBCF(json);

    expect(parsed.version).toBe('3.0');
    expect(parsed.project?.project_id).toBe('proj-001');
    expect(parsed.topics).toHaveLength(1);
    expect(parsed.topics[0].title).toBe('Clash issue');
    expect(parsed.topics[0].guid).toBe(topic.guid);
  });

  it('should serialize topic comments', () => {
    let topic = createBCFTopic({ title: 'With comment', author: 'a@opencad.io' });
    topic = addBCFComment(topic, 'Comment text', 'reviewer@opencad.io');

    const bcfFile: BCFFile = { version: '3.0', topics: [topic] };
    const json = serializeBCF(bcfFile);
    const parsed = parseBCF(json);

    expect(parsed.topics[0].comments).toHaveLength(1);
    expect(parsed.topics[0].comments[0].comment).toBe('Comment text');
  });

  it('should roundtrip multiple topics', () => {
    const topics: BCFTopic[] = [
      createBCFTopic({ title: 'Topic 1', author: 'a@opencad.io', type: 'Issue' }),
      createBCFTopic({ title: 'Topic 2', author: 'b@opencad.io', type: 'Request', status: 'Resolved' }),
      createBCFTopic({ title: 'Topic 3', author: 'c@opencad.io', priority: 'Critical' }),
    ];
    const bcfFile: BCFFile = { version: '3.0', topics };
    const parsed = parseBCF(serializeBCF(bcfFile));

    expect(parsed.topics).toHaveLength(3);
    expect(parsed.topics[1].topic_status).toBe('Resolved');
    expect(parsed.topics[2].priority).toBe('Critical');
  });

  it('should create BCF from document annotations', () => {
    const doc = createProject('doc-001', 'user-001');
    doc.presentation.annotations['ann-1'] = {
      type: 'text',
      content: 'This beam is undersized',
      position: { x: 100, y: 200, z: 300, _type: 'Point3D' },
    };

    const bcfFile = documentToBCF(doc, 'engineer@opencad.io');
    expect(bcfFile.project?.project_id).toBe('doc-001');
    expect(bcfFile.topics).toHaveLength(1);
    expect(bcfFile.topics[0].title).toContain('This beam is undersized');
  });

  it('parsed BCF default status is Open when not specified', () => {
    const json = JSON.stringify({
      version: '3.0',
      topics: [{ guid: 'abc', title: 'Test', creation_author: 'a', creation_date: '2025-01-01' }],
    });
    const parsed = parseBCF(json);
    // defaults are filled in
    expect(parsed.topics[0].comments).toEqual([]);
    expect(parsed.topics[0].viewpoints).toEqual([]);
  });
});

// ─── T-IO-008: COBie ──────────────────────────────────────────────────────────

describe('T-IO-008: COBie spreadsheet export', () => {
  it('should export document to COBie spreadsheet', () => {
    const doc = createProject('cobie-test', 'user-001');
    const cobie = documentToCOBie(doc, 'fm@opencad.io');

    expect(cobie.Facilities).toHaveLength(1);
    expect(cobie.Facilities[0].Name).toBe('Untitled Project');
    expect(cobie.Contacts).toHaveLength(1);
    expect(cobie.Floors).toHaveLength(1);
    expect(cobie.Floors[0].Name).toBe('Level 1');
  });

  it('should include spaces from document', () => {
    const doc = createProject('cobie-test', 'user-001');
    doc.content.spaces['space-1'] = {
      id: 'space-1',
      name: 'Office 101',
      boundaries: [],
      area: 25000000,
      volume: 75000000000,
      levelId: 'level-1',
    };

    const cobie = documentToCOBie(doc, 'fm@opencad.io');
    expect(cobie.Spaces).toHaveLength(1);
    expect(cobie.Spaces[0].Name).toBe('Office 101');
    expect(cobie.Spaces[0].GrossArea).toBe(25000000);
  });

  it('should include maintainable element types', () => {
    const doc = createProject('cobie-test', 'user-001');
    const layerId = Object.keys(doc.organization.layers)[0]!;

    // Add a door (maintainable)
    doc.content.elements['door-1'] = {
      id: 'door-1',
      type: 'door',
      properties: {
        Name: { type: 'string', value: 'Door D-101' },
        Width: { type: 'number', value: 900 },
      },
      propertySets: [],
      geometry: { type: 'brep', data: null },
      layerId,
      levelId: null,
      transform: { translation: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      boundingBox: { min: { x: 0, y: 0, z: 0, _type: 'Point3D' }, max: { x: 1, y: 1, z: 1, _type: 'Point3D' } },
      metadata: { id: 'door-1', createdBy: 'user-001', createdAt: 0, updatedAt: 0, version: { clock: {} } },
      visible: true,
      locked: false,
    };

    const cobie = documentToCOBie(doc, 'fm@opencad.io');
    expect(cobie.Components.some((c) => c.Name === 'Door D-101')).toBe(true);
  });

  it('should not include non-maintainable elements as components', () => {
    const doc = createProject('cobie-test', 'user-001');
    const layerId = Object.keys(doc.organization.layers)[0]!;

    // Line element (not maintainable)
    doc.content.elements['line-1'] = {
      id: 'line-1',
      type: 'line',
      properties: { Name: { type: 'string', value: 'Line 1' } },
      propertySets: [],
      geometry: { type: 'brep', data: null },
      layerId,
      levelId: null,
      transform: { translation: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      boundingBox: { min: { x: 0, y: 0, z: 0, _type: 'Point3D' }, max: { x: 1, y: 1, z: 1, _type: 'Point3D' } },
      metadata: { id: 'line-1', createdBy: 'user-001', createdAt: 0, updatedAt: 0, version: { clock: {} } },
      visible: true,
      locked: false,
    };

    const cobie = documentToCOBie(doc, 'fm@opencad.io');
    expect(cobie.Components.some((c) => c.Name === 'Line 1')).toBe(false);
  });

  it('should serialize COBie to CSV format', () => {
    const doc = createProject('cobie-test', 'user-001');
    const cobie = documentToCOBie(doc, 'fm@opencad.io');
    const csv = serializeCOBieCSV(cobie);

    expect(csv['Facilities']).toBeDefined();
    expect(csv['Facilities']).toContain('Untitled Project');
    expect(csv['Floors']).toBeDefined();
    expect(csv['Floors']).toContain('Level 1');
  });

  it('COBie has correct facility units', () => {
    const doc = createProject('cobie-test', 'user-001');
    const cobie = documentToCOBie(doc, 'fm@opencad.io');
    expect(cobie.Facilities[0].LinearUnits).toBe('millimeters');
    expect(cobie.Facilities[0].AreaUnits).toBe('square meters');
  });

  it('element types become COBie types', () => {
    const doc = createProject('cobie-test', 'user-001');
    const layerId = Object.keys(doc.organization.layers)[0]!;
    doc.content.elements['w1'] = {
      id: 'w1', type: 'wall', properties: {}, propertySets: [],
      geometry: { type: 'brep', data: null }, layerId, levelId: null,
      transform: { translation: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      boundingBox: { min: { x: 0, y: 0, z: 0, _type: 'Point3D' }, max: { x: 1, y: 1, z: 1, _type: 'Point3D' } },
      metadata: { id: 'w1', createdBy: 'u', createdAt: 0, updatedAt: 0, version: { clock: {} } },
      visible: true, locked: false,
    };
    const cobie = documentToCOBie(doc, 'fm@opencad.io');
    expect(cobie.Types.some((t) => t.Name === 'wall')).toBe(true);
  });
});

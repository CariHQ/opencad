/**
 * E2E Test: Document Model
 *
 * Tests the document model functionality in the browser environment.
 * Tests from PRD: T-DOC-001 through T-DOC-006
 */

import { test, expect } from '@playwright/test';
import { DocumentModel, createProject } from '@opencad/document';

test.describe('Document Model E2E Tests', () => {
  test.describe('T-DOC-001: Create project → verify document model initialized with correct schema', () => {
    test('should create a document with correct schema structure', async ({ page }) => {
      await page.goto('/');

      const projectName = await page
        .locator('.project-info p strong:has-text("Name:") + *')
        .textContent();
      expect(projectName).toBe('My First Project');

      const schemaVersion = await page.locator('.project-info p:has-text("Schema:")').textContent();
      expect(schemaVersion).toContain('1.0.0');
    });

    test('should create a default layer named "Layer 1"', async ({ page }) => {
      await page.goto('/');

      const layers = await page.locator('.layers-section .item').count();
      expect(layers).toBeGreaterThanOrEqual(1);

      const firstLayer = await page.locator('.layers-section .item').first().textContent();
      expect(firstLayer).toContain('Layer 1');
    });

    test('should create a default level with elevation 0', async ({ page }) => {
      await page.goto('/');

      const levels = await page.locator('.levels-section .item').count();
      expect(levels).toBe(1);

      const firstLevel = await page.locator('.levels-section .item').first().textContent();
      expect(firstLevel).toContain('Level 1');
      expect(firstLevel).toContain('Elevation: 0mm');
    });
  });

  test.describe('T-DOC-002: Auto-save functionality', () => {
    test('should save data when layer is added', async ({ page }) => {
      await page.goto('/');

      const initialLayers = await page.locator('.layers-section .item').count();

      await page.click('.layers-section button.add-btn');

      const newLayers = await page.locator('.layers-section .item').count();
      expect(newLayers).toBe(initialLayers + 1);
    });

    test('should save data when element is added', async ({ page }) => {
      await page.goto('/');

      const initialElements = await page.locator('.elements-section .item').count();

      await page.click('.elements-section button.add-btn');

      const newElements = await page.locator('.elements-section .item').count();
      expect(newElements).toBe(initialElements + 1);
    });
  });

  test.describe('T-DOC-004: Import IFC', () => {
    test('should parse IFC entities into elements', async () => {
      const ifcData = `
        ISO-10303-21;
        HEADER;
        ENDSEC;
        DATA;
        #1=IFCWALL('wall1',$,'Wall 1',$,$,$,$,$,$);
        #2=IFCDOOR('door1',$,'Door 1',$,$,$,$,$,$);
        ENDSEC;
        END-ISO-10303-21;
      `;

      const model = DocumentModel.fromIFC(ifcData);
      const elements = Object.values(model.document.elements);

      expect(elements.length).toBeGreaterThanOrEqual(2);
    });

    test('should map IFC types to OpenCAD element types', async () => {
      const ifcData = `
        ISO-10303-21;
        HEADER;
        ENDSEC;
        DATA;
        #1=IFCWALL('wall1',$,'Wall 1',$,$,$,$,$,$);
        #2=IFCDOOR('door1',$,'Door 1',$,$,$,$,$,$);
        #3=IFCSLAB('slab1',$,'Slab 1',$,$,$,$,$,$);
        ENDSEC;
        END-ISO-10303-21;
      `;

      const model = DocumentModel.fromIFC(ifcData);
      const elements = Object.values(model.document.elements);

      const wall = elements.find((e) => e.type === 'wall');
      const door = elements.find((e) => e.type === 'door');
      const slab = elements.find((e) => e.type === 'slab');

      expect(wall).toBeDefined();
      expect(door).toBeDefined();
      expect(slab).toBeDefined();
    });
  });

  test.describe('T-DOC-005: Export IFC', () => {
    test('should export to valid IFC format', async () => {
      const project = createProject('test-export', 'user');
      const layerId = Object.keys(project.layers)[0];

      project.elements['test-wall'] = {
        id: 'test-wall',
        type: 'wall',
        properties: {
          Name: { type: 'string', value: 'Test Wall' },
          Length: { type: 'number', value: 5000, unit: 'mm' },
        },
        propertySets: [],
        geometry: { type: 'brep', data: null },
        layerId: layerId,
        levelId: null,
        transform: {
          translation: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        boundingBox: {
          min: { x: 0, y: 0, z: 0, _type: 'Point3D' },
          max: { x: 5000, y: 200, z: 3000, _type: 'Point3D' },
        },
        metadata: {
          id: 'test-wall',
          createdBy: 'user',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: { clock: {} },
        },
        visible: true,
        locked: false,
      };

      const ifcString = DocumentModel.toIFC(project);

      expect(ifcString).toContain('ISO-10303-21');
      expect(ifcString).toContain('IFCWALL');
      expect(ifcString).toContain('Test Wall');
    });

    test('should include required IFC header', async () => {
      const project = createProject('test', 'user');
      const ifcString = DocumentModel.toIFC(project);

      expect(ifcString).toContain('HEADER');
      expect(ifcString).toContain('FILE_DESCRIPTION');
      expect(ifcString).toContain('FILE_NAME');
      expect(ifcString).toContain('FILE_SCHEMA');
    });
  });

  test.describe('T-DOC-006: Version history', () => {
    test('should create versions with incrementing version numbers', async () => {
      const model = new DocumentModel('test-versioning', 'user');

      model.addLayer({ name: 'V1', color: '#000000' });
      const v1 = model.createVersion('Version 1');

      model.addLayer({ name: 'V2', color: '#111111' });
      const v2 = model.createVersion('Version 2');

      model.addLayer({ name: 'V3', color: '#222222' });
      model.createVersion('Version 3');

      expect(v1.version).toBe(1);
      expect(v2.version).toBe(2);
    });

    test('should restore version correctly', async () => {
      const model = new DocumentModel('test-restore', 'user');

      model.addLayer({ name: 'V1-Layer', color: '#111111' });
      model.createVersion('Version 1');

      model.addLayer({ name: 'V2-Layer', color: '#222222' });
      const v2 = model.createVersion('Version 2');

      model.addLayer({ name: 'V3-Layer', color: '#333333' });
      model.createVersion('Version 3');

      model.restoreVersion(2);

      const currentLayers = Object.values(model.document.layers).map((l) => l.name);

      expect(currentLayers).toContain('V1-Layer');
      expect(currentLayers).toContain('V2-Layer');
      expect(currentLayers).not.toContain('V3-Layer');
    });
  });
});

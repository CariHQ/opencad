/**
 * TDD Tests for Document Model
 *
 * These tests follow the TDD workflow from the PRD:
 * 1. Write failing test (Red)
 * 2. Write minimal code to pass (Green)
 * 3. Refactor
 *
 * Test IDs from PRD: T-DOC-001 through T-DOC-006
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DocumentModel,
  createProject,
  type DocumentSchema,
  type LayerSchema,
  type LevelSchema,
  type ElementSchema,
  type Point3D,
} from './index';

describe('Document Model - TDD Tests', () => {
  describe('T-DOC-001: Create project → verify document model initialized with correct schema', () => {
    it('should create a document with correct schema structure', () => {
      const projectId = 'test-project-001';
      const userId = 'user-001';
      const project = createProject(projectId, userId);

      expect(project).toBeDefined();
      expect(project.id).toBe(projectId);
      expect(project.name).toBe('Untitled Project');
      expect(project.version).toEqual({ clock: {} });
      expect(project.elements).toEqual({});
      expect(project.layers).toBeDefined();
      expect(project.levels).toBeDefined();
      expect(project.views).toEqual({});
      expect(project.materials).toBeDefined();
      expect(project.spaces).toEqual({});
      expect(project.annotations).toEqual({});
      expect(project.metadata.schemaVersion).toBe('1.0.0');
    });

    it('should create a default layer named "Layer 1"', () => {
      const project = createProject('test', 'user');
      const layerIds = Object.keys(project.layers);

      expect(layerIds.length).toBe(1);
      const defaultLayer = project.layers[layerIds[0]];
      expect(defaultLayer.name).toBe('Layer 1');
      expect(defaultLayer.visible).toBe(true);
      expect(defaultLayer.locked).toBe(false);
    });

    it('should create a default level named "Level 1" with elevation 0', () => {
      const project = createProject('test', 'user');
      const levelIds = Object.keys(project.levels);

      expect(levelIds.length).toBe(1);
      const defaultLevel = project.levels[levelIds[0]];
      expect(defaultLevel.name).toBe('Level 1');
      expect(defaultLevel.elevation).toBe(0);
      expect(defaultLevel.height).toBe(3000); // 3m default height
    });

    it('should create default material library', () => {
      const project = createProject('test', 'user');
      const materialIds = Object.keys(project.materials);

      expect(materialIds.length).toBeGreaterThan(0);
      expect(project.materials[materialIds[0]]).toBeDefined();
    });
  });

  describe('T-DOC-002: Auto-save → verify data persisted to storage within 2s of edit', () => {
    it('should emit save event when data changes', () => {
      vi.useFakeTimers();
      const saveHandler = vi.fn();
      const model = new DocumentModel('test', 'user');
      model.onSave(saveHandler);

      model.addLayer({ name: 'New Layer', color: '#000000' });
      vi.advanceTimersByTime(2500); // Wait for debounce

      expect(saveHandler).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should include changed data in save event', () => {
      vi.useFakeTimers();
      let savedData: unknown = null;
      const model = new DocumentModel('test', 'user');
      model.onSave((data) => {
        savedData = data;
      });

      const layerId = model.addLayer({ name: 'Test Layer', color: '#FF0000' });
      vi.advanceTimersByTime(2500); // Wait for debounce

      expect(savedData).toBeDefined();
      const data = savedData as { layers: Record<string, LayerSchema> };
      expect(data.layers[layerId]).toBeDefined();
      expect(data.layers[layerId].name).toBe('Test Layer');
      vi.useRealTimers();
    });

    it('should batch multiple rapid changes into single save', () => {
      vi.useFakeTimers();
      const saveHandler = vi.fn();
      const model = new DocumentModel('test', 'user');
      model.onSave(saveHandler);

      model.addLayer({ name: 'Layer 1', color: '#000000' });
      model.addLayer({ name: 'Layer 2', color: '#111111' });
      model.addLayer({ name: 'Layer 3', color: '#222222' });

      vi.advanceTimersByTime(1900); // Just under 2 seconds
      expect(saveHandler).not.toHaveBeenCalled();

      vi.advanceTimersByTime(200); // Trigger debounce
      expect(saveHandler).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  describe('T-DOC-003: Offline edit → verify sync completes on reconnect', () => {
    it('should queue operations when offline', () => {
      const model = new DocumentModel('test', 'user');
      model.setOnlineStatus(false);

      const layerId = model.addLayer({ name: 'Offline Layer', color: '#333333' });

      expect(model.getPendingOperations().length).toBe(1);
      expect(model.getPendingOperations()[0].entityId).toBe(layerId);
    });

    it('should process queued operations when back online', () => {
      const model = new DocumentModel('test', 'user');
      model.setOnlineStatus(false);

      const layerId = model.addLayer({ name: 'Offline Layer', color: '#333333' });

      model.setOnlineStatus(true);

      expect(model.getPendingOperations().length).toBe(0);
    });

    it('should emit sync completed event when operations processed', () => {
      const syncHandler = vi.fn();
      const model = new DocumentModel('test', 'user');
      model.onSyncComplete(syncHandler);
      model.setOnlineStatus(false);

      model.addLayer({ name: 'Test', color: '#000000' });

      model.setOnlineStatus(true);

      expect(syncHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          operationsProcessed: 1,
          success: true,
        })
      );
    });
  });

  describe('T-DOC-004: Import IFC → verify model renders with correct hierarchy', () => {
    it('should parse IFC entities into elements', () => {
      const ifcData = `
        ISO-10303-21;
        HEADER;
        ENDSEC;
        DATA;
        #1=IFCWALL('abc',$,'Wall 1',$,$,$,$,$,$);
        #2=IFCDOOR('def',$,'Door 1',$,$,$,$,$,$);
        ENDSEC;
        END-ISO-10303-21;
      `;

      const model = DocumentModel.fromIFC(ifcData);
      const elements = Object.values(model.document.elements);

      expect(elements.length).toBeGreaterThanOrEqual(2);
    });

    it('should preserve IFC entity hierarchy', () => {
      const ifcData = `
        ISO-10303-21;
        HEADER;
        ENDSEC;
        DATA;
        #1=IFCBUILDINGSTOREY('floor1',$,'Floor 1',$,$,#10,$);
        #2=IFCWALL('wall1',$,'Wall 1',$,$,#1,$,$);
        #3=IFCDOOR('door1',$,'Door 1',$,$,#2,$,$);
        ENDSEC;
        END-ISO-10303-21;
      `;

      const model = DocumentModel.fromIFC(ifcData);
      const wall = model.getElementByName('Wall 1');
      const door = model.getElementByName('Door 1');

      expect(wall).toBeDefined();
      expect(door).toBeDefined();
      expect(door?.levelId).toBe(wall?.levelId);
    });

    it('should map IFC types to OpenCAD element types', () => {
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

  describe('T-DOC-005: Export IFC → verify exported file validates against IFC schema', () => {
    it('should export to valid IFC format', () => {
      const project = createProject('test', 'user');
      const layerId = Object.keys(project.layers)[0];

      project.elements[layerId + '-el'] = {
        id: layerId + '-el',
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
          min: { x: 0, y: 0, z: 0, _type: 'Point3D' as const },
          max: { x: 5000, y: 200, z: 3000, _type: 'Point3D' as const },
        },
        metadata: {
          id: layerId + '-el',
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

    it('should include required IFC header', () => {
      const project = createProject('test', 'user');
      const ifcString = DocumentModel.toIFC(project);

      expect(ifcString).toContain('HEADER');
      expect(ifcString).toContain('FILE_DESCRIPTION');
      expect(ifcString).toContain('FILE_NAME');
      expect(ifcString).toContain('FILE_SCHEMA');
    });

    it('should export element properties as IFC attributes', () => {
      const project = createProject('test', 'user');
      const layerId = Object.keys(project.layers)[0];
      const wallId = crypto.randomUUID();
      const now = Date.now();

      project.elements[wallId] = {
        id: wallId,
        type: 'wall',
        properties: {
          Name: { type: 'string', value: 'Exterior Wall' },
          Height: { type: 'number', value: 3000, unit: 'mm' },
          Thickness: { type: 'number', value: 200, unit: 'mm' },
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
          min: { x: 0, y: 0, z: 0, _type: 'Point3D' as const },
          max: { x: 5000, y: 200, z: 3000, _type: 'Point3D' as const },
        },
        metadata: {
          id: wallId,
          createdBy: 'user',
          createdAt: now,
          updatedAt: now,
          version: { clock: {} },
        },
        visible: true,
        locked: false,
      };

      const ifcString = DocumentModel.toIFC(project);

      expect(ifcString).toContain('Exterior Wall');
      expect(ifcString).toContain('IFCWALLSTANDARDCASE');
    });
  });

  describe('T-DOC-006: Version history → create 5 versions → restore version 2 → verify state', () => {
    it('should create versions with incrementing version numbers', () => {
      const model = new DocumentModel('test', 'user');

      model.addLayer({ name: 'V1', color: '#000000' });
      const v1 = model.createVersion('Version 1');

      model.addLayer({ name: 'V2', color: '#111111' });
      const v2 = model.createVersion('Version 2');

      model.addLayer({ name: 'V3', color: '#222222' });
      model.createVersion('Version 3');

      expect(v1.version).toBe(1);
      expect(v2.version).toBe(2);
    });

    it('should store layer changes in versions', () => {
      const model = new DocumentModel('test', 'user');

      const v1 = model.createVersion('Before adding layers');
      model.addLayer({ name: 'Layer A', color: '#AAAAAA' });
      model.createVersion('After Layer A');
      model.addLayer({ name: 'Layer B', color: '#BBBBBB' });
      model.createVersion('After Layer B');

      const version1State = model.getVersion(1);
      const layerCount = Object.keys(version1State.layers).length;

      expect(layerCount).toBe(1); // Only default layer
    });

    it('should restore version 2 correctly', () => {
      const model = new DocumentModel('test', 'user');

      // Create 5 versions
      model.addLayer({ name: 'V1-Layer', color: '#111111' });
      model.createVersion('Version 1');

      model.addLayer({ name: 'V2-Layer', color: '#222222' });
      const v2 = model.createVersion('Version 2');

      model.addLayer({ name: 'V3-Layer', color: '#333333' });
      model.createVersion('Version 3');

      model.addLayer({ name: 'V4-Layer', color: '#444444' });
      model.createVersion('Version 4');

      model.addLayer({ name: 'V5-Layer', color: '#555555' });
      model.createVersion('Version 5');

      // Restore to version 2
      const v2State = model.getVersion(2);
      model.restoreVersion(2);

      // Verify current state matches version 2
      const currentLayers = Object.values(model.document.layers).map((l) => l.name);

      expect(currentLayers).toContain('V1-Layer');
      expect(currentLayers).toContain('V2-Layer');
      expect(currentLayers).not.toContain('V3-Layer');
      expect(currentLayers).not.toContain('V4-Layer');
      expect(currentLayers).not.toContain('V5-Layer');
    });

    it('should not allow restoring to non-existent version', () => {
      const model = new DocumentModel('test', 'user');
      model.createVersion('V1');

      expect(() => model.restoreVersion(999)).toThrow('Version 999 does not exist');
    });
  });
});

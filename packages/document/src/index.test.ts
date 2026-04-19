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

import { describe, it, expect, vi } from 'vitest';
import {
  DocumentModel,
  createProject,
  type LayerSchema,
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
      expect(project.content.elements).toEqual({});
      expect(project.organization.layers).toBeDefined();
      expect(project.organization.levels).toBeDefined();
      expect(project.presentation.views).toEqual({});
      expect(project.library.materials).toBeDefined();
      expect(project.content.spaces).toEqual({});
      expect(project.presentation.annotations).toEqual({});
      expect(project.metadata.schemaVersion).toBe('1.0.0');
    });

    it('should create a default layer named "Layer 1"', () => {
      const project = createProject('test', 'user');
      const layerIds = Object.keys(project.organization.layers);

      expect(layerIds.length).toBe(1);
      const defaultLayer = project.organization.layers[layerIds[0]];
      expect(defaultLayer.name).toBe('Layer 1');
      expect(defaultLayer.visible).toBe(true);
      expect(defaultLayer.locked).toBe(false);
    });

    it('should create a default level named "Level 1" with elevation 0', () => {
      const project = createProject('test', 'user');
      const levelIds = Object.keys(project.organization.levels);

      expect(levelIds.length).toBe(1);
      const defaultLevel = project.organization.levels[levelIds[0]];
      expect(defaultLevel.name).toBe('Level 1');
      expect(defaultLevel.elevation).toBe(0);
      expect(defaultLevel.height).toBe(3000); // 3m default height
    });

    it('should create default material library', () => {
      const project = createProject('test', 'user');
      const materialIds = Object.keys(project.library.materials);

      expect(materialIds.length).toBeGreaterThan(0);
      expect(project.library.materials[materialIds[0]]).toBeDefined();
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
      const data = savedData as { organization: { layers: Record<string, LayerSchema> } };
      expect(data.organization.layers[layerId]).toBeDefined();
      expect(data.organization.layers[layerId].name).toBe('Test Layer');
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

      const _layerId = model.addLayer({ name: 'Offline Layer', color: '#333333' });

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
      const elements = Object.values(model.document.content.elements);

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
      const elements = Object.values(model.document.content.elements);

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
      const layerId = Object.keys(project.organization.layers)[0];

      project.content.elements[layerId + '-el'] = {
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
      const layerId = Object.keys(project.organization.layers)[0];
      const wallId = crypto.randomUUID();
      const now = Date.now();

      project.content.elements[wallId] = {
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

      const _v1 = model.createVersion('Before adding layers');
      model.addLayer({ name: 'Layer A', color: '#AAAAAA' });
      model.createVersion('After Layer A');
      model.addLayer({ name: 'Layer B', color: '#BBBBBB' });
      model.createVersion('After Layer B');

      const version1State = model.getVersion(1);
      const layerCount = Object.keys(version1State.organization.layers).length;

      expect(layerCount).toBe(1); // Only default layer
    });

    it('should restore version 2 correctly', () => {
      const model = new DocumentModel('test', 'user');

      // Create 5 versions
      model.addLayer({ name: 'V1-Layer', color: '#111111' });
      model.createVersion('Version 1');

      model.addLayer({ name: 'V2-Layer', color: '#222222' });
      const _v2 = model.createVersion('Version 2');

      model.addLayer({ name: 'V3-Layer', color: '#333333' });
      model.createVersion('Version 3');

      model.addLayer({ name: 'V4-Layer', color: '#444444' });
      model.createVersion('Version 4');

      model.addLayer({ name: 'V5-Layer', color: '#555555' });
      model.createVersion('Version 5');

      // Restore to version 2
      const _v2State = model.getVersion(2);
      model.restoreVersion(2);

      // Verify current state matches version 2
      const currentLayers = Object.values(model.document.organization.layers).map((l) => l.name);

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

  describe('T-IO: Import/Export Tests', () => {
    describe('T-IO-001: Large File Import Performance', () => {
      it('should track import progress', async () => {
        const mockRead = vi.fn().mockResolvedValue('test data');
        const mockParse = vi.fn().mockReturnValue({ parsed: true });
        const progress: Array<{ phase: string }> = [];

        const { importWithProgress } = await import('./io');
        await importWithProgress(mockRead, mockParse, {
          onProgress: (p) => progress.push(p),
        });

        expect(progress.length).toBeGreaterThan(0);
      });

      it('should reject files exceeding size limit', async () => {
        const mockRead = vi.fn().mockResolvedValue('x'.repeat(1500));
        const mockParse = vi.fn().mockImplementation(() => {
          throw new Error('too large');
        });

        const { importWithProgress } = await import('./io');
        const result = await importWithProgress(mockRead, mockParse, {
          maxFileSize: 1000,
        });

        expect(result.success).toBe(false);
        expect(result.errors.some((e) => e.type === 'size')).toBe(true);
      });
    });

    describe('T-IO-002: Corrupted File Error', () => {
      it('should handle parse errors', async () => {
        const mockRead = vi.fn().mockResolvedValue('invalid');
        const mockParse = vi.fn().mockImplementation(() => {
          throw new Error('Parse error');
        });

        const { importWithProgress } = await import('./io');
        const result = await importWithProgress(mockRead, mockParse);

        expect(result.success).toBe(false);
      });
    });

    describe('T-IO-003: Unsupported Format Error', () => {
      it('should detect supported formats', async () => {
        const { isFormatSupported, SUPPORTED_IMPORT_FORMATS } = await import('./io');

        expect(isFormatSupported('ifc', SUPPORTED_IMPORT_FORMATS)).toBe(true);
        expect(isFormatSupported('opencad', SUPPORTED_IMPORT_FORMATS)).toBe(true);
        expect(isFormatSupported('xyz', SUPPORTED_IMPORT_FORMATS)).toBe(false);
      });

      it('should get file extension', async () => {
        const { getFileExtension } = await import('./io');

        expect(getFileExtension('file.ifc')).toBe('ifc');
        expect(getFileExtension('file.opencad')).toBe('opencad');
      });
    });

    describe('T-IO-004: Batch Import', () => {
      it('should import multiple files', async () => {
        const { batchImportFiles } = await import('./io');

        const files = [
          { name: 'project1.opencad', content: '{"id": "1"}' },
          { name: 'project2.opencad', content: '{"id": "2"}' },
        ];

        const result = await batchImportFiles(files, (content) => JSON.parse(content));

        expect(result.total).toBe(2);
        expect(result.successful).toBe(2);
      });

      it('should track failed files', async () => {
        const { batchImportFiles } = await import('./io');

        const files = [{ name: 'unsupported.xxx', content: 'data' }];

        const result = await batchImportFiles(files, (content) => JSON.parse(content));

        expect(result.failed).toBe(1);
      });
    });

    describe('T-IO-005: Offline Export', () => {
      it('should export to opencad format', async () => {
        const { exportDocument } = await import('./io');

        const doc = { id: 'test', name: 'Test' };
        const result = await exportDocument(doc, { format: 'opencad' });

        expect(result.extension).toBe('opencad');
      });

      it('should throw for unsupported format', async () => {
        const { exportDocument } = await import('./io');

        await expect(exportDocument({}, { format: 'xyz' as never })).rejects.toThrow();
      });
    });

    describe('T-IO-006: Import Privacy', () => {
      it('should validate document structure', async () => {
        const { validateDocumentStructure } = await import('./io');

        const validDoc = {
          id: 'test-1',
          metadata: { createdAt: Date.now(), createdBy: 'user', schemaVersion: '1.0.0' },
          content: { elements: {}, spaces: {} },
          organization: { layers: {}, levels: {} },
          presentation: { views: {}, annotations: {} },
          library: { materials: {} },
        };

        const warnings = validateDocumentStructure(validDoc);

        expect(warnings).toHaveLength(0);
      });

      it('should warn on missing fields', async () => {
        const { validateDocumentStructure } = await import('./io');

        const warnings = validateDocumentStructure({ id: 'test' });

        expect(warnings.length).toBeGreaterThan(0);
      });
    });

    describe('T-DWG: DWG/DXF Import/Export Tests', () => {
      it('T-DWG-001: should parse DXF LINE entities', async () => {
        const { parseDXF } = await import('./dwg');

        const dxfContent = `0
SECTION
2
ENTITIES
0
LINE
5
$12A
330
0
100
AcDbEntity
8
0
100
AcDbLine
10
0.0
20
0.0
30
0.0
11
100.0
21
100.0
31
0.0
0
ENDSEC
0
EOF`;

        const doc = parseDXF(dxfContent);
        const lineEntities = Object.values(doc.content.elements).filter((e) => e.type === 'line');
        expect(lineEntities.length).toBe(1);
      });

      it('T-DWG-001: should parse DXF CIRCLE entities', async () => {
        const { parseDXF } = await import('./dwg');

        const dxfContent = `0
SECTION
2
ENTITIES
0
CIRCLE
5
$12B
330
0
100
AcDbEntity
8
0
100
AcDbCircle
10
50.0
20
50.0
30
0.0
40
25.0
0
ENDSEC
0
EOF`;

        const doc = parseDXF(dxfContent);
        const circleEntities = Object.values(doc.content.elements).filter((e) => e.type === 'circle');
        expect(circleEntities.length).toBe(1);
      });

      it('T-DWG-002: should parse 3D entities', async () => {
        const { parseDXF } = await import('./dwg');

        const dxfContent = `0
SECTION
2
ENTITIES
0
3DFACE
5
$12C
330
0
100
AcDbEntity
8
0
100
AcDbFace
10
0.0
20
0.0
30
0.0
11
100.0
21
0.0
31
0.0
12
100.0
22
100.0
32
0.0
13
0.0
23
100.0
33
0.0
0
ENDSEC
0
EOF`;

        const doc = parseDXF(dxfContent);
        const faceEntities = Object.values(doc.content.elements).filter((e) => e.type === 'surface');
        expect(faceEntities.length).toBe(1);
      });

      it('T-DWG-003: should map layers from DXF', async () => {
        const { parseDXF } = await import('./dwg');

        const dxfContent = `0
SECTION
2
ENTITIES
0
LINE
5
$12A
330
0
100
AcDbEntity
8
WALLS
100
AcDbLine
10
0.0
20
0.0
30
0.0
11
100.0
21
100.0
31
0.0
0
ENDSEC
0
EOF`;

        const doc = parseDXF(dxfContent);
        const layerNames = Object.values(doc.organization.layers).map((l) => l.name);
        expect(layerNames).toContain('WALLS');
      });

      it('T-DWG-004: should parse BLOCK definitions', async () => {
        const { parseDXF } = await import('./dwg');

        const dxfContent = `0
SECTION
2
BLOCKS
0
BLOCK
5
$10A
330
0
100
AcDbEntity
2
DOOR_BLOCK
70
0
10
0.0
20
0.0
30
0.0
3
DOOR_BLOCK
0
ENDBLK
5
$10B
330
0
100
AcDbEntity
70
0
0
BLOCKS
0
ENDSEC
0
ENDSEC
0
EOF`;

        const doc = parseDXF(dxfContent);
        expect(doc.library.blocks).toBeDefined();
      });

      it('T-DWG-005: should serialize document to DXF', async () => {
        const { serializeDXF } = await import('./dwg');
        const { createProject } = await import('./document');

        const doc = createProject('test', 'user');
        const _elementId = Object.keys(doc.content.elements)[0];

        const dxf = serializeDXF(doc);
        expect(dxf).toContain('SECTION');
        expect(dxf).toContain('ENTITIES');
        expect(dxf).toContain('ENDSEC');
      });

      it('T-DWG-006: should parse DXF polyline entities', async () => {
        const { parseDXF } = await import('./dwg');

        const dxfContent = `0
SECTION
2
ENTITIES
0
LWPOLYLINE
5
$12D
330
0
100
AcDbEntity
8
0
100
AcDbPolyline
90
4
70
0
10
0.0
20
0.0
10
10.0
20
0.0
10
10.0
20
10.0
10
0.0
20
10.0
0
ENDSEC
0
EOF`;

        const doc = parseDXF(dxfContent);
        const polylineEntities = Object.values(doc.content.elements).filter((e) => e.type === 'polyline');
        expect(polylineEntities.length).toBe(1);
      });

      it('T-DWG-007: should export polyline to DXF', async () => {
        const { serializeDXF } = await import('./dwg');
        const { createProject, addElement } = await import('./document');

        const doc = createProject('test', 'user');
        const _elementId = addElement(doc, {
          type: 'polyline',
          points: [
            { x: 0, y: 0, z: 0 },
            { x: 10, y: 0, z: 0 },
            { x: 10, y: 10, z: 0 },
          ],
          layerId: Object.keys(doc.organization.layers)[0],
          levelId: Object.keys(doc.organization.levels)[0],
        });

        const dxf = serializeDXF(doc);
        expect(dxf).toContain('LWPOLYLINE');
      });
    });

    describe('T-RVT: Revit Import Tests', () => {
      it('T-RVT-001: should parse Revit categories', async () => {
        const { parseRVT } = await import('./revit');

        const rvtContent = `<?xml version="1.0"?>
<RevitXML>
  <Elements>
    <Element Id="123" Category="Walls" Family="Basic Wall" Type="Generic - 200mm"/>
    <Element Id="124" Category="Doors" Family="Single Flush" Type="0915 x 2134mm"/>
  </Elements>
</RevitXML>`;

        const doc = parseRVT(rvtContent);
        const wallElements = Object.values(doc.content.elements).filter((e) => e.type === 'wall');
        expect(wallElements.length).toBe(1);
      });

      it('T-RVT-002: should map Revit categories to element types', async () => {
        const { parseRVT } = await import('./revit');

        const rvtContent = `<?xml version="1.0"?>
<RevitXML>
  <Elements>
    <Element Id="123" Category="Walls"/>
    <Element Id="124" Category="Doors"/>
    <Element Id="125" Category="Windows"/>
    <Element Id="126" Category="Columns"/>
  </Elements>
</RevitXML>`;

        const doc = parseRVT(rvtContent);
        const elementTypes = [...new Set(Object.values(doc.content.elements).map((e) => e.type))];
        expect(elementTypes).toContain('wall');
        expect(elementTypes).toContain('door');
        expect(elementTypes).toContain('window');
        expect(elementTypes).toContain('column');
      });

      it('T-RVT-003: should parse element parameters', async () => {
        const { parseRVT } = await import('./revit');

        const rvtContent = `<?xml version="1.0"?>
<RevitXML>
  <Elements>
    <Element Id="123" Category="Walls" Width="200" Height="3000"/>
  </Elements>
</RevitXML>`;

        const doc = parseRVT(rvtContent);
        const element = Object.values(doc.content.elements)[0];
        expect(element.properties.Width).toBeDefined();
      });

      it('T-RVT-004: should parse Revit levels', async () => {
        const { parseRVT } = await import('./revit');

        const rvtContent = `<?xml version="1.0"?>
<RevitXML>
  <Levels>
    <Level Id="L1" Name="Level 1" Elevation="0"/>
    <Level Id="L2" Name="Level 2" Elevation="3000"/>
  </Levels>
</RevitXML>`;

        const doc = parseRVT(rvtContent);
        expect(Object.keys(doc.organization.levels).length).toBe(2);
        expect(doc.organization.levels[Object.keys(doc.organization.levels)[0]].elevation).toBeDefined();
      });

      it('T-RVT-005: should parse family definitions', async () => {
        const { parseRVT } = await import('./revit');

        const rvtContent = `<?xml version="1.0"?>
<RevitXML>
  <Families>
    <Family Id="F1" Name="Basic Wall" Category="Walls"/>
    <Family Id="F2" Name="Single Flush" Category="Doors"/>
  </Families>
</RevitXML>`;

        const doc = parseRVT(rvtContent);
        expect(doc.library.families).toBeDefined();
      });

      it('T-RVT-006: should generate import report', async () => {
        const { parseRVT } = await import('./revit');

        const rvtContent = `<?xml version="1.0"?>
<RevitXML>
  <Elements>
    <Element Id="123" Category="Walls"/>
    <Element Id="124" Category="Doors" Status="Error"/>
  </Elements>
</RevitXML>`;

        const doc = parseRVT(rvtContent);
        const metadata = doc.metadata as { importReport?: { elements: number; warnings: number } };
        expect(metadata.importReport).toBeDefined();
      });

      it('T-RVT-007: should handle phases', async () => {
        const { parseRVT } = await import('./revit');

        const rvtContent = `<?xml version="1.0"?>
<RevitXML>
  <Phases>
    <Phase Id="P1" Name="New Construction"/>
    <Phase Id="P2" Name="Existing"/>
  </Phases>
  <Elements>
    <Element Id="123" Category="Walls" Phase="P1"/>
  </Elements>
</RevitXML>`;

        const doc = parseRVT(rvtContent);
        expect(doc.organization.phases).toBeDefined();
      });
    });

    describe('T-DWG: DWG/DXF Import/Export Tests', () => {
      it('T-DWG-001: should parse DXF LINE entities', async () => {
        const { parseDXF, serializeDXF } = await import('./dwg');

        const dxfContent = `0
SECTION
2
ENTITIES
0
LINE
5
$12A
330
0
100
AcDbEntity
8
0
100
AcDbLine
10
0.0
20
0.0
30
0.0
11
100.0
21
100.0
31
0.0
0
ENDSEC
0
EOF`;

        const doc = parseDXF(dxfContent);
        const reExported = serializeDXF(doc);

        expect(reExported).toContain('LINE');
        expect(reExported).toContain('10');
        expect(reExported).toContain('0.0');
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // T-IO-002 / T-IO-003 / T-IO-004 — Export pipeline
  // ──────────────────────────────────────────────────────────────────────────

  describe('T-IO-002: exportToIFC — doc with one wall → contains IFCWALL', () => {
    function makeWallDoc(id: string) {
      const doc = createProject(id, 'user');
      const layerId = Object.keys(doc.organization.layers)[0];
      const levelId = Object.keys(doc.organization.levels)[0];
      const wallId = 'wall-' + id;
      doc.content.elements[wallId] = {
        id: wallId,
        type: 'wall',
        properties: {
          Name: { type: 'string', value: 'Test Wall' },
          StartX: { type: 'number', value: 0 },
          StartY: { type: 'number', value: 0 },
          EndX: { type: 'number', value: 5000 },
          EndY: { type: 'number', value: 0 },
        },
        propertySets: [],
        geometry: { type: 'brep', data: null },
        layerId,
        levelId,
        transform: { translation: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
        boundingBox: {
          min: { x: 0, y: 0, z: 0, _type: 'Point3D' as const },
          max: { x: 5000, y: 200, z: 3000, _type: 'Point3D' as const },
        },
        metadata: {
          id: wallId, createdBy: 'user', createdAt: 0, updatedAt: 0, version: { clock: {} },
        },
        visible: true,
        locked: false,
      };
      return doc;
    }

    it('should produce a string that contains IFCWALL', async () => {
      const { exportToIFC } = await import('./ifc');
      const result = exportToIFC(makeWallDoc('ifc-001'));
      expect(typeof result).toBe('string');
      expect(result).toContain('IFCWALL');
    });

    it('should include ISO-10303-21 header tokens', async () => {
      const { exportToIFC } = await import('./ifc');
      const result = exportToIFC(makeWallDoc('ifc-002'));
      expect(result).toContain('ISO-10303-21');
      expect(result).toContain('FILE_DESCRIPTION');
      expect(result).toContain('FILE_NAME');
      expect(result).toContain('FILE_SCHEMA');
    });

    it('should include IFCBUILDINGSTOREY for each level', async () => {
      const { exportToIFC } = await import('./ifc');
      const doc = createProject('ifc-003', 'user');
      const result = exportToIFC(doc);
      expect(result).toContain('IFCBUILDINGSTOREY');
    });

    it('should include IFCPROJECT and IFCBUILDING', async () => {
      const { exportToIFC } = await import('./ifc');
      const doc = createProject('ifc-004', 'user');
      const result = exportToIFC(doc);
      expect(result).toContain('IFCPROJECT');
      expect(result).toContain('IFCBUILDING');
    });
  });

  describe('T-IO-003: exportToDXF — doc with one wall → contains LINE', () => {
    function makeWallDoc(id: string) {
      const doc = createProject(id, 'user');
      const layerId = Object.keys(doc.organization.layers)[0];
      const levelId = Object.keys(doc.organization.levels)[0];
      const wallId = 'wall-' + id;
      doc.content.elements[wallId] = {
        id: wallId,
        type: 'wall',
        properties: {
          Name: { type: 'string', value: 'DXF Wall' },
          StartX: { type: 'number', value: 0 },
          StartY: { type: 'number', value: 0 },
          EndX: { type: 'number', value: 3000 },
          EndY: { type: 'number', value: 0 },
        },
        propertySets: [],
        geometry: { type: 'brep', data: null },
        layerId,
        levelId,
        transform: { translation: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
        boundingBox: {
          min: { x: 0, y: 0, z: 0, _type: 'Point3D' as const },
          max: { x: 3000, y: 200, z: 3000, _type: 'Point3D' as const },
        },
        metadata: {
          id: wallId, createdBy: 'user', createdAt: 0, updatedAt: 0, version: { clock: {} },
        },
        visible: true,
        locked: false,
      };
      return doc;
    }

    it('should produce a string that contains LINE', async () => {
      const { exportToDXF } = await import('./dwg');
      const result = exportToDXF(makeWallDoc('dxf-001'));
      expect(typeof result).toBe('string');
      expect(result).toContain('LINE');
    });

    it('should include DXF HEADER and ENTITIES sections', async () => {
      const { exportToDXF } = await import('./dwg');
      const result = exportToDXF(makeWallDoc('dxf-002'));
      expect(result).toContain('HEADER');
      expect(result).toContain('ENTITIES');
      expect(result).toContain('ENDSEC');
    });

    it('should emit CIRCLE for column elements', async () => {
      const { exportToDXF } = await import('./dwg');
      const doc = createProject('dxf-003', 'user');
      const layerId = Object.keys(doc.organization.layers)[0];
      const levelId = Object.keys(doc.organization.levels)[0];
      const colId = 'col-001';
      doc.content.elements[colId] = {
        id: colId,
        type: 'column',
        properties: { CenterX: { type: 'number', value: 1000 }, CenterY: { type: 'number', value: 1000 }, Radius: { type: 'number', value: 150 } },
        propertySets: [],
        geometry: { type: 'brep', data: null },
        layerId,
        levelId,
        transform: { translation: { x: 1000, y: 1000, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
        boundingBox: {
          min: { x: 850, y: 850, z: 0, _type: 'Point3D' as const },
          max: { x: 1150, y: 1150, z: 3000, _type: 'Point3D' as const },
        },
        metadata: { id: colId, createdBy: 'user', createdAt: 0, updatedAt: 0, version: { clock: {} } },
        visible: true,
        locked: false,
      };
      const result = exportToDXF(doc);
      expect(result).toContain('CIRCLE');
    });
  });

  describe('T-IO-004: exportToPDFDataURL → returns data:application/pdf;base64,...', () => {
    it('should return a string starting with data:application/pdf', async () => {
      const { exportToPDFDataURL } = await import('./pdf');
      const doc = createProject('pdf-001', 'user');
      const result = exportToPDFDataURL(doc);
      expect(typeof result).toBe('string');
      expect(result.startsWith('data:application/pdf;base64,')).toBe(true);
    });

    it('should contain valid base64 after the header', async () => {
      const { exportToPDFDataURL } = await import('./pdf');
      const doc = createProject('pdf-002', 'user');
      const result = exportToPDFDataURL(doc);
      const b64Part = result.replace('data:application/pdf;base64,', '');
      expect(/^[A-Za-z0-9+/]+=*$/.test(b64Part)).toBe(true);
    });

    it('should not throw when doc has wall elements', async () => {
      const { exportToPDFDataURL } = await import('./pdf');
      const doc = createProject('pdf-003', 'user');
      const layerId = Object.keys(doc.organization.layers)[0];
      const levelId = Object.keys(doc.organization.levels)[0];
      const lineId = 'wall-pdf-001';
      doc.content.elements[lineId] = {
        id: lineId,
        type: 'wall',
        properties: { StartX: { type: 'number', value: 0 }, StartY: { type: 'number', value: 0 }, EndX: { type: 'number', value: 2000 }, EndY: { type: 'number', value: 0 } },
        propertySets: [],
        geometry: { type: 'brep', data: null },
        layerId,
        levelId,
        transform: { translation: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
        boundingBox: {
          min: { x: 0, y: 0, z: 0, _type: 'Point3D' as const },
          max: { x: 2000, y: 200, z: 3000, _type: 'Point3D' as const },
        },
        metadata: { id: lineId, createdBy: 'user', createdAt: 0, updatedAt: 0, version: { clock: {} } },
        visible: true,
        locked: false,
      };
      const result = exportToPDFDataURL(doc);
      expect(result.startsWith('data:application/pdf;base64,')).toBe(true);
    });
  });
});

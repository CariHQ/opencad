# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: document.spec.ts >> Document Model E2E Tests >> T-DOC-002: Auto-save functionality >> should save data when layer is added
- Location: document.spec.ts:48:5

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | /**
  2   |  * E2E Test: Document Model
  3   |  *
  4   |  * Tests the document model functionality in the browser environment.
  5   |  * Tests from PRD: T-DOC-001 through T-DOC-006
  6   |  */
  7   | 
  8   | import { test, expect } from '@playwright/test';
  9   | import { DocumentModel, createProject } from '@opencad/document';
  10  | 
  11  | test.describe('Document Model E2E Tests', () => {
  12  |   test.describe('T-DOC-001: Create project → verify document model initialized with correct schema', () => {
  13  |     test('should create a document with correct schema structure', async ({ page }) => {
  14  |       await page.goto('/');
  15  | 
  16  |       const projectName = await page
  17  |         .locator('.project-info p strong:has-text("Name:") + *')
  18  |         .textContent();
  19  |       expect(projectName).toBe('My First Project');
  20  | 
  21  |       const schemaVersion = await page.locator('.project-info p:has-text("Schema:")').textContent();
  22  |       expect(schemaVersion).toContain('1.0.0');
  23  |     });
  24  | 
  25  |     test('should create a default layer named "Layer 1"', async ({ page }) => {
  26  |       await page.goto('/');
  27  | 
  28  |       const layers = await page.locator('.layers-section .item').count();
  29  |       expect(layers).toBeGreaterThanOrEqual(1);
  30  | 
  31  |       const firstLayer = await page.locator('.layers-section .item').first().textContent();
  32  |       expect(firstLayer).toContain('Layer 1');
  33  |     });
  34  | 
  35  |     test('should create a default level with elevation 0', async ({ page }) => {
  36  |       await page.goto('/');
  37  | 
  38  |       const levels = await page.locator('.levels-section .item').count();
  39  |       expect(levels).toBe(1);
  40  | 
  41  |       const firstLevel = await page.locator('.levels-section .item').first().textContent();
  42  |       expect(firstLevel).toContain('Level 1');
  43  |       expect(firstLevel).toContain('Elevation: 0mm');
  44  |     });
  45  |   });
  46  | 
  47  |   test.describe('T-DOC-002: Auto-save functionality', () => {
  48  |     test('should save data when layer is added', async ({ page }) => {
> 49  |       await page.goto('/');
      |                  ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  50  | 
  51  |       const initialLayers = await page.locator('.layers-section .item').count();
  52  | 
  53  |       await page.click('.layers-section button.add-btn');
  54  | 
  55  |       const newLayers = await page.locator('.layers-section .item').count();
  56  |       expect(newLayers).toBe(initialLayers + 1);
  57  |     });
  58  | 
  59  |     test('should save data when element is added', async ({ page }) => {
  60  |       await page.goto('/');
  61  | 
  62  |       const initialElements = await page.locator('.elements-section .item').count();
  63  | 
  64  |       await page.click('.elements-section button.add-btn');
  65  | 
  66  |       const newElements = await page.locator('.elements-section .item').count();
  67  |       expect(newElements).toBe(initialElements + 1);
  68  |     });
  69  |   });
  70  | 
  71  |   test.describe('T-DOC-004: Import IFC', () => {
  72  |     test('should parse IFC entities into elements', async () => {
  73  |       const ifcData = `
  74  |         ISO-10303-21;
  75  |         HEADER;
  76  |         ENDSEC;
  77  |         DATA;
  78  |         #1=IFCWALL('wall1',$,'Wall 1',$,$,$,$,$,$);
  79  |         #2=IFCDOOR('door1',$,'Door 1',$,$,$,$,$,$);
  80  |         ENDSEC;
  81  |         END-ISO-10303-21;
  82  |       `;
  83  | 
  84  |       const model = DocumentModel.fromIFC(ifcData);
  85  |       const elements = Object.values(model.document.elements);
  86  | 
  87  |       expect(elements.length).toBeGreaterThanOrEqual(2);
  88  |     });
  89  | 
  90  |     test('should map IFC types to OpenCAD element types', async () => {
  91  |       const ifcData = `
  92  |         ISO-10303-21;
  93  |         HEADER;
  94  |         ENDSEC;
  95  |         DATA;
  96  |         #1=IFCWALL('wall1',$,'Wall 1',$,$,$,$,$,$);
  97  |         #2=IFCDOOR('door1',$,'Door 1',$,$,$,$,$,$);
  98  |         #3=IFCSLAB('slab1',$,'Slab 1',$,$,$,$,$,$);
  99  |         ENDSEC;
  100 |         END-ISO-10303-21;
  101 |       `;
  102 | 
  103 |       const model = DocumentModel.fromIFC(ifcData);
  104 |       const elements = Object.values(model.document.elements);
  105 | 
  106 |       const wall = elements.find((e) => e.type === 'wall');
  107 |       const door = elements.find((e) => e.type === 'door');
  108 |       const slab = elements.find((e) => e.type === 'slab');
  109 | 
  110 |       expect(wall).toBeDefined();
  111 |       expect(door).toBeDefined();
  112 |       expect(slab).toBeDefined();
  113 |     });
  114 |   });
  115 | 
  116 |   test.describe('T-DOC-005: Export IFC', () => {
  117 |     test('should export to valid IFC format', async () => {
  118 |       const project = createProject('test-export', 'user');
  119 |       const layerId = Object.keys(project.layers)[0];
  120 | 
  121 |       project.elements['test-wall'] = {
  122 |         id: 'test-wall',
  123 |         type: 'wall',
  124 |         properties: {
  125 |           Name: { type: 'string', value: 'Test Wall' },
  126 |           Length: { type: 'number', value: 5000, unit: 'mm' },
  127 |         },
  128 |         propertySets: [],
  129 |         geometry: { type: 'brep', data: null },
  130 |         layerId: layerId,
  131 |         levelId: null,
  132 |         transform: {
  133 |           translation: { x: 0, y: 0, z: 0 },
  134 |           rotation: { x: 0, y: 0, z: 0 },
  135 |           scale: { x: 1, y: 1, z: 1 },
  136 |         },
  137 |         boundingBox: {
  138 |           min: { x: 0, y: 0, z: 0, _type: 'Point3D' },
  139 |           max: { x: 5000, y: 200, z: 3000, _type: 'Point3D' },
  140 |         },
  141 |         metadata: {
  142 |           id: 'test-wall',
  143 |           createdBy: 'user',
  144 |           createdAt: Date.now(),
  145 |           updatedAt: Date.now(),
  146 |           version: { clock: {} },
  147 |         },
  148 |         visible: true,
  149 |         locked: false,
```
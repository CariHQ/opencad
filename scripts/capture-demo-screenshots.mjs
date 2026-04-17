/**
 * Captures real OpenCAD app screenshots for the landing page demo.
 * Injects a pre-built residential floor plan into localStorage so the
 * canvas renders real content on first load.
 *
 * Run: node scripts/capture-demo-screenshots.mjs
 */
import { createRequire } from 'module';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const req = createRequire(import.meta.url);
const { chromium } = req('/Users/kenroy/Projects/opencad/node_modules/.pnpm/playwright@1.59.1/node_modules/playwright/index.js');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT  = join(ROOT, 'packages/landing/screenshots');
mkdirSync(OUT, { recursive: true });

const PORT = 5174;
const BASE = `http://localhost:${PORT}`;
const W = 1280, H = 800;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForServer(url, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { const r = await fetch(url); if (r.status < 500) return; } catch {}
    await sleep(500);
  }
  throw new Error('Server timed out');
}

async function shot(page, name, label) {
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`  ✓ ${name}.png  ${label || ''}`);
}

// ── Build a realistic residential floor plan ──────────────────────────────
function makeFloorPlan() {
  const layerId  = 'layer-default';
  const levelId  = 'level-1';
  const projectId = 'demo-residential';
  const now = Date.now();

  function prop(type, value, unit) {
    return unit ? { type, value, unit } : { type, value };
  }
  function pt(x, y, z = 0) {
    return { x, y, z, _type: 'Point3D' };
  }
  function bb(x1, y1, x2, y2) {
    return { min: pt(x1,y1), max: pt(x2,y2) };
  }
  function meta(id) {
    return { id, createdBy:'demo', createdAt:now, updatedAt:now, version:{clock:{}} };
  }
  function xform() {
    return {
      translation:{x:0,y:0,z:0}, rotation:{x:0,y:0,z:0}, scale:{x:1,y:1,z:1},
    };
  }

  // Wall helper: (x1,y1) → (x2,y2), thickness 200
  function wall(id, x1, y1, x2, y2, label) {
    return {
      id, type: 'wall',
      properties: {
        StartX:    prop('number', x1, 'mm'),
        StartY:    prop('number', y1, 'mm'),
        EndX:      prop('number', x2, 'mm'),
        EndY:      prop('number', y2, 'mm'),
        Height:    prop('number', 3000, 'mm'),
        Thickness: prop('number', 200, 'mm'),
        Material:  prop('string', 'Concrete'),
        Type:      prop('enum', 'Exterior'),
        Name:      prop('string', label || 'Wall'),
      },
      propertySets: [],
      geometry: { type: 'brep', data: null },
      layerId, levelId,
      transform: xform(),
      boundingBox: bb(Math.min(x1,x2), Math.min(y1,y2), Math.max(x1,x2), Math.max(y1,y2)),
      metadata: meta(id),
      visible: true, locked: false,
    };
  }

  function door(id, x, y, w = 900) {
    return {
      id, type: 'door',
      properties: {
        X:      prop('number', x, 'mm'),
        Y:      prop('number', y, 'mm'),
        Width:  prop('number', w, 'mm'),
        Height: prop('number', 2100, 'mm'),
        Name:   prop('string', 'Door'),
      },
      propertySets: [],
      geometry: { type: 'brep', data: null },
      layerId, levelId,
      transform: xform(),
      boundingBox: bb(x, y, x + w, y + 2100),
      metadata: meta(id),
      visible: true, locked: false,
    };
  }

  function window_(id, x, y, w = 1200) {
    return {
      id, type: 'window',
      properties: {
        X:      prop('number', x, 'mm'),
        Y:      prop('number', y, 'mm'),
        Width:  prop('number', w, 'mm'),
        Height: prop('number', 1200, 'mm'),
        Name:   prop('string', 'Window'),
      },
      propertySets: [],
      geometry: { type: 'brep', data: null },
      layerId, levelId,
      transform: xform(),
      boundingBox: bb(x, y, x + w, y + 1200),
      metadata: meta(id),
      visible: true, locked: false,
    };
  }

  // Floor plan layout (mm coords)
  // Outer footprint: 14400 × 9600
  const O = 0; // origin
  const W2 = 14400, H2 = 9600;
  // Room dividers
  const vDiv1 = 6000;  // living | bedroom zone
  const vDiv2 = 9600;  // bedroom | bathroom
  const hDiv  = 5200;  // upper | lower rooms

  const elements = {};
  const add = el => { elements[el.id] = el; };

  // ── Outer walls ──────────────────────────────────────────────────
  add(wall('w-north',  O,   O,   W2,  O,   'North Wall'));
  add(wall('w-south',  O,   H2,  W2,  H2,  'South Wall'));
  add(wall('w-west',   O,   O,   O,   H2,  'West Wall'));
  add(wall('w-east',   W2,  O,   W2,  H2,  'East Wall'));

  // ── Interior walls ───────────────────────────────────────────────
  add(wall('w-v1',  vDiv1, O,    vDiv1, H2,   'Living/Bedroom divide'));
  add(wall('w-v2',  vDiv2, O,    vDiv2, H2,   'Bedroom/Bath divide'));
  add(wall('w-h1',  O,     hDiv, vDiv1, hDiv, 'Living/Kitchen divide'));
  add(wall('w-h2',  vDiv1, hDiv, W2,   hDiv,  'Bedroom upper divide'));

  // ── Doors ────────────────────────────────────────────────────────
  add(door('d-front',   2800, H2,  900));  // front door (south)
  add(door('d-living',  vDiv1, 2000, 900)); // living → kitchen
  add(door('d-bed1',    vDiv1, 6000, 900)); // bedroom 1
  add(door('d-bed2',    8200,  hDiv, 900)); // bedroom 2
  add(door('d-bath',    vDiv2, 2500, 800)); // bathroom

  // ── Windows ──────────────────────────────────────────────────────
  add(window_('win-living1', 1000, O, 1800));
  add(window_('win-living2', 3200, O, 1600));
  add(window_('win-kitchen', 7000, O, 1400));
  add(window_('win-bed1',    0,  2000, 1200));
  add(window_('win-bed2',    vDiv1, 7000, 1400));
  add(window_('win-bath',    vDiv2, 1200, 800));

  const doc = {
    id: projectId,
    name: 'Residential Unit A',
    version: { clock: {} },
    metadata: {
      createdAt: now, updatedAt: now,
      createdBy: 'demo', schemaVersion: '1.0.0',
    },
    content: { elements, spaces: {} },
    organization: {
      layers: {
        [layerId]: {
          id: layerId, name: 'Layer 1',
          color: '#808080', visible: true, locked: false, order: 0,
        },
      },
      levels: {
        [levelId]: {
          id: levelId, name: 'Level 1',
          elevation: 0, height: 3000, order: 0,
        },
      },
    },
    presentation: { views: {}, annotations: {} },
    library: { materials: {} },
  };

  return { doc, projectId };
}

(async () => {
  console.log(`Starting dev server on :${PORT} (auth disabled)…`);
  const server = spawn('pnpm', ['--filter=@opencad/app', 'exec', 'vite', '--port', String(PORT)], {
    cwd: ROOT,
    env: {
      ...process.env,
      VITE_FIREBASE_API_KEY: '', VITE_FIREBASE_AUTH_DOMAIN: '',
      VITE_FIREBASE_PROJECT_ID: '', VITE_FIREBASE_STORAGE_BUCKET: '',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '', VITE_FIREBASE_APP_ID: '',
    },
    stdio: ['ignore','pipe','ignore'],
  });

  try {
    await waitForServer(BASE);
    console.log('Server ready.\n');

    const browser = await chromium.launch({ headless: true });

    // ── Helper to get a fresh page with floor plan pre-loaded ─────────
    async function freshPage() {
      const page = await browser.newPage();
      await page.setViewportSize({ width: W, height: H });

      // Seed localStorage with the floor plan before the app boots
      const { doc, projectId } = makeFloorPlan();
      const projectMeta = [{
        id: projectId, name: doc.name,
        thumbnail: null, createdAt: doc.metadata.createdAt,
        updatedAt: doc.metadata.updatedAt,
        collaborators: [], starred: false,
      }];

      await page.goto(BASE, { waitUntil: 'domcontentloaded' });
      await page.evaluate(({ docJson, projectId, metaJson }) => {
        localStorage.setItem(`opencad-doc-${projectId}`, docJson);
        localStorage.setItem('opencad-projects', metaJson);
      }, {
        docJson: JSON.stringify(doc),
        projectId,
        metaJson: JSON.stringify(projectMeta),
      });

      return { page, projectId };
    }

    // ── 1. Dashboard ───────────────────────────────────────────────────
    console.log('Capturing dashboard…');
    const { page: pg1, projectId } = await freshPage();
    await pg1.reload({ waitUntil: 'networkidle' });
    await sleep(700);
    await shot(pg1, '01-dashboard', 'Project dashboard');
    await pg1.close();

    // ── 2. Editor — Floor Plan view ────────────────────────────────────
    console.log('Opening editor…');
    const { page } = await freshPage();
    await page.goto(`${BASE}/project/${projectId}`, { waitUntil: 'networkidle' });
    await sleep(1200);

    // Switch to Floor Plan (2D) view
    const fpTab = page.locator('text=Floor Plan').first();
    if (await fpTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fpTab.click(); await sleep(800);
    }

    // Pan + zoom so the pre-loaded floor plan is centred and visible.
    // Default viewport: scale=20 (20mm/px), pan offset (-5000,-5000).
    // The 14400×9600mm floor plan maps to 720×480px at scale=20.
    // At default pan, the TL corner sits at roughly (620,610) on a 1280×800 canvas.
    // We pan right/up to centre it, then zoom out so it fills the canvas nicely.
    {
      const cv = page.locator('canvas').first();
      const box = await cv.boundingBox().catch(() => null);
      if (box) {
        const cx = box.x + box.width  * 0.5;
        const cy = box.y + box.height * 0.5;

        // Middle-mouse drag: move canvas so the floor plan centre is near screen centre.
        // Floor plan centre in world: (7200, 4800). At scale=20 and default pan (-5000,-5000):
        //   screenX = (7200 - (-5000)) / 20 + 640 = 12200/20 + 640 = 1250  (off-screen right)
        //   screenY = (4800 - (-5000)) / 20 + 400 = 9800/20  + 400 = 890   (off-screen bottom)
        // We want floor plan centre at (cx,cy). That requires a pan delta of roughly (-610, -490).
        await page.mouse.move(cx, cy);
        await page.mouse.down({ button: 'middle' });
        await page.mouse.move(cx - 610, cy - 490, { steps: 30 });
        await page.mouse.up({ button: 'middle' });
        await sleep(150);

        // Zoom out 4× (each wheel event with deltaY=120 zooms out by factor 1/0.85 ≈ 1.18×).
        // 4 steps → ~1.18^4 ≈ 1.94× zoom-out, bringing the 720×480 footprint down to ~370×247.
        const midX = box.x + box.width  * 0.5;
        const midY = box.y + box.height * 0.5;
        await page.mouse.move(midX, midY);
        for (let i = 0; i < 4; i++) {
          await page.mouse.wheel(0, 120);
          await sleep(60);
        }
        await sleep(300);
      }
    }

    await shot(page, '02-editor-floorplan', 'Floor plan loaded with elements');

    // ── 3. Wall tool active ────────────────────────────────────────────
    console.log('Activating Wall tool…');
    // Click Wall button
    const wallBtn = page.locator('button[title*="Wall"], button[aria-label*="Wall"]').first();
    if (await wallBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await wallBtn.click();
    } else {
      await page.keyboard.press('w');
    }
    await sleep(400);
    await shot(page, '03-wall-tool', 'Wall tool — properties panel open');

    // ── 4. Click an existing wall to select it ─────────────────────────
    console.log('Selecting wall…');
    await page.keyboard.press('v');  // select tool
    await sleep(300);

    // Find canvas and click near the north wall
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox().catch(() => null);
    if (box) {
      // Click near canvas center-top (where north wall should render)
      await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.2);
      await sleep(700);
    }
    await shot(page, '04-element-selected', 'Wall selected — properties panel');

    // ── 5. Door tool ───────────────────────────────────────────────────
    console.log('Door tool…');
    const doorBtn = page.locator('button[title*="Door"], button[aria-label*="Door"]').first();
    if (await doorBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await doorBtn.click();
    } else {
      await page.keyboard.press('d');
    }
    await sleep(400);
    await shot(page, '05-door-tool', 'Door tool active');

    // ── 6. 3D view ─────────────────────────────────────────────────────
    console.log('3D view…');
    const view3d = page.locator('text=3D View').first();
    if (await view3d.isVisible({ timeout: 1000 }).catch(() => false)) {
      await view3d.click(); await sleep(1200);
    }
    await shot(page, '06-3d-view', '3D perspective view');

    // ── 7. Back to floor plan, zoom to fit ─────────────────────────────
    console.log('Final overview…');
    if (await fpTab.isVisible({ timeout: 1000 }).catch(() => false)) {
      await fpTab.click(); await sleep(600);
    }
    // Fit the view (Home key or Ctrl+Shift+H)
    await page.keyboard.press('Home');
    await sleep(500);
    await shot(page, '07-overview', 'Full floor plan overview');

    // ── 8. Navigator tree expanded ─────────────────────────────────────
    await page.keyboard.press('v');
    await sleep(200);
    // Click 'Elements' to expand
    const elemNode = page.locator('text=Elements').first();
    if (await elemNode.isVisible({ timeout: 1000 }).catch(() => false)) {
      await elemNode.click(); await sleep(400);
    }
    await shot(page, '08-navigator', 'Navigator showing floor plan elements');

    await browser.close();
    console.log('\nAll screenshots saved to packages/landing/screenshots/');

  } finally {
    server.kill('SIGTERM');
  }
})();

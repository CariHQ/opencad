/**
 * Autonomous house-building harness.
 *
 * Drives the app in a headless browser, executes a deterministic
 * house-drawing sequence, and emits 2D + 3D screenshots along with a
 * JSON summary of the document state. Each run is saved as its own
 * project under a per-iteration id so the human reviewer can navigate
 * to /project/<id> in the app and inspect it later.
 *
 * Iteration id: process.env.ITER (e.g. '001', '002'). Falls back to a
 * timestamp when unset. Artifacts land under experiment/house-build/<id>/.
 *
 * Run:
 *   ITER=001 node node_modules/.pnpm/@playwright+test@1.59.1/node_modules/@playwright/test/cli.js \
 *     test e2e/house-build.spec.ts --project=chromium --reporter=line
 */
import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';

const ITER = process.env.ITER ?? `ts-${Date.now()}`;
const PROJECT_ID = `house-build-${ITER}`;
const OUT = `experiment/house-build/${ITER}`;

test(`autonomous house build — iter ${ITER}`, async ({ page }) => {
  fs.mkdirSync(OUT, { recursive: true });

  const consoleLogs: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (m) => consoleLogs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => pageErrors.push(`${e.name}: ${e.message}`));

  // Start fresh only for THIS iteration's project slot. Other iterations are
  // preserved so the user can navigate between them in the app.
  await page.addInitScript((id: string) => {
    try { localStorage.removeItem(`opencad-document:${id}`); } catch { /* */ }
  }, PROJECT_ID);

  await page.goto(`/project/${PROJECT_ID}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // Ensure Floor Plan
  const floor = page.getByRole('button', { name: /^Floor Plan$/i });
  if (await floor.count()) { await floor.first().click(); await page.waitForTimeout(300); }

  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('no canvas');
  const cx0 = box.x + box.width / 2;
  const cy0 = box.y + box.height / 2;

  async function drag(x1: number, y1: number, x2: number, y2: number): Promise<void> {
    await page.mouse.move(x1, y1);
    await page.mouse.down();
    await page.mouse.move(x2, y2, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(180);
  }
  async function clickAt(x: number, y: number): Promise<void> {
    await page.mouse.click(x, y);
    await page.waitForTimeout(120);
  }

  // === Single-room house layout =============================================
  const L = 200; // half-width in screen pixels
  const H = 150; // half-height in screen pixels
  const xL = cx0 - L, xR = cx0 + L;
  const yT = cy0 - H, yB = cy0 + H;

  // Walls (clockwise)
  await page.keyboard.press('w');
  await drag(xL, yT, xR, yT); // top
  await drag(xR, yT, xR, yB); // right
  await drag(xR, yB, xL, yB); // bottom
  await drag(xL, yB, xL, yT); // left

  // Door on bottom wall
  await page.keyboard.press('d');
  await clickAt(cx0, yB);

  // Window on top wall
  await page.keyboard.press('n');
  await clickAt(cx0, yT);

  // Slab — room footprint
  await page.keyboard.press('s');
  await clickAt(xL + 20, yT + 20);
  await clickAt(xR - 20, yT + 20);
  await clickAt(xR - 20, yB - 20);
  await page.mouse.dblclick(xL + 20, yB - 20);
  await page.waitForTimeout(200);

  // Roof — overhang by ~10 px each side
  await page.keyboard.press('o');
  await clickAt(xL - 10, yT - 10);
  await clickAt(xR + 10, yT - 10);
  await clickAt(xR + 10, yB + 10);
  await page.mouse.dblclick(xL - 10, yB + 10);
  await page.waitForTimeout(200);

  // Columns at 4 interior corners
  await page.keyboard.press('k');
  await clickAt(xL + 40, yT + 40);
  await clickAt(xR - 40, yT + 40);
  await clickAt(xR - 40, yB - 40);
  await clickAt(xL + 40, yB - 40);

  await page.keyboard.press('v');
  await page.waitForTimeout(200);

  // ── Capture artifacts ────────────────────────────────────────────────────
  await page.screenshot({ path: `${OUT}/01-floor-plan.png`, fullPage: true });

  const three = page.getByRole('button', { name: /^3D View$/i });
  await three.first().click();
  await page.waitForTimeout(600);
  await page.keyboard.press('0');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/02-iso-3d.png`, fullPage: true });

  await page.keyboard.press('2');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/03-front.png`, fullPage: true });

  await page.keyboard.press('3');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/04-right.png`, fullPage: true });

  await page.keyboard.press('1');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/05-top.png`, fullPage: true });

  // Document state — count per type, position of each element
  const stateDump = await page.evaluate((id: string) => {
    try {
      const raw = localStorage.getItem(`opencad-document:${id}`);
      if (!raw) return { error: 'no-persisted-doc' };
      const doc = JSON.parse(raw) as {
        content: { elements: Record<string, { type: string; properties: Record<string, { value: unknown }> }> };
      };
      const counts: Record<string, number> = {};
      const sample: Array<{ type: string; props: Record<string, unknown> }> = [];
      for (const el of Object.values(doc.content.elements)) {
        counts[el.type] = (counts[el.type] ?? 0) + 1;
        if (sample.length < 24) {
          const props: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(el.properties)) props[k] = v.value;
          sample.push({ type: el.type, props });
        }
      }
      return { counts, sample };
    } catch (err) {
      return { error: (err as Error).message };
    }
  }, PROJECT_ID);

  fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({
    iteration: ITER,
    projectId: PROJECT_ID,
    projectUrl: `/project/${PROJECT_ID}`,
    state: stateDump,
    pageErrors,
    warnings: consoleLogs.filter((l) => l.includes('[warning]') && !l.includes('CRDT')).slice(0, 30),
    timestamp: new Date().toISOString(),
  }, null, 2));

  // Fail the test only on page errors — missing elements are signal for the
  // evaluator, not a hard blocker.
  expect(pageErrors.filter((e) => !e.includes('CRDT'))).toEqual([]);
});

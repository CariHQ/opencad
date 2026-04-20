/**
 * Autonomous house-building harness.
 *
 * Drives the app in Playwright, runs a template-defined drawing
 * sequence, emits 2D + 3D screenshots, and captures both element
 * counts AND compliance-engine violations via window.__opencadDiag.
 *
 * Run:
 *   ITER=006 TEMPLATE=three-bedroom node node_modules/.pnpm/@playwright+test@1.59.1/node_modules/@playwright/test/cli.js \
 *     test e2e/house-build.spec.ts --project=chromium --reporter=line
 *
 * ITER      — iteration id (required for per-iteration project slot)
 * TEMPLATE  — one of: simple | three-bedroom | pool-house | mountain-cabin
 *             (default: simple)
 *
 * Artifacts land under experiment/house-build/<iter>/ — gitignored; this
 * is a local-only experiment, not repo-tracked.
 */
import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import { TEMPLATES, type Action } from './house-templates';

const ITER = process.env.ITER ?? `ts-${Date.now()}`;
const TEMPLATE_NAME = process.env.TEMPLATE ?? 'simple';
const TEMPLATE = TEMPLATES[TEMPLATE_NAME];
if (!TEMPLATE) {
  throw new Error(`Unknown TEMPLATE '${TEMPLATE_NAME}'. Options: ${Object.keys(TEMPLATES).join(', ')}`);
}
const PROJECT_ID = `house-build-${ITER}-${TEMPLATE.id}`;
const OUT = `experiment/house-build/${ITER}`;

test(`autonomous house build — iter ${ITER} — ${TEMPLATE.label}`, async ({ page }) => {
  fs.mkdirSync(OUT, { recursive: true });

  const consoleLogs: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (m) => consoleLogs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => pageErrors.push(`${e.name}: ${e.message}`));

  await page.addInitScript((id: string) => {
    try { localStorage.removeItem(`opencad-document:${id}`); } catch { /* */ }
  }, PROJECT_ID);

  await page.goto(`/project/${PROJECT_ID}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // Floor Plan
  const floor = page.getByRole('button', { name: /^Floor Plan$/i });
  if (await floor.count()) { await floor.first().click(); await page.waitForTimeout(300); }

  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('no canvas');
  const cx0 = box.x + box.width / 2;
  const cy0 = box.y + box.height / 2;

  // Convert template-relative pixel offsets to absolute screen coords
  const xA = (x: number): number => cx0 + x;
  const yA = (y: number): number => cy0 + y;

  async function exec(a: Action): Promise<void> {
    switch (a.kind) {
      case 'tool':
        if (a.tool) await page.keyboard.press(a.tool);
        await page.waitForTimeout(90);
        break;
      case 'drag':
        await page.mouse.move(xA(a.x1!), yA(a.y1!));
        await page.mouse.down();
        await page.mouse.move(xA(a.x2!), yA(a.y2!), { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(150);
        break;
      case 'click':
        await page.mouse.click(xA(a.x1!), yA(a.y1!));
        await page.waitForTimeout(100);
        break;
      case 'dblclick':
        await page.mouse.dblclick(xA(a.x1!), yA(a.y1!));
        await page.waitForTimeout(180);
        break;
      case 'wait':
        await page.waitForTimeout(a.ms ?? 200);
        break;
      case 'setParam':
        await page.evaluate(([t, k, v]) => {
          const w = window as unknown as {
            __opencadDiag?: { setToolParam: (tool: string, key: string, value: unknown) => void };
          };
          w.__opencadDiag?.setToolParam(t, k, v);
        }, [a.paramTool!, a.paramKey!, a.paramValue!] as [string, string, unknown]);
        await page.waitForTimeout(60);
        break;
    }
  }

  for (const action of TEMPLATE.actions) await exec(action);

  await page.keyboard.press('v');
  await page.waitForTimeout(200);

  // Screenshots
  await page.screenshot({ path: `${OUT}/01-floor-plan.png`, fullPage: true });
  const three = page.getByRole('button', { name: /^3D View$/i });
  await three.first().click();
  await page.waitForTimeout(600);
  await page.keyboard.press('0');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/02-iso-3d.png`, fullPage: true });
  await page.keyboard.press('2'); await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/03-front.png`, fullPage: true });
  await page.keyboard.press('3'); await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/04-right.png`, fullPage: true });
  await page.keyboard.press('1'); await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/05-top.png`, fullPage: true });

  // Pull a full diagnostic snapshot from window.__opencadDiag — counts,
  // compliance violations, and a sample of each element type.
  const diag = await page.evaluate(() => {
    const w = window as unknown as { __opencadDiag?: {
      summary: () => { counts: Record<string, number>; violations: Array<{ ruleId: string; message: string; severity: string }>; elementCount: number };
      getDocument: () => unknown;
    } };
    if (!w.__opencadDiag) return { error: 'no-diag-window' };
    const s = w.__opencadDiag.summary();
    const doc = w.__opencadDiag.getDocument() as {
      content: { elements: Record<string, { type: string; properties: Record<string, { value: unknown }> }> };
    } | null;
    const sample: Array<{ type: string; props: Record<string, unknown> }> = [];
    const seenTypes = new Set<string>();
    if (doc) {
      for (const el of Object.values(doc.content.elements)) {
        if (seenTypes.has(el.type)) continue;
        seenTypes.add(el.type);
        const props: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(el.properties)) props[k] = v.value;
        sample.push({ type: el.type, props });
      }
    }
    return { ...s, sample };
  });

  // Expected-vs-actual count deltas — quick sanity signal for the evaluator
  const deltas: Record<string, { expected: number; actual: number; delta: number }> = {};
  if (TEMPLATE.expected && 'counts' in diag) {
    for (const [type, exp] of Object.entries(TEMPLATE.expected)) {
      const act = (diag.counts as Record<string, number>)[type] ?? 0;
      deltas[type] = { expected: exp, actual: act, delta: act - exp };
    }
  }

  fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({
    iteration: ITER,
    template: TEMPLATE.id,
    label: TEMPLATE.label,
    description: TEMPLATE.description,
    projectId: PROJECT_ID,
    projectUrl: `/project/${PROJECT_ID}`,
    diag,
    deltas,
    pageErrors,
    warnings: consoleLogs.filter((l) => l.includes('[warning]') && !l.includes('CRDT')).slice(0, 30),
    timestamp: new Date().toISOString(),
  }, null, 2));

  expect(pageErrors.filter((e) => !e.includes('CRDT'))).toEqual([]);
});

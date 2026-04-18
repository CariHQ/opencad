/**
 * OG Image Generator
 *
 * Generates social sharing images (1200×630 PNG) for all OpenCAD landing pages
 * using Playwright to screenshot the og-template.html with page-specific params.
 *
 * Usage:
 *   node packages/landing/scripts/generate-og.mjs
 *
 * Requires Playwright to be installed (it's already a dev dep via pnpm).
 * Output: packages/landing/og.png, og-architects.png, og-structural.png, etc.
 */

// Dynamic import resolves playwright from the monorepo root (run with: node packages/landing/scripts/generate-og.mjs from repo root)
const pwPath = new URL('../../../node_modules/.pnpm/playwright@1.59.1/node_modules/playwright/index.js', import.meta.url);
const pw = await import(pwPath.href);
const chromium = pw.default?.chromium ?? pw.chromium;
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LANDING_DIR = join(__dirname, '..');
const TEMPLATE_PATH = join(LANDING_DIR, 'og-template.html');

const OG_PAGES = [
  {
    filename: 'og.png',
    params: {
      accent: '#0052ff',
      accentGlow: 'rgba(0,82,255,0.12)',
      headline: 'Browser-Native<br/><em>BIM Platform</em>',
      sub: 'AI-powered design · Real-time collaboration · IFC4 export. No install required.',
      cta: 'Start free 14-day trial',
    },
  },
  {
    filename: 'og-architects.png',
    params: {
      accent: '#0052ff',
      accentGlow: 'rgba(0,82,255,0.12)',
      role: 'For Architects',
      preLabel: 'Architecture & BIM',
      headline: 'The BIM platform<br/>architects <em>actually</em> want.',
      sub: 'Full 2D drafting, 3D BIM, AI design assistance, IFC4 export — all in your browser.',
      cta: 'Start free 14-day trial',
    },
  },
  {
    filename: 'og-structural.png',
    params: {
      accent: '#ea580c',
      accentGlow: 'rgba(234,88,12,0.12)',
      role: 'For Structural Engineers',
      preLabel: 'Structural Engineering',
      headline: 'Structural coordination<br/>without the <em>bottlenecks.</em>',
      sub: 'Clash detection, IFC4 round-trip, section analysis — in your browser.',
      cta: 'Start free 14-day trial',
    },
  },
  {
    filename: 'og-mep.png',
    params: {
      accent: '#0891b2',
      accentGlow: 'rgba(8,145,178,0.12)',
      role: 'For MEP Engineers',
      preLabel: 'MEP Engineering',
      headline: 'MEP coordination that<br/><em>actually works.</em>',
      sub: 'Duct routing, clash detection, IFC4 MEP export — coordinate in real time.',
      cta: 'Start free 14-day trial',
    },
  },
  {
    filename: 'og-contractors.png',
    params: {
      accent: '#16a34a',
      accentGlow: 'rgba(22,163,74,0.12)',
      role: 'For Contractors',
      preLabel: 'Construction & BIM',
      headline: 'From BIM to <em>build</em><br/>without the friction.',
      sub: 'Quantity takeoffs, clash reports, shop drawing review — on any device.',
      cta: 'Start free 14-day trial',
    },
  },
  {
    filename: 'og-owners.png',
    params: {
      accent: '#7c3aed',
      accentGlow: 'rgba(124,58,237,0.12)',
      role: 'For Project Owners',
      preLabel: 'Project Owners & Clients',
      headline: 'See your building<br/><em>before it\'s built.</em>',
      sub: 'Real-time 3D visualization, design approvals, progress tracking.',
      cta: 'Get access',
    },
  },
];

async function generateOGImages() {
  console.log('Launching browser...');
  const browser = await chromium.launch();

  for (const page of OG_PAGES) {
    const context = await browser.newContext({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor: 1,
    });
    const tab = await context.newPage();

    // Build URL with params
    const url = new URL(`file://${TEMPLATE_PATH}`);
    for (const [key, value] of Object.entries(page.params)) {
      url.searchParams.set(key, value);
    }

    console.log(`Generating ${page.filename}...`);
    await tab.goto(url.toString());

    // Wait for fonts to load
    await tab.waitForFunction(() => document.fonts.ready);
    await tab.waitForTimeout(200); // small settle for font rendering

    const buffer = await tab.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 1200, height: 630 },
    });

    const outputPath = join(LANDING_DIR, page.filename);
    writeFileSync(outputPath, buffer);
    console.log(`  → Saved ${outputPath}`);

    await context.close();
  }

  await browser.close();
  console.log('\nAll OG images generated.');
}

generateOGImages().catch((err) => {
  console.error('Failed to generate OG images:', err);
  process.exit(1);
});

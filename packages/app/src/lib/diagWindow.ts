/**
 * Dev-only diagnostic hooks exposed on window for the Playwright
 * autonomous-build harness. Lets the harness read the live document,
 * run the compliance engine, and compute cost / carbon / quantity
 * takeoff totals without having to re-parse persisted JSON or switch
 * right-panel tabs.
 *
 * Only attaches when import.meta.env.DEV is true. Production builds
 * never touch window.__opencadDiag.
 */
import { runComplianceCheck, type ComplianceViolation } from './complianceEngine';
import { computeTakeoff } from './quantityTakeoff';
import { detectClashes } from './clashDetection';
import { BUILT_IN_MATERIALS } from './materials';
import type { DocumentSchema, ElementSchema } from '@opencad/document';

type Pv = Record<string, { value: unknown }>;
const num = (el: ElementSchema, k: string, fb = 0): number => {
  const v = (el.properties as Pv)[k]?.value;
  return typeof v === 'number' ? v : fb;
};
const str = (el: ElementSchema, k: string): string => {
  const v = (el.properties as Pv)[k]?.value;
  return typeof v === 'string' ? v : '';
};

function costAndCarbon(doc: DocumentSchema): { totalCostUSD: number; totalCarbonKgCO2e: number; byMaterial: Record<string, { qty: number; cost: number; carbon: number }> } {
  const byMaterial: Record<string, { qty: number; cost: number; carbon: number }> = {};
  let cost = 0, carbon = 0;
  const matByName = new Map(BUILT_IN_MATERIALS.map((m) => [m.name, m]));
  for (const el of Object.values(doc.content.elements)) {
    const matName = str(el, 'Material');
    const mat = matByName.get(matName);
    if (!mat) continue;
    // Rough quantity: use footprint area × thickness/height depending on element
    let qty = 0;
    const w = num(el, 'Width', 0);
    const h = num(el, 'Height', 0);
    const t = num(el, 'Thickness', 0);
    if (el.type === 'wall') {
      const dx = num(el, 'EndX', 0) - num(el, 'StartX', 0);
      const dy = num(el, 'EndY', 0) - num(el, 'StartY', 0);
      const len = Math.sqrt(dx * dx + dy * dy) / 1000; // m
      qty = len * (h / 1000); // m²
    } else if (el.type === 'slab' || el.type === 'roof') {
      const pts = (el.properties as Pv)['Points']?.value;
      if (typeof pts === 'string') {
        try {
          const p = JSON.parse(pts) as Array<{ x: number; y: number }>;
          if (p.length >= 3) {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const q of p) {
              if (q.x < minX) minX = q.x;
              if (q.x > maxX) maxX = q.x;
              if (q.y < minY) minY = q.y;
              if (q.y > maxY) maxY = q.y;
            }
            qty = ((maxX - minX) * (maxY - minY)) / 1_000_000; // m²
          }
        } catch { /* */ }
      }
    } else if (el.type === 'column' || el.type === 'beam' || el.type === 'stair') {
      qty = (w * h) / 1_000_000; // m² rough
    } else if (el.type === 'door' || el.type === 'window') {
      qty = (w * h) / 1_000_000;
    }
    const cM = qty * mat.costPerM2;
    const carbonM = qty * ((mat as { embodiedCarbon?: number }).embodiedCarbon ?? 0) * ((mat as { density?: number }).density ?? 0) * (t / 1000);
    cost += cM;
    carbon += carbonM;
    const bucket = byMaterial[matName] ?? { qty: 0, cost: 0, carbon: 0 };
    bucket.qty += qty;
    bucket.cost += cM;
    bucket.carbon += carbonM;
    byMaterial[matName] = bucket;
  }
  return { totalCostUSD: cost, totalCarbonKgCO2e: carbon, byMaterial };
}

export interface DiagSummary {
  counts: Record<string, number>;
  elementCount: number;
  violations: ComplianceViolation[];
  cost: { totalCostUSD: number; totalCarbonKgCO2e: number; byMaterial: Record<string, { qty: number; cost: number; carbon: number }> };
  clashes: number;
  quantity: ReturnType<typeof computeTakeoff>;
}

interface DiagWindow {
  __opencadDiag?: {
    getDocument: () => DocumentSchema | null;
    runCompliance: () => ComplianceViolation[];
    summary: () => DiagSummary;
    setToolParam: (tool: string, key: string, value: unknown) => void;
  };
}

export function installDiagWindow(
  getStoreDocument: () => DocumentSchema | null,
  setToolParam?: (tool: string, key: string, value: unknown) => void,
): void {
  if (!import.meta.env.DEV) return;
  if (typeof window === 'undefined') return;
  const w = window as unknown as DiagWindow;
  w.__opencadDiag = {
    getDocument: () => getStoreDocument(),
    setToolParam: (t, k, v) => setToolParam?.(t, k, v),
    runCompliance: () => {
      const doc = getStoreDocument();
      return doc ? runComplianceCheck(doc) : [];
    },
    summary: (): DiagSummary => {
      const doc = getStoreDocument();
      if (!doc) return {
        counts: {}, elementCount: 0, violations: [],
        cost: { totalCostUSD: 0, totalCarbonKgCO2e: 0, byMaterial: {} },
        clashes: 0,
        quantity: [],
      };
      const counts: Record<string, number> = {};
      for (const el of Object.values(doc.content.elements)) {
        counts[el.type] = (counts[el.type] ?? 0) + 1;
      }
      let clashes = 0;
      try {
        // detectClashes expects (structural, mep, tolerance).
        // MEP = ducts / pipes / conduits / cable trays. Doors, windows, and
        // railings are ARCHITECTURAL elements — a door inside a wall is
        // expected, not a clash. Until true MEP types ship we filter to an
        // explicit allowlist instead of "everything non-structural".
        const STRUCTURAL = new Set(['wall', 'column', 'beam', 'slab', 'roof', 'stair']);
        const MEP = new Set(['duct', 'pipe', 'conduit', 'cable_tray', 'hvac', 'plumbing']);
        const structural = Object.values(doc.content.elements).filter((el) => STRUCTURAL.has(el.type));
        const mep        = Object.values(doc.content.elements).filter((el) => MEP.has(el.type));
        clashes = detectClashes(structural, mep, 0.05).length;
      } catch { /* element shapes may throw */ }
      let quantity: ReturnType<typeof computeTakeoff>;
      try { quantity = computeTakeoff(doc); }
      catch { quantity = []; }
      return {
        counts,
        elementCount: Object.keys(doc.content.elements).length,
        violations: runComplianceCheck(doc),
        cost: costAndCarbon(doc),
        clashes,
        quantity,
      };
    },
  };
}

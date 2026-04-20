/**
 * Dev-only diagnostic hooks exposed on window for the Playwright
 * autonomous-build harness. Lets the harness read the live document
 * and run the compliance engine without having to re-parse persisted
 * JSON in Node.
 *
 * Only attaches when import.meta.env.DEV is true. Production builds
 * never touch window.__opencadDiag.
 */
import { runComplianceCheck } from './complianceEngine';
import type { DocumentSchema } from '@opencad/document';

interface DiagWindow {
  __opencadDiag?: {
    getDocument: () => DocumentSchema | null;
    runCompliance: () => ReturnType<typeof runComplianceCheck>;
    summary: () => {
      counts: Record<string, number>;
      violations: ReturnType<typeof runComplianceCheck>;
      elementCount: number;
    };
  };
}

export function installDiagWindow(getStoreDocument: () => DocumentSchema | null): void {
  if (!import.meta.env.DEV) return;
  if (typeof window === 'undefined') return;
  const w = window as unknown as DiagWindow;
  w.__opencadDiag = {
    getDocument: () => getStoreDocument(),
    runCompliance: () => {
      const doc = getStoreDocument();
      return doc ? runComplianceCheck(doc) : [];
    },
    summary: () => {
      const doc = getStoreDocument();
      if (!doc) return { counts: {}, violations: [], elementCount: 0 };
      const counts: Record<string, number> = {};
      for (const el of Object.values(doc.content.elements)) {
        counts[el.type] = (counts[el.type] ?? 0) + 1;
      }
      return {
        counts,
        violations: runComplianceCheck(doc),
        elementCount: Object.keys(doc.content.elements).length,
      };
    },
  };
}

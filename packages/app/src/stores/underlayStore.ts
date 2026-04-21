/**
 * Underlay store — holds PDF-as-trace images keyed by document id.
 *
 * The 2D viewport reads the current underlay and renders it beneath the
 * active drawing so architects can trace over scanned drawings, survey
 * PDFs, reference sheets, etc.
 */

import { create } from 'zustand';
import type { PDFUnderlay } from '../lib/pdfUnderlay';

interface UnderlayEntry {
  underlay: PDFUnderlay;
  /** Raster of the PDF page as a data URL. Stored in memory — not persisted. */
  imageDataUrl: string;
  /** Native pixel size of the rasterised page. */
  pixelWidth: number;
  pixelHeight: number;
}

interface UnderlayState {
  entries: Record<string, UnderlayEntry>;
  setUnderlay: (underlay: PDFUnderlay, image: { dataUrl: string; width: number; height: number }) => void;
  updateUnderlay: (id: string, patch: Partial<PDFUnderlay>) => void;
  removeUnderlay: (id: string) => void;
  clearAll: () => void;
}

export const useUnderlayStore = create<UnderlayState>((set) => ({
  entries: {},
  setUnderlay: (underlay, image) => set((state) => ({
    entries: {
      ...state.entries,
      [underlay.id]: {
        underlay,
        imageDataUrl: image.dataUrl,
        pixelWidth: image.width,
        pixelHeight: image.height,
      },
    },
  })),
  updateUnderlay: (id, patch) => set((state) => {
    const existing = state.entries[id];
    if (!existing) return state;
    return {
      entries: {
        ...state.entries,
        [id]: { ...existing, underlay: { ...existing.underlay, ...patch } },
      },
    };
  }),
  removeUnderlay: (id) => set((state) => {
    const { [id]: _removed, ...rest } = state.entries;
    void _removed;
    return { entries: rest };
  }),
  clearAll: () => set({ entries: {} }),
}));

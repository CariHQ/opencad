/**
 * Scene-level render settings shared across viewports.
 *
 * The document store holds the model; this store holds ephemeral display
 * state (sun direction for shadow studies, shadow toggle, photoreal toggle,
 * temporary visibility overrides, and category filter).
 * Keeping it out of the document store means these knobs don't bloat the
 * saved file or trigger autosave.
 */

import { create } from 'zustand';
import type { ElementType } from '@opencad/document';

export interface SunDirection {
  /** Degrees above horizon, 0 (sunrise/sunset) – 90 (zenith). */
  elevationDeg: number;
  /** Degrees clockwise from north, 0–360. */
  azimuthDeg: number;
}

/** T-VIS-02: Temporary (session-only) visibility masks. Never synced or persisted. */
export interface TemporaryHide {
  /** Elements explicitly hidden via H shortcut. */
  hidden: Set<string>;
  /**
   * When non-null, only elements in this set are visible.
   * null = isolate mode off.
   */
  isolated: Set<string> | null;
}

const HIDDEN_CATEGORIES_KEY = 'opencad.navigator.hiddenCategories';

function loadHiddenCategories(): Set<ElementType> {
  try {
    const raw = localStorage.getItem(HIDDEN_CATEGORIES_KEY);
    if (raw) return new Set(JSON.parse(raw) as ElementType[]);
  } catch { /* ignore */ }
  return new Set();
}

function saveHiddenCategories(cats: Set<ElementType>): void {
  try {
    localStorage.setItem(HIDDEN_CATEGORIES_KEY, JSON.stringify([...cats]));
  } catch { /* ignore */ }
}

interface SceneState {
  sun: SunDirection;
  shadowsEnabled: boolean;
  photorealEnabled: boolean;
  setSun: (sun: SunDirection) => void;
  setShadowsEnabled: (on: boolean) => void;
  setPhotorealEnabled: (on: boolean) => void;

  // T-VIS-02: Temporary hide / isolate (ephemeral, session only)
  temporaryHide: TemporaryHide;
  /** Add element IDs to the temporary hidden set. */
  addTemporaryHidden: (ids: string[]) => void;
  /** Show only these elements — hide everything else. Pass null to exit isolate. */
  setIsolated: (ids: string[] | null) => void;
  /** Clear all temporary visibility overrides. */
  resetTemporaryHide: () => void;

  // T-VIS-04: Category filter (persisted in localStorage, never in document)
  hiddenCategories: Set<ElementType>;
  toggleCategory: (type: ElementType) => void;
  resetCategoryFilter: () => void;
}

const DEFAULT_SUN: SunDirection = { elevationDeg: 55, azimuthDeg: 135 };

const emptyTemporaryHide = (): TemporaryHide => ({
  hidden: new Set(),
  isolated: null,
});

export const useSceneStore = create<SceneState>((set, get) => ({
  sun: DEFAULT_SUN,
  shadowsEnabled: true,
  photorealEnabled: false,
  setSun: (sun) => set({ sun }),
  setShadowsEnabled: (shadowsEnabled) => set({ shadowsEnabled }),
  setPhotorealEnabled: (photorealEnabled) => set({ photorealEnabled }),

  temporaryHide: emptyTemporaryHide(),

  addTemporaryHidden: (ids) => {
    const { temporaryHide } = get();
    const hidden = new Set(temporaryHide.hidden);
    for (const id of ids) hidden.add(id);
    set({ temporaryHide: { ...temporaryHide, hidden } });
  },

  setIsolated: (ids) => {
    const { temporaryHide } = get();
    set({
      temporaryHide: {
        ...temporaryHide,
        isolated: ids === null ? null : new Set(ids),
      },
    });
  },

  resetTemporaryHide: () => set({ temporaryHide: emptyTemporaryHide() }),

  hiddenCategories: loadHiddenCategories(),

  toggleCategory: (type) => {
    const cats = new Set(get().hiddenCategories);
    if (cats.has(type)) cats.delete(type);
    else cats.add(type);
    saveHiddenCategories(cats);
    set({ hiddenCategories: cats });
  },

  resetCategoryFilter: () => {
    saveHiddenCategories(new Set());
    set({ hiddenCategories: new Set() });
  },
}));

/**
 * Pure selector: should this element be rendered?
 * Combines element.visible, layer.visible, temporary hide, isolate, and
 * category filter into a single boolean.
 */
export function isElementVisible(
  elementId: string,
  elementVisible: boolean,
  elementType: string,
  layerVisible: boolean,
  temporaryHide: TemporaryHide,
  hiddenCategories: Set<ElementType>,
): boolean {
  if (!elementVisible) return false;
  if (!layerVisible) return false;
  if (temporaryHide.hidden.has(elementId)) return false;
  if (temporaryHide.isolated !== null && !temporaryHide.isolated.has(elementId)) return false;
  if (hiddenCategories.has(elementType as ElementType)) return false;
  return true;
}

/**
 * Convert a sun elevation + azimuth (degrees) into a world-space light
 * direction vector. +Y is up, -Z is north.
 */
export function sunDirectionToVector(sun: SunDirection, distance = 10000): { x: number; y: number; z: number } {
  const elRad = (sun.elevationDeg * Math.PI) / 180;
  const azRad = (sun.azimuthDeg * Math.PI) / 180;
  const cosEl = Math.cos(elRad);
  return {
    x:  Math.sin(azRad) * cosEl * distance,
    y:  Math.sin(elRad) * distance,
    z: -Math.cos(azRad) * cosEl * distance,
  };
}

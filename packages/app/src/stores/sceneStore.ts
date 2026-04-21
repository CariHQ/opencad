/**
 * Scene-level render settings shared across viewports.
 *
 * The document store holds the model; this store holds ephemeral display
 * state (sun direction for shadow studies, shadow toggle, photoreal toggle).
 * Keeping it out of the document store means these knobs don't bloat the
 * saved file or trigger autosave.
 */

import { create } from 'zustand';

export interface SunDirection {
  /** Degrees above horizon, 0 (sunrise/sunset) – 90 (zenith). */
  elevationDeg: number;
  /** Degrees clockwise from north, 0–360. */
  azimuthDeg: number;
}

interface SceneState {
  sun: SunDirection;
  shadowsEnabled: boolean;
  photorealEnabled: boolean;
  setSun: (sun: SunDirection) => void;
  setShadowsEnabled: (on: boolean) => void;
  setPhotorealEnabled: (on: boolean) => void;
}

const DEFAULT_SUN: SunDirection = { elevationDeg: 55, azimuthDeg: 135 };

export const useSceneStore = create<SceneState>((set) => ({
  sun: DEFAULT_SUN,
  shadowsEnabled: true,
  photorealEnabled: false,
  setSun: (sun) => set({ sun }),
  setShadowsEnabled: (shadowsEnabled) => set({ shadowsEnabled }),
  setPhotorealEnabled: (photorealEnabled) => set({ photorealEnabled }),
}));

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

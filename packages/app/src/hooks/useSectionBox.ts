/**
 * T-3D-005: Section box — clip planes for 3D section cuts
 */
import { useState, useCallback } from 'react';

export interface SectionBoxBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface SectionBoxState {
  enabled: boolean;
  bounds: SectionBoxBounds;
  linkedLevelId: string | null;
}

const DEFAULT_BOUNDS: SectionBoxBounds = {
  minX: -50000,
  maxX: 50000,
  minY: -50000,
  maxY: 50000,
  minZ: 0,
  maxZ: 10000,
};

export interface UseSectionBoxResult {
  sectionBox: SectionBoxState;
  enable: () => void;
  disable: () => void;
  toggle: () => void;
  setBounds: (bounds: Partial<SectionBoxBounds>) => void;
  resetBounds: () => void;
  linkToLevel: (levelId: string, elevation: number, height: number) => void;
  unlinkFromLevel: () => void;
}

export function useSectionBox(initialBounds?: Partial<SectionBoxBounds>): UseSectionBoxResult {
  const [sectionBox, setSectionBox] = useState<SectionBoxState>({
    enabled: false,
    bounds: { ...DEFAULT_BOUNDS, ...initialBounds },
    linkedLevelId: null,
  });

  const enable = useCallback(() => {
    setSectionBox((s) => ({ ...s, enabled: true }));
  }, []);

  const disable = useCallback(() => {
    setSectionBox((s) => ({ ...s, enabled: false }));
  }, []);

  const toggle = useCallback(() => {
    setSectionBox((s) => ({ ...s, enabled: !s.enabled }));
  }, []);

  const setBounds = useCallback((partial: Partial<SectionBoxBounds>) => {
    setSectionBox((s) => ({
      ...s,
      bounds: { ...s.bounds, ...partial },
    }));
  }, []);

  const resetBounds = useCallback(() => {
    setSectionBox((s) => ({
      ...s,
      bounds: { ...DEFAULT_BOUNDS },
      linkedLevelId: null,
    }));
  }, []);

  const linkToLevel = useCallback((levelId: string, elevation: number, height: number) => {
    setSectionBox((s) => ({
      ...s,
      enabled: true,
      linkedLevelId: levelId,
      bounds: {
        ...s.bounds,
        minZ: elevation,
        maxZ: elevation + height,
      },
    }));
  }, []);

  const unlinkFromLevel = useCallback(() => {
    setSectionBox((s) => ({ ...s, linkedLevelId: null }));
  }, []);

  return { sectionBox, enable, disable, toggle, setBounds, resetBounds, linkToLevel, unlinkFromLevel };
}

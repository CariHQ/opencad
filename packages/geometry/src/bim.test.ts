/**
 * BIM Element Tests
 * T-3D-004: Wall/Door/Window/Slab/Roof Tools
 */

import { describe, it, expect } from 'vitest';
import {
  createWall,
  createDoor,
  createWindow,
  createSlab,
  createRoof,
  insertHostedElement,
  getHostedElements,
  type BIMWall,
  type BIMDoor,
  type BIMWindow,
  type BIMSlab,
  type BIMRoof,
} from './bim';

describe('T-3D-004: Wall/Door/Window Tools', () => {
  // ─── Wall ──────────────────────────────────────────────────────────────────

  describe('Wall creation', () => {
    it('should create a wall with correct geometry', () => {
      const wall = createWall({ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 }, {
        height: 3,
        thickness: 0.2,
      });
      expect(wall.type).toBe('wall');
      expect(wall.start).toEqual({ x: 0, y: 0, z: 0 });
      expect(wall.end).toEqual({ x: 5, y: 0, z: 0 });
      expect(wall.height).toBe(3);
      expect(wall.thickness).toBe(0.2);
    });

    it('should compute wall length', () => {
      const wall = createWall({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 }, {
        height: 3,
        thickness: 0.2,
      });
      // Length = 5 (3-4-5 triangle)
      expect(wall.length).toBeCloseTo(5, 5);
    });

    it('should compute wall volume', () => {
      const wall = createWall({ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 }, {
        height: 3,
        thickness: 0.2,
      });
      // volume = length × height × thickness = 5 × 3 × 0.2 = 3
      expect(wall.volume).toBeCloseTo(3, 5);
    });

    it('should create wall with default thickness when not specified', () => {
      const wall = createWall({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { height: 2.8 });
      expect(wall.thickness).toBeGreaterThan(0);
    });
  });

  // ─── Door ──────────────────────────────────────────────────────────────────

  describe('Door creation', () => {
    it('should create a door with correct dimensions', () => {
      const door = createDoor({ width: 0.9, height: 2.1, thickness: 0.05 });
      expect(door.type).toBe('door');
      expect(door.width).toBe(0.9);
      expect(door.height).toBe(2.1);
      expect(door.thickness).toBe(0.05);
    });

    it('should create door with default swing direction', () => {
      const door = createDoor({ width: 0.9, height: 2.1 });
      expect(door.swing).toBeDefined();
      expect(['left', 'right']).toContain(door.swing);
    });

    it('should respect explicit swing direction', () => {
      const door = createDoor({ width: 0.9, height: 2.1, swing: 'right' });
      expect(door.swing).toBe('right');
    });
  });

  // ─── Window ────────────────────────────────────────────────────────────────

  describe('Window creation', () => {
    it('should create a window with correct dimensions', () => {
      const win = createWindow({ width: 1.2, height: 1.0, sillHeight: 0.9 });
      expect(win.type).toBe('window');
      expect(win.width).toBe(1.2);
      expect(win.height).toBe(1.0);
      expect(win.sillHeight).toBe(0.9);
    });

    it('should compute top-of-window height', () => {
      const win = createWindow({ width: 1.2, height: 1.0, sillHeight: 0.9 });
      expect(win.topHeight).toBeCloseTo(1.9, 5);
    });
  });

  // ─── Slab ──────────────────────────────────────────────────────────────────

  describe('Slab creation', () => {
    it('should create a rectangular slab', () => {
      const slab = createSlab({ width: 6, depth: 8, thickness: 0.25, elevation: 0 });
      expect(slab.type).toBe('slab');
      expect(slab.width).toBe(6);
      expect(slab.depth).toBe(8);
      expect(slab.thickness).toBe(0.25);
    });

    it('should compute slab volume', () => {
      const slab = createSlab({ width: 6, depth: 8, thickness: 0.25, elevation: 0 });
      expect(slab.volume).toBeCloseTo(12, 5); // 6 × 8 × 0.25
    });
  });

  // ─── Roof ──────────────────────────────────────────────────────────────────

  describe('Roof creation', () => {
    it('should create a gabled roof', () => {
      const roof = createRoof({ width: 8, depth: 10, pitch: 30, style: 'gabled' });
      expect(roof.type).toBe('roof');
      expect(roof.style).toBe('gabled');
      expect(roof.pitch).toBe(30);
    });

    it('should compute ridge height from pitch', () => {
      // pitch 45° → height = (width/2) × tan(45°) = 4
      const roof = createRoof({ width: 8, depth: 10, pitch: 45, style: 'gabled' });
      expect(roof.ridgeHeight).toBeCloseTo(4, 1);
    });

    it('should create a flat roof', () => {
      const roof = createRoof({ width: 8, depth: 10, pitch: 0, style: 'flat' });
      expect(roof.style).toBe('flat');
      expect(roof.ridgeHeight).toBe(0);
    });
  });

  // ─── Hosted Elements (doors/windows in walls) ──────────────────────────────

  describe('Hosted element insertion', () => {
    it('should insert a door into a wall', () => {
      const wall: BIMWall = createWall({ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 }, {
        height: 3,
        thickness: 0.2,
      });
      const door: BIMDoor = createDoor({ width: 0.9, height: 2.1 });
      const updated = insertHostedElement(wall, door, { offset: 1.0 });
      expect(updated.hostedElements.length).toBe(1);
      expect(updated.hostedElements[0]!.elementId).toBe(door.id);
      expect(updated.hostedElements[0]!.offset).toBe(1.0);
    });

    it('should insert a window into a wall', () => {
      const wall = createWall({ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 }, {
        height: 3,
        thickness: 0.2,
      });
      const win: BIMWindow = createWindow({ width: 1.2, height: 1.0, sillHeight: 0.9 });
      const updated = insertHostedElement(wall, win, { offset: 2.0 });
      const hosted = getHostedElements(updated);
      expect(hosted).toHaveLength(1);
      expect(hosted[0]!.elementId).toBe(win.id);
    });

    it('should allow multiple hosted elements in one wall', () => {
      const wall = createWall({ x: 0, y: 0, z: 0 }, { x: 8, y: 0, z: 0 }, {
        height: 3,
        thickness: 0.2,
      });
      const door = createDoor({ width: 0.9, height: 2.1 });
      const win = createWindow({ width: 1.2, height: 1.0, sillHeight: 0.9 });
      const w1 = insertHostedElement(wall, door, { offset: 1.0 });
      const w2 = insertHostedElement(w1, win, { offset: 4.0 });
      expect(getHostedElements(w2)).toHaveLength(2);
    });
  });
});

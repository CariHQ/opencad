/**
 * T-BIM-009: Stair Tool tests
 *
 * Verifies: generateStairTreads returns correct y-positions for tread lines,
 * spacing is even, edge cases handled gracefully.
 */
import { describe, it, expect } from 'vitest';
import { generateStairTreads } from './stairUtils';

describe('T-BIM-009: generateStairTreads', () => {
  it('returns an array of StairTread objects', () => {
    const treads = generateStairTreads(0, 0, 1200, 3000, 14);
    expect(Array.isArray(treads)).toBe(true);
    treads.forEach((t) => {
      expect(typeof t.y).toBe('number');
    });
  });

  it('returns numRisers-1 internal tread lines (top and bottom are bounding box edges)', () => {
    const treads = generateStairTreads(0, 0, 1200, 3000, 14);
    expect(treads).toHaveLength(13);
  });

  it('returns numRisers-1 tread lines for different riser count', () => {
    const treads = generateStairTreads(0, 0, 1200, 2400, 10);
    expect(treads).toHaveLength(9);
  });

  it('tread lines are evenly spaced: spacing = depth / numRisers', () => {
    const depth = 3000;
    const numRisers = 14;
    const treads = generateStairTreads(0, 0, 1200, depth, numRisers);
    const expectedSpacing = depth / numRisers;
    for (let i = 1; i < treads.length; i++) {
      expect(treads[i]!.y - treads[i - 1]!.y).toBeCloseTo(expectedSpacing, 5);
    }
  });

  it('with 14 risers and depth 3000mm, spacing is ~214mm', () => {
    const treads = generateStairTreads(0, 0, 1200, 3000, 14);
    const spacing = treads[1]!.y - treads[0]!.y;
    expect(spacing).toBeCloseTo(3000 / 14, 5); // ~214.29mm
  });

  it('first tread is one spacing below the top edge (y)', () => {
    const y = 500;
    const depth = 3000;
    const numRisers = 14;
    const treads = generateStairTreads(0, y, 1200, depth, numRisers);
    const spacing = depth / numRisers;
    expect(treads[0]!.y).toBeCloseTo(y + spacing, 5);
  });

  it('last tread is one spacing above the bottom edge (y + depth)', () => {
    const y = 500;
    const depth = 3000;
    const numRisers = 14;
    const treads = generateStairTreads(0, y, 1200, depth, numRisers);
    const spacing = depth / numRisers;
    expect(treads[treads.length - 1]!.y).toBeCloseTo(y + depth - spacing, 5);
  });

  it('x and width parameters do not affect the y tread positions', () => {
    const treads1 = generateStairTreads(0, 0, 1200, 3000, 14);
    const treads2 = generateStairTreads(500, 0, 800, 3000, 14);
    treads1.forEach((t, i) => {
      expect(t.y).toBeCloseTo(treads2[i]!.y, 5);
    });
  });

  it('returns empty array when numRisers < 2', () => {
    expect(generateStairTreads(0, 0, 1200, 3000, 1)).toHaveLength(0);
    expect(generateStairTreads(0, 0, 1200, 3000, 0)).toHaveLength(0);
  });

  it('returns empty array when depth is zero', () => {
    expect(generateStairTreads(0, 0, 1200, 0, 14)).toHaveLength(0);
  });

  it('returns empty array when depth is negative', () => {
    expect(generateStairTreads(0, 0, 1200, -100, 14)).toHaveLength(0);
  });

  it('works with minimal valid input: 2 risers', () => {
    const treads = generateStairTreads(0, 0, 1200, 1000, 2);
    expect(treads).toHaveLength(1);
    expect(treads[0]!.y).toBeCloseTo(500, 5);
  });
});

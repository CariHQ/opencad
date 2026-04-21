/**
 * T-IO-050: Point cloud import
 */
import { describe, it, expect } from 'vitest';
import { parseXYZ, parsePLY, detectFormat } from './pointCloud';

describe('T-IO-050: parseXYZ', () => {
  it('parses whitespace-separated XYZ points', () => {
    const src = `0 0 0\n1 2 3\n4 5 6\n`;
    const pc = parseXYZ(src);
    expect(pc.renderedCount).toBe(3);
    expect(Array.from(pc.positions)).toEqual([0, 0, 0, 1, 2, 3, 4, 5, 6]);
  });

  it('computes bounds', () => {
    const src = `-1 0 2\n3 -4 5\n0 6 -7\n`;
    const pc = parseXYZ(src);
    expect(pc.bounds.min).toEqual({ x: -1, y: -4, z: -7 });
    expect(pc.bounds.max).toEqual({ x: 3, y: 6, z: 5 });
  });

  it('ignores comments and blank lines', () => {
    const src = `# header\n\n1 2 3\n# note\n4 5 6\n`;
    const pc = parseXYZ(src);
    expect(pc.renderedCount).toBe(2);
  });

  it('parses RGB colours when present', () => {
    const src = `0 0 0 255 0 0\n1 1 1 0 255 0\n`;
    const pc = parseXYZ(src);
    expect(pc.colors).toBeDefined();
    expect(pc.colors![0]).toBeCloseTo(1);
    expect(pc.colors![1]).toBeCloseTo(0);
    expect(pc.colors![3]).toBeCloseTo(0);
    expect(pc.colors![4]).toBeCloseTo(1);
  });

  it('decimates when input exceeds maxPoints', () => {
    const lines: string[] = [];
    for (let i = 0; i < 1000; i++) lines.push(`${i} 0 0`);
    const pc = parseXYZ(lines.join('\n') + '\n', { maxPoints: 100 });
    expect(pc.renderedCount).toBeLessThanOrEqual(100);
    expect(pc.pointCount).toBe(1000);
  });

  it('applies scale factor', () => {
    const src = `1 2 3\n`;
    const pc = parseXYZ(src, { scale: 1000 });
    expect(Array.from(pc.positions)).toEqual([1000, 2000, 3000]);
  });
});

describe('T-IO-050: parsePLY', () => {
  const asciiPly = [
    'ply',
    'format ascii 1.0',
    'element vertex 3',
    'property float x',
    'property float y',
    'property float z',
    'end_header',
    '0 0 0',
    '1 2 3',
    '4 5 6',
    '',
  ].join('\n');

  it('parses ASCII PLY with x/y/z properties', () => {
    const pc = parsePLY(asciiPly);
    expect(pc.renderedCount).toBe(3);
    expect(pc.pointCount).toBe(3);
    expect(Array.from(pc.positions)).toEqual([0, 0, 0, 1, 2, 3, 4, 5, 6]);
  });

  it('parses PLY with vertex colours', () => {
    const src = [
      'ply',
      'format ascii 1.0',
      'element vertex 2',
      'property float x',
      'property float y',
      'property float z',
      'property uchar red',
      'property uchar green',
      'property uchar blue',
      'end_header',
      '0 0 0 255 0 0',
      '1 1 1 0 0 255',
      '',
    ].join('\n');
    const pc = parsePLY(src);
    expect(pc.colors).toBeDefined();
    expect(pc.colors![0]).toBeCloseTo(1);
    expect(pc.colors![5]).toBeCloseTo(1);
  });

  it('returns empty cloud for binary PLY (not yet supported)', () => {
    const src = 'ply\nformat binary_little_endian 1.0\nelement vertex 5\nend_header\n';
    const pc = parsePLY(src);
    expect(pc.renderedCount).toBe(0);
  });
});

describe('T-IO-050: detectFormat', () => {
  it('detects PLY from extension', () => {
    expect(detectFormat('scan.ply', '')).toBe('ply');
  });

  it('detects PLY from magic prefix', () => {
    expect(detectFormat('unknown.dat', 'ply\nformat ascii 1.0\n')).toBe('ply');
  });

  it('defaults to XYZ for unknown extensions', () => {
    expect(detectFormat('scan.txt', '1 2 3\n')).toBe('xyz');
    expect(detectFormat('scan.xyz', '')).toBe('xyz');
  });
});

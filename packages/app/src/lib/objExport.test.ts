/**
 * T-IO-049 3D export tests (GitHub issue #342).
 *
 *   T-IO-049-001 — single cube produces 8 v + 6 f
 *   T-IO-049-002 — MTL file reflects provided materials
 *   T-IO-049-003 — coord conversion Y-up vs Z-up swaps Y and Z
 */
import { describe, it, expect } from 'vitest';
import { serializeOBJ, serializeMTL, type MeshGroup } from './objExport';

function cube(name: string, size = 1): MeshGroup {
  const s = size / 2;
  const vertices = [
    { x: -s, y: -s, z: -s }, { x:  s, y: -s, z: -s },
    { x:  s, y:  s, z: -s }, { x: -s, y:  s, z: -s },
    { x: -s, y: -s, z:  s }, { x:  s, y: -s, z:  s },
    { x:  s, y:  s, z:  s }, { x: -s, y:  s, z:  s },
  ];
  const faces = [
    { indices: [0, 1, 2, 3] }, // bottom
    { indices: [4, 5, 6, 7] }, // top
    { indices: [0, 1, 5, 4] },
    { indices: [1, 2, 6, 5] },
    { indices: [2, 3, 7, 6] },
    { indices: [3, 0, 4, 7] },
  ];
  return { name, vertices, faces };
}

describe('T-IO-049: objExport', () => {
  it('T-IO-049-001: single cube → 8 v lines + 6 f lines + 1 o', () => {
    const obj = serializeOBJ([cube('Cube')]);
    const lines = obj.split('\n').filter((l) => l.length > 0 && !l.startsWith('#'));
    expect(lines.filter((l) => l.startsWith('v ')).length).toBe(8);
    expect(lines.filter((l) => l.startsWith('f ')).length).toBe(6);
    expect(lines.filter((l) => l.startsWith('o ')).length).toBe(1);
  });

  it('T-IO-049-002: MTL file lists every material with Kd', () => {
    const mtl = serializeMTL([
      { name: 'Concrete', Kd: [0.6, 0.6, 0.6] },
      { name: 'Wood',     Kd: [0.6, 0.45, 0.3] },
    ]);
    expect(mtl).toContain('newmtl Concrete');
    expect(mtl).toContain('Kd 0.6000 0.6000 0.6000');
    expect(mtl).toContain('newmtl Wood');
  });

  it('T-IO-049-003: Z-up swaps Y and negates Z', () => {
    const one: MeshGroup = {
      name: 'Point', vertices: [{ x: 0, y: 1, z: 2 }], faces: [],
    };
    const y = serializeOBJ([one], { coordSystem: 'y-up' });
    const z = serializeOBJ([one], { coordSystem: 'z-up' });
    expect(y).toContain('v 0.000000 1.000000 2.000000');
    expect(z).toContain('v 0.000000 2.000000 -1.000000');
  });

  it('multiple groups offset face indices correctly', () => {
    const obj = serializeOBJ([cube('A'), cube('B')]);
    // Group B's first face should reference vertices 9..12 (8 cube A + 8 cube B)
    const fLines = obj.split('\n').filter((l) => l.startsWith('f '));
    expect(fLines.length).toBe(12);
    // Last face references indices > 8
    const last = fLines[fLines.length - 1]!;
    for (const idx of last.slice(2).split(' ')) {
      expect(parseInt(idx, 10)).toBeGreaterThan(8);
    }
  });

  it('mtllib line appears when filename is provided', () => {
    const obj = serializeOBJ([cube('A')], { mtlFileName: 'out.mtl' });
    expect(obj).toContain('mtllib out.mtl');
  });

  it('usemtl line appears when group has a material', () => {
    const g = { ...cube('A'), material: 'Concrete' };
    const obj = serializeOBJ([g]);
    expect(obj).toContain('usemtl Concrete');
  });

  it('unitScale 0.001 converts mm → m', () => {
    const g: MeshGroup = {
      name: 'P', vertices: [{ x: 1000, y: 2000, z: 3000 }], faces: [],
    };
    const obj = serializeOBJ([g], { unitScale: 0.001 });
    expect(obj).toContain('v 1.000000 2.000000 3.000000');
  });
});

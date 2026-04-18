/**
 * T-AI-010: AI Design Modification Commands — Tests
 *
 * TDD tests for the natural language design command parser and applier.
 */

import { describe, it, expect } from 'vitest';
import { parseDesignCommand, applyDesignCommand, type DesignElement } from './designCommands';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeElement(id: string, overrides: Partial<DesignElement> = {}): DesignElement {
  return {
    id,
    type: 'wall',
    properties: {
      Width: { type: 'number', value: 100 },
      Height: { type: 'number', value: 200 },
      Material: { type: 'string', value: 'brick' },
    },
    propertySets: [],
    geometry: { type: 'brep', data: null },
    layerId: 'layer-1',
    levelId: 'level-1',
    transform: {
      translation: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
    boundingBox: {
      min: { x: 0, y: 0, z: 0, _type: 'Point3D' },
      max: { x: 100, y: 200, z: 0, _type: 'Point3D' },
    },
    metadata: {
      id,
      createdBy: 'test',
      createdAt: 0,
      updatedAt: 0,
      version: { clock: {} },
    },
    visible: true,
    locked: false,
    ...overrides,
  };
}

// ─── T-AI-010: parseDesignCommand ────────────────────────────────────────────

describe('T-AI-010: parseDesignCommand parses scale command', () => {
  it('parses "scale by 1.5" as scale command with factor 1.5', () => {
    const cmd = parseDesignCommand('scale by 1.5');
    expect(cmd.type).toBe('scale');
    if (cmd.type === 'scale') {
      expect(cmd.factor).toBe(1.5);
      expect(cmd.target).toBe('all');
    }
  });

  it('parses "scale by 2" as scale command with factor 2', () => {
    const cmd = parseDesignCommand('scale by 2');
    expect(cmd.type).toBe('scale');
    if (cmd.type === 'scale') {
      expect(cmd.factor).toBe(2);
    }
  });

  it('parses "scale by 0.5" as scale command with factor 0.5', () => {
    const cmd = parseDesignCommand('scale by 0.5');
    expect(cmd.type).toBe('scale');
    if (cmd.type === 'scale') {
      expect(cmd.factor).toBe(0.5);
    }
  });

  it('is case-insensitive for scale', () => {
    const cmd = parseDesignCommand('Scale By 1.2');
    expect(cmd.type).toBe('scale');
  });
});

describe('parseDesignCommand parses rotate command', () => {
  it('parses "rotate 90 degrees" as rotate command with 90 degrees', () => {
    const cmd = parseDesignCommand('rotate 90 degrees');
    expect(cmd.type).toBe('rotate');
    if (cmd.type === 'rotate') {
      expect(cmd.degrees).toBe(90);
      expect(cmd.target).toBe('all');
    }
  });

  it('parses "rotate 45 degrees" correctly', () => {
    const cmd = parseDesignCommand('rotate 45 degrees');
    expect(cmd.type).toBe('rotate');
    if (cmd.type === 'rotate') {
      expect(cmd.degrees).toBe(45);
    }
  });

  it('parses "rotate 180 degrees" correctly', () => {
    const cmd = parseDesignCommand('rotate 180 degrees');
    expect(cmd.type).toBe('rotate');
    if (cmd.type === 'rotate') {
      expect(cmd.degrees).toBe(180);
    }
  });

  it('is case-insensitive for rotate', () => {
    const cmd = parseDesignCommand('Rotate 30 Degrees');
    expect(cmd.type).toBe('rotate');
  });
});

describe('parseDesignCommand parses translate command', () => {
  it('parses "move left 500" as translate with dx=-500, dy=0', () => {
    const cmd = parseDesignCommand('move left 500');
    expect(cmd.type).toBe('translate');
    if (cmd.type === 'translate') {
      expect(cmd.dx).toBe(-500);
      expect(cmd.dy).toBe(0);
      expect(cmd.target).toBe('all');
    }
  });

  it('parses "move right 300" as translate with dx=300, dy=0', () => {
    const cmd = parseDesignCommand('move right 300');
    expect(cmd.type).toBe('translate');
    if (cmd.type === 'translate') {
      expect(cmd.dx).toBe(300);
      expect(cmd.dy).toBe(0);
    }
  });

  it('parses "move up 100" as translate with dx=0, dy=100', () => {
    const cmd = parseDesignCommand('move up 100');
    expect(cmd.type).toBe('translate');
    if (cmd.type === 'translate') {
      expect(cmd.dx).toBe(0);
      expect(cmd.dy).toBe(100);
    }
  });

  it('parses "move down 200" as translate with dx=0, dy=-200', () => {
    const cmd = parseDesignCommand('move down 200');
    expect(cmd.type).toBe('translate');
    if (cmd.type === 'translate') {
      expect(cmd.dx).toBe(0);
      expect(cmd.dy).toBe(-200);
    }
  });

  it('is case-insensitive for translate', () => {
    const cmd = parseDesignCommand('Move Left 100');
    expect(cmd.type).toBe('translate');
  });
});

describe('parseDesignCommand parses setMaterial command', () => {
  it('parses "set material to concrete" as setMaterial', () => {
    const cmd = parseDesignCommand('set material to concrete');
    expect(cmd.type).toBe('setMaterial');
    if (cmd.type === 'setMaterial') {
      expect(cmd.material).toBe('concrete');
      expect(cmd.target).toBe('all');
    }
  });

  it('parses "set material to glass" correctly', () => {
    const cmd = parseDesignCommand('set material to glass');
    expect(cmd.type).toBe('setMaterial');
    if (cmd.type === 'setMaterial') {
      expect(cmd.material).toBe('glass');
    }
  });

  it('parses "set material to brick" correctly', () => {
    const cmd = parseDesignCommand('set material to brick');
    expect(cmd.type).toBe('setMaterial');
    if (cmd.type === 'setMaterial') {
      expect(cmd.material).toBe('brick');
    }
  });

  it('is case-insensitive for setMaterial', () => {
    const cmd = parseDesignCommand('Set Material To Steel');
    expect(cmd.type).toBe('setMaterial');
    if (cmd.type === 'setMaterial') {
      expect(cmd.material).toBe('steel');
    }
  });
});

describe('parseDesignCommand returns unknown for unrecognized input', () => {
  it('returns unknown type with raw text for gibberish', () => {
    const cmd = parseDesignCommand('do something weird');
    expect(cmd.type).toBe('unknown');
    if (cmd.type === 'unknown') {
      expect(cmd.raw).toBe('do something weird');
    }
  });

  it('returns unknown for empty string', () => {
    const cmd = parseDesignCommand('');
    expect(cmd.type).toBe('unknown');
  });

  it('returns unknown for partially matching text', () => {
    const cmd = parseDesignCommand('scale');
    expect(cmd.type).toBe('unknown');
  });

  it('preserves original raw text in unknown result', () => {
    const raw = 'flip horizontally';
    const cmd = parseDesignCommand(raw);
    expect(cmd.type).toBe('unknown');
    if (cmd.type === 'unknown') {
      expect(cmd.raw).toBe(raw);
    }
  });
});

// ─── T-AI-010: applyDesignCommand ────────────────────────────────────────────

describe('applyDesignCommand scale multiplies element dimensions', () => {
  it('scale by 2 doubles transform scale', () => {
    const elements: Record<string, DesignElement> = {
      e1: makeElement('e1'),
    };
    const result = applyDesignCommand(
      { type: 'scale', factor: 2, target: 'all' },
      elements
    );
    expect(result['e1']!.transform.scale.x).toBe(2);
    expect(result['e1']!.transform.scale.y).toBe(2);
    expect(result['e1']!.transform.scale.z).toBe(2);
  });

  it('scale by 0.5 halves transform scale', () => {
    const elements: Record<string, DesignElement> = {
      e1: makeElement('e1'),
    };
    const result = applyDesignCommand(
      { type: 'scale', factor: 0.5, target: 'all' },
      elements
    );
    expect(result['e1']!.transform.scale.x).toBe(0.5);
    expect(result['e1']!.transform.scale.y).toBe(0.5);
  });

  it('scale does not mutate the original elements map', () => {
    const elements: Record<string, DesignElement> = {
      e1: makeElement('e1'),
    };
    applyDesignCommand({ type: 'scale', factor: 3, target: 'all' }, elements);
    expect(elements['e1']!.transform.scale.x).toBe(1); // unchanged
  });

  it('scale applies to all elements in map', () => {
    const elements: Record<string, DesignElement> = {
      e1: makeElement('e1'),
      e2: makeElement('e2'),
    };
    const result = applyDesignCommand(
      { type: 'scale', factor: 1.5, target: 'all' },
      elements
    );
    expect(result['e1']!.transform.scale.x).toBe(1.5);
    expect(result['e2']!.transform.scale.x).toBe(1.5);
  });
});

describe('applyDesignCommand setMaterial updates element material property', () => {
  it('setMaterial updates the Material property value', () => {
    const elements: Record<string, DesignElement> = {
      e1: makeElement('e1'),
    };
    const result = applyDesignCommand(
      { type: 'setMaterial', material: 'concrete', target: 'all' },
      elements
    );
    expect(result['e1']!.properties['Material']?.value).toBe('concrete');
  });

  it('setMaterial does not mutate the original elements', () => {
    const elements: Record<string, DesignElement> = {
      e1: makeElement('e1'),
    };
    applyDesignCommand(
      { type: 'setMaterial', material: 'glass', target: 'all' },
      elements
    );
    expect(elements['e1']!.properties['Material']?.value).toBe('brick'); // unchanged
  });

  it('setMaterial applies to all elements', () => {
    const elements: Record<string, DesignElement> = {
      e1: makeElement('e1'),
      e2: makeElement('e2'),
    };
    const result = applyDesignCommand(
      { type: 'setMaterial', material: 'steel', target: 'all' },
      elements
    );
    expect(result['e1']!.properties['Material']?.value).toBe('steel');
    expect(result['e2']!.properties['Material']?.value).toBe('steel');
  });
});

describe('applyDesignCommand rotate updates element transform rotation', () => {
  it('rotate 90 degrees sets rotation.z to 90', () => {
    const elements: Record<string, DesignElement> = {
      e1: makeElement('e1'),
    };
    const result = applyDesignCommand(
      { type: 'rotate', degrees: 90, target: 'all' },
      elements
    );
    expect(result['e1']!.transform.rotation.z).toBe(90);
  });
});

describe('applyDesignCommand translate updates element transform translation', () => {
  it('translate dx=-500 dy=0 moves translation.x by -500', () => {
    const elements: Record<string, DesignElement> = {
      e1: makeElement('e1'),
    };
    const result = applyDesignCommand(
      { type: 'translate', dx: -500, dy: 0, target: 'all' },
      elements
    );
    expect(result['e1']!.transform.translation.x).toBe(-500);
    expect(result['e1']!.transform.translation.y).toBe(0);
  });

  it('translate accumulates with existing translation', () => {
    const elements: Record<string, DesignElement> = {
      e1: makeElement('e1', {
        transform: {
          translation: { x: 100, y: 50, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
      }),
    };
    const result = applyDesignCommand(
      { type: 'translate', dx: 200, dy: -50, target: 'all' },
      elements
    );
    expect(result['e1']!.transform.translation.x).toBe(300);
    expect(result['e1']!.transform.translation.y).toBe(0);
  });
});

describe('applyDesignCommand unknown leaves elements unchanged', () => {
  it('unknown command returns a copy of elements without modification', () => {
    const elements: Record<string, DesignElement> = {
      e1: makeElement('e1'),
    };
    const result = applyDesignCommand(
      { type: 'unknown', raw: 'do nothing' },
      elements
    );
    expect(result['e1']!.transform.scale.x).toBe(1);
    expect(result['e1']!.properties['Material']?.value).toBe('brick');
  });
});

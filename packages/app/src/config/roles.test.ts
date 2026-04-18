import { describe, it, expect } from 'vitest';
import { ROLE_CONFIGS, type RoleId } from './roles';

// T-ROLE-DATA-001: every role config has required fields
describe('ROLE_CONFIGS', () => {
  const roles = Object.keys(ROLE_CONFIGS) as RoleId[];

  it('defines configs for all 7 roles', () => {
    expect(roles).toHaveLength(7);
    expect(roles).toContain('architect');
    expect(roles).toContain('structural');
    expect(roles).toContain('mep');
    expect(roles).toContain('contractor');
    expect(roles).toContain('owner');
    expect(roles).toContain('pm');
    expect(roles).toContain('admin');
  });

  roles.forEach((role) => {
    it(`${role}: config has all required fields`, () => {
      const cfg = ROLE_CONFIGS[role];
      expect(cfg.label).toBeTruthy();
      expect(Array.isArray(cfg.tools)).toBe(true);
      expect(Array.isArray(cfg.panels)).toBe(true);
      expect(cfg.viewportMode === 'interactive' || cfg.viewportMode === 'view-only').toBe(true);
      expect(cfg.writableLayers === 'all' || Array.isArray(cfg.writableLayers)).toBe(true);
    });
  });

  it('architect has full tool access', () => {
    const cfg = ROLE_CONFIGS['architect'];
    expect(cfg.tools).toContain('wall');
    expect(cfg.tools).toContain('window');
    expect(cfg.tools).toContain('ai');
    expect(cfg.writableLayers).toBe('all');
    expect(cfg.viewportMode).toBe('interactive');
  });

  it('owner has no tools and is view-only', () => {
    const cfg = ROLE_CONFIGS['owner'];
    expect(cfg.tools).toHaveLength(0);
    expect(cfg.viewportMode).toBe('view-only');
  });

  it('structural engineer has compliance panel', () => {
    const cfg = ROLE_CONFIGS['structural'];
    expect(cfg.panels).toContain('compliance');
  });

  it('owner and pm are view-only', () => {
    expect(ROLE_CONFIGS['owner'].viewportMode).toBe('view-only');
    expect(ROLE_CONFIGS['pm'].viewportMode).toBe('view-only');
  });

  it('admin is view-only', () => {
    expect(ROLE_CONFIGS['admin'].viewportMode).toBe('view-only');
  });
});

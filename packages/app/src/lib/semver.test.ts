import { describe, it, expect } from 'vitest';
import { parseSemver, bumpVersion, isPrerelease } from './semver';

describe('T-INFRA-002: Semantic versioning utilities', () => {
  it('parses a valid semver string', () => {
    const v = parseSemver('1.2.3');
    expect(v).toEqual({ major: 1, minor: 2, patch: 3, prerelease: null });
  });

  it('parses a prerelease semver', () => {
    const v = parseSemver('2.0.0-rc.1');
    expect(v?.prerelease).toBe('rc.1');
  });

  it('returns null for invalid semver', () => {
    expect(parseSemver('not-a-version')).toBeNull();
  });

  it('bumps patch version', () => {
    expect(bumpVersion('1.2.3', 'patch')).toBe('1.2.4');
  });

  it('bumps minor version and resets patch', () => {
    expect(bumpVersion('1.2.3', 'minor')).toBe('1.3.0');
  });

  it('bumps major version and resets minor/patch', () => {
    expect(bumpVersion('1.2.3', 'major')).toBe('2.0.0');
  });

  it('identifies prerelease versions', () => {
    expect(isPrerelease('1.0.0-rc.1')).toBe(true);
    expect(isPrerelease('1.0.0-beta')).toBe(true);
    expect(isPrerelease('1.0.0-alpha.1')).toBe(true);
    expect(isPrerelease('1.0.0')).toBe(false);
  });

  it('formats version as v-prefixed tag', () => {
    const v = parseSemver('3.1.4');
    expect(v ? `v${v.major}.${v.minor}.${v.patch}` : '').toBe('v3.1.4');
  });
});

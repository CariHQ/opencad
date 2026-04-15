export interface SemverVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
}

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/;

export function parseSemver(version: string): SemverVersion | null {
  const m = SEMVER_RE.exec(version);
  if (!m) return null;
  return {
    major: parseInt(m[1]!),
    minor: parseInt(m[2]!),
    patch: parseInt(m[3]!),
    prerelease: m[4] ?? null,
  };
}

export function bumpVersion(version: string, type: 'major' | 'minor' | 'patch'): string {
  const v = parseSemver(version);
  if (!v) throw new Error(`Invalid semver: ${version}`);

  switch (type) {
    case 'major': return `${v.major + 1}.0.0`;
    case 'minor': return `${v.major}.${v.minor + 1}.0`;
    case 'patch': return `${v.major}.${v.minor}.${v.patch + 1}`;
  }
}

export function isPrerelease(version: string): boolean {
  const v = parseSemver(version);
  return v !== null && v.prerelease !== null;
}

/**
 * Update check utility — queries the server for the latest release and compares semver.
 * T-DSK-012: Auto-update pipeline.
 */

export interface UpdateInfo {
  available: boolean;
  version?: string;
  notes?: string;
  downloadUrl?: string;
}

interface ReleaseResponse {
  version: string;
  notes: string;
  downloadUrl: string;
}

/**
 * Parse a semver string into a numeric tuple for comparison.
 * Returns [major, minor, patch] or null if unparseable.
 */
function parseSemver(version: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) return null;
  return [parseInt(match[1]!, 10), parseInt(match[2]!, 10), parseInt(match[3]!, 10)];
}

/**
 * Returns > 0 if a > b, 0 if equal, < 0 if a < b.
 */
function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return 0;
  for (let i = 0; i < 3; i++) {
    const diff = pa[i]! - pb[i]!;
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Check whether a newer version is available by querying /api/v1/releases/latest.
 * Returns `{ available: false }` on any error (graceful degradation).
 */
export async function checkForUpdate(currentVersion: string): Promise<UpdateInfo> {
  try {
    const res = await fetch('/api/v1/releases/latest');
    if (!res.ok) return { available: false };

    const data = (await res.json()) as ReleaseResponse;
    const isNewer = compareSemver(data.version, currentVersion) > 0;

    if (!isNewer) return { available: false };

    return {
      available: true,
      version: data.version,
      notes: data.notes,
      downloadUrl: data.downloadUrl,
    };
  } catch {
    return { available: false };
  }
}

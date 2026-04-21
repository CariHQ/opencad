/**
 * Plugin Manifest
 * T-PLG-001: Manifest schema, validation, and required fields
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type PluginPermission = 'network' | 'storage' | 'ui' | 'document';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  permissions: PluginPermission[];
  entrypoint: string; // URL, `inline:<key>`, or module path
  /** Optional SRI hash (sha384-…) for bundle integrity verification. */
  sriHash?: string;
  /** Optional icon URL shown in the marketplace card. */
  icon?: string;
  /** Optional author/publisher name. */
  author?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const MANIFEST_REQUIRED_FIELDS: string[] = [
  'id',
  'name',
  'version',
  'description',
  'permissions',
  'entrypoint',
];

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Type guard that validates an unknown value is a valid PluginManifest.
 * Returns true if all required fields are present and have the correct types.
 */
export function validateManifest(manifest: unknown): manifest is PluginManifest {
  if (manifest === null || typeof manifest !== 'object') {
    return false;
  }

  const obj = manifest as Record<string, unknown>;

  for (const field of MANIFEST_REQUIRED_FIELDS) {
    if (!(field in obj)) {
      return false;
    }
  }

  if (typeof obj['id'] !== 'string' || obj['id'].length === 0) return false;
  if (typeof obj['name'] !== 'string' || obj['name'].length === 0) return false;
  if (typeof obj['version'] !== 'string' || obj['version'].length === 0) return false;
  if (typeof obj['description'] !== 'string') return false;
  if (!Array.isArray(obj['permissions'])) return false;
  if (typeof obj['entrypoint'] !== 'string' || obj['entrypoint'].length === 0) return false;

  return true;
}

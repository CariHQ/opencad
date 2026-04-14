/**
 * Plugin Sandbox Module
 * Pure domain logic for sandboxed plugin execution
 * T-PLG-001 through T-PLG-005
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  entryPoint: string;
  resourceLimits?: {
    maxMemoryMB: number;
    maxCpuMs: number;
  };
}

export interface ResourceLimits {
  maxMemoryMB: number;
  maxCpuMs: number;
}

export interface PluginContext {
  pluginId: string;
  isolated: true;
  resourceLimits: ResourceLimits;
  /** Invoke a sandboxed API by name. Returns an error object if forbidden. */
  callAPI(api: string, ...args: unknown[]): unknown;
}

interface APIViolation {
  pluginId: string;
  api: string;
  timestamp: number;
}

// Forbidden API patterns — these are always blocked regardless of permissions
const FORBIDDEN_APIS = new Set([
  'fs.readFile',
  'fs.writeFile',
  'fs.readdir',
  'fs.unlink',
  'fs.rmdir',
  'child_process.exec',
  'child_process.spawn',
  'eval',
  'Function',
  '__proto__',
  'constructor',
]);

const ALLOWED_APIS = new Set(['log', 'createElement', 'getElement', 'querySelector']);

const DEFAULT_LIMITS: ResourceLimits = { maxMemoryMB: 64, maxCpuMs: 5000 };

// ─── T-PLG-001: Plugin Sandbox ────────────────────────────────────────────────

export class PluginSandbox {
  private readonly _loaded = new Map<string, PluginContext>();
  private readonly _violations = new Map<string, APIViolation[]>();

  load(manifest: PluginManifest): PluginContext {
    const limits: ResourceLimits = manifest.resourceLimits ?? { ...DEFAULT_LIMITS };
    const violations: APIViolation[] = [];
    this._violations.set(manifest.id, violations);

    const ctx: PluginContext = {
      pluginId: manifest.id,
      isolated: true,
      resourceLimits: limits,
      callAPI: (api: string, ...args: unknown[]) => {
        if (FORBIDDEN_APIS.has(api)) {
          violations.push({ pluginId: manifest.id, api, timestamp: Date.now() });
          return { error: 'FORBIDDEN', api };
        }
        if (!ALLOWED_APIS.has(api)) {
          violations.push({ pluginId: manifest.id, api, timestamp: Date.now() });
          return { error: 'FORBIDDEN', api };
        }
        // Permitted: log
        if (api === 'log') {
          return { ok: true, args };
        }
        return { ok: true };
      },
    };

    this._loaded.set(manifest.id, ctx);
    return ctx;
  }

  unload(pluginId: string): void {
    this._loaded.delete(pluginId);
    this._violations.delete(pluginId);
  }

  getLoadedPlugins(): string[] {
    return Array.from(this._loaded.keys());
  }

  getViolations(pluginId: string): APIViolation[] {
    return this._violations.get(pluginId) ?? [];
  }
}

// ─── T-PLG-002: Plugin API (createElement) ───────────────────────────────────

interface DocStore {
  addElement(el: Record<string, unknown>): Record<string, unknown>;
  getElement(id: string): Record<string, unknown> | undefined;
}

interface CreatedElement {
  id: string;
  [key: string]: unknown;
}

let _idCounter = 0;

export function createPluginAPI(
  pluginId: string,
  docStore: DocStore
): {
  createElement(props: Record<string, unknown>): CreatedElement;
  getElement(id: string): Record<string, unknown> | undefined;
} {
  return {
    createElement(props: Record<string, unknown>): CreatedElement {
      const id = `plugin-el-${++_idCounter}-${Date.now()}`;
      const el: Record<string, unknown> = { ...props, id, _pluginId: pluginId };
      docStore.addElement(el);
      return el as CreatedElement;
    },
    getElement(id: string) {
      return docStore.getElement(id);
    },
  };
}

// ─── T-PLG-003: Plugin Permission Manager ────────────────────────────────────

type PromptHandler = (pluginId: string, permission: string, resource: string) => Promise<boolean>;

export class PluginPermissionManager {
  private readonly _cache = new Map<string, boolean>();
  private _promptHandler: PromptHandler = async () => false;

  setPromptHandler(handler: PromptHandler): void {
    this._promptHandler = handler;
  }

  async request(pluginId: string, permission: string, resource: string): Promise<boolean> {
    const key = `${pluginId}:${permission}:${resource}`;
    if (this._cache.has(key)) {
      return this._cache.get(key)!;
    }
    const granted = await this._promptHandler(pluginId, permission, resource);
    this._cache.set(key, granted);
    return granted;
  }

  revoke(pluginId: string, permission: string, resource: string): void {
    const key = `${pluginId}:${permission}:${resource}`;
    this._cache.delete(key);
  }
}

// ─── T-PLG-005: Plugin UI Mount ───────────────────────────────────────────────

export class PluginUIMount {
  readonly pluginId: string;
  readonly containerId: string;

  constructor(pluginId: string) {
    this.pluginId = pluginId;
    this.containerId = `plugin-ui-${pluginId}-${Date.now()}`;
  }

  /**
   * Scope a CSS string to the plugin's container element so styles don't leak.
   * Each rule is prefixed with the container selector.
   */
  scopeCSS(css: string): string {
    // Split into rules and prefix each with the container id
    return css
      .split('}')
      .map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return '';
        const braceIdx = trimmed.indexOf('{');
        if (braceIdx === -1) return trimmed;
        const selector = trimmed.slice(0, braceIdx).trim();
        const body = trimmed.slice(braceIdx);
        return `#${this.containerId} ${selector} ${body}}`;
      })
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Create an isolated JS namespace — no globals exposed.
   */
  createNamespace(): Record<string, unknown> {
    return Object.create(null) as Record<string, unknown>;
  }
}

/**
 * Plugin Host
 *
 * Bridges the plugin runtime (WorkerPluginSandbox) to the running application:
 * - Loads every installed plugin into its own worker.
 * - Implements the PluginAPI against the document store and a notifications
 *   channel that the app UI can subscribe to.
 * - Exposes examples (inline plugin scripts) so the marketplace can ship a
 *   functional demo out of the box instead of pointing at a dead CDN.
 */

import { WorkerPluginSandbox, type PluginAPI, type PluginElementSchema } from './workerSandbox';
import { pluginRegistry } from './pluginRegistry';
import type { PluginManifest } from './pluginManifest';
import { useDocumentStore } from '../stores/documentStore';

// ─── Notification channel ────────────────────────────────────────────────────

export interface PluginNotification {
  id: string;
  pluginId: string;
  message: string;
  type: 'info' | 'success' | 'error';
  timestamp: number;
}

type NotifListener = (n: PluginNotification) => void;
const notifListeners = new Set<NotifListener>();

export function onPluginNotification(fn: NotifListener): () => void {
  notifListeners.add(fn);
  return () => { notifListeners.delete(fn); };
}

// ─── Command registry (plugins → UI) ─────────────────────────────────────────

export interface PluginCommand {
  pluginId: string;
  id: string;
  label: string;
}

const registeredCommands: PluginCommand[] = [];
type CommandListener = (commands: PluginCommand[]) => void;
const commandListeners = new Set<CommandListener>();

export function listPluginCommands(): PluginCommand[] {
  return [...registeredCommands];
}

export function onPluginCommandsChange(fn: CommandListener): () => void {
  commandListeners.add(fn);
  return () => { commandListeners.delete(fn); };
}

function notifyCommands(): void {
  for (const fn of commandListeners) fn(listPluginCommands());
}

// ─── Example plugins shipped inline ──────────────────────────────────────────

/**
 * Inline plugin source for demo purposes. Real plugins would fetch from a
 * URL — but the marketplace's catalogue URLs resolve to a nonexistent CDN,
 * so we ship these two as working examples.
 */
const INLINE_PLUGINS: Record<string, string> = {
  'hello-opencad': `
    api.log('Hello OpenCAD plugin loaded');
    api.ui.showNotification('Hello OpenCAD is running', 'success');
    api.ui.registerCommand(
      { id: 'say-hi', label: 'Say hi again' },
      function() {
        api.ui.showNotification('Hi from the hello-opencad plugin.', 'info');
      },
    );
  `,
  'element-counter': `
    (async () => {
      try {
        const elements = await api.document.getElements();
        api.ui.showNotification('Document has ' + elements.length + ' element(s)', 'info');
      } catch (err) {
        api.log('element-counter failed: ' + err);
      }
    })();
    api.ui.registerCommand(
      { id: 'count-again', label: 'Count elements' },
      function() {
        api.document.getElements().then(function(els) {
          api.ui.showNotification('Document has ' + els.length + ' element(s)', 'info');
        });
      },
    );
  `,
};

// ─── Manifests for the bundled examples ──────────────────────────────────────

export const BUNDLED_PLUGIN_MANIFESTS: PluginManifest[] = [
  {
    id: 'hello-opencad',
    name: 'Hello OpenCAD',
    version: '1.0.0',
    description: 'A minimal example plugin — posts a welcome notification on load.',
    permissions: ['ui'],
    entrypoint: 'inline:hello-opencad',
  },
  {
    id: 'element-counter',
    name: 'Element Counter',
    version: '1.0.0',
    description: 'Counts elements in the active document and posts a notification.',
    permissions: ['document', 'ui'],
    entrypoint: 'inline:element-counter',
  },
];

// ─── PluginAPI backed by the real document store ────────────────────────────

function buildPluginAPI(pluginId: string): PluginAPI {
  return {
    document: {
      getElements(): PluginElementSchema[] {
        const doc = useDocumentStore.getState().document;
        if (!doc) return [];
        return Object.values(doc.content.elements) as unknown as PluginElementSchema[];
      },
      addElement({ type, layerId, properties }): string {
        const id = useDocumentStore.getState().addElement({ type, layerId, properties: properties ?? {} });
        return id;
      },
      updateElement(id, updates): void {
        useDocumentStore.getState().updateElement(id, updates);
      },
      deleteElement(id): void {
        useDocumentStore.getState().deleteElement(id);
      },
    },
    ui: {
      showNotification(message, type = 'info'): void {
        const n: PluginNotification = {
          id: crypto.randomUUID(),
          pluginId,
          message,
          type,
          timestamp: Date.now(),
        };
        for (const fn of notifListeners) fn(n);
      },
      openPanel(_panelId): void {
        // Reserved for richer UI contribution — plugins can't open arbitrary
        // panels today, only post notifications.
      },
      registerCommand(command): void {
        // Idempotent: replace if a plugin re-registers the same id.
        const idx = registeredCommands.findIndex(
          (c) => c.pluginId === pluginId && c.id === command.id,
        );
        const entry: PluginCommand = { pluginId, id: command.id, label: command.label };
        if (idx >= 0) registeredCommands[idx] = entry;
        else registeredCommands.push(entry);
        notifyCommands();
      },
    },
    log(message): void {
      // eslint-disable-next-line no-console
      console.info(`[plugin:${pluginId}]`, message);
    },
  };
}

// ─── Host that actually loads plugins ────────────────────────────────────────

class PluginHost {
  private sandboxes = new Map<string, WorkerPluginSandbox>();
  private started = false;

  /** Invoke a command previously registered by a plugin. */
  runCommand(pluginId: string, commandId: string): void {
    this.sandboxes.get(pluginId)?.runCommand(commandId);
  }

  async startAll(): Promise<void> {
    if (this.started) return;
    this.started = true;

    for (const manifest of pluginRegistry.list()) {
      await this.start(manifest).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn(`[plugin-host] failed to start ${manifest.id}:`, err);
      });
    }

    // Re-sync when the registry changes.
    pluginRegistry.subscribe(() => {
      const installed = new Set(pluginRegistry.list().map((m) => m.id));
      for (const id of this.sandboxes.keys()) {
        if (!installed.has(id)) this.stop(id);
      }
      for (const manifest of pluginRegistry.list()) {
        if (!this.sandboxes.has(manifest.id)) void this.start(manifest);
      }
    });
  }

  async start(manifest: PluginManifest): Promise<void> {
    if (this.sandboxes.has(manifest.id)) return;

    const src = await this.loadSource(manifest);
    if (!src) return;

    // Web Workers are unavailable outside the browser (tests) — skip quietly.
    if (typeof Worker === 'undefined') return;

    const sandbox = new WorkerPluginSandbox();
    // Pass the manifest's declared permissions to the sandbox so every
    // PluginAPI call is gated by what the user consented to at install
    // time. The bundled/curated plugins declare only what they need.
    await sandbox.load(src, buildPluginAPI(manifest.id), manifest.permissions);
    this.sandboxes.set(manifest.id, sandbox);
  }

  stop(id: string): void {
    const sb = this.sandboxes.get(id);
    if (!sb) return;
    sb.dispose();
    this.sandboxes.delete(id);
    // Purge any commands the plugin had registered.
    for (let i = registeredCommands.length - 1; i >= 0; i--) {
      if (registeredCommands[i]!.pluginId === id) registeredCommands.splice(i, 1);
    }
    notifyCommands();
  }

  private async loadSource(manifest: PluginManifest): Promise<string | null> {
    if (manifest.entrypoint.startsWith('inline:')) {
      const key = manifest.entrypoint.slice('inline:'.length);
      return INLINE_PLUGINS[key] ?? null;
    }
    try {
      const res = await fetch(manifest.entrypoint);
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }
}

export const pluginHost = new PluginHost();

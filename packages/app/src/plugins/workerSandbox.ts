/**
 * Worker-based Plugin Sandbox
 * Executes untrusted plugin code in a Web Worker with a restricted postMessage API.
 * T-PLUGIN-001 (Worker variant)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal element schema — mirrors ElementSchema from @opencad/document */
export interface PluginElementSchema {
  id: string;
  type: string;
  layerId?: string;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PluginAPI {
  document: {
    getElements(): PluginElementSchema[];
    addElement(params: { type: string; layerId: string; properties?: Record<string, unknown> }): string;
    updateElement(id: string, updates: Record<string, unknown>): void;
    deleteElement(id: string): void;
  };
  ui: {
    showNotification(message: string, type?: 'info' | 'success' | 'error'): void;
    openPanel(panelId: string): void;
    /** Register a command that appears in the Plugins menu.
     *  When the user runs the command the host sends a 'runCommand'
     *  message back to the worker so the plugin can respond. */
    registerCommand(command: { id: string; label: string }): void;
  };
  log(message: string): void;
}

export interface SandboxMessage {
  type: 'call' | 'return' | 'error' | 'ready' | 'init' | 'runCommand';
  id?: number;
  method?: string;
  args?: unknown[];
  result?: unknown;
  error?: string;
  code?: string;
  commandId?: string;
}

// ─── Worker bootstrap code (injected as a Blob URL) ──────────────────────────

const WORKER_BOOTSTRAP = `
self.__commands__ = {};
self.onmessage = function(e) {
  var msg = e.data;
  if (msg.type === 'init') {
    // Run the plugin code
    try {
      // eslint-disable-next-line no-eval
      (function(api) { eval(msg.code); })(self.__api__);
    } catch (err) {
      self.postMessage({ type: 'error', error: String(err) });
    }
    return;
  }
  if (msg.type === 'runCommand') {
    var fn = self.__commands__[msg.commandId];
    if (typeof fn === 'function') {
      try { fn(); } catch (err) { self.postMessage({ type: 'error', error: String(err) }); }
    }
    return;
  }
  if (msg.type === 'return') {
    var pending = self.__pending__ && self.__pending__[msg.id];
    if (pending) {
      delete self.__pending__[msg.id];
      pending.resolve(msg.result);
    }
    return;
  }
  if (msg.type === 'error') {
    var pendingErr = self.__pending__ && self.__pending__[msg.id];
    if (pendingErr) {
      delete self.__pending__[msg.id];
      pendingErr.reject(new Error(msg.error || 'Unknown error'));
    }
    return;
  }
};

// Build an api proxy that routes calls through postMessage
self.__pending__ = {};
self.__nextId__ = 1;

function makeApiMethod(method) {
  return function() {
    var id = self.__nextId__++;
    var args = Array.prototype.slice.call(arguments);
    return new Promise(function(resolve, reject) {
      self.__pending__[id] = { resolve: resolve, reject: reject };
      self.postMessage({ type: 'call', id: id, method: method, args: args });
    });
  };
}

self.__api__ = {
  document: {
    getElements: makeApiMethod('document.getElements'),
    addElement: makeApiMethod('document.addElement'),
    updateElement: makeApiMethod('document.updateElement'),
    deleteElement: makeApiMethod('document.deleteElement'),
  },
  ui: {
    showNotification: makeApiMethod('ui.showNotification'),
    openPanel: makeApiMethod('ui.openPanel'),
    // registerCommand stores the handler locally (function can't cross
    // the postMessage boundary) and announces { id, label } to the host.
    registerCommand: function(command, handler) {
      if (command && command.id && typeof handler === 'function') {
        self.__commands__[command.id] = handler;
      }
      var id = self.__nextId__++;
      return new Promise(function(resolve, reject) {
        self.__pending__[id] = { resolve: resolve, reject: reject };
        self.postMessage({
          type: 'call',
          id: id,
          method: 'ui.registerCommand',
          args: [{ id: command.id, label: command.label }],
        });
      });
    },
  },
  log: makeApiMethod('log'),
};

self.postMessage({ type: 'ready' });
`;

// ─── Permission gating ───────────────────────────────────────────────────────

export type SandboxPermission = 'network' | 'storage' | 'ui' | 'document';

/** Every API method → the manifest permission it requires. Methods not in
 *  this map are either always-allowed (e.g. `log`) or rejected as unknown. */
const METHOD_PERMISSION: Readonly<Record<string, SandboxPermission | null>> = {
  'document.getElements': 'document',
  'document.addElement': 'document',
  'document.updateElement': 'document',
  'document.deleteElement': 'document',
  'ui.showNotification': 'ui',
  'ui.openPanel': 'ui',
  'ui.registerCommand': 'ui',
  'log': null, // always allowed — diagnostic output has no blast radius
};

/** Thrown from dispatchAPICall when the plugin tries to use an API method
 *  that its manifest does not declare permission for. The sandbox
 *  serialises the message back to the plugin, where it surfaces as a
 *  Promise rejection on the method call. */
export class PluginPermissionError extends Error {
  constructor(method: string, required: SandboxPermission) {
    super(`Plugin permission denied: '${method}' requires '${required}' in manifest.permissions`);
    this.name = 'PluginPermissionError';
  }
}

// ─── API method dispatcher ────────────────────────────────────────────────────

function dispatchAPICall(
  api: PluginAPI,
  method: string,
  args: unknown[],
  permissions: readonly SandboxPermission[],
): unknown {
  const required = METHOD_PERMISSION[method];
  if (required !== undefined && required !== null && !permissions.includes(required)) {
    throw new PluginPermissionError(method, required);
  }
  switch (method) {
    case 'document.getElements':
      return api.document.getElements();
    case 'document.addElement':
      return api.document.addElement(args[0] as Parameters<PluginAPI['document']['addElement']>[0]);
    case 'document.updateElement':
      return api.document.updateElement(args[0] as string, args[1] as Record<string, unknown>);
    case 'document.deleteElement':
      return api.document.deleteElement(args[0] as string);
    case 'ui.showNotification':
      return api.ui.showNotification(args[0] as string, args[1] as 'info' | 'success' | 'error');
    case 'ui.openPanel':
      return api.ui.openPanel(args[0] as string);
    case 'ui.registerCommand':
      return api.ui.registerCommand(args[0] as { id: string; label: string });
    case 'log':
      return api.log(args[0] as string);
    default:
      throw new Error(`Unknown API method: ${method}`);
  }
}

// ─── WorkerPluginSandbox ──────────────────────────────────────────────────────

export class WorkerPluginSandbox {
  private worker: Worker | null = null;
  private pending: Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }> =
    new Map();
  private messageId = 0;
  private permissions: readonly SandboxPermission[] = [];

  async load(
    pluginCode: string,
    api: PluginAPI,
    permissions: readonly SandboxPermission[] = [],
  ): Promise<void> {
    this.permissions = permissions;
    const blob = new Blob([WORKER_BOOTSTRAP], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    this.worker = new Worker(blobUrl);
    URL.revokeObjectURL(blobUrl);

    return new Promise<void>((resolve, reject) => {
      const onMessage = (e: MessageEvent): void => {
        const msg = e.data as SandboxMessage;

        if (msg.type === 'ready') {
          // Worker is bootstrapped — send the plugin code
          this.worker!.removeEventListener('message', onMessage as EventListener);

          // Set up the persistent message handler for API calls / returns
          this.worker!.addEventListener('message', (evt: MessageEvent) => {
            this._handleMessage(evt.data as SandboxMessage, api);
          });

          this.worker!.postMessage({ type: 'init', code: pluginCode } satisfies SandboxMessage);
          resolve();
          return;
        }

        if (msg.type === 'error') {
          reject(new Error(msg.error ?? 'Worker error during init'));
        }
      };

      this.worker!.addEventListener('message', onMessage as EventListener);
      this.worker!.addEventListener('error', (e: ErrorEvent) => {
        reject(new Error(e.message));
      });
    });
  }

  private _handleMessage(msg: SandboxMessage, api: PluginAPI): void {
    if (msg.type === 'call') {
      // Worker is calling an API method. Dispatch through the permission
      // gate and return the result, or send back an error that the plugin
      // will see as a rejected promise.
      const { id, method, args = [] } = msg;
      try {
        const result = dispatchAPICall(api, method ?? '', args, this.permissions);
        this.worker!.postMessage({ type: 'return', id, result } satisfies SandboxMessage);
      } catch (err) {
        this.worker!.postMessage({
          type: 'error',
          id,
          error: err instanceof Error ? err.message : String(err),
        } satisfies SandboxMessage);
      }
      return;
    }

    if (msg.type === 'return') {
      const p = this.pending.get(msg.id!);
      if (p) {
        this.pending.delete(msg.id!);
        p.resolve(msg.result);
      }
      return;
    }

    if (msg.type === 'error') {
      const p = this.pending.get(msg.id!);
      if (p) {
        this.pending.delete(msg.id!);
        p.reject(new Error(msg.error ?? 'Plugin error'));
      }
    }
  }

  async call(method: string, ...args: unknown[]): Promise<unknown> {
    if (!this.worker) {
      throw new Error('Sandbox not loaded — call load() first');
    }
    const id = ++this.messageId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ type: 'call', id, method, args } satisfies SandboxMessage);
    });
  }

  /** Invoke a command previously registered by the plugin via ui.registerCommand. */
  runCommand(commandId: string): void {
    if (!this.worker) return;
    this.worker.postMessage({ type: 'runCommand', commandId } satisfies SandboxMessage);
  }

  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    // Reject any outstanding pending calls
    for (const [, p] of this.pending) {
      p.reject(new Error('Sandbox disposed'));
    }
    this.pending.clear();
  }
}

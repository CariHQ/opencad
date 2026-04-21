/**
 * Background sync queue — PRD §9.4.
 *
 * Periodically drains the offlineStore's pendingSync list by calling
 * a caller-supplied push function. Lives in the page (not a real Service
 * Worker) to keep cross-browser behaviour consistent — every major
 * browser runs the page's in-memory queue reliably, while real SyncManager
 * support is still spotty. Semantics mirror what a SW queue would do:
 *
 *   - idle poll every pollMs when online (default 5000 ms)
 *   - one record at a time, oldest first
 *   - on push failure, exponential back-off with jitter up to maxBackoffMs
 *   - on success, markSynced + reset back-off
 *   - pauses when navigator.onLine reports false, resumes on 'online' event
 */

import { listPendingSync, loadDocument, markSynced } from './offlineStore';

export type PushFn = (projectId: string, data: string) => Promise<void>;

export interface BackgroundSyncOptions {
  pollMs?: number;
  maxBackoffMs?: number;
  push: PushFn;
}

let timer: ReturnType<typeof setTimeout> | null = null;
let backoff = 0;
let running = false;
let pushRef: PushFn | null = null;
let pollMsRef = 5000;
let maxBackoffRef = 60_000;

async function drainOnce(): Promise<void> {
  if (!pushRef) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  try {
    const pending = await listPendingSync();
    if (pending.length === 0) { backoff = 0; return; }
    const [projectId] = pending;
    const data = await loadDocument(projectId!);
    if (!data) return;
    await pushRef(projectId!, data);
    await markSynced(projectId!);
    backoff = 0;
  } catch {
    backoff = Math.min(backoff === 0 ? pollMsRef : backoff * 2, maxBackoffRef);
  }
}

function scheduleNext(): void {
  if (!running) return;
  const delay = backoff > 0 ? backoff + Math.floor(Math.random() * 1000) : pollMsRef;
  timer = setTimeout(async () => {
    await drainOnce();
    scheduleNext();
  }, delay);
}

export function startBackgroundSync(options: BackgroundSyncOptions): () => void {
  stopBackgroundSync();
  pushRef = options.push;
  pollMsRef = options.pollMs ?? 5000;
  maxBackoffRef = options.maxBackoffMs ?? 60_000;
  running = true;
  scheduleNext();

  const onOnline = (): void => {
    if (timer) clearTimeout(timer);
    backoff = 0;
    scheduleNext();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('online', onOnline);
  }
  return () => {
    if (typeof window !== 'undefined') window.removeEventListener('online', onOnline);
    stopBackgroundSync();
  };
}

export function stopBackgroundSync(): void {
  running = false;
  if (timer) { clearTimeout(timer); timer = null; }
  backoff = 0;
}

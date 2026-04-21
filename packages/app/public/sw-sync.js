/**
 * Service Worker sync event handler — imported by the generated SW.
 *
 * When the browser fires a 'sync' event (registered from the page via
 * SyncManager.register), we can't touch the page's in-memory state —
 * the SW lives in a separate context. Instead we broadcast a message to
 * any open clients; they run the normal drain loop. If no client is
 * open, the sync is left for the next page-load — the pendingSync flag
 * in IndexedDB remains set so the record isn't lost.
 */

self.addEventListener('sync', (event) => {
  if (event.tag !== 'opencad-doc-sync') return;
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      for (const client of clients) {
        client.postMessage({ type: 'opencad-sync-wake' });
      }
    })()
  );
});

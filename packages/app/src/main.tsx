import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';
// Initialise i18next before any component renders. The module's IIFE
// registers namespaces and detects the preferred locale; importing it
// for side effects is enough — no exports are used at this boot layer.
import './i18n';

// Register service worker for PWA / offline support.
// vite-plugin-pwa generates the SW and the virtual module at build time.
// In dev mode the virtual module is a no-op so this is safe in all environments.
import { registerSW } from 'virtual:pwa-register';
import { initSyncCrdt } from './lib/syncAdapter';
import { useDocumentStore } from './stores/documentStore';
import { installDiagWindow } from './lib/diagWindow';

registerSW({ immediate: false });

// Kick off WASM load in the background — document mutations tolerate the
// short window before the CRDT is ready (crdtApply* are no-ops when not ready).
void initSyncCrdt();

// Dev-only: expose window.__opencadDiag for the Playwright autonomous-build
// harness so it can read the live document and run the compliance engine
// without re-parsing persisted JSON. No-op in production.
installDiagWindow(
  () => useDocumentStore.getState().document,
  (tool, key, value) => useDocumentStore.getState().setToolParam(tool, key, value),
);

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

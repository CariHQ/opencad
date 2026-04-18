import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';

// Register service worker for PWA / offline support.
// vite-plugin-pwa generates the SW and the virtual module at build time.
// In dev mode the virtual module is a no-op so this is safe in all environments.
import { registerSW } from 'virtual:pwa-register';
import { initSyncCrdt } from './lib/syncAdapter';

registerSW({ immediate: false });

// Kick off WASM load in the background — document mutations tolerate the
// short window before the CRDT is ready (crdtApply* are no-ops when not ready).
void initSyncCrdt();

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

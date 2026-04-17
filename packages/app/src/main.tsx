import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';

// Stamp the HTML element before React mounts so CSS can target Tauri vs browser
// without any runtime flicker.  The class is used purely for layout — e.g.
// shifting the toolbar right to clear the macOS traffic-light buttons.
if (typeof window !== 'undefined' && (window as Window & { __TAURI__?: unknown }).__TAURI__) {
  document.documentElement.classList.add('tauri-window');
}

// Register service worker for PWA / offline support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failure is non-fatal
    });
  });
}

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

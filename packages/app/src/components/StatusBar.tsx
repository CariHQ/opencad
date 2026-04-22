import { useEffect, useState } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { SyncStatusBar, type SyncStatus } from './SyncStatusBar';
import { getStorageUsage, isStorageQuotaWarning } from '@opencad/document';
import { useRole } from '../hooks/useRole';
import { RoleSwitcher } from './RoleSwitcher';
import { LanguageSelector } from './LanguageSelector';
import {
  getSharedFrameStats,
  getActiveRendererBackend,
  onActiveRendererBackendChange,
  type ActiveRendererBackend,
} from '../hooks/useThreeViewport';

interface StatusBarProps {
  /** Pass '3d' to show the fps performance counter */
  viewType?: 'floor-plan' | '3d' | 'section';
}

export function StatusBar({ viewType }: StatusBarProps = {}) {
  const { document: doc, isOnline, isSaving, lastSaved, selectedIds } = useDocumentStore();
  const [storageWarning, setStorageWarning] = useState(false);
  const { role, config } = useRole();
  const [fpsDisplay, setFpsDisplay] = useState<{ fps: number; color: string } | null>(null);
  const [backend, setBackend] = useState<ActiveRendererBackend>(() => getActiveRendererBackend());
  useEffect(() => onActiveRendererBackendChange(setBackend), []);

  const syncStatus: SyncStatus = !isOnline ? 'offline' : isSaving ? 'syncing' : 'connected';

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const { used, quota } = await getStorageUsage();
        if (active) setStorageWarning(isStorageQuotaWarning(used, quota));
      } catch { /* non-fatal */ }
    };
    void check();
    const id = setInterval(() => { void check(); }, 5 * 60 * 1000);
    return () => { active = false; clearInterval(id); };
  }, []);

  // ── FPS counter — only active when in 3D view ──────────────────────────────
  useEffect(() => {
    if (viewType !== '3d') {
      setFpsDisplay(null);
      return;
    }
    const id = setInterval(() => {
      const stats = getSharedFrameStats();
      const fps = stats.avgFrameMs > 0 ? Math.round(1000 / stats.avgFrameMs) : 60;
      let color: string;
      if (fps >= 55) {
        color = 'var(--color-success, #22c55e)';
      } else if (fps >= 30) {
        color = 'var(--color-warning, #f59e0b)';
      } else {
        color = 'var(--color-error, #ef4444)';
      }
      setFpsDisplay({ fps, color });
    }, 500);
    return () => { clearInterval(id); };
  }, [viewType]);

  return (
    <footer className="app-status-bar">
      <div className="status-left">
        <SyncStatusBar
          status={syncStatus}
          pendingOps={0}
          lastSynced={lastSaved}
        />
        {storageWarning && (
          <span className="status-storage-warning" title="Storage usage is above 80% — consider exporting your projects">
            ⚠ Storage almost full
          </span>
        )}
      </div>

      <div className="status-right">
        {selectedIds.length > 0 && (
          <div className="status-item">
            <span>{selectedIds.length} selected</span>
          </div>
        )}
        {doc && (
          <div className="status-item">
            <span>{Object.keys(doc.content.elements).length} elements</span>
          </div>
        )}
        {fpsDisplay && (
          <div className="status-item status-fps" title="Rolling average frame rate">
            <span style={{ color: fpsDisplay.color }}>
              {fpsDisplay.fps >= 55
                ? `${fpsDisplay.fps} fps`
                : fpsDisplay.fps >= 30
                  ? '< 30 fps'
                  : '< 20 fps'}
            </span>
          </div>
        )}
        {viewType === '3d' && (
          <div
            className="status-item status-backend"
            title={
              backend === 'webgpu'
                ? 'Three.js WebGPURenderer — compute shaders enabled'
                : 'WebGL 2.0 fallback — WebGPU unavailable or disabled'
            }
          >
            <span className={`backend-badge backend-badge--${backend}`}>
              {backend === 'webgpu' ? 'WebGPU' : 'WebGL'}
            </span>
          </div>
        )}
        <div className="status-item" title={`Current role: ${config.label}`}>
          <span className={`role-badge role-badge--${role}`}>{config.label}</span>
        </div>
        {/* Language selector — persists to localStorage, lazy-loads the
            chosen locale's bundle. Placed here for discoverability
            without adding a dedicated row of chrome. */}
        <div className="status-item">
          <LanguageSelector />
        </div>
        {import.meta.env.DEV && <RoleSwitcher />}
      </div>
    </footer>
  );
}

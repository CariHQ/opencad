/**
 * UpdateBanner — displays an in-app notification when a newer version is available.
 * T-DSK-012: Auto-update pipeline.
 */

import React, { useState } from 'react';
import { installUpdate } from '../hooks/useTauri';
import type { TauriUpdateInfo } from '../hooks/useTauri';

interface UpdateBannerProps {
  /** Update info from the Tauri updater plugin. */
  info: TauriUpdateInfo;
  /** Called when the user dismisses the banner. */
  onDismiss?: () => void;
}

const SESSION_KEY = 'opencad_update_dismissed';

export function UpdateBanner({ info, onDismiss }: UpdateBannerProps): React.ReactElement | null {
  const alreadyDismissed = sessionStorage.getItem(SESSION_KEY) === 'true';
  const [dismissed, setDismissed] = useState(alreadyDismissed);
  const [installing, setInstalling] = useState(false);

  if (dismissed) {
    return null;
  }

  function handleDismiss(): void {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setDismissed(true);
    onDismiss?.();
  }

  async function handleInstall(): Promise<void> {
    setInstalling(true);
    await installUpdate();
    // installUpdate triggers app restart on success; if we reach here there was an error
    setInstalling(false);
  }

  return (
    <div
      data-testid="update-banner"
      role="banner"
      style={{
        padding: '8px 16px',
        background: '#1e3a5f',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <span data-testid="update-version">
        Version {info.version} is available
      </span>
      {info.body && (
        <span style={{ opacity: 0.8, fontSize: '0.875em' }}>{info.body}</span>
      )}
      <button
        data-testid="install-update-btn"
        onClick={() => void handleInstall()}
        disabled={installing}
        style={{
          padding: '4px 10px',
          background: '#0d99ff',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: installing ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          fontSize: '0.875em',
        }}
      >
        {installing ? 'Installing...' : 'Install Update'}
      </button>
      <button
        data-testid="dismiss-update-btn"
        onClick={handleDismiss}
        style={{
          marginLeft: 'auto',
          background: 'transparent',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
        }}
        aria-label="Dismiss update notification"
      >
        Dismiss
      </button>
    </div>
  );
}

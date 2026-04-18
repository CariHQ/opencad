/**
 * UpdateBanner — displays an in-app notification when a newer version is available.
 * T-DSK-012: Auto-update pipeline.
 */

import React, { useState } from 'react';
import type { UpdateInfo } from '../lib/updateCheck';

interface UpdateBannerProps {
  updateInfo: UpdateInfo;
}

const SESSION_KEY = 'opencad_update_dismissed';

export function UpdateBanner({ updateInfo }: UpdateBannerProps): React.ReactElement | null {
  const alreadyDismissed = sessionStorage.getItem(SESSION_KEY) === 'true';
  const [dismissed, setDismissed] = useState(alreadyDismissed);

  if (!updateInfo.available || dismissed) {
    return null;
  }

  function handleDismiss(): void {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setDismissed(true);
  }

  return (
    <div data-testid="update-banner" role="banner" style={{ padding: '8px 16px', background: '#1e3a5f', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span data-testid="update-version">
        Version {updateInfo.version} is available
      </span>
      {updateInfo.notes && (
        <span style={{ opacity: 0.8, fontSize: '0.875em' }}>{updateInfo.notes}</span>
      )}
      {updateInfo.downloadUrl && (
        <a
          data-testid="download-update-btn"
          href={updateInfo.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#7dd3fc', fontWeight: 600 }}
        >
          Download update
        </a>
      )}
      <button
        data-testid="dismiss-update-btn"
        onClick={handleDismiss}
        style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
        aria-label="Dismiss update notification"
      >
        Dismiss
      </button>
    </div>
  );
}

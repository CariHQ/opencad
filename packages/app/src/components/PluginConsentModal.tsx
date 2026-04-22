/**
 * Consent modal shown at plugin install time.
 *
 * Surfaces the permissions a plugin is asking for — document, UI, network,
 * storage — in plain language the user can actually reason about. The
 * same manifest.permissions array is enforced at the sandbox boundary at
 * runtime (workerSandbox.ts), so this dialog is not just advisory: a
 * plugin cannot use a permission the user didn't consent to.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PluginPermission } from '../plugins/pluginManifest';

interface PluginConsentModalProps {
  pluginName: string;
  pluginAuthor?: string;
  pluginVersion: string;
  permissions: PluginPermission[];
  /** Called when user accepts — host proceeds with install. */
  onAccept: () => void;
  /** Called when user cancels — no install happens. */
  onCancel: () => void;
}

/** Plain-language permission descriptions. Keep these honest: if we ever
 *  widen what a permission covers, update the copy so users consenting
 *  today know what they're agreeing to. */
const PERMISSION_INFO: Record<PluginPermission, { title: string; detail: string }> = {
  document: {
    title: 'Read and modify your drawings',
    detail: 'Can add, update, and delete elements (walls, doors, slabs, etc.) in documents you have open.',
  },
  ui: {
    title: 'Show notifications and register commands',
    detail: 'Can post messages to the notification area and add entries to the Plugins menu.',
  },
  network: {
    title: 'Make network requests',
    detail: 'Can contact external servers. Only install plugins from authors you trust — a plugin with this permission can exfiltrate data it has access to.',
  },
  storage: {
    title: 'Store data locally',
    detail: 'Can persist state in your browser across sessions.',
  },
};

export function PluginConsentModal({
  pluginName,
  pluginAuthor,
  pluginVersion,
  permissions,
  onAccept,
  onCancel,
}: PluginConsentModalProps): React.ReactElement {
  const { t } = useTranslation('panels');
  return (
    <div
      className="plugin-consent-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plugin-consent-title"
      onClick={onCancel}
    >
      <div className="plugin-consent-modal" onClick={(e) => e.stopPropagation()}>
        <div className="plugin-consent-header">
          <h3 id="plugin-consent-title" className="plugin-consent-title">
            {t('pluginConsent.installPrompt', { name: pluginName })}
          </h3>
          <div className="plugin-consent-meta">
            v{pluginVersion}
            {pluginAuthor ? ` · ${t('pluginConsent.byAuthor', { author: pluginAuthor })}` : ''}
          </div>
        </div>

        {permissions.length === 0 ? (
          <p className="plugin-consent-noperm">
            {t('pluginConsent.noPermissions')}
          </p>
        ) : (
          <>
            <p className="plugin-consent-intro">
              {t('pluginConsent.permissionsIntro')}
            </p>
            <ul className="plugin-consent-perms">
              {permissions.map((perm) => (
                <li key={perm} className="plugin-consent-perm">
                  <span className="plugin-consent-perm-title">
                    {PERMISSION_INFO[perm]?.title ?? perm}
                  </span>
                  <span className="plugin-consent-perm-detail">
                    {PERMISSION_INFO[perm]?.detail ?? `Unknown permission: ${perm}`}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="plugin-consent-actions">
          <button
            type="button"
            className="plugin-consent-cancel"
            onClick={onCancel}
          >
            {t('pluginConsent.cancel')}
          </button>
          <button
            type="button"
            className="plugin-consent-accept"
            onClick={onAccept}
            autoFocus
          >
            {t('pluginConsent.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}

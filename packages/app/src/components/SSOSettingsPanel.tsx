import React, { useState } from 'react';

type SSOProvider = 'saml' | 'oidc';

export interface SSOConfig {
  enabled: boolean;
  provider: SSOProvider;
  entityId: string;
  ssoUrl: string;
  certificate: string;
  oidcClientId: string;
  oidcClientSecret: string;
  oidcDiscoveryUrl: string;
}

interface SSOSettingsPanelProps {
  config: SSOConfig;
  onSave: (config: SSOConfig) => void;
}

export function SSOSettingsPanel({ config: initialConfig, onSave }: SSOSettingsPanelProps) {
  const [config, setConfig] = useState<SSOConfig>(initialConfig);

  const update = (patch: Partial<SSOConfig>) => setConfig((prev) => ({ ...prev, ...patch }));

  return (
    <div className="sso-settings-panel">
      <div className="panel-header">
        <span className="panel-title">SSO Settings — Single Sign-On</span>
      </div>

      <div className="sso-field">
        <label htmlFor="sso-enabled">Enable SSO</label>
        <input
          id="sso-enabled"
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
        />
      </div>

      <div className="sso-field">
        <label htmlFor="sso-provider">Provider</label>
        <select
          id="sso-provider"
          value={config.provider}
          onChange={(e) => update({ provider: e.target.value as SSOProvider })}
        >
          <option value="saml">SAML 2.0</option>
          <option value="oidc">OIDC (OpenID Connect)</option>
        </select>
      </div>

      {config.enabled && config.provider === 'saml' && (
        <div className="saml-fields">
          <h4>SAML Configuration</h4>
          <div className="sso-field">
            <label htmlFor="saml-entity-id">Entity ID</label>
            <input
              id="saml-entity-id"
              type="text"
              value={config.entityId}
              onChange={(e) => update({ entityId: e.target.value })}
              placeholder="https://your-idp.example.com"
            />
          </div>
          <div className="sso-field">
            <label htmlFor="saml-sso-url">SSO URL</label>
            <input
              id="saml-sso-url"
              type="url"
              value={config.ssoUrl}
              onChange={(e) => update({ ssoUrl: e.target.value })}
              placeholder="https://your-idp.example.com/sso"
            />
          </div>
          <div className="sso-field">
            <label htmlFor="saml-cert">X.509 Certificate</label>
            <textarea
              id="saml-cert"
              value={config.certificate}
              onChange={(e) => update({ certificate: e.target.value })}
              placeholder="Paste your IdP X.509 certificate here…"
              rows={4}
            />
          </div>
        </div>
      )}

      {config.enabled && config.provider === 'oidc' && (
        <div className="oidc-fields">
          <h4>OIDC Configuration</h4>
          <div className="sso-field">
            <label htmlFor="oidc-client-id">Client ID</label>
            <input
              id="oidc-client-id"
              type="text"
              value={config.oidcClientId}
              onChange={(e) => update({ oidcClientId: e.target.value })}
              placeholder="your-client-id"
            />
          </div>
          <div className="sso-field">
            <label htmlFor="oidc-client-secret">Client Secret</label>
            <input
              id="oidc-client-secret"
              type="password"
              value={config.oidcClientSecret}
              onChange={(e) => update({ oidcClientSecret: e.target.value })}
              placeholder="••••••••••••••••"
            />
          </div>
          <div className="sso-field">
            <label htmlFor="oidc-discovery-url">Discovery URL</label>
            <input
              id="oidc-discovery-url"
              type="url"
              value={config.oidcDiscoveryUrl}
              onChange={(e) => update({ oidcDiscoveryUrl: e.target.value })}
              placeholder="https://your-idp.example.com/.well-known/openid-configuration"
            />
          </div>
        </div>
      )}

      <button
        aria-label="Save SSO settings"
        className="btn-save"
        onClick={() => onSave(config)}
      >
        Save Settings
      </button>
    </div>
  );
}

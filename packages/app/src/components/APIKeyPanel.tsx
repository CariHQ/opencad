import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export type APIKeyScope = 'read' | 'write' | 'admin';

export interface APIKey {
  id: string;
  name: string;
  prefix: string;
  scopes: APIKeyScope[];
  createdAt: string;
  lastUsed: string | null;
}

interface APIKeyPanelProps {
  keys?: APIKey[];
  onCreate?: (params: { name: string; scopes: APIKeyScope[] }) => void;
  onRevoke?: (keyId: string) => void;
}

export function APIKeyPanel({ keys: propKeys = [], onCreate, onRevoke }: APIKeyPanelProps = {}) {
  const { t } = useTranslation('panels');
  const [keys, setKeys] = useState<APIKey[]>(propKeys);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newScopes, setNewScopes] = useState<APIKeyScope[]>(['read']);

  const toggleScope = (scope: APIKeyScope) => {
    setNewScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const params = { name, scopes: newScopes };
    const newKey: APIKey = {
      id: `key-${Date.now()}`,
      name,
      prefix: 'oc_live_xxxx',
      scopes: newScopes,
      createdAt: new Date().toISOString().slice(0, 10),
      lastUsed: null,
    };
    setKeys((prev) => [...prev, newKey]);
    onCreate?.(params);
    setCreating(false);
    setNewName('');
    setNewScopes(['read']);
  };

  const handleRevoke = (keyId: string) => {
    setKeys((prev) => prev.filter((k) => k.id !== keyId));
    onRevoke?.(keyId);
  };

  return (
    <div className="api-key-panel">
      <div className="panel-header">
        <span className="panel-title">API Keys</span>
        <button
          aria-label={t('settings.apiKeys.createNew', { defaultValue: 'Create new API key' })}
          className="btn-create-key"
          onClick={() => setCreating(!creating)}
        >
          + New API Key
        </button>
      </div>

      {creating && (
        <div className="create-key-form">
          <input
            type="text"
            placeholder={t('settings.apiKeys.keyNamePlaceholder', { defaultValue: 'Key name (e.g. CI/CD Pipeline)' })}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="key-name-input"
          />
          <div className="scope-checkboxes">
            {(['read', 'write', 'admin'] as APIKeyScope[]).map((scope) => (
              <label key={scope} className="scope-label">
                <input
                  type="checkbox"
                  checked={newScopes.includes(scope)}
                  onChange={() => toggleScope(scope)}
                />
                {scope}
              </label>
            ))}
          </div>
          <div className="create-actions">
            <button
              aria-label={t('settings.apiKeys.generate', { defaultValue: 'Generate key' })}
              className="btn-generate"
              onClick={handleCreate}
            >
              Generate Key
            </button>
            <button onClick={() => setCreating(false)} className="btn-cancel">Cancel</button>
          </div>
        </div>
      )}

      <div className="api-keys-list">
        {keys.map((key) => (
          <div key={key.id} className="api-key-row">
            <div className="key-info">
              <span className="key-name">{key.name}</span>
              <span className="key-prefix">{key.prefix}•••••••••••</span>
              <span className="key-scopes">{key.scopes.join(', ')}</span>
              <span className="key-meta">
                Created {key.createdAt}
                {key.lastUsed && ` · Last used ${key.lastUsed}`}
              </span>
            </div>
            <button
              aria-label={`Revoke ${key.name}`}
              className="btn-revoke"
              onClick={() => handleRevoke(key.id)}
            >
              Revoke
            </button>
          </div>
        ))}
        {keys.length === 0 && <div className="keys-empty">{t('settings.apiKeys.empty', { defaultValue: 'No API keys yet.' })}</div>}
      </div>
    </div>
  );
}

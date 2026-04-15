import React, { useState } from 'react';

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
  keys: APIKey[];
  onCreate: (params: { name: string; scopes: APIKeyScope[] }) => void;
  onRevoke: (keyId: string) => void;
}

export function APIKeyPanel({ keys, onCreate, onRevoke }: APIKeyPanelProps) {
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
    onCreate({ name, scopes: newScopes });
    setCreating(false);
    setNewName('');
    setNewScopes(['read']);
  };

  return (
    <div className="api-key-panel">
      <div className="panel-header">
        <span className="panel-title">API Keys</span>
        <button
          aria-label="Create new API key"
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
            placeholder="Key name (e.g. CI/CD Pipeline)"
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
              aria-label="Generate key"
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
              onClick={() => onRevoke(key.id)}
            >
              Revoke
            </button>
          </div>
        ))}
        {keys.length === 0 && <div className="keys-empty">No API keys yet.</div>}
      </div>
    </div>
  );
}

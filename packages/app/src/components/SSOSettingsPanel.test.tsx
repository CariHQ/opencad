import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SSOSettingsPanel } from './SSOSettingsPanel';
expect.extend(jestDomMatchers);

describe('T-AUTH-001: SSOSettingsPanel', () => {
  const onSave = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });

  const defaultConfig = {
    enabled: false,
    provider: 'saml' as const,
    entityId: '',
    ssoUrl: '',
    certificate: '',
    oidcClientId: '',
    oidcClientSecret: '',
    oidcDiscoveryUrl: '',
  };

  it('renders SSO Settings header', () => {
    render(<SSOSettingsPanel config={defaultConfig} onSave={onSave} />);
    expect(screen.getByText(/sso settings|single sign.on/i)).toBeInTheDocument();
  });

  it('shows SSO enabled toggle', () => {
    render(<SSOSettingsPanel config={defaultConfig} onSave={onSave} />);
    expect(screen.getByLabelText(/enable sso/i)).toBeInTheDocument();
  });

  it('shows provider selection (SAML, OIDC)', () => {
    render(<SSOSettingsPanel config={defaultConfig} onSave={onSave} />);
    expect(screen.getByLabelText(/provider/i)).toBeInTheDocument();
    expect(screen.getAllByText(/saml|oidc/i).length).toBeGreaterThan(0);
  });

  it('shows SAML fields when provider is SAML', () => {
    render(<SSOSettingsPanel config={{ ...defaultConfig, enabled: true, provider: 'saml' }} onSave={onSave} />);
    expect(screen.getByLabelText(/entity id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sso url/i)).toBeInTheDocument();
  });

  it('shows OIDC fields when provider is OIDC', () => {
    render(<SSOSettingsPanel config={{ ...defaultConfig, enabled: true, provider: 'oidc' }} onSave={onSave} />);
    expect(screen.getByLabelText(/client id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/discovery url/i)).toBeInTheDocument();
  });

  it('shows Save button', () => {
    render(<SSOSettingsPanel config={defaultConfig} onSave={onSave} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('calls onSave with config when Save clicked', () => {
    render(<SSOSettingsPanel config={defaultConfig} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ provider: 'saml' }));
  });

  it('updates entity ID field', () => {
    render(<SSOSettingsPanel config={{ ...defaultConfig, enabled: true, provider: 'saml' }} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText(/entity id/i), { target: { value: 'https://idp.example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ entityId: 'https://idp.example.com' }));
  });
});

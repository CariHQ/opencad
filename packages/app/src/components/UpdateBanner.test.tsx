/**
 * UpdateBanner component tests
 * T-DSK-012: Desktop auto-update pipeline
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpdateBanner } from './UpdateBanner';
import type { TauriUpdateInfo } from '../hooks/useTauri';

vi.mock('../hooks/useTauri', () => ({
  installUpdate: vi.fn().mockResolvedValue(undefined),
}));

const baseInfo: TauriUpdateInfo = {
  version: '2.0.0',
  body: 'Major release with new features',
  date: '2026-04-18',
};

describe('T-DSK-012: UpdateBanner', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('renders banner when update info is provided', () => {
    render(<UpdateBanner info={baseInfo} />);
    expect(screen.getByTestId('update-banner')).toBeTruthy();
  });

  it('shows the version number', () => {
    render(<UpdateBanner info={baseInfo} />);
    expect(screen.getByTestId('update-version').textContent).toContain('2.0.0');
  });

  it('shows release notes body', () => {
    render(<UpdateBanner info={baseInfo} />);
    expect(screen.getByText('Major release with new features')).toBeTruthy();
  });

  it('install button is present', () => {
    render(<UpdateBanner info={baseInfo} />);
    expect(screen.getByTestId('install-update-btn')).toBeTruthy();
  });

  it('dismiss hides the banner', () => {
    render(<UpdateBanner info={baseInfo} />);
    expect(screen.getByTestId('update-banner')).toBeTruthy();
    fireEvent.click(screen.getByTestId('dismiss-update-btn'));
    expect(screen.queryByTestId('update-banner')).toBeNull();
  });

  it('dismiss calls onDismiss callback', () => {
    const onDismiss = vi.fn();
    render(<UpdateBanner info={baseInfo} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('dismiss-update-btn'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('install button calls installUpdate', async () => {
    const { installUpdate } = await import('../hooks/useTauri');
    render(<UpdateBanner info={baseInfo} />);
    fireEvent.click(screen.getByTestId('install-update-btn'));
    // Allow the async call to settle
    await new Promise((r) => setTimeout(r, 0));
    expect(installUpdate).toHaveBeenCalledOnce();
  });

  it('banner stays hidden when already dismissed in sessionStorage', () => {
    sessionStorage.setItem('opencad_update_dismissed', 'true');
    render(<UpdateBanner info={baseInfo} />);
    expect(screen.queryByTestId('update-banner')).toBeNull();
  });
});

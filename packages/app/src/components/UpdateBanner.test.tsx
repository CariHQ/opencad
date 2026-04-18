/**
 * UpdateBanner component tests
 * T-DSK-012: Auto-update pipeline
 */
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
expect.extend(jestDomMatchers);
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpdateBanner } from './UpdateBanner';
import type { UpdateInfo } from '../lib/updateCheck';

describe('T-DSK-012: UpdateBanner', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('banner not shown when no update available', () => {
    const updateInfo: UpdateInfo = { available: false };
    render(<UpdateBanner updateInfo={updateInfo} />);
    expect(screen.queryByTestId('update-banner')).toBeNull();
  });

  it('banner shown with version when update available', () => {
    const updateInfo: UpdateInfo = {
      available: true,
      version: '2.0.0',
      notes: 'Major release with new features',
      downloadUrl: 'https://example.com/download/2.0.0',
    };
    render(<UpdateBanner updateInfo={updateInfo} />);

    expect(screen.getByTestId('update-banner')).toBeTruthy();
    expect(screen.getByTestId('update-version').textContent).toContain('2.0.0');
  });

  it('download button has correct href', () => {
    const downloadUrl = 'https://example.com/download/2.0.0';
    const updateInfo: UpdateInfo = {
      available: true,
      version: '2.0.0',
      notes: 'Release notes',
      downloadUrl,
    };
    render(<UpdateBanner updateInfo={updateInfo} />);

    const btn = screen.getByTestId('download-update-btn');
    expect(btn.getAttribute('href')).toBe(downloadUrl);
  });

  it('dismiss hides the banner', () => {
    const updateInfo: UpdateInfo = {
      available: true,
      version: '2.0.0',
      notes: 'Release notes',
      downloadUrl: 'https://example.com/download',
    };
    render(<UpdateBanner updateInfo={updateInfo} />);

    expect(screen.getByTestId('update-banner')).toBeTruthy();

    fireEvent.click(screen.getByTestId('dismiss-update-btn'));

    expect(screen.queryByTestId('update-banner')).toBeNull();
  });
});

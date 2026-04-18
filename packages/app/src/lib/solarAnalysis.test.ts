/**
 * Solar Analysis Tests
 * T-AI-030: Solar / daylight analysis
 */

import { describe, it, expect } from 'vitest';
import {
  calculateSolarPosition,
  estimateDaylightHours,
  type SolarConfig,
} from './solarAnalysis';

describe('T-AI-030: calculateSolarPosition', () => {
  it('T-AI-030: returns elevation and azimuth for a given config', () => {
    const config: SolarConfig = { latitude: 40.7, longitude: -74.0, month: 6, hour: 12 };
    const position = calculateSolarPosition(config);
    expect(typeof position.elevation).toBe('number');
    expect(typeof position.azimuth).toBe('number');
    expect(typeof position.hour).toBe('number');
    expect(typeof position.month).toBe('number');
  });

  it('elevation is never negative', () => {
    const configs: SolarConfig[] = [
      { latitude: 90, longitude: 0, month: 12, hour: 6 },
      { latitude: -90, longitude: 0, month: 6, hour: 6 },
      { latitude: 0, longitude: 0, month: 1, hour: 6 },
      { latitude: 70, longitude: 0, month: 12, hour: 12 },
    ];
    for (const config of configs) {
      const pos = calculateSolarPosition(config);
      expect(pos.elevation).toBeGreaterThanOrEqual(0);
    }
  });

  it('elevation is clamped to 90°', () => {
    const config: SolarConfig = { latitude: 0, longitude: 0, month: 6, hour: 12 };
    const pos = calculateSolarPosition(config);
    expect(pos.elevation).toBeLessThanOrEqual(90);
  });

  it('noon (hour=12) has azimuth near 180°', () => {
    const config: SolarConfig = { latitude: 40.7, longitude: -74.0, month: 6, hour: 12 };
    const pos = calculateSolarPosition(config);
    expect(pos.azimuth).toBeCloseTo(180, 0);
  });

  it('hour before noon produces azimuth < 180', () => {
    const config: SolarConfig = { latitude: 40.7, longitude: -74.0, month: 6, hour: 9 };
    const pos = calculateSolarPosition(config);
    expect(pos.azimuth).toBeLessThan(180);
  });

  it('hour after noon produces azimuth > 180', () => {
    const config: SolarConfig = { latitude: 40.7, longitude: -74.0, month: 6, hour: 15 };
    const pos = calculateSolarPosition(config);
    expect(pos.azimuth).toBeGreaterThan(180);
  });

  it('echoes back month and hour in the result', () => {
    const config: SolarConfig = { latitude: 40.7, longitude: -74.0, month: 3, hour: 10 };
    const pos = calculateSolarPosition(config);
    expect(pos.hour).toBe(10);
    expect(pos.month).toBe(3);
  });
});

describe('T-AI-030: estimateDaylightHours', () => {
  it('returns more daylight hours in summer for northern latitudes', () => {
    const summer = estimateDaylightHours(45, 6);
    const winter = estimateDaylightHours(45, 12);
    expect(summer).toBeGreaterThan(winter);
  });

  it('northern hemisphere summer (month 6) has more hours than equator', () => {
    const northSummer = estimateDaylightHours(60, 6);
    const equatorSummer = estimateDaylightHours(0, 6);
    expect(northSummer).toBeGreaterThan(equatorSummer);
  });

  it('result is clamped to 6–18 hours', () => {
    const extremeNorth = estimateDaylightHours(90, 6);
    const extremeSouth = estimateDaylightHours(90, 12);
    expect(extremeNorth).toBeLessThanOrEqual(18);
    expect(extremeSouth).toBeGreaterThanOrEqual(6);
  });

  it('returns approximately 12 hours at equator (month 6)', () => {
    const hours = estimateDaylightHours(0, 6);
    expect(hours).toBeCloseTo(12, 0);
  });
});

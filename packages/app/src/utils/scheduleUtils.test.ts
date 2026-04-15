/**
 * T-SCHED-001: Schedule generation tests
 */
import { describe, it, expect } from 'vitest';
import {
  DOOR_SCHEDULE_COLUMNS,
  WINDOW_SCHEDULE_COLUMNS,
  ROOM_SCHEDULE_COLUMNS,
  getScheduleColumnsForType,
  createSchedule,
  sortScheduleRows,
  filterScheduleRows,
  countByProperty,
  type ScheduleRow,
} from './scheduleUtils';

describe('T-SCHED-001: Schedule Utilities', () => {
  describe('column definitions', () => {
    it('DOOR_SCHEDULE_COLUMNS has mark column', () => {
      expect(DOOR_SCHEDULE_COLUMNS.some((c) => c.key === 'mark')).toBe(true);
    });

    it('WINDOW_SCHEDULE_COLUMNS has sillHeight column', () => {
      expect(WINDOW_SCHEDULE_COLUMNS.some((c) => c.key === 'sillHeight')).toBe(true);
    });

    it('ROOM_SCHEDULE_COLUMNS has area column', () => {
      expect(ROOM_SCHEDULE_COLUMNS.some((c) => c.key === 'area')).toBe(true);
    });

    it('each column has a non-empty label', () => {
      for (const col of [...DOOR_SCHEDULE_COLUMNS, ...WINDOW_SCHEDULE_COLUMNS, ...ROOM_SCHEDULE_COLUMNS]) {
        expect(col.label.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getScheduleColumnsForType', () => {
    it('returns door columns for door type', () => {
      expect(getScheduleColumnsForType('door')).toBe(DOOR_SCHEDULE_COLUMNS);
    });

    it('returns window columns for window type', () => {
      expect(getScheduleColumnsForType('window')).toBe(WINDOW_SCHEDULE_COLUMNS);
    });

    it('returns room columns for room type', () => {
      expect(getScheduleColumnsForType('room')).toBe(ROOM_SCHEDULE_COLUMNS);
    });
  });

  describe('createSchedule', () => {
    it('uses default title for door', () => {
      const s = createSchedule({ type: 'door' });
      expect(s.title).toBe('Door Schedule');
    });

    it('uses default title for window', () => {
      const s = createSchedule({ type: 'window' });
      expect(s.title).toBe('Window Schedule');
    });

    it('accepts custom title', () => {
      const s = createSchedule({ type: 'room', title: 'Level 1 Rooms' });
      expect(s.title).toBe('Level 1 Rooms');
    });

    it('returns empty rows by default', () => {
      const s = createSchedule({ type: 'door' });
      expect(s.rows).toEqual([]);
    });

    it('passes provided rows through', () => {
      const rows: ScheduleRow[] = [{ id: '1', mark: 'D1', width: 900 }];
      const s = createSchedule({ type: 'door', rows });
      expect(s.rows).toHaveLength(1);
      expect(s.rows[0]?.mark).toBe('D1');
    });

    it('sets correct type', () => {
      const s = createSchedule({ type: 'window' });
      expect(s.type).toBe('window');
    });
  });

  describe('sortScheduleRows', () => {
    const rows: ScheduleRow[] = [
      { id: '1', mark: 'D3', width: 1200 },
      { id: '2', mark: 'D1', width: 900 },
      { id: '3', mark: 'D2', width: 900 },
    ];

    it('sorts ascending by mark', () => {
      const sorted = sortScheduleRows(rows, 'mark', 'asc');
      expect(sorted[0]?.mark).toBe('D1');
      expect(sorted[2]?.mark).toBe('D3');
    });

    it('sorts descending by mark', () => {
      const sorted = sortScheduleRows(rows, 'mark', 'desc');
      expect(sorted[0]?.mark).toBe('D3');
    });

    it('does not mutate original array', () => {
      const original = [...rows];
      sortScheduleRows(rows, 'mark');
      expect(rows).toEqual(original);
    });

    it('sorts numerically by width', () => {
      const sorted = sortScheduleRows(rows, 'width', 'desc');
      expect(sorted[0]?.width).toBe(1200);
    });
  });

  describe('filterScheduleRows', () => {
    const rows: ScheduleRow[] = [
      { id: '1', mark: 'D1', material: 'Timber' },
      { id: '2', mark: 'D2', material: 'Aluminium' },
      { id: '3', mark: 'W1', material: 'Timber' },
    ];

    it('returns all rows when query is empty', () => {
      expect(filterScheduleRows(rows, '')).toHaveLength(3);
    });

    it('filters by mark', () => {
      expect(filterScheduleRows(rows, 'D')).toHaveLength(2);
    });

    it('filters by property value', () => {
      expect(filterScheduleRows(rows, 'aluminium')).toHaveLength(1);
    });

    it('is case-insensitive', () => {
      expect(filterScheduleRows(rows, 'TIMBER')).toHaveLength(2);
    });
  });

  describe('countByProperty', () => {
    const rows: ScheduleRow[] = [
      { id: '1', mark: 'D1', material: 'Timber' },
      { id: '2', mark: 'D2', material: 'Timber' },
      { id: '3', mark: 'D3', material: 'Aluminium' },
    ];

    it('counts correctly', () => {
      const counts = countByProperty(rows, 'material');
      expect(counts['Timber']).toBe(2);
      expect(counts['Aluminium']).toBe(1);
    });

    it('returns empty object for empty rows', () => {
      expect(countByProperty([], 'material')).toEqual({});
    });
  });
});

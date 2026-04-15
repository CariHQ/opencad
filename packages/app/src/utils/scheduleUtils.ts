/**
 * T-SCHED-001: Schedule generation — door, window, room schedules
 */

export type ScheduleType = 'door' | 'window' | 'room' | 'column' | 'beam';

export interface ScheduleColumn {
  key: string;
  label: string;
  width?: number;
}

export interface ScheduleRow {
  id: string;
  mark: string;
  [key: string]: string | number | undefined;
}

export interface Schedule {
  type: ScheduleType;
  title: string;
  columns: ScheduleColumn[];
  rows: ScheduleRow[];
}

export const DOOR_SCHEDULE_COLUMNS: ScheduleColumn[] = [
  { key: 'mark', label: 'Mark', width: 60 },
  { key: 'width', label: 'Width (mm)', width: 80 },
  { key: 'height', label: 'Height (mm)', width: 80 },
  { key: 'material', label: 'Material', width: 120 },
  { key: 'swing', label: 'Swing', width: 80 },
  { key: 'quantity', label: 'Qty', width: 50 },
  { key: 'remarks', label: 'Remarks', width: 160 },
];

export const WINDOW_SCHEDULE_COLUMNS: ScheduleColumn[] = [
  { key: 'mark', label: 'Mark', width: 60 },
  { key: 'width', label: 'Width (mm)', width: 80 },
  { key: 'height', label: 'Height (mm)', width: 80 },
  { key: 'sillHeight', label: 'Sill Ht (mm)', width: 90 },
  { key: 'material', label: 'Material', width: 120 },
  { key: 'glazing', label: 'Glazing', width: 100 },
  { key: 'quantity', label: 'Qty', width: 50 },
];

export const ROOM_SCHEDULE_COLUMNS: ScheduleColumn[] = [
  { key: 'mark', label: 'Room No.', width: 80 },
  { key: 'name', label: 'Room Name', width: 140 },
  { key: 'area', label: 'Area (m²)', width: 90 },
  { key: 'perimeter', label: 'Perimeter (m)', width: 110 },
  { key: 'finish', label: 'Floor Finish', width: 120 },
  { key: 'ceiling', label: 'Ceiling Ht (mm)', width: 120 },
];

export function getScheduleColumnsForType(type: ScheduleType): ScheduleColumn[] {
  switch (type) {
    case 'door': return DOOR_SCHEDULE_COLUMNS;
    case 'window': return WINDOW_SCHEDULE_COLUMNS;
    case 'room': return ROOM_SCHEDULE_COLUMNS;
    default: return [{ key: 'mark', label: 'Mark' }];
  }
}

export interface ScheduleOptions {
  type: ScheduleType;
  title?: string;
  rows?: ScheduleRow[];
}

export function createSchedule(options: ScheduleOptions): Schedule {
  const { type, title, rows = [] } = options;
  const defaultTitles: Record<ScheduleType, string> = {
    door: 'Door Schedule',
    window: 'Window Schedule',
    room: 'Room Schedule',
    column: 'Column Schedule',
    beam: 'Beam Schedule',
  };
  return {
    type,
    title: title ?? defaultTitles[type],
    columns: getScheduleColumnsForType(type),
    rows,
  };
}

export function sortScheduleRows(rows: ScheduleRow[], key: string, direction: 'asc' | 'desc' = 'asc'): ScheduleRow[] {
  return [...rows].sort((a, b) => {
    const av = a[key] ?? '';
    const bv = b[key] ?? '';
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return direction === 'asc' ? cmp : -cmp;
  });
}

export function filterScheduleRows(rows: ScheduleRow[], query: string): ScheduleRow[] {
  const q = query.toLowerCase();
  return rows.filter((r) =>
    Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q))
  );
}

export function countByProperty(rows: ScheduleRow[], key: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const val = String(row[key] ?? 'unknown');
    counts[val] = (counts[val] ?? 0) + 1;
  }
  return counts;
}

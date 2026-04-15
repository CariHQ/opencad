/**
 * T-2D-010: Architectural symbols — north arrow, scale bar, detail markers
 */

export interface ArchSymbol { id: string; name: string; description: string; defaultSize: number; }

export const SYMBOLS: ArchSymbol[] = [
  { id: 'north-arrow', name: 'North Arrow', description: 'Compass north indicator', defaultSize: 40 },
  { id: 'scale-bar', name: 'Scale Bar', description: 'Graphical scale reference', defaultSize: 120 },
  { id: 'detail-marker', name: 'Detail Marker', description: 'Detail reference circle', defaultSize: 24 },
  { id: 'section-marker', name: 'Section Marker', description: 'Section cut line marker', defaultSize: 20 },
  { id: 'elevation-marker', name: 'Elevation Marker', description: 'Elevation reference tag', defaultSize: 20 },
];

export interface NorthArrowOptions { rotation?: number; size?: number; }
export interface ScaleBarOptions { totalLength: number; divisions?: number; pixelsPerMm?: number; }
export interface ScaleBarTick { x: number; label: string; }
export interface DetailMarkerOptions { number: number | string; sheetRef?: string; }

export function getNorthArrowPath(options: NorthArrowOptions = {}): string {
  const { rotation = 0, size = 40 } = options;
  const r = (rotation * Math.PI) / 180;
  const h = size, w = h * 0.4;
  const pts = [{ x: 0, y: -h/2 }, { x: -w/2, y: h/2 }, { x: w/2, y: h/2 }, { x: 0, y: 0 }];
  const cos = Math.cos(r), sin = Math.sin(r);
  const rot = (p: {x:number,y:number}) => ({ x: p.x*cos - p.y*sin, y: p.x*sin + p.y*cos });
  const [t, bl, br, m] = pts.map(rot) as [{x:number,y:number},{x:number,y:number},{x:number,y:number},{x:number,y:number}];
  const n = (v: number) => (Math.round(v * 1000) / 1000 === 0 ? 0 : v);
  const f = (p: {x:number,y:number}) => `${n(p.x).toFixed(3)} ${n(p.y).toFixed(3)}`;
  return `M ${f(t)} L ${f(bl)} L ${f(m)} Z M ${f(t)} L ${f(br)} L ${f(m)} Z`;
}

export function getScaleBarTicks(options: ScaleBarOptions): ScaleBarTick[] {
  const { totalLength, divisions = 4, pixelsPerMm = 1 } = options;
  const ticks: ScaleBarTick[] = [];
  for (let i = 0; i <= divisions; i++) {
    const mm = (totalLength / divisions) * i;
    const x = mm * pixelsPerMm;
    const label = mm >= 1000 ? `${(mm/1000).toFixed(1)}m` : `${mm}mm`;
    ticks.push({ x, label });
  }
  return ticks;
}

export function getDetailMarkerLabel(options: DetailMarkerOptions): string {
  const { number, sheetRef = '' } = options;
  return sheetRef ? `${number} / ${sheetRef}` : String(number);
}

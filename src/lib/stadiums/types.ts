// ─── Stadium system types ─────────────────────────────────────────────────────

export type SectorStatus = 'available' | 'few' | 'soldout' | 'selected' | 'disabled' | 'visitor';
export type SportType   = 'football' | 'basketball' | 'rugby';

export interface SectorConfig {
  id: string;
  name: string;
  /** Matches sector.nombre in DB. Empty string = no DB match (display-only). */
  dbName: string;
  /** Tribuna grouping key for filter logic */
  tribunaKey: string;
  /** SVG path d attribute */
  pathData: string;
  /** Optional transform applied to path geometry (useful for mirrored sectors). */
  pathTransform?: string;
  labelX: number;
  labelY: number;
  /** Rotation degrees for the label text */
  labelAngle?: number;
  labelFontSize?: number;
  /** Short label override (e.g. "A" instead of full name) */
  labelShort?: string;
  isVisitorSection?: boolean;
}

export interface StadiumConfig {
  id: string;
  name: string;
  sport: SportType;
  tier: 1 | 2;
  viewBox: string;
  /** SVG center coordinates */
  cx: number;
  cy: number;
  /** Field ellipse outer edge (for background "track") */
  fieldRx: number;
  fieldRy: number;
  /** Actual pitch dimensions (for markings rectangle) */
  pitchW: number;
  pitchH: number;
  sectors: SectorConfig[];
}

// ─── Colors per status ────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<SectorStatus, { fill: string; stroke: string; text: string }> = {
  available: { fill: '#14532d', stroke: '#16a34a', text: '#86efac' },
  few:       { fill: '#78350f', stroke: '#d97706', text: '#fde68a' },
  soldout:   { fill: '#1c1c1c', stroke: '#374151', text: '#4b5563' },
  selected:  { fill: '#713f12', stroke: '#F5C518', text: '#fef08a' },
  disabled:  { fill: '#111111', stroke: '#1f2937', text: '#1f2937' },
  visitor:   { fill: '#1e3a5f', stroke: '#3b82f6', text: '#93c5fd' },
};

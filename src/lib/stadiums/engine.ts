import type { SectorStatus } from './types';

// ─── SVG geometry helpers ─────────────────────────────────────────────────────

const f = (n: number) => n.toFixed(1);

/** Point on an ellipse given center, radii and angle (degrees, math convention: 0=right, 90=up) */
export function ep(
  cx: number, cy: number,
  rx: number, ry: number,
  deg: number
): [number, number] {
  const r = (deg * Math.PI) / 180;
  return [cx + rx * Math.cos(r), cy - ry * Math.sin(r)];
}

/**
 * Build an SVG path for a "banana" sector of an oval tribuna.
 *
 * dir:
 *   'ccw' — arc goes counterclockwise on screen  (Henderson top, Cataldi left, Güelfi right)
 *   'cw'  — arc goes clockwise on screen          (Damiani bottom)
 *
 * a1 → a2 must always be the "short way" through the desired arc.
 * For sectors crossing 0° (Güelfi), pass a1=332, a2=28 with dir='ccw'.
 */
export function ovalSector(
  cx: number, cy: number,
  outerRx: number, outerRy: number,
  innerRx: number, innerRy: number,
  a1: number, a2: number,
  dir: 'ccw' | 'cw'
): string {
  const oSweep: 0 | 1 = dir === 'ccw' ? 0 : 1;
  const iSweep: 0 | 1 = dir === 'ccw' ? 1 : 0;

  const [ox1, oy1] = ep(cx, cy, outerRx, outerRy, a1);
  const [ox2, oy2] = ep(cx, cy, outerRx, outerRy, a2);
  const [ix1, iy1] = ep(cx, cy, innerRx, innerRy, a1);
  const [ix2, iy2] = ep(cx, cy, innerRx, innerRy, a2);

  // Angular span — always ≤180° for the standard sectors we build
  let span = Math.abs(a2 - a1);
  if (span > 180) span = 360 - span;
  const la: 0 | 1 = span > 180 ? 1 : 0;

  return [
    `M ${f(ox1)} ${f(oy1)}`,
    `A ${outerRx} ${outerRy} 0 ${la} ${oSweep} ${f(ox2)} ${f(oy2)}`,
    `L ${f(ix2)} ${f(iy2)}`,
    `A ${innerRx} ${innerRy} 0 ${la} ${iSweep} ${f(ix1)} ${f(iy1)}`,
    'Z',
  ].join(' ');
}

/** Label center for an arc sector (midpoint angle, midpoint radius). */
export function ovalLabel(
  cx: number, cy: number,
  rx: number, ry: number,
  a1: number, a2: number,
  crossesZero = false
): [number, number] {
  let mid: number;
  if (crossesZero) {
    // e.g. a1=332, a2=28 → mid = (332+388)/2 = 360 → use 0°
    mid = ((a1 + (a2 + 360)) / 2) % 360;
  } else {
    mid = (a1 + a2) / 2;
  }
  return ep(cx, cy, rx, ry, mid);
}

// ─── Status computation ───────────────────────────────────────────────────────

export function computeStatus(
  disponibles: number,
  capacidad: number,
  habilitado: boolean,
  isVisitor = false
): Exclude<SectorStatus, 'selected'> {
  if (!habilitado) return 'disabled';
  if (isVisitor) return 'visitor';
  if (disponibles === 0) return 'soldout';
  const pct = capacidad > 0 ? disponibles / capacidad : 0;
  if (pct < 0.10) return 'few';
  return 'available';
}

// ─── Stadium name → registry id ──────────────────────────────────────────────

export function stadiumIdFromName(name: string): string {
  const s = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // remove accents
    .replace(/[^a-z0-9 ]/g, '');
  if (s.includes('campeon') || s.includes('siglo')) return 'campeon-del-siglo';
  if (s.includes('centenario'))                         return 'centenario';
  if (s.includes('palacio'))                            return 'palacio-penarol';
  if (s.includes('franzini'))                           return 'franzini';
  if (s.includes('gran parque') || s.includes('parque central')) return 'gran-parque-central';
  if (s.includes('jardin') || s.includes('hipodromo')) return 'jardines-hipodromo';
  if (s.includes('charrua'))                            return 'charrua';
  if (s.includes('burgue'))                             return 'burgue-miguel';
  if (s.includes('sobrero'))                            return 'mario-sobrero';
  if (s.includes('saroldi'))                            return 'saroldi';
  return 'generic-oval';
}

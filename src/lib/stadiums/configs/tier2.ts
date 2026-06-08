import { ovalSector, ovalLabel, ep } from '../engine';
import type { StadiumConfig, SectorConfig } from '../types';

// ─── Generic Tier-2 generator ─────────────────────────────────────────────────
// Produces a standard 4-tribuna oval football stadium.

interface T2Tribuna {
  id: string;
  name: string;
  dbName: string;
  a1: number; a2: number;
  dir: 'ccw' | 'cw';
  labelAngle?: number;
  isVisitor?: boolean;
}

function makeOvalStadium(
  id: string,
  name: string,
  tribunas: T2Tribuna[],
  opts: { outerRx?: number; outerRy?: number; innerRx?: number; innerRy?: number } = {}
): StadiumConfig {
  const CX = 420, CY = 298;
  const ORX = opts.outerRx ?? 340, ORY = opts.outerRy ?? 210;
  const IRX = opts.innerRx ?? 265, IRY = opts.innerRy ?? 155;
  const LRX = (ORX + IRX) / 2;
  const LRY = (ORY + IRY) / 2;

  const sectors: SectorConfig[] = tribunas.map((t) => {
    const crossesZero = t.a1 > t.a2;
    let lx: number, ly: number;
    if (t.dir === 'cw') {
      [lx, ly] = ovalLabel(CX, CY, LRX, LRY, t.a1, t.a2);
    } else if (crossesZero) {
      [lx, ly] = ovalLabel(CX, CY, LRX, LRY, t.a1, t.a2, true);
    } else if (t.labelAngle !== undefined) {
      // Use axis endpoint for side labels
      const deg = t.a1 > 90 && t.a2 > 90 ? 180 : 0;
      [lx, ly] = ep(CX, CY, LRX, LRY, deg);
    } else {
      [lx, ly] = ovalLabel(CX, CY, LRX, LRY, t.a1, t.a2);
    }

    return {
      id:             t.id,
      name:           t.name,
      dbName:         t.dbName,
      tribunaKey:     t.id,
      pathData:       ovalSector(CX, CY, ORX, ORY, IRX, IRY, t.a1, t.a2, t.dir),
      labelX:         lx,
      labelY:         ly,
      labelAngle:     t.labelAngle,
      labelFontSize:  12,
      isVisitorSection: t.isVisitor,
    };
  });

  return {
    id, name,
    sport: 'football', tier: 2,
    viewBox: '0 0 840 600',
    cx: CX, cy: CY,
    fieldRx: IRX - 15, fieldRy: IRY - 10,
    pitchW: (IRX - 15) * 1.5, pitchH: (IRY - 10) * 1.4,
    sectors,
  };
}

// Standard 4-tribuna layout used by most Tier-2 stadiums
const STD: T2Tribuna[] = [
  { id: 'norte',  name: 'Tribuna Norte',  dbName: 'Tribuna Norte',  a1: 30,  a2: 150, dir: 'ccw' },
  { id: 'oeste',  name: 'Tribuna Oeste',  dbName: 'Tribuna Oeste',  a1: 150, a2: 210, dir: 'ccw', labelAngle: -90 },
  { id: 'sur',    name: 'Tribuna Sur',    dbName: 'Tribuna Sur',    a1: 210, a2: 330, dir: 'cw',  isVisitor: true },
  { id: 'este',   name: 'Tribuna Este',   dbName: 'Tribuna Este',   a1: 330, a2: 30,  dir: 'ccw', labelAngle: 90 },
];

// ─── Individual Tier-2 stadium configs ───────────────────────────────────────

export const franzini = makeOvalStadium(
  'franzini', 'Estadio Luis Franzini',
  [
    { id: 'popular',   name: 'General',        dbName: 'General',        a1: 30,  a2: 150, dir: 'ccw' },
    { id: 'platea-n',  name: 'Platea Norte',   dbName: 'Platea Norte',   a1: 150, a2: 210, dir: 'ccw', labelAngle: -90 },
    { id: 'visitante', name: 'Sur (Visitante)', dbName: 'Sur Visitante',  a1: 210, a2: 330, dir: 'cw',  isVisitor: true },
    { id: 'platea-s',  name: 'Platea Sur',     dbName: 'Platea Sur',     a1: 330, a2: 30,  dir: 'ccw', labelAngle: 90 },
  ]
);

export const granParqueCentral = makeOvalStadium(
  'gran-parque-central', 'Gran Parque Central',
  [
    { id: 'colombes',  name: 'Tribuna Colombes',  dbName: 'Tribuna Colombes',  a1: 30,  a2: 150, dir: 'ccw' },
    { id: 'amsterdam', name: 'Tribuna Ámsterdam', dbName: 'Tribuna Ámsterdam', a1: 150, a2: 210, dir: 'ccw', labelAngle: -90 },
    { id: 'olimpica',  name: 'Tribuna Olímpica',  dbName: 'Tribuna Olímpica',  a1: 210, a2: 330, dir: 'cw',  isVisitor: true },
    { id: 'america',   name: 'Tribuna América',   dbName: 'Tribuna América',   a1: 330, a2: 30,  dir: 'ccw', labelAngle: 90 },
  ]
);

export const jardinesHipodromo = makeOvalStadium(
  'jardines-hipodromo', 'Estadio Jardines del Hipódromo', STD
);

export const charrua = makeOvalStadium(
  'charrua', 'Estadio Charrúa', STD
);

export const burgueMiguel = makeOvalStadium(
  'burgue-miguel', 'Estadio Domingo Burgueño',
  [
    ...STD.slice(0, 2),
    { ...STD[2], name: 'Popular Sur', dbName: 'Popular Sur' },
    STD[3],
  ]
);

export const marioSobrero = makeOvalStadium(
  'mario-sobrero', 'Estadio Mario Sobrero', STD,
  { outerRx: 310, outerRy: 195, innerRx: 240, innerRy: 142 }
);

export const saroldi = makeOvalStadium(
  'saroldi', 'Estadio Saroldi', STD,
  { outerRx: 310, outerRy: 195, innerRx: 240, innerRy: 142 }
);

// Generic fallback
export const genericOval = makeOvalStadium('generic-oval', 'Estadio', STD);

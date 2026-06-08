import { ovalSector, ovalLabel, ep } from '../engine';
import type { StadiumConfig } from '../types';

// El Centenario es más circular que el CDS
const CX = 420, CY = 298;
const ORX = 345, ORY = 225;
const IRX = 268, IRY = 165;
const LRX = (ORX + IRX) / 2; // 306
const LRY = (ORY + IRY) / 2; // 195

// Angular layout (classic 4-tribuna football stadium)
// Olímpica (norte):   30° → 150°   (top)
// Ámsterdam (oeste): 150° → 210°   (left — main covered stand)
// Battifora (sur):   210° → 330°   (bottom — includes visitor)
// Colombes (este):   330° →  30°   (right, crosses 0°)

const [olmLx, olmLy]  = ovalLabel(CX, CY, LRX, LRY, 30, 150);
const [amstLx, amstLy] = ep(CX, CY, LRX, LRY, 180);
const [batCLx, batCLy] = ovalLabel(CX, CY, LRX, LRY, 210, 270);  // west half
const [batDLx, batDLy] = ovalLabel(CX, CY, LRX, LRY, 270, 330);  // east half (visitor)
const [colLx, colLy]   = ep(CX, CY, LRX, LRY, 0);

export const centenario: StadiumConfig = {
  id:      'centenario',
  name:    'Estadio Centenario',
  sport:   'football',
  tier:    1,
  viewBox: '0 0 840 600',
  cx: CX, cy: CY,
  fieldRx: 255, fieldRy: 152,
  pitchW: 390, pitchH: 215,
  sectors: [
    {
      id: 'olimpica',
      name: 'Tribuna Olímpica',
      dbName: 'Tribuna Olímpica',
      tribunaKey: 'olimpica',
      pathData: ovalSector(CX, CY, ORX, ORY, IRX, IRY, 30, 150, 'ccw'),
      labelX: olmLx, labelY: olmLy,
      labelFontSize: 12,
    },
    {
      id: 'amsterdam',
      name: 'Tribuna Ámsterdam',
      dbName: 'Tribuna Ámsterdam',
      tribunaKey: 'amsterdam',
      pathData: ovalSector(CX, CY, ORX, ORY, IRX, IRY, 150, 210, 'ccw'),
      labelX: amstLx, labelY: amstLy,
      labelAngle: -90, labelFontSize: 11,
    },
    {
      id: 'battifora-oeste',
      name: 'Tribuna Battifora (Oeste)',
      dbName: 'Tribuna Battifora - Puerta C',
      tribunaKey: 'battifora',
      pathData: ovalSector(CX, CY, ORX, ORY, IRX, IRY, 210, 270, 'cw'),
      labelX: batCLx, labelY: batCLy,
      labelFontSize: 9, labelShort: 'C',
    },
    {
      id: 'battifora-este',
      name: 'Tribuna Battifora (Este — Visitante)',
      dbName: 'Tribuna Battifora - Puerta D',
      tribunaKey: 'battifora',
      pathData: ovalSector(CX, CY, ORX, ORY, IRX, IRY, 270, 330, 'cw'),
      labelX: batDLx, labelY: batDLy,
      labelFontSize: 9, labelShort: 'D',
      isVisitorSection: true,
    },
    {
      id: 'colombes',
      name: 'Tribuna Colombes',
      dbName: 'Tribuna Colombes',
      tribunaKey: 'colombes',
      pathData: ovalSector(CX, CY, ORX, ORY, IRX, IRY, 330, 30, 'ccw'),
      labelX: colLx, labelY: colLy,
      labelAngle: 90, labelFontSize: 11,
    },
  ],
};

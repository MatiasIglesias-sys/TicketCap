import type { StadiumConfig } from '../types';

// ─── Palacio Peñarol — rectangular basketball arena ───────────────────────────
// ViewBox 840×600, court centered at (420, 298)
// Court: 28×15m proportional → 420×225px visual
// Tribunas: Norte (top), Sur (bottom), Este (right), Oeste (left), Palco (center overlay)

const CX = 420, CY = 298;
const CW = 420, CH = 225; // court visual size
const L = CX - CW / 2, R = CX + CW / 2;  // 210, 630
const T = CY - CH / 2, B = CY + CH / 2;  // 185.5, 410.5
const TW = 68; // tribuna width (depth from court edge outward)

// Norte: rect above court
const norteD = `M ${L - 4} ${T - TW} L ${R + 4} ${T - TW} L ${R} ${T} L ${L} ${T} Z`;
// Sur: rect below court (visitor)
const surD   = `M ${L - 4} ${B + TW} L ${R + 4} ${B + TW} L ${R} ${B} L ${L} ${B} Z`;
// Oeste: left side
const oesteD = `M ${L - TW} ${T - 4} L ${L} ${T} L ${L} ${B} L ${L - TW} ${B + 4} Z`;
// Este: right side
const esteD  = `M ${R + TW} ${T - 4} L ${R} ${T} L ${R} ${B} L ${R + TW} ${B + 4} Z`;
// Palco central — small overlay row above court (north inner row)
const palcoD = `M ${CX - 80} ${T - 14} L ${CX + 80} ${T - 14} L ${CX + 80} ${T} L ${CX - 80} ${T} Z`;

export const palacioPernarol: StadiumConfig = {
  id:      'palacio-penarol',
  name:    'Palacio Peñarol',
  sport:   'basketball',
  tier:    1,
  viewBox: '0 0 840 600',
  cx: CX, cy: CY,
  fieldRx: CW / 2, fieldRy: CH / 2,
  pitchW: CW, pitchH: CH,
  sectors: [
    {
      id: 'norte',
      name: 'Tribuna Norte',
      dbName: 'Tribuna Norte',
      tribunaKey: 'norte',
      pathData: norteD,
      labelX: CX, labelY: T - TW / 2,
      labelFontSize: 13,
    },
    {
      id: 'sur',
      name: 'Tribuna Sur',
      dbName: 'Tribuna Sur',
      tribunaKey: 'sur',
      pathData: surD,
      labelX: CX, labelY: B + TW / 2,
      labelFontSize: 13,
      isVisitorSection: true,
    },
    {
      id: 'oeste',
      name: 'Plateas Oeste',
      dbName: 'Plateas Oeste',
      tribunaKey: 'oeste',
      pathData: oesteD,
      labelX: L - TW / 2, labelY: CY,
      labelAngle: -90, labelFontSize: 12,
    },
    {
      id: 'este',
      name: 'Plateas Este',
      dbName: 'Plateas Este',
      tribunaKey: 'este',
      pathData: esteD,
      labelX: R + TW / 2, labelY: CY,
      labelAngle: 90, labelFontSize: 12,
    },
    {
      id: 'palco',
      name: 'Palco Central',
      dbName: 'Palcos VIP',
      tribunaKey: 'palco',
      pathData: palcoD,
      labelX: CX, labelY: T - 7,
      labelFontSize: 8,
      labelShort: 'VIP',
    },
  ],
};

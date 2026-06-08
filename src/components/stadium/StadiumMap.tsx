"use client";

import { useState, useMemo } from "react";
import { getStadiumConfig }               from "@/lib/stadiums/registry";
import { stadiumIdFromName, computeStatus } from "@/lib/stadiums/engine";
import { STATUS_COLORS, type SectorStatus, type SectorConfig } from "@/lib/stadiums/types";

// ─── DB sector (minimal shape needed here) ────────────────────────────────────
export interface DbSector {
  id: string;
  nombre: string;
  tipo: string;
  capacidad: number;
  disponibles: number;
  precio: number;
  precioSocio: number;
  habilitado: boolean;
  esVisitante: boolean;
}

interface Props {
  estadioName: string;
  sectores: DbSector[];
  selectedDbSectorId?: string | null;
  onSelectSector: (dbSector: DbSector | null) => void;
  /** For visitor events: only these config sector ids are active */
  visitorSectionIds?: string[] | null;
}

// ─── Field renderers ──────────────────────────────────────────────────────────

function FootballField({ cx, cy, w, h }: { cx: number; cy: number; w: number; h: number }) {
  const l = cx - w / 2, r = cx + w / 2, t = cy - h / 2, b = cy + h / 2;
  const C = "#3a9a40";
  const penW = w * 0.155, penH = h * 0.52;
  const goalW = w * 0.062, goalH = h * 0.30;

  // Franjas de pasto
  const STRIPE_COUNT = 12;
  const stripeW = w / STRIPE_COUNT;

  // Punto de penal y arco
  const penSpotDist = penW * 0.667;
  const arcR = penW * 0.555;
  const arcDist = penW - penSpotDist;
  const arcHalfChord = Math.sqrt(Math.max(0, arcR * arcR - arcDist * arcDist));

  // Arcos de córner
  const cornerR = h * 0.022;

  return (
    <g>
      {/* Base oscura */}
      <rect x={l} y={t} width={w} height={h} fill="#1a4d20" rx={3} />

      {/* Franjas verticales de pasto cortado */}
      {Array.from({ length: STRIPE_COUNT }).map((_, i) =>
        i % 2 === 0 ? (
          <rect key={i} x={l + i * stripeW} y={t} width={stripeW} height={h} fill="#2d7535" opacity={0.55} />
        ) : null
      )}

      {/* Borde y línea central */}
      <rect x={l} y={t} width={w} height={h} fill="none" stroke={C} strokeWidth={1.5} rx={3} />
      <line x1={cx} y1={t} x2={cx} y2={b} stroke={C} strokeWidth={1.5} />

      {/* Círculo central + punto central */}
      <circle cx={cx} cy={cy} r={h * 0.165} fill="none" stroke={C} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={2.5} fill={C} />

      {/* Áreas grandes */}
      <rect x={l} y={cy - penH / 2} width={penW} height={penH} fill="none" stroke={C} strokeWidth={1.5} />
      <rect x={r - penW} y={cy - penH / 2} width={penW} height={penH} fill="none" stroke={C} strokeWidth={1.5} />

      {/* Áreas chicas (porterías) */}
      <rect x={l} y={cy - goalH / 2} width={goalW} height={goalH} fill="none" stroke={C} strokeWidth={1.5} />
      <rect x={r - goalW} y={cy - goalH / 2} width={goalW} height={goalH} fill="none" stroke={C} strokeWidth={1.5} />

      {/* Puntos de penal */}
      <circle cx={l + penSpotDist} cy={cy} r={2.5} fill={C} />
      <circle cx={r - penSpotDist} cy={cy} r={2.5} fill={C} />

      {/* Arcos de penal (la "D" fuera del área) */}
      <path
        d={`M ${l + penW} ${cy - arcHalfChord} A ${arcR} ${arcR} 0 0 1 ${l + penW} ${cy + arcHalfChord}`}
        fill="none" stroke={C} strokeWidth={1.5}
      />
      <path
        d={`M ${r - penW} ${cy - arcHalfChord} A ${arcR} ${arcR} 0 0 0 ${r - penW} ${cy + arcHalfChord}`}
        fill="none" stroke={C} strokeWidth={1.5}
      />

      {/* Arcos de córner (lenguitas) */}
      <path d={`M ${l + cornerR} ${t} A ${cornerR} ${cornerR} 0 0 0 ${l} ${t + cornerR}`} fill="none" stroke={C} strokeWidth={1.5} />
      <path d={`M ${r - cornerR} ${t} A ${cornerR} ${cornerR} 0 0 1 ${r} ${t + cornerR}`} fill="none" stroke={C} strokeWidth={1.5} />
      <path d={`M ${l + cornerR} ${b} A ${cornerR} ${cornerR} 0 0 1 ${l} ${b - cornerR}`} fill="none" stroke={C} strokeWidth={1.5} />
      <path d={`M ${r - cornerR} ${b} A ${cornerR} ${cornerR} 0 0 0 ${r} ${b - cornerR}`} fill="none" stroke={C} strokeWidth={1.5} />
    </g>
  );
}

function BasketballCourt({ cx, cy, w, h }: { cx: number; cy: number; w: number; h: number }) {
  const l = cx - w / 2, r = cx + w / 2, t = cy - h / 2, b = cy + h / 2;
  const C = "#7a5c1e";
  return (
    <g>
      <rect x={l} y={t} width={w} height={h} fill="#7a5010" rx={3} />
      <rect x={l} y={t} width={w} height={h} fill="none" stroke={C} strokeWidth={1.5} rx={3} />
      <line x1={cx} y1={t} x2={cx} y2={b} stroke={C} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={h * 0.2} fill="none" stroke={C} strokeWidth={1.5} />
      <rect x={l} y={cy - h * 0.22} width={w * 0.14} height={h * 0.44} fill="none" stroke={C} strokeWidth={1.5} />
      <rect x={r - w * 0.14} y={cy - h * 0.22} width={w * 0.14} height={h * 0.44} fill="none" stroke={C} strokeWidth={1.5} />
    </g>
  );
}

// ─── StadiumMap ───────────────────────────────────────────────────────────────

export default function StadiumMap({
  estadioName,
  sectores,
  selectedDbSectorId,
  onSelectSector,
  visitorSectionIds,
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [inhabilitadoPatternId] = useState(() => `inhabilitado-${Math.random().toString(36).slice(2, 10)}`);

  const normalizeName = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const looseName = (value: string) =>
    normalizeName(value)
      .replace(/\b(tribuna|tr|t|sector|puerta|preferencial|platea|popular|vip)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const config = useMemo(
    () => getStadiumConfig(stadiumIdFromName(estadioName)),
    [estadioName]
  );

  // Config sector id → matching DB sector
  const dbByConfig = useMemo<Record<string, DbSector | undefined>>(() => {
    const out: Record<string, DbSector | undefined> = {};
    for (const cs of config.sectors) {
      if (!cs.dbName) continue;
      const dbNameNorm = normalizeName(cs.dbName);
      const dbNameLoose = looseName(cs.dbName);
      out[cs.id] = sectores.find((s) => {
        const sectorNorm = normalizeName(s.nombre);
        const sectorLoose = looseName(s.nombre);
        if (sectorNorm === dbNameNorm || sectorLoose === dbNameLoose) return true;
        if (sectorNorm.includes(dbNameNorm) || dbNameNorm.includes(sectorNorm)) return true;
        if (dbNameLoose && dbNameLoose.length > 2 && sectorLoose.length > 2 && (sectorLoose.includes(dbNameLoose) || dbNameLoose.includes(sectorLoose))) return true;
        return false;
      });
    }
    return out;
  }, [config, sectores]);

  function resolveStatus(cs: SectorConfig): Exclude<SectorStatus, 'selected'> {
    // Visitor event: only explicitly listed sections are active
    if (visitorSectionIds != null) {
      if (visitorSectionIds.includes(cs.id)) return 'visitor';
      return 'disabled';
    }
    const db = dbByConfig[cs.id];
    if (!db) return 'disabled';
    return computeStatus(db.disponibles, db.capacidad, db.habilitado, db.esVisitante);
  }

  function sectorStatus(cs: SectorConfig): SectorStatus {
    const base = resolveStatus(cs);
    if (base === 'disabled') return 'disabled';
    if (hoveredId === cs.id) return 'selected';
    const db = dbByConfig[cs.id];
    if (selectedDbSectorId && db?.id === selectedDbSectorId) return 'selected';
    return base;
  }

  function handleClick(cs: SectorConfig) {
    const db = dbByConfig[cs.id];
    const st = resolveStatus(cs);
    if (!db || st === 'disabled' || st === 'soldout') { onSelectSector(null); return; }
    onSelectSector(db);
  }

  const [vw, vh] = config.viewBox.split(' ').slice(2).map(Number);
  const isTickantelMode = config.id === 'campeon-del-siglo';
  // Recorta el área del título (Estadio / Club Atlético Peñarol) en modo Tickantel
  const TICKANTEL_CROP_TOP = 185;
  const croppedVh = vh - TICKANTEL_CROP_TOP;

  function getTickantelSectorClass(status: SectorStatus): string {
    if (status === 'selected') return 'map-svg-active';
    if (status === 'disabled' || status === 'soldout') return 'map-svg-inhabilitado';
    return 'map-svg-comprar';
  }

  if (isTickantelMode) {
    const guelfiVisitanteSector = config.sectors.find((s) => s.id === 'guelfi-visitante');
    const guelfiVisitanteClass = getTickantelSectorClass(
      guelfiVisitanteSector ? sectorStatus(guelfiVisitanteSector) : 'disabled'
    );

    return (
      <div className="tickantel-map-shell">
        <div className="map__content">

          <div className="map-svg auto-map-svg">
            <svg
              viewBox={`0 ${TICKANTEL_CROP_TOP} ${vw} ${croppedVh}`}
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <pattern id={inhabilitadoPatternId} patternUnits="userSpaceOnUse" width="10" height="10" x="0" y="0">
                  <rect x="0" y="0" width="10" height="10" fill="#4d4d4d" />
                  <path
                    d="M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2"
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>

              {/* ── Cancha verde ────────────────────────────────────────── */}
              <FootballField cx={config.cx} cy={config.cy} w={config.pitchW} h={config.pitchH} />

              {config.sectors.map((cs) => {
                const status = sectorStatus(cs);
                const db = dbByConfig[cs.id];
                const clickable = status !== 'disabled' && status !== 'soldout';
                const className = getTickantelSectorClass(status);

                return (
                  <path
                    key={cs.id}
                    id={cs.id}
                    className={className}
                    d={cs.pathData}
                    transform={cs.pathTransform}
                    fill={className === 'map-svg-inhabilitado' ? `url(#${inhabilitadoPatternId})` : undefined}
                    style={{ cursor: clickable ? 'pointer' : 'default' }}
                    onClick={() => handleClick(cs)}
                    onMouseEnter={() => setHoveredId(cs.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <title>
                      {db
                        ? `${cs.name}. ${status === 'soldout' ? 'Entradas agotadas' : `${db.disponibles.toLocaleString('es-UY')} disponibles`} $ ${db.precio.toLocaleString('es-UY')}`
                        : cs.name}
                    </title>
                  </path>
                );
              })}

              {/* ── Logo Peñarol sobre tribuna Henderson ─────────────────── */}
              <defs>
                <clipPath id="henderson-clip">
                  {config.sectors
                    .filter((s) => s.tribunaKey === 'henderson')
                    .map((s) => (
                      <path key={s.id} d={s.pathData} transform={s.pathTransform} />
                    ))}
                </clipPath>
              </defs>
              <image
                href="/images/logos/logo henderson .png"
                x={212}
                y={5}
                width={600}
                height={600}
                opacity={0.45}
                clipPath="url(#henderson-clip)"
                style={{ pointerEvents: 'none' }}
              />

              {/* ── Labels de sectores (letra de cada sector) ────────────── */}
              <g aria-hidden="true" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {config.sectors.map((cs) => {
                  if (!cs.labelShort || cs.labelX === 0) return null;
                  if (cs.tribunaKey !== 'henderson') return null;
                  return (
                    <text
                      key={`label-${cs.id}`}
                      x={cs.labelX}
                      y={cs.labelY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffffff"
                      fontSize={22}
                      fontWeight="900"
                      letterSpacing={0.5}
                      transform={cs.labelAngle ? `rotate(${cs.labelAngle} ${cs.labelX} ${cs.labelY})` : undefined}
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {cs.labelShort}
                    </text>
                  );
                })}
              </g>

              <path
                id="guelfi-visitante-bridge"
                className={guelfiVisitanteClass}
                d="M 849 379 L 790 434 C 797 468 804 504 810 542 L 860 538 L 899 533 C 892 473 883 422 849 379 Z"
                style={{ pointerEvents: 'none' }}
              />

              <g id="seat-stripes" aria-hidden="true" style={{ pointerEvents: 'none' }}>
                {(() => {
                  if (typeof document === 'undefined') return null;

                  const cataldi = config.sectors.find((s) => s.id === 'cataldi');
                  if (!cataldi) return null;

                  const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                  pathEl.setAttribute('d', cataldi.pathData);
                  if (cataldi.pathTransform) pathEl.setAttribute('transform', cataldi.pathTransform);

                  const len = pathEl.getTotalLength();
                  if (!Number.isFinite(len) || len <= 0) return null;

                  const sidePoints: Array<{ x: number; y: number }> = [];
                  for (let i = 0; i <= 420; i += 1) {
                    const p = pathEl.getPointAtLength((i / 420) * len);
                    if (p.x < config.cx) sidePoints.push({ x: p.x, y: p.y });
                  }
                  if (sidePoints.length < 20) return null;

                  const yMin = Math.min(...sidePoints.map((p) => p.y));
                  const yMax = Math.max(...sidePoints.map((p) => p.y));
                  const bins = 140;
                  const minX: Array<number | null> = Array.from({ length: bins }, () => null);

                  for (const p of sidePoints) {
                    const idx = Math.max(0, Math.min(bins - 1, Math.floor(((p.y - yMin) / (yMax - yMin || 1)) * (bins - 1))));
                    minX[idx] = minX[idx] == null ? p.x : Math.min(minX[idx] as number, p.x);
                  }

                  const first = minX.findIndex((v) => v != null);
                  if (first === -1) return null;
                  for (let i = 0; i < first; i += 1) minX[i] = minX[first];

                  let prev = first;
                  for (let i = first + 1; i < minX.length; i += 1) {
                    if (minX[i] == null) continue;
                    const a = minX[prev] as number;
                    const b = minX[i] as number;
                    const span = i - prev;
                    for (let k = 1; k < span; k += 1) minX[prev + k] = a + ((b - a) * k) / span;
                    prev = i;
                  }
                  for (let i = prev + 1; i < minX.length; i += 1) minX[i] = minX[prev];

                  const pts = minX.map((x, i) => ({
                    x: x as number,
                    y: yMin + (i / (bins - 1)) * (yMax - yMin),
                  }));

                  let d = `M ${pts[0].x} ${pts[0].y}`;
                  for (let i = 1; i < pts.length - 1; i += 1) {
                    const c = pts[i];
                    const n = pts[i + 1];
                    d += ` Q ${c.x} ${c.y} ${(c.x + n.x) / 2} ${(c.y + n.y) / 2}`;
                  }
                  d += ` T ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;

                  const damianiC = config.sectors.find((s) => s.id === 'damiani-c');
                  const damianiD = config.sectors.find((s) => s.id === 'damiani-d');
                  const guelfiLocal = config.sectors.find((s) => s.id === 'guelfi-local');
                  const guelfiVisitante = config.sectors.find((s) => s.id === 'guelfi-visitante');
                  const guelfiVisitanteB = config.sectors.find((s) => s.id === 'guelfi-visitante-b');

                  let dDamiani = '';
                  if (damianiC && damianiD) {
                    const damianiPoints: Array<{ x: number; y: number }> = [];
                    const collectDamiani = (sector: { pathData: string; pathTransform?: string }) => {
                      const pEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                      pEl.setAttribute('d', sector.pathData);
                      if (sector.pathTransform) pEl.setAttribute('transform', sector.pathTransform);
                      const pLen = pEl.getTotalLength();
                      if (!Number.isFinite(pLen) || pLen <= 0) return;
                      for (let i = 0; i <= 420; i += 1) {
                        const p = pEl.getPointAtLength((i / 420) * pLen);
                        if (p.y > config.cy) damianiPoints.push({ x: p.x, y: p.y });
                      }
                    };

                    collectDamiani(damianiC);
                    collectDamiani(damianiD);

                    if (damianiPoints.length >= 20) {
                      const xMinD = Math.min(...damianiPoints.map((p) => p.x));
                      const xMaxD = Math.max(...damianiPoints.map((p) => p.x));
                      const binsD = 170;
                      const maxY: Array<number | null> = Array.from({ length: binsD }, () => null);

                      for (const p of damianiPoints) {
                        const idx = Math.max(0, Math.min(binsD - 1, Math.floor(((p.x - xMinD) / (xMaxD - xMinD || 1)) * (binsD - 1))));
                        maxY[idx] = maxY[idx] == null ? p.y : Math.max(maxY[idx] as number, p.y);
                      }

                      const firstD = maxY.findIndex((v) => v != null);
                      if (firstD !== -1) {
                        for (let i = 0; i < firstD; i += 1) maxY[i] = maxY[firstD];
                        let prevD = firstD;
                        for (let i = firstD + 1; i < maxY.length; i += 1) {
                          if (maxY[i] == null) continue;
                          const a = maxY[prevD] as number;
                          const b = maxY[i] as number;
                          const span = i - prevD;
                          for (let k = 1; k < span; k += 1) maxY[prevD + k] = a + ((b - a) * k) / span;
                          prevD = i;
                        }
                        for (let i = prevD + 1; i < maxY.length; i += 1) maxY[i] = maxY[prevD];

                        const ptsD = maxY.map((y, i) => ({
                          x: xMinD + (i / (binsD - 1)) * (xMaxD - xMinD),
                          y: y as number,
                        }));

                        if (ptsD.length > 2) {
                          dDamiani = `M ${ptsD[0].x} ${ptsD[0].y}`;
                          for (let i = 1; i < ptsD.length - 1; i += 1) {
                            const c = ptsD[i];
                            const n = ptsD[i + 1];
                            dDamiani += ` Q ${c.x} ${c.y} ${(c.x + n.x) / 2} ${(c.y + n.y) / 2}`;
                          }
                          dDamiani += ` T ${ptsD[ptsD.length - 1].x} ${ptsD[ptsD.length - 1].y}`;
                        }
                      }
                    }
                  }

                  let dGuelfi = '';
                  if (guelfiLocal) {
                    const guelfiPoints: Array<{ x: number; y: number }> = [];
                    const pEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    pEl.setAttribute('d', guelfiLocal.pathData);
                    if (guelfiLocal.pathTransform) pEl.setAttribute('transform', guelfiLocal.pathTransform);

                    const pLen = pEl.getTotalLength();
                    if (Number.isFinite(pLen) && pLen > 0) {
                      for (let i = 0; i <= 420; i += 1) {
                        const p = pEl.getPointAtLength((i / 420) * pLen);
                        if (p.x > config.cx) guelfiPoints.push({ x: p.x, y: p.y });
                      }
                    }

                    if (guelfiPoints.length >= 20) {
                      const yMinG = Math.min(...guelfiPoints.map((p) => p.y));
                      const yMaxG = Math.max(...guelfiPoints.map((p) => p.y));
                      const binsG = 140;
                      const maxX: Array<number | null> = Array.from({ length: binsG }, () => null);

                      for (const p of guelfiPoints) {
                        const idx = Math.max(0, Math.min(binsG - 1, Math.floor(((p.y - yMinG) / (yMaxG - yMinG || 1)) * (binsG - 1))));
                        maxX[idx] = maxX[idx] == null ? p.x : Math.max(maxX[idx] as number, p.x);
                      }

                      const firstG = maxX.findIndex((v) => v != null);
                      if (firstG !== -1) {
                        for (let i = 0; i < firstG; i += 1) maxX[i] = maxX[firstG];

                        let prevG = firstG;
                        for (let i = firstG + 1; i < maxX.length; i += 1) {
                          if (maxX[i] == null) continue;
                          const a = maxX[prevG] as number;
                          const b = maxX[i] as number;
                          const span = i - prevG;
                          for (let k = 1; k < span; k += 1) maxX[prevG + k] = a + ((b - a) * k) / span;
                          prevG = i;
                        }
                        for (let i = prevG + 1; i < maxX.length; i += 1) maxX[i] = maxX[prevG];

                        const ptsG = maxX.map((x, i) => ({
                          x: x as number,
                          y: yMinG + (i / (binsG - 1)) * (yMaxG - yMinG),
                        }));

                        if (ptsG.length > 2) {
                          dGuelfi = `M ${ptsG[0].x} ${ptsG[0].y}`;
                          for (let i = 1; i < ptsG.length - 1; i += 1) {
                            const c = ptsG[i];
                            const n = ptsG[i + 1];
                            dGuelfi += ` Q ${c.x} ${c.y} ${(c.x + n.x) / 2} ${(c.y + n.y) / 2}`;
                          }
                          dGuelfi += ` T ${ptsG[ptsG.length - 1].x} ${ptsG[ptsG.length - 1].y}`;
                        }
                      }
                    }
                  }

                  // Curva para Guelfi visitante (recortando parte inferior para evitar borde pegado)
                  let dGuelfiVisitante = '';
                  if (guelfiVisitante) {
                    const vPoints: Array<{ x: number; y: number }> = [];
                    const collectV = (sector: { pathData: string; pathTransform?: string }) => {
                      const pEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                      pEl.setAttribute('d', sector.pathData);
                      if (sector.pathTransform) pEl.setAttribute('transform', sector.pathTransform);
                      const pLen = pEl.getTotalLength();
                      if (!Number.isFinite(pLen) || pLen <= 0) return;
                      for (let i = 0; i <= 500; i += 1) {
                        const p = pEl.getPointAtLength((i / 500) * pLen);
                        if (p.x > config.cx) vPoints.push({ x: p.x, y: p.y });
                      }
                    };

                    collectV(guelfiVisitante);
                    if (guelfiVisitanteB) collectV(guelfiVisitanteB);

                    if (vPoints.length >= 20) {
                      const yMinV = Math.min(...vPoints.map((p) => p.y));
                      const yMaxV = Math.max(...vPoints.map((p) => p.y));
                      const yCutoffV = yMinV + (yMaxV - yMinV) * 0.84;
                      const trimmedVPoints = vPoints.filter((p) => p.y <= yCutoffV);
                      const usableVPoints = trimmedVPoints.length >= 20 ? trimmedVPoints : vPoints;
                      const binsV = 140;
                      const maxXV: Array<number | null> = Array.from({ length: binsV }, () => null);

                      for (const p of usableVPoints) {
                        const idx = Math.max(0, Math.min(binsV - 1, Math.floor(((p.y - yMinV) / (yMaxV - yMinV || 1)) * (binsV - 1))));
                        maxXV[idx] = maxXV[idx] == null ? p.x : Math.max(maxXV[idx] as number, p.x);
                      }

                      const firstV = maxXV.findIndex((v) => v != null);
                      if (firstV !== -1) {
                        for (let i = 0; i < firstV; i += 1) maxXV[i] = maxXV[firstV];
                        let prevV = firstV;
                        for (let i = firstV + 1; i < maxXV.length; i += 1) {
                          if (maxXV[i] == null) continue;
                          const a = maxXV[prevV] as number;
                          const b = maxXV[i] as number;
                          const span = i - prevV;
                          for (let k = 1; k < span; k += 1) maxXV[prevV + k] = a + ((b - a) * k) / span;
                          prevV = i;
                        }
                        for (let i = prevV + 1; i < maxXV.length; i += 1) maxXV[i] = maxXV[prevV];

                        const ptsV = maxXV.map((x, i) => ({
                          x: x as number,
                          y: yMinV + (i / (binsV - 1)) * (yMaxV - yMinV),
                        }));

                        if (ptsV.length > 2) {
                          dGuelfiVisitante = `M ${ptsV[0].x} ${ptsV[0].y}`;
                          for (let i = 1; i < ptsV.length - 1; i += 1) {
                            const c = ptsV[i];
                            const n = ptsV[i + 1];
                            dGuelfiVisitante += ` Q ${c.x} ${c.y} ${(c.x + n.x) / 2} ${(c.y + n.y) / 2}`;
                          }
                          dGuelfiVisitante += ` T ${ptsV[ptsV.length - 1].x} ${ptsV[ptsV.length - 1].y}`;
                        }
                      }
                    }
                  }

                  return (
                    <>
                      <defs>
                        <clipPath id="seat-stripes-cataldi-clip">
                          <path d={cataldi.pathData} transform={cataldi.pathTransform} />
                        </clipPath>
                        <clipPath id="seat-stripes-damiani-clip">
                          {damianiC && <path d={damianiC.pathData} transform={damianiC.pathTransform} />}
                          {damianiD && <path d={damianiD.pathData} transform={damianiD.pathTransform} />}
                        </clipPath>
                        <clipPath id="seat-stripes-guelfi-clip">
                          {guelfiLocal && <path d={guelfiLocal.pathData} transform={guelfiLocal.pathTransform} />}
                        </clipPath>
                        <clipPath id="seat-stripes-guelfi-visitante-clip">
                          {guelfiVisitante && <path d={guelfiVisitante.pathData} transform={guelfiVisitante.pathTransform} />}
                          {guelfiVisitanteB && <path d={guelfiVisitanteB.pathData} transform={guelfiVisitanteB.pathTransform} />}
                        </clipPath>
                        <clipPath id="seat-stripes-decano-top">
                          <rect x="0" y="0" width="1024" height="482" />
                        </clipPath>
                        <clipPath id="seat-stripes-decano-bottom">
                          <rect x="0" y="742" width="1024" height="408" />
                        </clipPath>
                        <clipPath id="seat-stripes-penarol-left">
                          <rect x="0" y="0" width="356" height="1050" />
                        </clipPath>
                        <clipPath id="seat-stripes-penarol-right">
                          <rect x="670" y="0" width="345" height="1050" />
                        </clipPath>
                      </defs>
                      <g clipPath="url(#seat-stripes-cataldi-clip)">
                        <path
                          d={d}
                          fill="none"
                          stroke="#000000"
                          strokeWidth={23}
                          strokeLinecap="square"
                          strokeLinejoin="miter"
                        />
                        <path
                          d={d}
                          transform="translate(50 -10)"
                          fill="none"
                          stroke="#000000"
                          strokeWidth={23}
                          strokeLinecap="square"
                          strokeLinejoin="miter"
                          clipPath="url(#seat-stripes-decano-top)"
                        />
                        <path
                          d={d}
                          transform="translate(50 -10)"
                          fill="none"
                          stroke="#000000"
                          strokeWidth={23}
                          strokeLinecap="square"
                          strokeLinejoin="miter"
                          clipPath="url(#seat-stripes-decano-bottom)"
                        />
                        <path
                          d={d}
                          transform="translate(106 0)"
                          fill="none"
                          stroke="#000000"
                          strokeWidth={23}
                          strokeLinecap="square"
                          strokeLinejoin="miter"
                        />
                        <path
                          d={d}
                          transform="translate(145 0)"
                          fill="none"
                          stroke="#000000"
                          strokeWidth={23}
                          strokeLinecap="square"
                          strokeLinejoin="miter"
                        />
                        <path
                          d={d}
                          transform="translate(183 0)"
                          fill="none"
                          stroke="#000000"
                          strokeWidth={23}
                          strokeLinecap="square"
                          strokeLinejoin="miter"
                        />
                      </g>
                      {dDamiani && (
                        <g clipPath="url(#seat-stripes-damiani-clip)">
                          <path
                            d={dDamiani}
                            fill="none"
                            stroke="#000000"
                            strokeWidth={27}
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                            clipPath="url(#seat-stripes-penarol-left)"
                          />
                          <path
                            d={dDamiani}
                            fill="none"
                            stroke="#000000"
                            strokeWidth={27}
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                            clipPath="url(#seat-stripes-penarol-right)"
                          />
                          <path
                            d={dDamiani}
                            transform="translate(0 -50)"
                            fill="none"
                            stroke="#000000"
                            strokeWidth={23}
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                            clipPath="url(#seat-stripes-penarol-left)"
                          />
                          <path
                            d={dDamiani}
                            transform="translate(0 -50)"
                            fill="none"
                            stroke="#000000"
                            strokeWidth={23}
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                            clipPath="url(#seat-stripes-penarol-right)"
                          />
                          <path
                            d={dDamiani}
                            transform="translate(0 -90)"
                            fill="none"
                            stroke="#000000"
                            strokeWidth={23}
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                            clipPath="url(#seat-stripes-penarol-left)"
                          />
                          <path
                            d={dDamiani}
                            transform="translate(0 -90)"
                            fill="none"
                            stroke="#000000"
                            strokeWidth={23}
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                            clipPath="url(#seat-stripes-penarol-right)"
                          />
                          <path
                            d={dDamiani}
                            transform="translate(0 -142)"
                            fill="none"
                            stroke="#000000"
                            strokeWidth={23}
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                            clipPath="url(#seat-stripes-penarol-left)"
                          />
                          <path
                            d={dDamiani}
                            transform="translate(0 -142)"
                            fill="none"
                            stroke="#000000"
                            strokeWidth={23}
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                            clipPath="url(#seat-stripes-penarol-right)"
                          />
                          <path
                            d={dDamiani}
                            transform="translate(0 -184)"
                            fill="none"
                            stroke="#000000"
                            strokeWidth={27}
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                            clipPath="url(#seat-stripes-penarol-left)"
                          />
                          <path
                            d={dDamiani}
                            transform="translate(0 -184)"
                            fill="none"
                            stroke="#000000"
                            strokeWidth={27}
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                            clipPath="url(#seat-stripes-penarol-right)"
                          />
                        </g>
                      )}
                      {dGuelfi && (
                        <g clipPath="url(#seat-stripes-guelfi-clip)">
                          <path
                            d={dGuelfi}
                            transform="translate(-45 0)"
                            fill="none"
                            stroke="#000000"
                            strokeWidth={23}
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                          />
                        </g>
                      )}
                       {dGuelfi && (
                        <g clipPath="url(#seat-stripes-guelfi-clip)">
                          <path
                            d={dGuelfi}
                            transform="translate(-6 0)"
                            fill="none"
                            stroke="#000000"
                            strokeWidth={23}
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                          />
                        </g>
                      )}
                       {dGuelfi && (
                        <g clipPath="url(#seat-stripes-guelfi-clip)">
                          <path
                            d={dGuelfi}
                            transform="translate(-85 0)"
                            fill="none"
                            stroke="#000000"
                            strokeWidth={20}
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                          />
                        </g>
                      )}
                      {dGuelfi && (
                        <g clipPath="url(#seat-stripes-guelfi-clip)">
                          <path
                            d={dGuelfi}
                            transform="translate(-180 0)"
                            fill="none"
                            stroke="#000000"
                            strokeWidth={20}
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                          />
                        </g>
                      )}
                      {dGuelfi && (
                        <g clipPath="url(#seat-stripes-guelfi-clip)">
                          <path
                            d={dGuelfi}
                            transform="translate(-135 0)"
                            fill="none"
                            stroke="#000000"
                            strokeWidth={20}
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                          />
                        </g>
                      )}
                      {dGuelfi && (
                        <g clipPath="url(#seat-stripes-guelfi-clip)">
                          <path
                            d={dGuelfi}
                            transform="translate(-135 0)"
                            fill="none"
                            stroke="#000000"
                            strokeWidth={20}
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                          />
                        </g>
                      )}
                      {dGuelfi && (
                        <g clipPath="url(#seat-stripes-guelfi-clip)">
                          <path
                            d={dGuelfi}
                            transform="translate(-180 0)"
                            fill="none"
                            stroke="#000000"
                            strokeWidth={20}
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                          />
                        </g>
                      )}
                
                      {dGuelfiVisitante && (
                        <g clipPath="url(#seat-stripes-guelfi-visitante-clip)">
                          <path
                            d={dGuelfiVisitante}
                            transform="rotate(-8 900 460) translate(-140 0)"
                            fill="none"
                            stroke="#000000"
                            strokeWidth={20}
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                          />
                          <path
                            d={dGuelfiVisitante}
                            transform="rotate(-8 900 460) translate(-183 0)"
                            fill="none"
                            stroke="#000000"
                            strokeWidth={20}
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                          />
                        </g>
                      )}
                    </>
                  );
                })()}
              </g>

              <g aria-hidden="true" transform="rotate(70 936 391)" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {[
                  { x: 902, y: 404 },
                  { x: 926, y: 404 },
                  { x: 950, y: 404 },
                  { x: 974, y: 404 },
                  { x: 998, y: 404 },
                  { x: 1022, y: 404 },
                  { x: 914, y: 432 },
                  { x: 938, y: 432 },
                  { x: 962, y: 432 },
                  { x: 986, y: 432 },
                  { x: 1010, y: 432 },
                ].map((star, index) => (
                  <text
                    key={index}
                    x={star.x}
                    y={star.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#f3cc5a"
                    fontSize={22}
                    fontWeight="700"
                    fontFamily="'Bebas Neue', sans-serif"
                  >
                    ★
                  </text>
                ))}
              </g>

              {/* ── Labels de tribunas (encima de los sectores) ──────────── */}
              <text
                x={512} y={200}
                textAnchor="middle" dominantBaseline="middle"
                fill="#f3cc5a"
                stroke="#1a1a1a"
                strokeWidth={3}
                paintOrder="stroke fill"
                fontSize={13}
                fontWeight="700"
                letterSpacing={2}
                style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: "'Bebas Neue', sans-serif" }}
              >
                Palcos
              </text>
              <text x={512} y={438} textAnchor="middle" dominantBaseline="middle" fill="#f3cc5a" fontSize={17} fontWeight="700" letterSpacing={3} style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: "'Bebas Neue', sans-serif" }}>
                Frank Henderson
              </text>
              <text x={512} y={762} textAnchor="middle" dominantBaseline="middle" fill="#f3cc5a" fontSize={17} fontWeight="700" letterSpacing={3} style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: "'Bebas Neue', sans-serif" }}>
                José Pedro Damiani
              </text>
              <text x={264} y={600} textAnchor="middle" dominantBaseline="middle" fill="#f3cc5a" fontSize={17} fontWeight="700" letterSpacing={3} transform="rotate(-90 264 600)" style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: "'Bebas Neue', sans-serif" }}>
                Washington Cataldi
              </text>
              <text
                x={206}
                y={475}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#111111"
                fontSize={46}
                letterSpacing={2.2}
                fontWeight="700"
                transform="rotate(-90 206 600)"
                style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: "'Decorattio', 'Bebas Neue', sans-serif" }}
              >
                DECANO
              </text>
              <text x={760} y={600} textAnchor="middle" dominantBaseline="middle" fill="#f3cc5a" fontSize={17} fontWeight="700" letterSpacing={3} transform="rotate(90 760 600)" style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: "'Bebas Neue', sans-serif" }}>
                Gastón Guelfi
              </text>
              <text
                x={512} y={930}
                textAnchor="middle" dominantBaseline="middle"
                fill="#f3cc5a"
                stroke="#1a1a1a"
                strokeWidth={3}
                paintOrder="stroke fill"
                fontSize={13}
                fontWeight="700"
                letterSpacing={2}
                style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: "'Bebas Neue', sans-serif" }}
              >
                Palcos
              </text>
              <text
                x={512}
                y={966}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#111111"
                fontSize={50}
                fontWeight="700"
                letterSpacing={1.8}
                transform="rotate(180 512 966)"
                style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: "'Decorattio', 'Bebas Neue', sans-serif" }}
              >
                PEÑAROL
              </text>
              <text
                x={512}
                y={912}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#111111"
                fontSize={70}
                fontWeight="700"
                letterSpacing={1.8}
                transform="rotate(180 512 894)"
                style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: "'Decorattio', 'Bebas Neue', sans-serif" }}
              >
                1891
              </text>
            </svg>
          </div>
        </div>

        {hoveredId && (
          <div className="tickantel-map-tooltip" aria-live="polite">
            {config.sectors.find((s) => s.id === hoveredId)?.name}
          </div>
        )}

        <style jsx>{`
          .tickantel-map-shell {
            width: 100%;
            background: #1a1a1a;
            border: none;
            border-radius: 6px;
            overflow: hidden;
          }

          .map__content {
            position: relative;
            width: 100%;
            aspect-ratio: ${vw} / ${croppedVh};
            background: #1a1a1a;
            max-height: 67vh;
          }

          .map-svg {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
          }

          .map-svg svg {
            width: 100%;
            height: 100%;
          }

          .map-svg-inhabilitado {
            stroke: #8b8b8b;
            stroke-width: 1.8;
          }

          .map-svg-comprar {
            fill: #f3cc5a;
            stroke: #cf9d00;
            stroke-width: 1.8;
            transition: fill 0.08s ease, stroke 0.08s ease;
          }

          .map-svg-comprar:hover {
            fill: #ffe680;
            stroke: #e6ac00;
            stroke-width: 2.2;
          }

          .map-svg-active {
            fill: #ffe033;
            stroke: #f5c518;
            stroke-width: 2.5;
            animation: sector-pulse 1.6s ease-in-out infinite;
            will-change: opacity;
          }

          @keyframes sector-pulse {
            0%, 100% { opacity: 0.85; }
            50%       { opacity: 1; }
          }

          [id^="henderson"].map-svg-comprar {
            fill: #201E21;
            stroke: #3a3838;
            stroke-width: 1.8;
          }

          [id^="henderson"].map-svg-comprar:hover {
            fill: #2e2b2f;
            stroke: #f5c518;
            stroke-width: 2.2;
          }

          [id^="henderson"].map-svg-active {
            fill: #201E21;
            stroke: #f5c518;
            stroke-width: 2.5;
            animation: sector-pulse 1.6s ease-in-out infinite;
            will-change: opacity;
          }

          [id^="henderson"].map-svg-inhabilitado {
            fill: url(#inhabilitado-pattern-henderson);
            stroke: #555555;
            stroke-width: 1.8;
          }

          #guelfi-visitante-b.map-svg-comprar {
            stroke: #f3cc5a;
            stroke-width: 2.4;
            paint-order: stroke fill;
            stroke-linejoin: round;
            transform-box: fill-box;
            transform-origin: center;
            transform: translate(-1px, -1px) scale(1.018);
          }

          #guelfi-visitante-b.map-svg-active {
            stroke: #f7d976;
            stroke-width: 2.6;
            paint-order: stroke fill;
            stroke-linejoin: round;
            transform-box: fill-box;
            transform-origin: center;
            transform: translate(-1px, -1px) scale(1.02);
          }

          #guelfi-visitante-b.map-svg-inhabilitado {
            stroke: #8b8b8b;
            stroke-width: 2;
            stroke-linejoin: round;
            transform-box: fill-box;
            transform-origin: center;
            transform: translate(-1px, -1px) scale(1.016);
          }

          #guelfi-visitante.map-svg-comprar,
          #guelfi-visitante.map-svg-active {
            fill: #000000;
            stroke: none;
          }

          #guelfi-visitante.map-svg-inhabilitado {
            fill: #000000;
            stroke: none;
          }

          .tickantel-map-tooltip {
            border-top: 1px solid rgba(255,255,255,0.08);
            padding: 6px 10px;
            font-size: 12px;
            color: #d0d0d0;
            background: #1a1a1a;
          }
        `}</style>
      </div>
    );
  }

  return (
    <svg
      viewBox={config.viewBox}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full select-none"
      style={{ fontFamily: "Inter, Arial, sans-serif" }}
    >
      <rect width={vw} height={vh} fill="#0d0d0d" rx={10} />

      {/* Field */}
      {config.sport === 'basketball'
        ? <BasketballCourt cx={config.cx} cy={config.cy} w={config.pitchW} h={config.pitchH} />
        : <FootballField cx={config.cx} cy={config.cy} w={config.pitchW} h={config.pitchH} />
      }

      {/* Sectors */}
      {config.sectors.map((cs) => {
        const status = sectorStatus(cs);
        const colors = STATUS_COLORS[status];
        const db = dbByConfig[cs.id];
        const clickable = status !== 'disabled';

        return (
          <g
            key={cs.id}
            style={{ cursor: clickable ? 'pointer' : 'default' }}
            onClick={() => handleClick(cs)}
            onMouseEnter={() => setHoveredId(cs.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Sector fill */}
            <path
              d={cs.pathData}
              transform={cs.pathTransform}
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={status === 'selected' ? 2.2 : 0.8}
              style={{
                transition: 'fill 0.12s, stroke 0.12s',
                filter: status === 'selected'
                  ? 'drop-shadow(0 0 6px rgba(245,197,24,0.45))'
                  : undefined,
              }}
            />

            {/* Label */}
            <text
              x={cs.labelX}
              y={cs.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={colors.text}
              fontSize={cs.labelFontSize ?? 11}
              fontWeight="700"
              letterSpacing={0.3}
              transform={cs.labelAngle
                ? `rotate(${cs.labelAngle} ${cs.labelX} ${cs.labelY})`
                : undefined}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {cs.labelShort ?? cs.name}
            </text>

            {/* Hover tooltip inside SVG */}
            {hoveredId === cs.id && (
              <g style={{ pointerEvents: 'none' }}>
                <rect
                  x={cs.labelX - 70}
                  y={cs.labelY - 42}
                  width={140}
                  height={38}
                  rx={5}
                  fill="#1a1a1a"
                  stroke="#333"
                  strokeWidth={0.8}
                  opacity={0.95}
                />
                <text
                  x={cs.labelX}
                  y={cs.labelY - 30}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={9}
                  fontWeight="600"
                >
                  {cs.name.length > 22 ? cs.name.slice(0, 22) + '…' : cs.name}
                </text>
                <text
                  x={cs.labelX}
                  y={cs.labelY - 14}
                  textAnchor="middle"
                  fill={db ? (status === 'soldout' ? '#6b7280' : '#F5C518') : '#6b7280'}
                  fontSize={9}
                >
                  {db
                    ? (status === 'soldout'
                        ? 'Agotado'
                        : `${db.disponibles.toLocaleString('es-UY')} disp. · $${db.precio.toLocaleString('es-UY')}`)
                    : 'No configurado'}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Stadium label */}
      <text
        x={config.cx}
        y={vh - 8}
        textAnchor="middle"
        fill="#333"
        fontSize={9}
        letterSpacing={1.2}
        style={{ userSelect: 'none' }}
      >
        {config.name.toUpperCase()}
      </text>
    </svg>
  );
}

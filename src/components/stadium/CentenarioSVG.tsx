"use client";

import { useState } from "react";

export type CentenarioKey = "amsterdam" | "colombes" | "olimpica" | "america";

export interface CentenarioTribunaInfo {
  key: CentenarioKey;
  nombre: string;
  disponibles: number;
  total: number;
  precioDesde: number;
}

interface Props {
  tribunas: CentenarioTribunaInfo[];
  selectedTribuna: CentenarioKey | null;
  onSelectTribuna: (key: CentenarioKey) => void;
}

function pctColor(pct: number, selected: boolean): string {
  if (selected) return "#F5C518";
  if (pct === 0) return "#4A1515";
  if (pct < 0.08) return "#7f1d1d";
  if (pct < 0.2) return "#991B1B";
  if (pct < 0.4) return "#C2410C";
  return "#15563A";
}

function pctStroke(selected: boolean): string {
  return selected ? "#FAD02C" : "#1A1A1A";
}

function pctTextColor(selected: boolean): string {
  return selected ? "#1A1A1A" : "#FFFFFF";
}

export default function CentenarioSVG({ tribunas, selectedTribuna, onSelectTribuna }: Props) {
  const [hovered, setHovered] = useState<CentenarioKey | null>(null);

  const get = (key: CentenarioKey) => tribunas.find((t) => t.key === key);

  const fillFor = (key: CentenarioKey) => {
    const t = get(key);
    if (!t) return "#2A2A2A";
    const pct = t.total > 0 ? t.disponibles / t.total : 0;
    return pctColor(pct, selectedTribuna === key || hovered === key);
  };

  const strokeFor = (key: CentenarioKey) => pctStroke(selectedTribuna === key);
  const sw = (key: CentenarioKey) => (selectedTribuna === key ? 2.5 : hovered === key ? 1.5 : 0.8);
  const txtFor = (key: CentenarioKey) => pctTextColor(selectedTribuna === key);
  const isActive = (key: CentenarioKey) => selectedTribuna === key || hovered === key;

  return (
    <svg
      viewBox="0 0 720 560"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-2xl mx-auto select-none"
      style={{ fontFamily: "Inter, Arial, sans-serif" }}
    >
      {/* ── Background ── */}
      <rect width="720" height="560" fill="#0D0D0D" rx="14" />

      {/* ── Outer stadium shell — elongated oval with flattened ends ── */}
      <path
        d="M 100 40 Q 360 10 620 40 L 680 90 L 680 470 Q 360 510 60 470 L 40 420 L 40 140 Z"
        fill="#1A1A1A"
        stroke="#333"
        strokeWidth="1"
      />

      {/* ══ ÁMSTERDAM — Tribuna Oeste (LEFT, main stand) ══ */}
      <g
        style={{ cursor: "pointer" }}
        onClick={() => onSelectTribuna("amsterdam")}
        onMouseEnter={() => setHovered("amsterdam")}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Main body — wide left side */}
        <path
          d="M 40 140 L 40 420 Q 60 470 110 490 L 150 490 L 150 70 L 110 70 Q 60 90 40 140 Z"
          fill={fillFor("amsterdam")}
          stroke={strokeFor("amsterdam")}
          strokeWidth={sw("amsterdam")}
          style={{ transition: "fill 0.2s" }}
          filter={isActive("amsterdam") ? "drop-shadow(0 0 10px rgba(245,197,24,0.5))" : undefined}
        />
        {/* Press box strip */}
        <rect
          x="40" y="240" width="40" height="80"
          fill={isActive("amsterdam") ? "#C4A015" : "#8B6914"}
          stroke="#1A1A1A" strokeWidth="0.6"
          style={{ transition: "fill 0.2s" }}
        />
        {/* Seat lines */}
        {[100, 120, 140, 160].map((x) => (
          <line key={x} x1={x} y1="100" x2={x} y2="460" stroke="#00000030" strokeWidth="0.5" />
        ))}
        {/* Label */}
        <text
          x="95" y="280" textAnchor="middle" fill={txtFor("amsterdam")} fontSize="12"
          fontWeight="bold" letterSpacing="1.5"
          transform="rotate(-90 95 280)"
          style={{ transition: "fill 0.2s" }}
        >
          ÁMSTERDAM
        </text>
        <text
          x="68" y="280" textAnchor="middle" fill={txtFor("amsterdam")} fontSize="8"
          opacity="0.75" transform="rotate(-90 68 280)"
          style={{ transition: "fill 0.2s" }}
        >
          Tribuna Oeste — Principal
        </text>
        {get("amsterdam") && (
          <text
            x="50" y="280" textAnchor="middle" fill={txtFor("amsterdam")} fontSize="7"
            opacity="0.65" transform="rotate(-90 50 280)"
          >
            {get("amsterdam")!.disponibles.toLocaleString()} disp.
          </text>
        )}
      </g>

      {/* ══ COLOMBES — Tribuna Este (RIGHT) ══ */}
      <g
        style={{ cursor: "pointer" }}
        onClick={() => onSelectTribuna("colombes")}
        onMouseEnter={() => setHovered("colombes")}
        onMouseLeave={() => setHovered(null)}
      >
        <path
          d="M 570 70 L 610 70 Q 660 90 680 140 L 680 420 Q 660 470 610 490 L 570 490 Z"
          fill={fillFor("colombes")}
          stroke={strokeFor("colombes")}
          strokeWidth={sw("colombes")}
          style={{ transition: "fill 0.2s" }}
          filter={isActive("colombes") ? "drop-shadow(0 0 10px rgba(245,197,24,0.5))" : undefined}
        />
        {/* Seat lines */}
        {[580, 600, 620, 640].map((x) => (
          <line key={x} x1={x} y1="100" x2={x} y2="460" stroke="#00000030" strokeWidth="0.5" />
        ))}
        <text
          x="625" y="280" textAnchor="middle" fill={txtFor("colombes")} fontSize="12"
          fontWeight="bold" letterSpacing="1.5"
          transform="rotate(90 625 280)"
          style={{ transition: "fill 0.2s" }}
        >
          COLOMBES
        </text>
        <text
          x="652" y="280" textAnchor="middle" fill={txtFor("colombes")} fontSize="8"
          opacity="0.75" transform="rotate(90 652 280)"
          style={{ transition: "fill 0.2s" }}
        >
          Tribuna Este
        </text>
        {get("colombes") && (
          <text
            x="670" y="280" textAnchor="middle" fill={txtFor("colombes")} fontSize="7"
            opacity="0.65" transform="rotate(90 670 280)"
          >
            {get("colombes")!.disponibles.toLocaleString()} disp.
          </text>
        )}
      </g>

      {/* ══ OLÍMPICA — Tribuna Norte (TOP, curved) ══ */}
      <g
        style={{ cursor: "pointer" }}
        onClick={() => onSelectTribuna("olimpica")}
        onMouseEnter={() => setHovered("olimpica")}
        onMouseLeave={() => setHovered(null)}
      >
        <path
          d="M 110 70 L 150 70 L 150 160 L 570 160 L 570 70 L 610 70 Q 360 10 110 70 Z"
          fill={fillFor("olimpica")}
          stroke={strokeFor("olimpica")}
          strokeWidth={sw("olimpica")}
          style={{ transition: "fill 0.2s" }}
          filter={isActive("olimpica") ? "drop-shadow(0 0 10px rgba(245,197,24,0.5))" : undefined}
        />
        {/* Seat lines */}
        {[95, 115, 135].map((y) => (
          <line key={y} x1="150" y1={y} x2="570" y2={y} stroke="#00000030" strokeWidth="0.5" />
        ))}
        <text x="360" y="122" textAnchor="middle" fill={txtFor("olimpica")} fontSize="13"
          fontWeight="bold" letterSpacing="2" style={{ transition: "fill 0.2s" }}>
          OLÍMPICA
        </text>
        <text x="360" y="138" textAnchor="middle" fill={txtFor("olimpica")} fontSize="9"
          opacity="0.75">
          Tribuna Norte
        </text>
        {get("olimpica") && (
          <text x="360" y="153" textAnchor="middle" fill={txtFor("olimpica")} fontSize="8" opacity="0.65">
            {get("olimpica")!.disponibles.toLocaleString()} disponibles
          </text>
        )}
      </g>

      {/* ══ AMÉRICA — Tribuna Sur (BOTTOM, curved) ══ */}
      <g
        style={{ cursor: "pointer" }}
        onClick={() => onSelectTribuna("america")}
        onMouseEnter={() => setHovered("america")}
        onMouseLeave={() => setHovered(null)}
      >
        <path
          d="M 150 400 L 150 490 L 110 490 Q 60 470 40 420 L 40 400 Z"
          fill={fillFor("america")}
          stroke={strokeFor("america")}
          strokeWidth={sw("america")}
          style={{ transition: "fill 0.2s" }}
          opacity="0"
        />
        <path
          d="M 110 490 Q 360 540 610 490 L 570 490 L 570 400 L 150 400 L 150 490 Z"
          fill={fillFor("america")}
          stroke={strokeFor("america")}
          strokeWidth={sw("america")}
          style={{ transition: "fill 0.2s" }}
          filter={isActive("america") ? "drop-shadow(0 0 10px rgba(245,197,24,0.5))" : undefined}
        />
        {/* Seat lines */}
        {[415, 435, 455, 475].map((y) => (
          <line key={y} x1="150" y1={y} x2="570" y2={y} stroke="#00000030" strokeWidth="0.5" />
        ))}
        <text x="360" y="435" textAnchor="middle" fill={txtFor("america")} fontSize="13"
          fontWeight="bold" letterSpacing="2" style={{ transition: "fill 0.2s" }}>
          AMÉRICA
        </text>
        <text x="360" y="452" textAnchor="middle" fill={txtFor("america")} fontSize="9" opacity="0.75">
          Tribuna Sur
        </text>
        {get("america") && (
          <text x="360" y="468" textAnchor="middle" fill={txtFor("america")} fontSize="8" opacity="0.65">
            {get("america")!.disponibles.toLocaleString()} disponibles
          </text>
        )}
      </g>

      {/* ══ FIELD ══ */}
      <rect x="150" y="160" width="420" height="240" fill="#1B4B2A" rx="4" />
      <rect x="160" y="170" width="400" height="220" fill="#1F5B30" rx="3" />
      {/* Center circle */}
      <circle cx="360" cy="280" r="40" fill="none" stroke="#FFFFFF22" strokeWidth="1" />
      <circle cx="360" cy="280" r="2.5" fill="#FFFFFF33" />
      {/* Center line */}
      <line x1="160" y1="280" x2="560" y2="280" stroke="#FFFFFF22" strokeWidth="0.8" />
      {/* Left penalty box */}
      <rect x="160" y="233" width="75" height="94" fill="none" stroke="#FFFFFF22" strokeWidth="0.8" />
      <rect x="160" y="255" width="38" height="50" fill="none" stroke="#FFFFFF18" strokeWidth="0.6" />
      {/* Right penalty box */}
      <rect x="485" y="233" width="75" height="94" fill="none" stroke="#FFFFFF22" strokeWidth="0.8" />
      <rect x="522" y="255" width="38" height="50" fill="none" stroke="#FFFFFF18" strokeWidth="0.6" />
      {/* Goals */}
      <rect x="144" y="263" width="16" height="34" fill="none" stroke="#FFFFFF44" strokeWidth="1" rx="1" />
      <rect x="560" y="263" width="16" height="34" fill="none" stroke="#FFFFFF44" strokeWidth="1" rx="1" />
      {/* Corner arcs */}
      <path d="M 160 170 A 8 8 0 0 1 168 178" fill="none" stroke="#FFFFFF15" strokeWidth="0.7" />
      <path d="M 560 170 A 8 8 0 0 0 552 178" fill="none" stroke="#FFFFFF15" strokeWidth="0.7" />
      <path d="M 160 390 A 8 8 0 0 0 168 382" fill="none" stroke="#FFFFFF15" strokeWidth="0.7" />
      <path d="M 560 390 A 8 8 0 0 1 552 382" fill="none" stroke="#FFFFFF15" strokeWidth="0.7" />

      {/* ── Watermark ── */}
      <text x="360" y="550" textAnchor="middle" fill="#444" fontSize="7.5" letterSpacing="3">
        ESTADIO CENTENARIO — MONTEVIDEO, URUGUAY
      </text>
    </svg>
  );
}

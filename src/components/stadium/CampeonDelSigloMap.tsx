"use client";

import { useState } from "react";

export type TribunaKey = "henderson" | "damiani" | "cataldi" | "guelfi";

export interface TribunaInfo {
  key: TribunaKey;
  nombre: string;
  disponibles: number;
  total: number;
  precioDesde: number;
}

interface Props {
  tribunas: TribunaInfo[];
  selectedTribuna: TribunaKey | null;
  onSelectTribuna: (key: TribunaKey) => void;
}

function fillByAvailability(pct: number, selected: boolean, hovered: boolean): string {
  if (selected) return "#CBCBCB";
  if (hovered) return "#E4E4E4";
  if (pct === 0) return "#D8D8D8";
  if (pct < 0.1) return "#D0D0D0";
  if (pct < 0.3) return "#DADADA";
  return "#E7E7E7";
}

function strokeColor(selected: boolean): string {
  return selected ? "#8E8E8E" : "#C9C9C9";
}

function textColor(selected: boolean): string {
  return selected ? "#333333" : "#555555";
}

function visitorColor(selected: boolean, hovered: boolean): string {
  if (selected) return "#BFBFBF";
  if (hovered) return "#D8D8D8";
  return "#C9C9C9";
}

function ringShadow(active: boolean): string | undefined {
  return active ? "drop-shadow(0 0 6px rgba(0,0,0,0.14))" : undefined;
}

export default function CampeonDelSigloSVG({ tribunas, selectedTribuna, onSelectTribuna }: Props) {
  const [hovered, setHovered] = useState<TribunaKey | null>(null);

  const getTribuna = (key: TribunaKey) => tribunas.find((t) => t.key === key);

  const tribunaFill = (key: TribunaKey) => {
    const t = getTribuna(key);
    if (!t) return "#D1D5DB";
    const pct = t.total > 0 ? t.disponibles / t.total : 0;
    return fillByAvailability(pct, selectedTribuna === key, hovered === key);
  };

  const isActive = (key: TribunaKey) => selectedTribuna === key || hovered === key;
  const tColor = (key: TribunaKey) => textColor(selectedTribuna === key);

  const topLetters = ["R", "Q", "P", "O", "N", "M", "L", "K", "J", "I", "H", "G", "F", "E", "D", "C", "B", "A"];
  const leftLetters = ["Q", "P", "O", "N", "M", "L", "K", "J", "I"];
  const rightLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q"];

  return (
    <svg
      viewBox="0 0 960 700"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-3xl mx-auto select-none"
      style={{ fontFamily: "Arial, Segoe UI, sans-serif" }}
    >
      <rect width="960" height="700" fill="#FFFFFF" rx="12" />

      <text x="480" y="48" textAnchor="middle" fill="#808080" fontSize="27" fontWeight="500">
        Estadio Campeón del Siglo
      </text>
      <text x="480" y="72" textAnchor="middle" fill="#B1B1B1" fontSize="12" letterSpacing="1.7">
        CLUB ATLETICO PENAROL
      </text>

      <path
        d="M 120 150 Q 480 48 840 150 L 875 190 L 845 232 Q 820 215 792 206 L 742 267 Q 760 330 760 350 Q 760 370 742 432 L 792 493 Q 820 484 845 467 L 875 510 L 840 550 Q 480 654 120 550 L 85 510 L 115 467 Q 140 484 168 493 L 218 432 Q 200 370 200 350 Q 200 330 218 267 L 168 206 Q 140 215 115 232 L 85 190 Z"
        fill="#F9F9F9"
        stroke="#DDDDDD"
        strokeWidth="3"
      />

      <g
        style={{ cursor: "pointer" }}
        onClick={() => onSelectTribuna("henderson")}
        onMouseEnter={() => setHovered("henderson")}
        onMouseLeave={() => setHovered(null)}
        filter={ringShadow(isActive("henderson"))}
      >
        <path
          d="M 178 198 Q 480 106 782 198 L 742 258 Q 480 191 218 258 Z"
          fill={tribunaFill("henderson")}
          stroke={strokeColor(selectedTribuna === "henderson")}
          strokeWidth={selectedTribuna === "henderson" ? 3 : 1.6}
        />

        <rect x="438" y="120" width="84" height="26" rx="10" fill="#EFEFEF" stroke="#DDDDDD" strokeWidth="1" />
        <rect x="400" y="160" width="160" height="20" rx="9" fill="#F1F1F1" stroke="#E2E2E2" strokeWidth="1" />

        {topLetters.map((letter, i) => {
          const x = 225 + i * 30;
          const y = 232 + Math.abs(8.5 - i) * 1.2;
          return (
            <text key={letter} x={x} y={y} textAnchor="middle" fill={tColor("henderson")} fontSize="13" fontWeight="500">
              {letter}
            </text>
          );
        })}

        <text x="480" y="278" textAnchor="middle" fill="#7B7B7B" fontSize="24" fontWeight="500" letterSpacing="1">
          FRANK HENDERSON
        </text>

        {getTribuna("henderson") && (
          <text x="480" y="297" textAnchor="middle" fill="#9A9A9A" fontSize="13">
            {getTribuna("henderson")!.disponibles.toLocaleString()} disponibles · desde ${getTribuna("henderson")!.precioDesde.toLocaleString()}
          </text>
        )}
      </g>

      <g
        style={{ cursor: "pointer" }}
        onClick={() => onSelectTribuna("cataldi")}
        onMouseEnter={() => setHovered("cataldi")}
        onMouseLeave={() => setHovered(null)}
        filter={ringShadow(isActive("cataldi"))}
      >
        <path
          d="M 122 232 L 198 285 Q 172 350 198 415 L 122 468 Q 89 350 122 232 Z"
          fill={tribunaFill("cataldi")}
          stroke={strokeColor(selectedTribuna === "cataldi")}
          strokeWidth={selectedTribuna === "cataldi" ? 3 : 1.6}
        />

        {leftLetters.map((letter, i) => (
            <text key={letter} x={165} y={268 + i * 22} textAnchor="middle" fill={tColor("cataldi")} fontSize="14" fontWeight="500">
            {letter}
          </text>
        ))}

        <text x="228" y="352" textAnchor="middle" fill="#7B7B7B" fontSize="22" transform="rotate(-90 228 352)">
          WASHINGTON CATALDI
        </text>
      </g>

      <g
        style={{ cursor: "pointer" }}
        onClick={() => onSelectTribuna("guelfi")}
        onMouseEnter={() => setHovered("guelfi")}
        onMouseLeave={() => setHovered(null)}
        filter={ringShadow(isActive("guelfi"))}
      >
        <path
          d="M 838 232 L 762 285 Q 788 350 762 415 L 838 468 Q 871 350 838 232 Z"
          fill={tribunaFill("guelfi")}
          stroke={strokeColor(selectedTribuna === "guelfi")}
          strokeWidth={selectedTribuna === "guelfi" ? 3 : 1.6}
        />

        <path
          d="M 812 256 L 762 289 Q 778 328 780 350 Q 779 372 762 412 L 812 444 Q 832 398 832 350 Q 832 302 812 256 Z"
          fill={visitorColor(selectedTribuna === "guelfi", hovered === "guelfi")}
          opacity="0.34"
        />

        {rightLetters.map((letter, i) => {
          const y = 270 + i * 15;
          return (
            <text key={letter} x={795} y={y} textAnchor="middle" fill={tColor("guelfi")} fontSize="12.5" fontWeight="500">
              {letter}
            </text>
          );
        })}

        <text x="734" y="352" textAnchor="middle" fill="#7B7B7B" fontSize="22" transform="rotate(90 734 352)">
          GASTON GUELFI
        </text>

        <text x="826" y="337" textAnchor="middle" fill="#9A9A9A" fontSize="11" transform="rotate(90 826 337)">
          Visitante
        </text>
      </g>

      <g
        style={{ cursor: "pointer" }}
        onClick={() => onSelectTribuna("damiani")}
        onMouseEnter={() => setHovered("damiani")}
        onMouseLeave={() => setHovered(null)}
        filter={ringShadow(isActive("damiani"))}
      >
        <path
          d="M 218 442 Q 480 509 742 442 L 782 502 Q 480 594 178 502 Z"
          fill={tribunaFill("damiani")}
          stroke={strokeColor(selectedTribuna === "damiani")}
          strokeWidth={selectedTribuna === "damiani" ? 3 : 1.6}
        />

        <rect x="404" y="505" width="152" height="21" rx="9" fill="#F1F1F1" stroke="#E2E2E2" strokeWidth="1" />
        <text x="480" y="518" textAnchor="middle" fill="#9A9A9A" fontSize="12" fontWeight="500">
          PALCOS
        </text>

        <text x="480" y="492" textAnchor="middle" fill="#7B7B7B" fontSize="24" fontWeight="500" letterSpacing="1">
          JOSE PEDRO DAMIANI
        </text>

        {getTribuna("damiani") && (
          <text x="480" y="566" textAnchor="middle" fill="#9A9A9A" fontSize="13">
            {getTribuna("damiani")!.disponibles.toLocaleString()} disponibles · desde ${getTribuna("damiani")!.precioDesde.toLocaleString()}
          </text>
        )}
      </g>

      <rect x="248" y="286" width="464" height="128" rx="6" fill="#B9D6B7" />
      <rect x="248" y="286" width="464" height="128" rx="6" fill="none" stroke="#E5E5E5" strokeWidth="3" />

      <line x1="480" y1="286" x2="480" y2="414" stroke="#E5E5E5" strokeWidth="2" />
      <circle cx="480" cy="350" r="28" fill="none" stroke="#E5E5E5" strokeWidth="2" />

      <rect x="248" y="319" width="66" height="62" fill="none" stroke="#E5E5E5" strokeWidth="2" />
      <rect x="646" y="319" width="66" height="62" fill="none" stroke="#E5E5E5" strokeWidth="2" />

      <rect x="248" y="333" width="26" height="34" fill="none" stroke="#E5E5E5" strokeWidth="2" />
      <rect x="686" y="333" width="26" height="34" fill="none" stroke="#E5E5E5" strokeWidth="2" />

      <circle cx="350" cy="350" r="1.8" fill="#E5E5E5" />
      <circle cx="610" cy="350" r="1.8" fill="#E5E5E5" />
    </svg>
  );
}

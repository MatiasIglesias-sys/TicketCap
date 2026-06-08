"use client";

import { useState, useMemo } from "react";
import { getStadiumConfig }   from "@/lib/stadiums/registry";
import { stadiumIdFromName }  from "@/lib/stadiums/engine";
import { STATUS_COLORS }      from "@/lib/stadiums/types";
import type { SectorConfig }  from "@/lib/stadiums/types";

interface Props {
  estadioName: string;
  eventId: string;
  initialVisitorSections?: string[];
  onSave?: (sectionIds: string[]) => void;
}

export default function VisitorSectionPicker({
  estadioName,
  eventId,
  initialVisitorSections = [],
  onSave,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialVisitorSections));
  const [saving, setSaving]     = useState(false);
  const [saved,  setSaved]      = useState(false);

  const config = useMemo(
    () => getStadiumConfig(stadiumIdFromName(estadioName)),
    [estadioName]
  );

  const [vw, vh] = config.viewBox.split(' ').slice(2).map(Number);

  function toggleSector(cs: SectorConfig) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cs.id)) next.delete(cs.id); else next.add(cs.id);
      return next;
    });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const ids = [...selected];
    try {
      await fetch(`/api/events/${eventId}/visitor-sections`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ visitorSectionIds: ids }),
      });
      setSaved(true);
      onSave?.(ids);
    } finally {
      setSaving(false);
    }
  }

  // Football field markings (inline, no import needed)
  function FootballField() {
    const cx = config.cx, cy = config.cy, w = config.pitchW, h = config.pitchH;
    const l = cx - w / 2, r = cx + w / 2, t = cy - h / 2, b = cy + h / 2;
    const C = "#3a9a40";
    return (
      <g>
        <rect x={l} y={t} width={w} height={h} fill="#1a4d20" rx={3} />
        <rect x={l} y={t} width={w} height={h} fill="none" stroke={C} strokeWidth={1.5} rx={3} />
        <line x1={cx} y1={t} x2={cx} y2={b} stroke={C} strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={h * 0.165} fill="none" stroke={C} strokeWidth={1.5} />
      </g>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-negro-suave border border-amarillo/20 rounded-xl p-4">
        <p className="text-amarillo text-xs font-semibold uppercase tracking-wider mb-1">
          Asignación de tribuna visitante
        </p>
        <p className="text-gris-medio text-xs">
          Hacé click en los sectores del estadio que estarán habilitados para la hinchada visitante.
          El resto quedará deshabilitado.
        </p>
      </div>

      {/* SVG map — all sectors clickable */}
      <svg
        viewBox={config.viewBox}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full select-none"
        style={{ fontFamily: "Inter, Arial, sans-serif" }}
      >
        <rect width={vw} height={vh} fill="#0d0d0d" rx={10} />
        <FootballField />

        {config.sectors.map((cs) => {
          const isVisitor  = selected.has(cs.id);
          const colors = isVisitor
            ? STATUS_COLORS.visitor
            : STATUS_COLORS.disabled;

          return (
            <g
              key={cs.id}
              style={{ cursor: 'pointer' }}
              onClick={() => toggleSector(cs)}
            >
              <path
                d={cs.pathData}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={isVisitor ? 2 : 0.8}
                style={{
                  transition: 'fill 0.15s',
                  filter: isVisitor
                    ? 'drop-shadow(0 0 5px rgba(59,130,246,0.5))'
                    : undefined,
                }}
              />
              <text
                x={cs.labelX}
                y={cs.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={colors.text}
                fontSize={cs.labelFontSize ?? 11}
                fontWeight="700"
                transform={cs.labelAngle
                  ? `rotate(${cs.labelAngle} ${cs.labelX} ${cs.labelY})`
                  : undefined}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {cs.labelShort ?? cs.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Selected list */}
      {selected.size > 0 && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3">
          <p className="text-blue-400 text-xs font-semibold mb-2">Sectores visitante seleccionados:</p>
          <div className="flex flex-wrap gap-2">
            {[...selected].map((id) => {
              const cs = config.sectors.find((s) => s.id === id);
              return (
                <span
                  key={id}
                  onClick={() => toggleSector(cs!)}
                  className="text-[10px] bg-blue-500/15 border border-blue-500/30 text-blue-300 rounded px-2 py-0.5 cursor-pointer hover:bg-blue-500/25"
                >
                  {cs?.name ?? id} ×
                </span>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || selected.size === 0}
        className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
      >
        {saving ? (
          <><div className="spinner w-4 h-4" />Guardando...</>
        ) : saved ? (
          '✓ Guardado'
        ) : (
          `Guardar asignación (${selected.size} sector${selected.size !== 1 ? 'es' : ''})`
        )}
      </button>
    </div>
  );
}

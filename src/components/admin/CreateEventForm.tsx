"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Upload, Lock, Unlock } from "lucide-react";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────

type Sport = "football" | "basketball" | "rugby" | "parking";

type SectorForm = {
  nombre: string;
  tipo: string;
  capacidad: number;
  disponibles: number;
  precio: number;
  precioSocio: number;
  habilitado: boolean;
  esVisitante?: boolean;
  esFamiliar?: boolean;
  soloSocios?: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TORNEOS: { value: string; label: string; sport: Sport }[] = [
  // Fútbol
  { value: "CLAUSURA",       label: "Clausura",                     sport: "football" },
  { value: "APERTURA",       label: "Apertura",                     sport: "football" },
  { value: "INTERMEDIO",     label: "Intermedio",                   sport: "football" },
  { value: "COPA_URUGUAY",   label: "Copa AUF Uruguay",             sport: "football" },
  { value: "LIBERTADORES",   label: "Copa Libertadores",            sport: "football" },
  { value: "SUDAMERICANA",   label: "Copa Sudamericana",            sport: "football" },
  { value: "SUPERCOPA",      label: "Supercopa",                    sport: "football" },
  { value: "AMISTOSO",       label: "Amistoso Fútbol",              sport: "football" },
  { value: "MUNDIAL_CLUBES", label: "Mundial de Clubes",            sport: "football" },
  // Básquetbol
  { value: "BASQUETBOL",     label: "Básquetbol — Liga",            sport: "basketball" },
  { value: "BASQUETBOL_COPA",label: "Básquetbol — Copa",            sport: "basketball" },
  // Rugby
  { value: "RUGBY",          label: "Rugby — Liga",                 sport: "rugby" },
  { value: "RUGBY_COPA",     label: "Rugby — Copa",                 sport: "rugby" },
  { value: "RUGBY_AMERICAS", label: "Rugby — Súper Rugby Américas", sport: "rugby" },
  // Parking
  { value: "PARKING",        label: "Estacionamiento",              sport: "parking" },
];

// Estadios disponibles para visitante de fútbol (Copa Libertadores, etc.)
const ESTADIOS_VISITANTE = [
  "Estadio Centenario",
  "Estadio Gran Parque Central",
  "Estadio Luis Franzini",
  "Estadio Jardines del Hipódromo",
  "Estadio Parque Artigas",
  "Estadio Palermo",
  "Otro",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSport(torneo: string): Sport {
  return TORNEOS.find((t) => t.value === torneo)?.sport ?? "football";
}

/**
 * Returns the auto-assigned stadium or null if the user must choose manually.
 */
function getAutoEstadio(torneo: string, esLocal: boolean): string | null {
  const sport = getSport(torneo);
  if (esLocal) {
    if (sport === "basketball") return "Palacio Peñarol";
    if (sport === "rugby")      return "Estadio General Rugby";
    return "Estadio Campeón del Siglo"; // football + parking
  }
  // Visitante
  if (sport === "basketball") return "Estadio General Basketball";
  if (sport === "rugby")      return "Estadio General Rugby";
  // Football visitante — Copa AUF Uruguay: elige entre dos, resto: selector libre
  if (torneo === "COPA_URUGUAY") return null;
  return null;
}

function isAutoEstadio(torneo: string, esLocal: boolean): boolean {
  return getAutoEstadio(torneo, esLocal) !== null;
}

function isCopaSplit(torneo: string, esLocal: boolean): boolean {
  return !esLocal && torneo === "COPA_URUGUAY";
}

function needsFreeSelector(torneo: string, esLocal: boolean): boolean {
  if (esLocal) return false;
  return getSport(torneo) === "football" && torneo !== "COPA_URUGUAY";
}

function tag(s: SectorForm): SectorForm { return s; }

function buildSectores(torneo: string, estadio: string, esLocal: boolean): SectorForm[] {
  if (torneo === "PARKING") {
    return [tag({ nombre: "Estacionamiento General", tipo: "PARKING", capacidad: 500, disponibles: 500, precio: 400, precioSocio: 300, habilitado: true })];
  }

  if (torneo === "BASQUETBOL" || torneo === "BASQUETBOL_COPA") {
    return [
      tag({ nombre: "Platea Alta",  tipo: "POPULAR",    capacidad: 2000, disponibles: 2000, precio: 400,  precioSocio: 0,    habilitado: true }),
      tag({ nombre: "Platea Baja",  tipo: "PLATEA_VIP", capacidad: 1500, disponibles: 1500, precio: 700,  precioSocio: 0,    habilitado: true }),
      tag({ nombre: "Palcos VIP",   tipo: "PALCO_VIP",  capacidad: 200,  disponibles: 200,  precio: 2000, precioSocio: 1500, habilitado: true }),
    ];
  }

  if (torneo === "RUGBY" || torneo === "RUGBY_COPA" || torneo === "RUGBY_AMERICAS") {
    return [
      tag({ nombre: "Popular General", tipo: "POPULAR",    capacidad: 5000, disponibles: 5000, precio: 300, precioSocio: 0, habilitado: true }),
      tag({ nombre: "Platea",          tipo: "PLATEA_VIP", capacidad: 3000, disponibles: 3000, precio: 600, precioSocio: 0, habilitado: true }),
    ];
  }

  // Visitante fútbol
  if (!esLocal) {
    return [tag({ nombre: "Hinchada Visitante", tipo: "PLATEA_VISITANTE", capacidad: 3000, disponibles: 3000, precio: 800, precioSocio: 0, habilitado: true, esVisitante: true })];
  }

  // Local fútbol — Centenario
  if (estadio.toLowerCase().includes("centenario")) {
    return [
      tag({ nombre: "Tribuna Ámsterdam", tipo: "PLATEA_VIP",      capacidad: 10000, disponibles: 10000, precio: 1200,  precioSocio: 0,     habilitado: true }),
      tag({ nombre: "Tribuna Colombes",  tipo: "PLATEA_FAMILIAR", capacidad: 8000,  disponibles: 8000,  precio: 800,   precioSocio: 0,     habilitado: true, esFamiliar: true }),
      tag({ nombre: "Tribuna Olímpica",  tipo: "POPULAR",         capacidad: 12000, disponibles: 12000, precio: 600,   precioSocio: 0,     habilitado: true }),
      tag({ nombre: "Tribuna América",   tipo: "POPULAR",         capacidad: 10000, disponibles: 10000, precio: 600,   precioSocio: 0,     habilitado: true }),
      tag({ nombre: "Palcos VIP",        tipo: "PALCO_VIP",       capacidad: 500,   disponibles: 500,   precio: 12000, precioSocio: 10000, habilitado: true }),
    ];
  }

  // Local fútbol — Campeón del Siglo (default)
  const HENDERSON_CAP = 525;
  const letras = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R"];
  const pref   = new Set(["D","E","M","N"]);
  const henderson: SectorForm[] = letras.flatMap((l) => {
    const base = tag({ nombre: `T. Henderson - Sector ${l}`, tipo: "PLATEA_VIP", capacidad: HENDERSON_CAP, disponibles: HENDERSON_CAP, precio: 2750, precioSocio: 0, habilitado: true });
    return pref.has(l)
      ? [base, tag({ nombre: `Sector ${l} Preferencial`, tipo: "PALCO_VIP", capacidad: 200, disponibles: 200, precio: 2750, precioSocio: 0, habilitado: true })]
      : [base];
  });

  return [
    tag({ nombre: "Tr. W. Cataldi",        tipo: "POPULAR",         capacidad: 8380, disponibles: 8380, precio: 870,  precioSocio: 0,  habilitado: true }),
    tag({ nombre: "Tr. Damiani - Puerta C", tipo: "PLATEA_FAMILIAR", capacidad: 4500, disponibles: 4500, precio: 1240, precioSocio: 0,  habilitado: true, esFamiliar: true }),
    tag({ nombre: "Tr. Damiani - Puerta D", tipo: "PLATEA_FAMILIAR", capacidad: 4500, disponibles: 4500, precio: 1240, precioSocio: 0,  habilitado: true, esFamiliar: true }),
    tag({ nombre: "Tr. Güelfi - Visitante", tipo: "PLATEA_VISITANTE",capacidad: 2141, disponibles: 2141, precio: 870,  precioSocio: 870, habilitado: true, esVisitante: true }),
    ...henderson,
  ];
}

async function fetchTeamLogo(teamName: string): Promise<string | null> {
  if (teamName.trim().length < 2) return null;
  try {
    const res  = await fetch(`/api/team-logo?name=${encodeURIComponent(teamName.trim())}`);
    const data = await res.json();
    return data.url ?? null;
  } catch { return null; }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateEventForm() {
  const router      = useRouter();
  const [open, setOpen]       = useState(false);
  const [saving, setSaving]   = useState(false);
  const [fetchingLogo, setFetchingLogo]   = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [nombre,   setNombre]   = useState("");
  const [rival,    setRival]    = useState("");
  const [rivalEscudo, setRivalEscudo] = useState("");
  const [fecha,    setFecha]    = useState("");
  const [torneo,   setTorneo]   = useState("CLAUSURA");
  const [esLocal,  setEsLocal]  = useState(true);
  const [estadio,  setEstadio]  = useState("Estadio Campeón del Siglo");
  const [sectores, setSectores] = useState<SectorForm[]>([]);
  const [descripcion,    setDescripcion]    = useState("");
  const [limiteXUsuario, setLimiteXUsuario] = useState(4);
  const [diasRanking, setDiasRanking]       = useState(7);
  const [diasSocios,  setDiasSocios]        = useState(3);
  const [diasGeneral, setDiasGeneral]       = useState(1);
  const [rankingMin,  setRankingMin]        = useState(45);

  // ── Auto-set estadio when torneo or esLocal changes ─────────────────────────
  useEffect(() => {
    const auto = getAutoEstadio(torneo, esLocal);
    if (auto) setEstadio(auto);
    else if (isAutoEstadio(torneo, !esLocal)) {
      // switching to visitante that needs manual choice
      setEstadio("");
    }
  }, [torneo, esLocal]);

  // ── Regenerate sectors when torneo / estadio / esLocal change ───────────────
  useEffect(() => {
    if (!estadio && !isAutoEstadio(torneo, esLocal)) return; // wait for user to pick estadio
    setSectores(buildSectores(torneo, estadio, esLocal));
  }, [torneo, estadio, esLocal]);

  // ── Auto-fetch rival logo ────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setRivalEscudo("");
    if (rival.length < 2) return;
    debounceRef.current = setTimeout(async () => {
      setFetchingLogo(true);
      const logo = await fetchTeamLogo(rival);
      setRivalEscudo(logo ?? "");
      setFetchingLogo(false);
    }, 700);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [rival]);

  // ── Logo upload ──────────────────────────────────────────────────────────────
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const fd = new FormData();
    fd.append("file", file);
    const res  = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.url) setRivalEscudo(data.url);
    setUploadingLogo(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Sector helpers ───────────────────────────────────────────────────────────
  function updateSector(idx: number, field: keyof SectorForm, value: number | boolean) {
    setSectores((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre, rival, rivalEscudo, fecha, torneo, estadio, esLocal,
        descripcion, limiteXUsuario,
        estado: "PROXIMO",
        ventaEstado: "CERRADO",
        ventaEscalonadaActiva: true,
        diasAntesRanking: diasRanking,
        diasAntesSocios:  diasSocios,
        diasAntesGeneral: diasGeneral,
        rankingMinAsistenciaPct: rankingMin,
        sectores,
      }),
    });
    setSaving(false);
    resetForm();
    setOpen(false);
    router.refresh();
  }

  function resetForm() {
    setNombre(""); setRival(""); setRivalEscudo(""); setFecha("");
    setTorneo("CLAUSURA"); setEsLocal(true); setEstadio("Estadio Campeón del Siglo");
    setSectores([]); setDescripcion(""); setLimiteXUsuario(4);
    setDiasRanking(7); setDiasSocios(3); setDiasGeneral(1); setRankingMin(45);
  }

  // ── Derived state ────────────────────────────────────────────────────────────
  const sport       = getSport(torneo);
  const copaSplit   = isCopaSplit(torneo, esLocal);
  const freeSelect  = needsFreeSelector(torneo, esLocal);
  const autoEst     = isAutoEstadio(torneo, esLocal);
  const habilitadas = sectores.filter((s) => s.habilitado).length;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2 text-sm">
        <Plus size={16} />
        Nuevo evento
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-negro-suave border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl animate-fade-in flex flex-col max-h-[92vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
              <h2 className="text-white font-semibold text-base">Crear nuevo evento</h2>
              <button onClick={() => { setOpen(false); resetForm(); }} className="text-gris-oscuro hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* ── 1. Nombre + Rival ─────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Nombre del evento *</label>
                  <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                    className="input-dark text-sm" placeholder="Peñarol vs ..." required />
                </div>

                <div>
                  <label className="field-label">
                    Rival <span className="text-gris-oscuro/50">— nombre oficial</span>
                  </label>
                  <div className="relative">
                    <input type="text" value={rival} onChange={(e) => setRival(e.target.value)}
                      className="input-dark text-sm pr-10" placeholder='Ej: "Nacional" o "Boca Juniors"' />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      {(fetchingLogo || uploadingLogo) && <Loader2 size={14} className="text-amarillo animate-spin" />}
                      {!fetchingLogo && !uploadingLogo && rivalEscudo && (
                        <Image src={rivalEscudo} alt="logo" width={24} height={24} className="w-6 h-6 object-contain" unoptimized />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span>
                      {rivalEscudo && !fetchingLogo && <p className="text-[10px] text-alerta-verde">✓ Logo listo</p>}
                      {!rivalEscudo && !fetchingLogo && rival.length >= 2 && <p className="text-[10px] text-gris-oscuro">Sin logo automático</p>}
                    </span>
                    <div>
                      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden" onChange={handleLogoUpload} />
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo}
                        className="flex items-center gap-1 text-[10px] text-gris-oscuro hover:text-white border border-white/10 hover:border-white/25 rounded px-2 py-0.5 transition-colors">
                        <Upload size={10} />
                        {rivalEscudo ? "Cambiar logo" : "Subir logo"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 2. Fecha + Torneo ─────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Fecha y hora *</label>
                  <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)}
                    className="input-dark text-sm" required />
                </div>
                <div>
                  <label className="field-label">Torneo *</label>
                  <select value={torneo} onChange={(e) => setTorneo(e.target.value)} className="input-dark text-sm">
                    {TORNEOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              {/* ── 3. Local / Visitante ──────────────────────────────────── */}
              <div>
                <label className="field-label">Condición de Peñarol *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setEsLocal(true)}
                    className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      esLocal ? "bg-amarillo/15 border-amarillo text-amarillo" : "bg-negro-medio border-white/10 text-gris-oscuro hover:border-white/25"
                    }`}>
                    Local
                  </button>
                  <button type="button" onClick={() => setEsLocal(false)}
                    className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      !esLocal ? "bg-blue-500/15 border-blue-400 text-blue-400" : "bg-negro-medio border-white/10 text-gris-oscuro hover:border-white/25"
                    }`}>
                    Visitante
                  </button>
                </div>
              </div>

              {/* ── 4. Estadio ────────────────────────────────────────────── */}
              <div>
                <label className="field-label">
                  Estadio *
                  {autoEst && <span className="ml-1 text-amarillo/60 text-[10px]">— asignado automáticamente</span>}
                  {!esLocal && !autoEst && <span className="ml-1 text-gris-oscuro/60 text-[10px]">— estadio del rival</span>}
                </label>

                {/* Auto (local, o visitante no-football) */}
                {autoEst && (
                  <div className="input-dark text-sm text-gris-oscuro flex items-center gap-2 select-none">
                    <Lock size={13} className="shrink-0" />
                    {estadio}
                  </div>
                )}

                {/* Copa AUF Uruguay visitante — elige entre 2 */}
                {copaSplit && (
                  <div className="grid grid-cols-2 gap-2">
                    {["Estadio Centenario", "Estadio General"].map((opt) => (
                      <button key={opt} type="button" onClick={() => setEstadio(opt)}
                        className={`py-2.5 rounded-xl border text-sm font-semibold transition-all text-center ${
                          estadio === opt ? "bg-amarillo/15 border-amarillo text-amarillo" : "bg-negro-medio border-white/10 text-gris-oscuro hover:border-white/25"
                        }`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Visitante fútbol libre (Copa Libertadores, Apertura, etc.) */}
                {freeSelect && (
                  <select value={estadio} onChange={(e) => setEstadio(e.target.value)} className="input-dark text-sm" required>
                    <option value="">Seleccionar estadio...</option>
                    {ESTADIOS_VISITANTE.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                )}
              </div>

              {/* ── 5. Sectores / Tribunas ────────────────────────────────── */}
              {sectores.length > 0 && (
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/10">
                    <p className="text-white text-xs font-semibold">
                      {sport === "football" ? "Tribunas" : sport === "basketball" ? "Sectores" : "Sectores / Tribunas"}
                    </p>
                    <p className="text-gris-oscuro text-[10px]">
                      {habilitadas} de {sectores.length} habilitada{habilitadas !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Header */}
                  <div className="grid grid-cols-[1fr_90px_90px_68px] text-[10px] text-gris-oscuro px-4 py-1.5 border-b border-white/5">
                    <span>Tribuna / Sector</span>
                    <span className="text-right">Precio ($)</span>
                    <span className="text-right">P. Socio ($)</span>
                    <span className="text-center">Hab.</span>
                  </div>

                  {/* Rows — max height with scroll for Campeón del Siglo */}
                  <div className="max-h-56 overflow-y-auto divide-y divide-white/5">
                    {sectores.map((s, i) => (
                      <div key={i} className={`grid grid-cols-[1fr_90px_90px_68px] items-center px-4 py-1.5 transition-opacity ${!s.habilitado ? "opacity-40" : ""}`}>
                        <div>
                          <p className="text-white text-xs">{s.nombre}</p>
                          {s.esVisitante && <span className="text-[9px] text-blue-400">Visitante</span>}
                          {s.esFamiliar  && <span className="text-[9px] text-alerta-verde">Familiar</span>}
                        </div>
                        <div className="flex justify-end">
                          <input
                            type="number" min={0} step={10}
                            value={s.precio}
                            onChange={(e) => updateSector(i, "precio", Number(e.target.value))}
                            disabled={!s.habilitado}
                            className="w-20 bg-negro-medio border border-white/10 rounded px-2 py-0.5 text-xs text-right text-white focus:outline-none focus:border-amarillo/50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div className="flex justify-end">
                          <input
                            type="number" min={0} step={10}
                            value={s.precioSocio}
                            onChange={(e) => updateSector(i, "precioSocio", Number(e.target.value))}
                            disabled={!s.habilitado}
                            className="w-20 bg-negro-medio border border-white/10 rounded px-2 py-0.5 text-xs text-right text-white focus:outline-none focus:border-amarillo/50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => updateSector(i, "habilitado", !s.habilitado)}
                            title={s.habilitado ? "Click para inhabilitar" : "Click para habilitar"}
                            className={`p-1.5 rounded transition-colors ${
                              s.habilitado
                                ? "text-alerta-verde hover:text-red-400"
                                : "text-gris-oscuro hover:text-alerta-verde"
                            }`}
                          >
                            {s.habilitado ? <Unlock size={13} /> : <Lock size={13} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-gris-oscuro px-4 py-2 border-t border-white/5">
                    Precio Socio = 0 significa entrada gratis para socios. Inhabilitar cierra la tribuna.
                  </p>
                </div>
              )}

              {/* ── 6. Descripción ────────────────────────────────────────── */}
              <div>
                <label className="field-label">Descripción de la publicación</label>
                <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                  className="input-dark text-sm resize-none" rows={2}
                  placeholder="Jornada, fase, info adicional..." />
              </div>

              {/* ── 7. Límite por usuario ─────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Límite de entradas por usuario</label>
                  <input type="number" value={limiteXUsuario} onChange={(e) => setLimiteXUsuario(Number(e.target.value))}
                    className="input-dark text-sm" min={1} max={10} />
                </div>
              </div>

              {/* ── 8. Venta programada ───────────────────────────────────── */}
              <div className="rounded-xl border border-white/10 p-4 space-y-3">
                <div>
                  <p className="text-white text-xs font-semibold">Venta programada</p>
                  <p className="text-gris-oscuro text-[10px] mt-0.5">
                    Configura con cuántos días de anticipación abre la venta para cada grupo
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="field-label">Ranking — días antes</label>
                    <input type="number" min={1} max={60} value={diasRanking} onChange={(e) => setDiasRanking(Number(e.target.value))}
                      className="input-dark text-sm" />
                  </div>
                  <div>
                    <label className="field-label">Socios — días antes</label>
                    <input type="number" min={1} max={60} value={diasSocios} onChange={(e) => setDiasSocios(Number(e.target.value))}
                      className="input-dark text-sm" />
                  </div>
                  <div>
                    <label className="field-label">General — días antes</label>
                    <input type="number" min={0} max={60} value={diasGeneral} onChange={(e) => setDiasGeneral(Number(e.target.value))}
                      className="input-dark text-sm" />
                  </div>
                  <div>
                    <label className="field-label">% mínimo asistencia (ranking)</label>
                    <input type="number" min={0} max={100} value={rankingMin} onChange={(e) => setRankingMin(Number(e.target.value))}
                      className="input-dark text-sm" />
                  </div>
                </div>
              </div>

              {/* ── Botones ───────────────────────────────────────────────── */}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setOpen(false); resetForm(); }} className="flex-1 btn-secondary text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={saving || (!estadio && (copaSplit || freeSelect))}
                  className="flex-1 btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving ? <><div className="spinner w-4 h-4" /> Creando...</> : "Crear evento"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Settings, Trash2, X, Loader2, Upload } from "lucide-react";
import Image from "next/image";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface Props {
  eventoId: string;
  currentEstado: string;
  currentVentaEstado: string;
  currentNombre?: string;
  currentRival?: string;
  currentRivalEscudo?: string;
  currentFecha?: string;
  currentTorneo?: string;
  currentDescripcion?: string;
  currentLimiteXUsuario?: number;
  currentVentaEscalonadaActiva?: boolean;
  currentDiasAntesRanking?: number;
  currentDiasAntesSocios?: number;
  currentDiasAntesGeneral?: number;
  currentRankingMinAntiguedad?: number;
}

const VENTA_ESTADOS = [
  { value: "CERRADO",              label: "Cerrado" },
  { value: "PREVENTA_SOCIOS",      label: "Solo socios" },
  { value: "PREVENTA_ADHERENTES",  label: "Socios y adherentes" },
  { value: "VENTA_GENERAL",        label: "Todos" },
  { value: "AGOTADO",              label: "Agotado" },
];

function normalizeVentaEstado(estado: string): string {
  if (estado === "FILA_VIRTUAL") return "CERRADO";
  return estado;
}

const ESTADOS = [
  { value: "PROXIMO",    label: "Próximo" },
  { value: "EN_VENTA",   label: "En venta" },
  { value: "FINALIZADO", label: "Finalizado" },
  { value: "SUSPENDIDO", label: "Suspendido" },
];

const TORNEOS = [
  { value: "CLAUSURA",       label: "Clausura" },
  { value: "APERTURA",       label: "Apertura" },
  { value: "INTERMEDIO",     label: "Intermedio" },
  { value: "COPA_URUGUAY",   label: "Copa AUF Uruguay" },
  { value: "LIBERTADORES",   label: "Copa Libertadores" },
  { value: "SUDAMERICANA",   label: "Copa Sudamericana" },
  { value: "SUPERCOPA",      label: "Supercopa" },
  { value: "AMISTOSO",       label: "Amistoso Fútbol" },
  { value: "MUNDIAL_CLUBES", label: "Mundial de Clubes" },
  { value: "BASQUETBOL",     label: "Básquetbol — Liga" },
  { value: "BASQUETBOL_COPA",label: "Básquetbol — Copa" },
  { value: "RUGBY",          label: "Rugby — Liga" },
  { value: "RUGBY_COPA",     label: "Rugby — Copa" },
  { value: "RUGBY_AMERICAS", label: "Rugby — Súper Rugby Américas" },
  { value: "PARKING",        label: "Estacionamiento" },
];

async function fetchTeamLogo(teamName: string): Promise<string | null> {
  if (teamName.trim().length < 2) return null;
  try {
    const res = await fetch(`/api/team-logo?name=${encodeURIComponent(teamName.trim())}`);
    const data = await res.json();
    return data.url ?? null;
  } catch {
    return null;
  }
}

// Convert DB date string to datetime-local value
function toDatetimeLocal(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return dateStr;
  }
}

export default function AdminEventControls({
  eventoId,
  currentEstado,
  currentVentaEstado,
  currentNombre = "",
  currentRival = "",
  currentRivalEscudo = "",
  currentFecha = new Date().toISOString(),
  currentTorneo = "CLAUSURA",
  currentDescripcion = "",
  currentLimiteXUsuario = 4,
  currentVentaEscalonadaActiva = false,
  currentDiasAntesRanking = 7,
  currentDiasAntesSocios = 3,
  currentDiasAntesGeneral = 1,
  currentRankingMinAntiguedad = 45,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fetchingLogo, setFetchingLogo] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nombre: currentNombre,
    rival: currentRival,
    rivalEscudo: currentRivalEscudo,
    fecha: toDatetimeLocal(currentFecha),
    torneo: currentTorneo,
    descripcion: currentDescripcion,
    limiteXUsuario: currentLimiteXUsuario,
    estado: currentEstado,
    ventaEstado: normalizeVentaEstado(currentVentaEstado),
    ventaEscalonadaActiva: currentVentaEscalonadaActiva,
    diasAntesRanking: currentDiasAntesRanking,
    diasAntesSocios: currentDiasAntesSocios,
    diasAntesGeneral: currentDiasAntesGeneral,
    rankingMinAsistenciaPct: currentRankingMinAntiguedad,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      nombre: currentNombre,
      rival: currentRival,
      rivalEscudo: currentRivalEscudo,
      fecha: toDatetimeLocal(currentFecha),
      torneo: currentTorneo,
      descripcion: currentDescripcion,
      limiteXUsuario: currentLimiteXUsuario,
      estado: currentEstado,
      ventaEstado: normalizeVentaEstado(currentVentaEstado),
      ventaEscalonadaActiva: currentVentaEscalonadaActiva,
      diasAntesRanking: currentDiasAntesRanking,
      diasAntesSocios: currentDiasAntesSocios,
      diasAntesGeneral: currentDiasAntesGeneral,
      rankingMinAsistenciaPct: currentRankingMinAntiguedad,
    });
  }, [
    open,
    currentNombre,
    currentRival,
    currentRivalEscudo,
    currentFecha,
    currentTorneo,
    currentDescripcion,
    currentLimiteXUsuario,
    currentEstado,
    currentVentaEstado,
    currentVentaEscalonadaActiva,
    currentDiasAntesRanking,
    currentDiasAntesSocios,
    currentDiasAntesGeneral,
    currentRankingMinAntiguedad,
  ]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (form.rival === currentRival) return; // don't refetch if unchanged
    setForm((p) => ({ ...p, rivalEscudo: "" }));
    if ((form.rival?.length ?? 0) < 2) return;

    debounceRef.current = setTimeout(async () => {
      setFetchingLogo(true);
      const logo = await fetchTeamLogo(form.rival);
      setForm((p) => ({ ...p, rivalEscudo: logo ?? "" }));
      setFetchingLogo(false);
    }, 700);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.rival, open]);

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => {
      const target = e.target as HTMLInputElement;
      const value = target.type === "checkbox"
        ? target.checked
        : target.type === "number"
        ? Number(target.value)
        : target.value;
      return { ...p, [f]: value };
    });

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.url) setForm((p) => ({ ...p, rivalEscudo: data.url }));
    setUploadingLogo(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/events/${eventoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ventaEscalonadaActiva: true }),
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  async function eliminar() {
    setDeleting(true);
    await fetch(`/api/events/${eventoId}`, { method: "DELETE" });
    setDeleting(false);
    setConfirmDelete(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      {/* Modal confirmación borrar */}
      {confirmDelete && (
        <ConfirmModal
          titulo="Eliminar evento"
          mensaje={`¿Estás seguro de que querés eliminar el evento "${currentNombre ?? "este evento"}"? Esta acción no se puede deshacer.`}
          labelConfirmar="Sí, eliminar"
          labelCancelar="No, cancelar"
          variante="danger"
          loading={deleting}
          onConfirmar={eliminar}
          onCancelar={() => setConfirmDelete(false)}
        />
      )}

      {/* Botón eliminar */}
      <button
        onClick={() => setConfirmDelete(true)}
        className="p-2 rounded-lg border border-white/10 hover:border-alerta-rojo/50 hover:text-alerta-rojo transition-all text-gris-oscuro"
        title="Eliminar evento"
      >
        <Trash2 size={15} />
      </button>

      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg border border-white/10 hover:border-amarillo/40 hover:text-amarillo transition-all text-gris-oscuro"
        title="Editar evento"
      >
        <Settings size={15} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-negro-suave border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 bg-negro-suave z-10">
              <h2 className="text-white font-semibold">Editar evento</h2>
              <button onClick={() => setOpen(false)} className="text-gris-oscuro hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Nombre */}
              <div>
                <label className="text-gris-oscuro text-xs mb-1 block">Nombre del evento</label>
                <input type="text" value={form.nombre} onChange={set("nombre")} className="input-dark text-sm w-full" />
              </div>

              {/* Rival + logo */}
              <div>
                <label className="text-gris-oscuro text-xs mb-1 block">
                  Rival <span className="text-gris-oscuro/60">— nombre oficial del equipo</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.rival}
                    onChange={set("rival")}
                    className="input-dark text-sm pr-10 w-full"
                    placeholder='Ej: "Boca Juniors" o "Racing Club (arg)"'
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    {(fetchingLogo || uploadingLogo) && <Loader2 size={14} className="text-amarillo animate-spin" />}
                    {!fetchingLogo && !uploadingLogo && form.rivalEscudo && (
                      <Image src={form.rivalEscudo} alt="logo" width={24} height={24} className="w-6 h-6 object-contain" unoptimized />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div>
                    {form.rivalEscudo && !fetchingLogo && !uploadingLogo && (
                      <p className="text-[10px] text-alerta-verde">✓ Logo listo</p>
                    )}
                    {!form.rivalEscudo && !fetchingLogo && !uploadingLogo && (form.rival?.length ?? 0) >= 2 && (
                      <p className="text-[10px] text-gris-oscuro">Sin logo automático</p>
                    )}
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="flex items-center gap-1 text-[10px] text-gris-oscuro hover:text-white border border-white/10 hover:border-white/25 rounded px-2 py-0.5 transition-colors"
                    >
                      <Upload size={10} />
                      {form.rivalEscudo ? "Cambiar logo" : "Subir logo"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Fecha + Torneo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gris-oscuro text-xs mb-1 block">Fecha y hora</label>
                  <input type="datetime-local" value={form.fecha} onChange={set("fecha")} className="input-dark text-sm" />
                </div>
                <div>
                  <label className="text-gris-oscuro text-xs mb-1 block">Torneo</label>
                  <select value={form.torneo} onChange={set("torneo")} className="input-dark text-sm">
                    {TORNEOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="text-gris-oscuro text-xs mb-1 block">Descripción</label>
                <textarea value={form.descripcion} onChange={set("descripcion")} className="input-dark text-sm resize-none w-full" rows={2} />
              </div>

              {/* Límite por usuario */}
              <div className="max-w-[140px]">
                <label className="text-gris-oscuro text-xs mb-1 block">Límite por usuario</label>
                <input type="number" value={form.limiteXUsuario} onChange={set("limiteXUsuario")} className="input-dark text-sm" min={1} max={10} />
              </div>

              {/* Venta programada */}
              <div className="rounded-xl border border-white/10 p-3 space-y-3">
                <div>
                  <p className="text-white text-xs font-semibold">Venta programada</p>
                  <p className="text-gris-oscuro text-[10px]">Configura con cuántos días de anticipación abre la venta para cada grupo</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gris-oscuro text-xs mb-1 block">Ranking — días antes</label>
                    <input type="number" min={1} max={30} value={form.diasAntesRanking} onChange={set("diasAntesRanking")} className="input-dark text-sm" />
                  </div>
                  <div>
                    <label className="text-gris-oscuro text-xs mb-1 block">Socios — días antes</label>
                    <input type="number" min={1} max={30} value={form.diasAntesSocios} onChange={set("diasAntesSocios")} className="input-dark text-sm" />
                  </div>
                  <div>
                    <label className="text-gris-oscuro text-xs mb-1 block">General — días antes</label>
                    <input type="number" min={0} max={30} value={form.diasAntesGeneral} onChange={set("diasAntesGeneral")} className="input-dark text-sm" />
                  </div>
                  <div>
                    <label className="text-gris-oscuro text-xs mb-1 block">% mínimo asistencia (ranking)</label>
                    <input type="number" min={0} max={100} value={form.rankingMinAsistenciaPct} onChange={set("rankingMinAsistenciaPct")} className="input-dark text-sm" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setOpen(false)} className="flex-1 btn-secondary text-sm">
                  Cancelar
                </button>
                <button onClick={save} disabled={saving} className="flex-1 btn-primary text-sm flex items-center justify-center gap-2">
                  {saving ? <><Loader2 size={14} className="animate-spin" />Guardando...</> : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

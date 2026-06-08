"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingCart, Plus, Minus, AlertCircle, LogIn, SlidersHorizontal,
  CheckCircle, ChevronRight, X, Users,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Sector {
  id: string;
  nombre: string;
  tipo: string;
  capacidad: number;
  disponibles: number;
  precio: number;
  precioSocio: number;
  soloSocios: boolean;
  esVisitante: boolean;
  esFamiliar: boolean;
  habilitado: boolean;
}

interface Props {
  sectores: Sector[];
  eventoId: string;
  eventoNombre: string;
  eventoFecha: string;
  fechaLabel: string;
  isSocioAlDia: boolean;
  socioCategoria: string;
  puedeComprar: boolean;
  limiteXUsuario: number;
  isAuthenticated: boolean;
}

function getPrecioEfectivo(sector: Sector, socioCategoria: string, isSocioAlDia: boolean): number {
  const esBeneficiado = isSocioAlDia && ["ACTIVO", "SUSCRIPTOR", "VITALICIO", "INTERIOR"].includes(socioCategoria);
  const esAdherente = isSocioAlDia && socioCategoria === "ADHERENTE";
  if (esBeneficiado) return sector.precioSocio;
  if (esAdherente) return Math.round(sector.precio * 0.7);
  return sector.precio;
}

function getDisponibilidadColor(sector: Sector): string {
  if (!sector.habilitado || sector.disponibles === 0) return "bg-alerta-rojo/20 text-alerta-rojo";
  const pct = sector.disponibles / sector.capacidad;
  if (pct < 0.1) return "bg-alerta-rojo/15 text-alerta-rojo";
  if (pct < 0.3) return "bg-orange-500/15 text-orange-400";
  return "bg-alerta-verde/10 text-alerta-verde";
}

function getDisponibilidadLabel(sector: Sector): string {
  if (!sector.habilitado) return "No habilitado";
  if (sector.disponibles === 0) return "Agotado";
  if (sector.disponibles < 20) return `¡Últimas ${sector.disponibles}!`;
  if (sector.disponibles / sector.capacidad < 0.1) return "Pocas entradas";
  return "Disponible";
}

export default function SectorList({
  sectores,
  eventoId,
  eventoNombre,
  eventoFecha,
  fechaLabel,
  isSocioAlDia,
  socioCategoria,
  puedeComprar,
  limiteXUsuario,
  isAuthenticated,
}: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [priceFilter, setPriceFilter] = useState<number | null>(null);

  const allPrecios = useMemo(
    () => sectores.filter((s) => s.habilitado).map((s) => s.precio),
    [sectores]
  );
  const precioMin = allPrecios.length ? Math.min(...allPrecios) : 0;
  const precioMax = allPrecios.length ? Math.max(...allPrecios) : 0;

  const filteredSectores = useMemo(() => {
    if (!priceFilter) return sectores;
    return sectores.filter((s) => s.precio <= priceFilter);
  }, [sectores, priceFilter]);

  const selected = sectores.find((s) => s.id === selectedId) ?? null;
  const precioEfectivo = selected ? getPrecioEfectivo(selected, socioCategoria, isSocioAlDia) : 0;
  const total = precioEfectivo * cantidad;

  async function handleCompra() {
    if (!selected) return;
    if (!isAuthenticated) { router.push("/login"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorId: selected.id, cantidad, metodoPago: "WEB" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al procesar"); return; }
      setSuccess(true);
      setTimeout(() => router.push("/mis-tickets?nuevo=1"), 1400);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  // ── Success state ────────────────────────────────────────────────
  if (success) {
    return (
      <div className="bg-negro-suave border border-alerta-verde/30 rounded-2xl p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-alerta-verde/10 border-2 border-alerta-verde/40 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-alerta-verde" />
        </div>
        <h2 className="text-white font-bebas text-3xl mb-1">¡Compra confirmada!</h2>
        <p className="text-gris-medio text-sm">Redirigiendo a tus tickets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-negro-suave border border-white/8 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-white font-bebas text-xl tracking-wide">
            {eventoNombre}
          </h2>
        </div>
        <p className="text-gris-oscuro text-xs">Función: {fechaLabel}</p>
      </div>

      {/* Filtro de precio */}
      <div className="bg-negro-suave border border-white/8 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal size={13} className="text-amarillo" />
          <span className="text-gris-medio text-xs font-medium uppercase tracking-wider">
            Filtrar por precio
          </span>
          {priceFilter && (
            <button
              onClick={() => setPriceFilter(null)}
              className="ml-auto flex items-center gap-1 text-xs text-gris-oscuro hover:text-white transition-colors"
            >
              <X size={12} /> Limpiar filtro
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { label: `Hasta $${(precioMin + (precioMax - precioMin) * 0.25).toFixed(0)}`, val: precioMin + (precioMax - precioMin) * 0.25 },
            { label: `Hasta $${(precioMin + (precioMax - precioMin) * 0.5).toFixed(0)}`, val: precioMin + (precioMax - precioMin) * 0.5 },
            { label: `Hasta $${(precioMin + (precioMax - precioMin) * 0.75).toFixed(0)}`, val: precioMin + (precioMax - precioMin) * 0.75 },
            { label: `Todos (hasta $${precioMax.toLocaleString()})`, val: precioMax },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={() => setPriceFilter(Math.round(opt.val))}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-150 ${
                priceFilter === Math.round(opt.val)
                  ? "bg-amarillo text-negro border-amarillo font-semibold"
                  : "border-white/10 text-gris-medio hover:border-amarillo/40 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de sectores */}
      <div className="bg-negro-suave border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5">
          <span className="text-gris-oscuro text-xs">
            Elegí una tarifa — {filteredSectores.filter((s) => s.disponibles > 0 && s.habilitado).length} sectores disponibles
          </span>
        </div>

        <div className="divide-y divide-white/5">
          {filteredSectores.length === 0 ? (
            <div className="p-8 text-center text-gris-oscuro text-sm">
              No hay sectores en este rango de precio.
            </div>
          ) : (
            filteredSectores.map((sector) => {
              const isSelected = sector.id === selectedId;
              const isUnavailable = !sector.habilitado || sector.disponibles === 0;
              const precio = getPrecioEfectivo(sector, socioCategoria, isSocioAlDia);
              const tieneDescuento = precio < sector.precio;
              const dispClass = getDisponibilidadColor(sector);
              const dispLabel = getDisponibilidadLabel(sector);

              return (
                <button
                  key={sector.id}
                  onClick={() => {
                    if (isUnavailable) return;
                    setSelectedId(isSelected ? null : sector.id);
                    setCantidad(1);
                    setError("");
                  }}
                  disabled={isUnavailable}
                  className={`w-full text-left px-5 py-4 flex items-center gap-4 transition-all duration-150 group
                    ${isSelected
                      ? "bg-amarillo/8 border-l-2 border-l-amarillo"
                      : isUnavailable
                      ? "opacity-45 cursor-not-allowed"
                      : "hover:bg-white/3 cursor-pointer border-l-2 border-l-transparent"
                    }`}
                >
                  {/* Radio indicator */}
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all
                    ${isSelected ? "border-amarillo bg-amarillo" : "border-white/20 group-hover:border-amarillo/50"}`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-negro" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${isUnavailable ? "text-gris-oscuro" : "text-white"}`}>
                        {sector.nombre}
                      </span>
                      {sector.esVisitante && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/20 font-medium">
                          Visitante
                        </span>
                      )}
                      {sector.esFamiliar && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20 font-medium">
                          Familiar
                        </span>
                      )}
                      {sector.tipo === "PALCO_VIP" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amarillo/15 text-amarillo border border-amarillo/20 font-medium">
                          VIP
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${dispClass}`}>
                        {dispLabel}
                      </span>
                      {sector.disponibles > 0 && sector.habilitado && (
                        <span className="text-gris-oscuro text-[10px] flex items-center gap-1">
                          <Users size={9} />
                          {sector.disponibles.toLocaleString()} entradas
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Precio */}
                  <div className="text-right shrink-0">
                    {precio === 0 ? (
                      <span className="text-alerta-verde font-bold text-base">GRATIS</span>
                    ) : (
                      <span className={`font-bold text-base ${isSelected ? "text-amarillo" : "text-white"}`}>
                        $ {precio.toLocaleString("es-UY", { minimumFractionDigits: 1 })}
                      </span>
                    )}
                    {tieneDescuento && precio > 0 && (
                      <div className="text-gris-oscuro text-xs line-through">
                        $ {sector.precio.toLocaleString()}
                      </div>
                    )}
                  </div>

                  <ChevronRight size={14} className={`shrink-0 transition-transform ${isSelected ? "text-amarillo rotate-90" : "text-gris-oscuro group-hover:text-white"}`} />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Panel de compra — aparece al seleccionar */}
      {selected && (
        <div className="bg-negro-suave border border-amarillo/25 rounded-2xl overflow-hidden shadow-[0_0_24px_rgba(245,197,24,0.08)] animate-fade-in">
          {/* Header */}
          <div className="bg-amarillo/8 border-b border-amarillo/15 px-5 py-3 flex items-center justify-between">
            <div>
              <div className="text-amarillo text-xs font-semibold uppercase tracking-wider">Sector seleccionado</div>
              <div className="text-white text-sm font-medium mt-0.5 truncate max-w-xs">{selected.nombre}</div>
            </div>
            <button onClick={() => setSelectedId(null)} className="text-gris-oscuro hover:text-white transition-colors p-1">
              <X size={16} />
            </button>
          </div>

          <div className="p-5">
            {/* Detalles */}
            <div className="space-y-2.5 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-gris-oscuro">Precio unitario</span>
                <span className="text-white font-semibold">
                  {precioEfectivo === 0 ? (
                    <span className="text-alerta-verde">GRATIS</span>
                  ) : (
                    formatCurrency(precioEfectivo)
                  )}
                  {precioEfectivo < selected.precio && precioEfectivo > 0 && (
                    <span className="text-gris-oscuro text-xs line-through ml-2">{formatCurrency(selected.precio)}</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-gris-oscuro">Cantidad</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                    className="w-8 h-8 rounded-full bg-negro-medio border border-white/10 flex items-center justify-center hover:border-amarillo/50 transition-colors active:scale-95"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="text-white font-bold text-lg w-6 text-center font-mono leading-none">{cantidad}</span>
                  <button
                    onClick={() => setCantidad(Math.min(limiteXUsuario, selected.disponibles, cantidad + 1))}
                    className="w-8 h-8 rounded-full bg-negro-medio border border-white/10 flex items-center justify-center hover:border-amarillo/50 transition-colors active:scale-95"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
              <p className="text-gris-oscuro text-xs text-right">
                Máx. {limiteXUsuario} por usuario
              </p>
            </div>

            {/* Total */}
            <div className="border-t border-white/8 pt-4 mb-4 flex items-center justify-between">
              <span className="text-white font-semibold">Total</span>
              <span className="text-amarillo font-bebas text-2xl">
                {total === 0 ? "GRATIS" : formatCurrency(total)}
              </span>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-alerta-rojo text-sm bg-alerta-rojo/10 border border-alerta-rojo/20 rounded-xl p-3 mb-4">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Botón */}
            {!isAuthenticated ? (
              <button
                onClick={() => router.push("/login")}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <LogIn size={16} />
                Ingresar para comprar
              </button>
            ) : !puedeComprar ? (
              <div className="text-center py-3 text-gris-oscuro text-sm border border-white/8 rounded-xl">
                La venta aún no está habilitada para este evento
              </div>
            ) : (
              <button
                onClick={handleCompra}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3.5"
              >
                {loading ? (
                  <><div className="spinner w-4 h-4" />Procesando pago...</>
                ) : (
                  <><ShoppingCart size={18} />Confirmar compra</>
                )}
              </button>
            )}

            <p className="text-gris-oscuro text-xs text-center mt-3 flex items-center justify-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-alerta-verde/60 inline-block" />
              QR generado al instante · Descarga en PDF disponible
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

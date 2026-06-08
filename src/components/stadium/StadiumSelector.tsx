"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingCart, Plus, Minus, AlertCircle, LogIn,
  CheckCircle, X, Users, ArrowLeft,
  Mail, Clock, Check, ChevronRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import StadiumMap from "@/components/stadium/StadiumMap";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  torneo?: string;
  estadio?: string;
  esLocal?: boolean;
  visitorSectionIds?: string[] | null;
  isSocioAlDia: boolean;
  socioCategoria: string;
  puedeComprar: boolean;
  limiteXUsuario: number;
  isAuthenticated: boolean;
  queueAccessToken?: string;
  queueExpiry?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPrecioEfectivo(s: Sector, cat: string, alDia: boolean): number {
  const pleno = alDia && ["ACTIVO", "SUSCRIPTOR", "VITALICIO", "INTERIOR"].includes(cat);
  const adherente = alDia && cat === "ADHERENTE";
  if (pleno) return s.precioSocio;
  if (adherente) return Math.round(s.precio * 0.7);
  return s.precio;
}

type PriceFilterKey = "all" | "free" | "lt1000" | "1000to5000" | "gt5000";

const PRICE_FILTER_OPTIONS: { key: PriceFilterKey; label: string }[] = [
  { key: "all",        label: "Todos los precios" },
  { key: "free",       label: "Gratis" },
  { key: "lt1000",     label: "Menos de $1000" },
  { key: "1000to5000", label: "$1000 - $5000" },
  { key: "gt5000",     label: "Más de $5000" },
];

function matchesPriceFilter(price: number, filter: PriceFilterKey): boolean {
  if (filter === "all")         return true;
  if (filter === "free")        return price === 0;
  if (filter === "lt1000")      return price > 0 && price < 1000;
  if (filter === "1000to5000")  return price >= 1000 && price <= 5000;
  return price > 5000;
}

function getSectorFeatures(sector: Sector): string[] {
  if (sector.tipo === "PALCO_VIP") {
    return ["Palco premium", "Zona exclusiva", "Mejor vista del campo"];
  }
  if (sector.esVisitante) {
    return ["Sector visitante", "Acceso independiente", "Zona demarcada"];
  }
  if (sector.esFamiliar) {
    return ["Zona familiar", "Menores gratis hasta 10 años", "Ambiente seguro"];
  }
  const n = sector.nombre.toLowerCase();
  if (n.includes("henderson"))    return ["Tribuna lateral", "Vista privilegiada", "Buena proximidad al juego"];
  if (n.includes("damiani"))      return ["Tribuna de fondo", "Buena proximidad al juego", "Zona popular"];
  if (n.includes("cataldi"))      return ["Tribuna popular", "Ambiente aurinegro", "Vista del partido"];
  if (n.includes("güelfi") || n.includes("guelfi")) return ["Tribuna popular", "Sector visitante", "Acceso independiente"];
  return ["Vista del partido", "Acceso general", "Zona cubierta"];
}

function getSectorOverlay(sector: Sector): string {
  if (sector.tipo === "PALCO_VIP") return "bg-gradient-to-r from-amarillo/30 to-negro/60";
  if (sector.esVisitante)          return "bg-gradient-to-r from-orange-500/30 to-negro/60";
  if (sector.esFamiliar)           return "bg-gradient-to-r from-blue-500/25 to-negro/60";
  return "bg-gradient-to-r from-amarillo/15 to-negro/50";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StadiumSelector({
  sectores,
  eventoId,
  eventoNombre,
  eventoFecha,
  fechaLabel,
  torneo,
  estadio,
  esLocal,
  visitorSectionIds,
  isSocioAlDia,
  socioCategoria,
  puedeComprar,
  limiteXUsuario,
  isAuthenticated,
  queueAccessToken,
  queueExpiry,
}: Props) {
  const router = useRouter();
  const isCampeonDelSiglo = (estadio ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().includes("campeon");

  // ── State ───────────────────────────────────────────────────────────────────
  const [buyingSector, setBuyingSector] = useState<Sector | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [emailEntradas, setEmailEntradas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [queueSecondsLeft, setQueueSecondsLeft] = useState<number | null>(null);
  const [priceFilter, setPriceFilter] = useState<PriceFilterKey>("all");

  // Release slot on F5 / tab close while in purchase window
  useEffect(() => {
    if (!queueAccessToken) return;
    const release = () => {
      sessionStorage.removeItem(`queue_access_${eventoId}`);
      navigator.sendBeacon(`/api/queue/release?eventId=${eventoId}`);
    };
    window.addEventListener("beforeunload", release);
    return () => window.removeEventListener("beforeunload", release);
  }, [queueAccessToken, eventoId]);

  // Queue countdown timer — redirect home when it expires
  useEffect(() => {
    if (!queueExpiry) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(queueExpiry).getTime() - Date.now()) / 1000));
      setQueueSecondsLeft(left);
      if (left === 0) {
        try { sessionStorage.removeItem(`queue_access_${eventoId}`); } catch { /* ignore */ }
        router.push("/");
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [queueExpiry, router]);

  // ── Derived sector lists ────────────────────────────────────────────────────
  const filteredSectores = useMemo<Sector[]>(() => {
    return sectores
      .filter((sector) => {
        const precio = getPrecioEfectivo(sector, socioCategoria, isSocioAlDia);
        return matchesPriceFilter(precio, priceFilter);
      })
      .sort((a, b) => a.precio - b.precio);
  }, [sectores, socioCategoria, isSocioAlDia, priceFilter]);

  // ── Buying sector helpers ────────────────────────────────────────────────────
  const precioEfectivo = buyingSector
    ? getPrecioEfectivo(buyingSector, socioCategoria, isSocioAlDia)
    : 0;
  const total = precioEfectivo * cantidad;

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleComprar(sector: Sector) {
    setBuyingSector(sector);
    setCantidad(1);
    setError("");
    setTimeout(() => {
      document.getElementById("purchase-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
  }

  async function handleConfirmar() {
    if (!buyingSector) return;
    if (!isAuthenticated) { router.push("/login"); return; }
    if (!emailEntradas || !emailEntradas.includes("@")) {
      setError("Ingresá un email válido para recibir las entradas.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectorId: buyingSector.id,
          cantidad,
          metodoPago: "WEB",
          emailEntradas,
          queueToken: queueAccessToken ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al procesar"); return; }
      setSuccess(true);
      // Clear queue token from localStorage so returning to the event shows "ya compraste"
      try { sessionStorage.removeItem(`queue_access_${eventoId}`); } catch { /* ignore */ }
      setTimeout(() => router.push("/mis-tickets?nuevo=1"), 2000);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="bg-negro-suave border border-alerta-verde/30 rounded-2xl p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-alerta-verde/10 border-2 border-alerta-verde/40 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-alerta-verde" />
        </div>
        <h2 className="text-white font-bebas text-3xl mb-1">¡Compra confirmada!</h2>
        <p className="text-gris-medio text-sm">Redirigiendo a tus tickets...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-5 items-start">

      {/* ── LEFT: Stadium map ────────────────────────────────────────────────── */}
      <div className="lg:sticky lg:top-20">
        <div className={isCampeonDelSiglo ? "bg-transparent rounded-xl px-3 pt-2" : "bg-negro-suave overflow-hidden rounded-xl p-3"}>
          <StadiumMap
            estadioName={estadio ?? "Estadio Campeón del Siglo"}
            sectores={sectores}
            selectedDbSectorId={buyingSector?.id ?? null}
            onSelectSector={(db) => { if (db) handleComprar(db as unknown as Sector); }}
            visitorSectionIds={!esLocal ? (visitorSectionIds ?? null) : null}
          />
        </div>
      </div>

      {/* ── RIGHT: Tabs + sector cards ───────────────────────────────────────── */}
      <div className="space-y-3">

        {/* Queue timer */}
        {queueAccessToken && queueSecondsLeft !== null && (
          <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${
            queueSecondsLeft < 60
              ? "bg-alerta-rojo/10 border border-alerta-rojo/30 text-alerta-rojo"
              : "bg-amarillo/8 border border-amarillo/20 text-amarillo"
          }`}>
            <Clock size={14} className="shrink-0" />
            <span className="font-medium">
              Tiempo para comprar:{" "}
              <strong className="font-mono">
                {String(Math.floor(queueSecondsLeft / 60)).padStart(2, "0")}:
                {String(queueSecondsLeft % 60).padStart(2, "0")}
              </strong>
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-stretch border-b border-white/10">
          <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-white border-b-2 border-amarillo -mb-px cursor-default">
            <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} className="text-amarillo">
              <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
            </svg>
            Precios
          </div>
          <Link
            href="/mis-tickets"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm text-gris-medio hover:text-white transition-colors border-b-2 border-transparent -mb-px"
          >
            <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M15 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M15 3v5h5"/>
            </svg>
            Mis entradas
          </Link>
        </div>

        {/* Filter + sort row */}
        <div className="flex items-center gap-3">
          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value as PriceFilterKey)}
            className="flex-1 h-8 px-2.5 rounded-lg bg-negro-medio border border-white/10 text-xs text-white focus:outline-none focus:border-amarillo/50"
            aria-label="Filtro por precio"
          >
            {PRICE_FILTER_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-gris-oscuro whitespace-nowrap shrink-0">
            Ordenado por precio ↑
          </span>
        </div>

        {/* Purchase panel — shown when buying a sector */}
        {buyingSector && (
          <div
            id="purchase-panel"
            className="bg-negro-suave border border-amarillo/30 rounded-2xl overflow-hidden shadow-[0_0_24px_rgba(245,197,24,0.1)] animate-fade-in"
          >
            {/* Header */}
            <div className="bg-amarillo/8 border-b border-amarillo/15 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setBuyingSector(null); setCantidad(1); setError(""); }}
                  className="w-7 h-7 rounded-full bg-negro-medio border border-white/10 flex items-center justify-center hover:border-amarillo/40 transition-colors"
                >
                  <ArrowLeft size={12} className="text-gris-medio" />
                </button>
                <div>
                  <div className="text-amarillo text-xs font-semibold uppercase tracking-wider">Sector seleccionado</div>
                  <div className="text-white text-sm font-medium mt-0.5">{buyingSector.nombre}</div>
                </div>
              </div>
              <button
                onClick={() => { setBuyingSector(null); setCantidad(1); setError(""); }}
                className="text-gris-oscuro hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Price & Qty */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gris-oscuro">Precio unitario</span>
                  <div className="text-right">
                    <span className="text-white font-semibold">
                      {precioEfectivo === 0
                        ? <span className="text-alerta-verde">GRATIS</span>
                        : formatCurrency(precioEfectivo)
                      }
                    </span>
                    {precioEfectivo < buyingSector.precio && precioEfectivo > 0 && (
                      <span className="text-gris-oscuro text-xs line-through ml-2">
                        {formatCurrency(buyingSector.precio)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gris-oscuro">Cantidad</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                      className="w-8 h-8 rounded-full bg-negro-medio border border-white/10 flex items-center justify-center hover:border-amarillo/50 transition-colors active:scale-95"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="text-white font-bold text-lg w-6 text-center font-mono">{cantidad}</span>
                    <button
                      onClick={() => setCantidad(Math.min(limiteXUsuario, buyingSector.disponibles, cantidad + 1))}
                      className="w-8 h-8 rounded-full bg-negro-medio border border-white/10 flex items-center justify-center hover:border-amarillo/50 transition-colors active:scale-95"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
                <p className="text-gris-oscuro text-xs text-right">Máx. {limiteXUsuario} por usuario</p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm text-gris-medio mb-1.5 font-medium">
                  <Mail size={12} className="inline mr-1.5" />
                  Email para recibir las entradas
                </label>
                <input
                  type="email"
                  value={emailEntradas}
                  onChange={(e) => setEmailEntradas(e.target.value)}
                  placeholder="tu@email.com"
                  className="input-dark"
                />
              </div>

              {/* Total */}
              <div className="flex items-center justify-between border-t border-white/8 pt-4">
                <span className="text-white font-semibold">Total</span>
                <span className="text-amarillo font-bebas text-2xl">
                  {total === 0 ? "GRATIS" : formatCurrency(total)}
                </span>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-alerta-rojo text-sm bg-alerta-rojo/10 border border-alerta-rojo/20 rounded-xl p-3">
                  <AlertCircle size={14} className="shrink-0" />
                  {error}
                </div>
              )}

              {/* CTA */}
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
                  onClick={handleConfirmar}
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3.5"
                >
                  {loading
                    ? <><div className="spinner w-4 h-4" />Procesando pago...</>
                    : <><ShoppingCart size={18} />Confirmar compra</>
                  }
                </button>
              )}

              <p className="text-gris-oscuro text-xs text-center flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-alerta-verde/60 inline-block" />
                QR generado al instante · Descarga en PDF disponible
              </p>
            </div>
          </div>
        )}

        {/* ── Sector cards (estilo Fever/Barcelona) ────────────────────────── */}
        <div className="space-y-2">
          {filteredSectores.length === 0 && (
            <div className="py-10 text-center text-gris-oscuro text-sm">
              No hay sectores para los filtros seleccionados.
            </div>
          )}

          {filteredSectores.map((sector) => {
            const isUnavail = !sector.habilitado || sector.disponibles === 0;
            const isBuying  = buyingSector?.id === sector.id;
            const precio    = getPrecioEfectivo(sector, socioCategoria, isSocioAlDia);
            const hasDiscount = precio < sector.precio;
            const features  = getSectorFeatures(sector);

            return (
              <div
                key={sector.id}
                onClick={() => !isUnavail && !isBuying && handleComprar(sector)}
                className={`rounded-xl overflow-hidden border transition-all duration-150 ${
                  isBuying
                    ? "border-amarillo/50 bg-amarillo/5 shadow-[0_0_16px_rgba(245,197,24,0.08)]"
                    : isUnavail
                    ? "border-white/5 opacity-50 cursor-not-allowed"
                    : "border-white/8 bg-negro-suave hover:border-amarillo/30 hover:bg-amarillo/3 cursor-pointer"
                }`}
              >
                <div className="flex items-stretch">
                  {/* Thumbnail */}
                  <div className="relative w-[100px] shrink-0 overflow-hidden" style={{ minHeight: "88px" }}>
                    <Image
                      src="/images/match-banner-3.jpg"
                      alt={sector.nombre}
                      fill
                      sizes="100px"
                      className="object-cover"
                    />
                    <div className={`absolute inset-0 ${getSectorOverlay(sector)}`} />

                    {/* Type badges over thumbnail */}
                    <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                      {sector.tipo === "PALCO_VIP" && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-negro/60 text-amarillo border border-amarillo/40 font-bold backdrop-blur-sm">
                          VIP
                        </span>
                      )}
                      {sector.esVisitante && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-negro/60 text-orange-400 border border-orange-500/40 font-bold backdrop-blur-sm">
                          Visitante
                        </span>
                      )}
                      {sector.esFamiliar && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-negro/60 text-blue-400 border border-blue-400/40 font-bold backdrop-blur-sm">
                          Familiar
                        </span>
                      )}
                    </div>

                    {/* Arrow indicator when buying */}
                    {isBuying && (
                      <div className="absolute inset-0 flex items-center justify-center bg-amarillo/10">
                        <ChevronRight size={20} className="text-amarillo" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-3 flex justify-between gap-3 min-w-0">
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-semibold leading-snug ${isUnavail ? "text-gris-oscuro" : "text-white"}`}>
                        {sector.nombre}
                      </h3>

                      {/* Feature bullets */}
                      <ul className="mt-1.5 space-y-0.5">
                        {features.map((f) => (
                          <li key={f} className="flex items-center gap-1.5 text-[11px] text-gris-medio">
                            <Check size={9} className={isUnavail ? "text-gris-oscuro shrink-0" : "text-amarillo shrink-0"} />
                            {f}
                          </li>
                        ))}
                      </ul>

                      {/* Availability note */}
                      {!isUnavail && sector.disponibles < 20 && (
                        <p className="mt-1.5 text-[10px] text-orange-400 flex items-center gap-1">
                          <Users size={9} />
                          ¡Últimas {sector.disponibles}!
                        </p>
                      )}
                      {isUnavail && (
                        <p className="mt-1.5 text-[10px] text-alerta-rojo/70">Entradas agotadas</p>
                      )}
                    </div>

                    {/* Price column */}
                    <div className="text-right shrink-0 flex flex-col justify-between items-end">
                      <div>
                        {!isUnavail ? (
                          <>
                            <div className="text-[10px] text-gris-oscuro">Desde:</div>
                            <div className={`font-bold text-base leading-tight ${isBuying ? "text-amarillo" : "text-white"}`}>
                              {precio === 0
                                ? <span className="text-alerta-verde text-sm font-bold">GRATIS</span>
                                : `$${precio.toLocaleString("es-UY")}`
                              }
                            </div>
                            {hasDiscount && precio > 0 && (
                              <div className="text-gris-oscuro text-[10px] line-through">
                                ${sector.precio.toLocaleString()}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-alerta-rojo/60 text-xs font-medium">Agotado</div>
                        )}
                      </div>

                      {/* Accessibility icon (decorative, like Barcelona) */}
                      {!isUnavail && (
                        <div className="mt-2 text-gris-oscuro hover:text-gris-medio transition-colors" title="Accesibilidad">
                          <Users size={13} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

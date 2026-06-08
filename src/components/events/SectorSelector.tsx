"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StadiumMap from "@/components/stadium/StadiumMap";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, Plus, Minus, AlertCircle, LogIn, Users } from "lucide-react";

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
  isSocioAlDia: boolean;
  socioCategoria?: string;
  puedeComprar: boolean;
  limiteXUsuario: number;
  isAuthenticated: boolean;
}

export default function SectorSelector({
  sectores,
  eventoId,
  eventoNombre,
  eventoFecha,
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

  const selected = sectores.find((s) => s.id === selectedId) ?? null;

  const esSocioConBeneficios =
    isSocioAlDia &&
    ["ACTIVO", "SUSCRIPTOR", "VITALICIO", "INTERIOR"].includes(socioCategoria ?? "");
  const esAdherente = isSocioAlDia && socioCategoria === "ADHERENTE";

  function getPrecio(sector: Sector): number {
    if (esSocioConBeneficios) return sector.precioSocio;
    if (esAdherente) return Math.round(sector.precio * 0.7);
    return sector.precio;
  }

  async function handleCompra() {
    if (!selected) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectorId: selected.id,
          cantidad,
          metodoPago: "DEMO",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al procesar la compra");
        return;
      }

      router.push("/mis-tickets?nuevo=1");
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Mapa */}
      <div className="card-dark p-4">
        <p className="text-gris-oscuro text-xs mb-3 text-center">
          Hacé click en un sector para seleccionarlo
        </p>
        <StadiumMap
          sectores={sectores}
          selectedSectorId={selectedId ?? undefined}
          onSelectSector={(s) => {
            if (!s.habilitado || s.disponibles === 0) return;
            setSelectedId(s.id);
            setCantidad(1);
            setError("");
          }}
          isSocio={isSocioAlDia}
        />
      </div>

      {/* Lista de sectores */}
      <div className="space-y-2">
        {sectores.map((sector) => {
          const precio = getPrecio(sector);
          const isSelected = sector.id === selectedId;
          const isSoldOut = sector.disponibles === 0;
          const isDisabled = !sector.habilitado || isSoldOut;

          return (
            <button
              key={sector.id}
              onClick={() => {
                if (isDisabled) return;
                setSelectedId(sector.id);
                setCantidad(1);
                setError("");
              }}
              disabled={isDisabled}
              className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                isSelected
                  ? "bg-amarillo/10 border-amarillo shadow-[0_0_12px_rgba(245,197,24,0.15)]"
                  : isDisabled
                  ? "bg-negro-medio/30 border-white/5 opacity-50 cursor-not-allowed"
                  : "bg-negro-suave border-white/5 hover:border-white/20 cursor-pointer"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Indicator */}
                  <div
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      isSelected
                        ? "bg-amarillo"
                        : isSoldOut
                        ? "bg-alerta-rojo"
                        : sector.disponibles / sector.capacidad < 0.15
                        ? "bg-orange-500"
                        : "bg-alerta-verde"
                    }`}
                  />
                  <div>
                    <div className="text-white text-sm font-medium">{sector.nombre}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Users size={11} className="text-gris-oscuro" />
                      <span className="text-gris-oscuro text-xs">
                        {isSoldOut ? "Agotado" : `${sector.disponibles.toLocaleString()} disponibles`}
                      </span>
                      {sector.soloSocios && (
                        <span className="badge-socio text-[10px] py-0">Solo socios</span>
                      )}
                      {sector.esVisitante && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gris-oscuro">
                          Visitante
                        </span>
                      )}
                      {sector.esFamiliar && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gris-oscuro">
                          Familiar
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {precio === 0 ? (
                    <div className="text-alerta-verde font-bold text-sm">GRATIS</div>
                  ) : (
                    <div className="text-white font-bold text-sm">{formatCurrency(precio)}</div>
                  )}
                  {precio < sector.precio && precio > 0 && (
                    <div className="text-gris-oscuro text-xs line-through">
                      {formatCurrency(sector.precio)}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Purchase panel */}
      {selected && (
        <div className="card-dark p-5 border border-amarillo/20 animate-fade-in">
          <h3 className="text-white font-semibold mb-4 text-sm">Resumen de compra</h3>

          <div className="space-y-3 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gris-oscuro">Sector</span>
              <span className="text-white font-medium">{selected.nombre}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gris-oscuro">Precio unitario</span>
              <span className="text-white">
                {getPrecio(selected) === 0
                  ? <span className="text-alerta-verde font-bold">GRATIS</span>
                  : formatCurrency(getPrecio(selected))
                }
              </span>
            </div>

            {/* Cantidad */}
            <div className="flex justify-between text-sm items-center">
              <span className="text-gris-oscuro">Cantidad</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                  className="w-7 h-7 rounded-full bg-negro-medio border border-white/10 flex items-center justify-center hover:border-amarillo/40 transition-colors"
                >
                  <Minus size={12} />
                </button>
                <span className="text-white font-bold w-5 text-center font-mono">{cantidad}</span>
                <button
                  onClick={() =>
                    setCantidad(Math.min(limiteXUsuario, selected.disponibles, cantidad + 1))
                  }
                  className="w-7 h-7 rounded-full bg-negro-medio border border-white/10 flex items-center justify-center hover:border-amarillo/40 transition-colors"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>

            <div className="border-t border-white/5 pt-3 flex justify-between">
              <span className="text-white font-semibold">Total</span>
              <span className="text-amarillo font-bold text-lg">
                {getPrecio(selected) === 0
                  ? "GRATIS"
                  : formatCurrency(getPrecio(selected) * cantidad)}
              </span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-alerta-rojo text-sm bg-alerta-rojo/10 border border-alerta-rojo/20 rounded-lg p-3 mb-4">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {!isAuthenticated ? (
            <button
              onClick={() => router.push("/login")}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <LogIn size={18} />
              Ingresar para comprar
            </button>
          ) : (
            <button
              onClick={handleCompra}
              disabled={loading || !puedeComprar}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="spinner w-4 h-4" />
                  Procesando...
                </>
              ) : (
                <>
                  <ShoppingCart size={18} />
                  Confirmar compra
                </>
              )}
            </button>
          )}

          <p className="text-gris-oscuro text-xs text-center mt-3">
            Los QR se generan al instante y se envían por email
          </p>
        </div>
      )}
    </div>
  );
}

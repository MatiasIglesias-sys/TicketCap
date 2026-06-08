"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, RefreshCw, CheckCircle, XCircle, Activity } from "lucide-react";

interface EventInfo {
  id: string;
  nombre: string;
  fecha: string;
  ventaEstado: string;
}

interface QueueMetrics {
  waiting: number;
  active: number;
  expired: number;
  completed: number;
  concurrent: number;
  filaVirtual: boolean;
  ventaEstado: string;
}

export default function AdminColaPage() {
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null);

  const fetchEvents = useCallback(async () => {
    const res = await fetch("/api/events?upcoming=true", { cache: "no-store" });
    if (!res.ok) return;

    const data: EventInfo[] = await res.json();
    setEvents(data);

    if (!data.length) {
      setSelectedEventId("");
      setMetrics(null);
      return;
    }

    setSelectedEventId((current) => {
      if (!current) return data[0].id;
      const stillExists = data.some((e) => e.id === current);
      return stillExists ? current : data[0].id;
    });
  }, []);

  // Refresca eventos futuros al cargar y cada minuto para sacar automáticamente los ya pasados
  useEffect(() => {
    fetchEvents();
    const id = setInterval(fetchEvents, 60_000);
    return () => clearInterval(id);
  }, [fetchEvents]);

  const fetchMetrics = useCallback(async () => {
    if (!selectedEventId) return;
    const res = await fetch(`/api/queue/admin?eventId=${selectedEventId}`, { cache: "no-store" });
    if (res.ok) setMetrics(await res.json());
  }, [selectedEventId]);

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, 5000);
    return () => clearInterval(id);
  }, [fetchMetrics]);

const stat = (label: string, value: number, color: string, Icon: any) => (
    <div className="bg-negro border border-white/8 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={color} />
        <span className="text-gris-oscuro text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className={`font-bebas text-4xl ${color}`}>{value.toLocaleString()}</div>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-bebas text-4xl text-white tracking-wide">GESTIÓN DE FILA VIRTUAL</h1>
        <p className="text-gris-oscuro text-sm mt-0.5">Monitoreo en tiempo real · se actualiza cada 5 segundos</p>
      </div>

      {/* Event selector */}
      <div className="bg-negro-suave border border-white/8 rounded-2xl p-4">
        <label className="text-gris-oscuro text-xs uppercase tracking-wider block mb-2">Seleccioná el evento</label>
        {events.length > 0 ? (
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="input-dark"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre} — {new Date(e.fecha).toLocaleDateString("es-UY", { day: "2-digit", month: "short", year: "numeric" })}
              </option>
            ))}
          </select>
        ) : (
          <div className="input-dark flex items-center text-gris-oscuro text-sm">
            No hay eventos futuros para gestionar en fila virtual.
          </div>
        )}
      </div>

      {metrics && (
        <>
          {/* Status badge */}
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${
            metrics.filaVirtual
              ? "bg-amarillo/8 border-amarillo/25"
              : "bg-negro-suave border-white/8"
          }`}>
            <div className={`w-3 h-3 rounded-full ${metrics.filaVirtual ? "bg-amarillo animate-pulse" : "bg-gris-oscuro"}`} />
            <div>
              <span className={`font-semibold text-sm ${metrics.filaVirtual ? "text-amarillo" : "text-gris-medio"}`}>
                Fila virtual: {metrics.filaVirtual ? "ACTIVA" : "INACTIVA"}
              </span>
              <span className="text-gris-oscuro text-xs ml-3">
                Venta:{" "}
                {{
                  CERRADO: "Cerrada",
                  PREVENTA_SOCIOS: "Socios",
                  PREVENTA_ADHERENTES: "Socios + Adherentes",
                  VENTA_GENERAL: "General",
                  AGOTADO: "Agotado",
                }[metrics.ventaEstado] ?? metrics.ventaEstado}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-1 text-gris-oscuro text-xs">
              <RefreshCw size={11} className="animate-spin" style={{ animationDuration: "3s" }} />
              Live
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {stat("En espera", metrics.waiting, "text-amarillo", Users)}
            {stat("Comprando", metrics.active, "text-alerta-verde", Activity)}
            {stat("Vistas activas", metrics.concurrent, "text-blue-400", Activity)}
            {stat("Expirados", metrics.expired, "text-alerta-rojo", XCircle)}
            {stat("Completados", metrics.completed, "text-gris-medio", CheckCircle)}
          </div>

          {/* Activity bar */}
          {metrics.waiting + metrics.active > 0 && (
            <div className="bg-negro-suave border border-white/8 rounded-xl p-4">
              <div className="text-gris-oscuro text-xs uppercase tracking-wider mb-3">Distribución de la cola</div>
              <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
                {metrics.waiting > 0 && (
                  <div
                    className="bg-amarillo/60"
                    style={{ flex: metrics.waiting }}
                    title={`${metrics.waiting} esperando`}
                  />
                )}
                {metrics.active > 0 && (
                  <div
                    className="bg-alerta-verde/70"
                    style={{ flex: metrics.active }}
                    title={`${metrics.active} comprando`}
                  />
                )}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gris-oscuro">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amarillo/60 inline-block" />Esperando</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-alerta-verde/70 inline-block" />Comprando</span>
              </div>
            </div>
          )}

          {/* Threshold info */}
          <div className="bg-negro-suave border border-white/8 rounded-xl p-4 text-xs text-gris-medio space-y-1">
            <div className="flex justify-between">
              <span>Vistas simultáneas (ventana 2 min)</span>
              <span className="text-white font-mono">{metrics.concurrent}</span>
            </div>
            <div className="flex justify-between">
              <span>Umbral auto-activación</span>
              <span className="text-white font-mono">40 usuarios</span>
            </div>
            <div className="flex justify-between">
              <span>Comprando simultáneamente (máx)</span>
              <span className="text-white font-mono">100</span>
            </div>
            <div className="flex justify-between">
              <span>Tiempo de acceso al frente</span>
              <span className="text-white font-mono">10 minutos</span>
            </div>
          </div>

        </>
      )}

      {!metrics && (
        <div className="bg-negro-suave border border-white/8 rounded-2xl p-12 flex items-center justify-center">
          <div className="spinner w-6 h-6" />
        </div>
      )}
    </div>
  );
}

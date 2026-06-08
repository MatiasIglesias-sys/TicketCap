"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Clock, Users, Shield, RefreshCw, AlertTriangle, Star } from "lucide-react";

interface QueueStatus {
  inQueue: boolean;
  estado: "ESPERANDO" | "ACTIVO" | "EXPIRADO";
  posicion?: number;
  estimatedMinutes?: number;
  prioridad?: number;
  accessToken?: string;
  accessExpiry?: string;
  expiresInSeconds?: number;
  totalWaiting?: number;
}

interface Props {
  eventId: string;
  eventoNombre: string;
  fechaLabel: string;
  prioridadInicial?: number;
  onAccess: (accessToken: string, expiresAt: string) => void;
}

const POLL_INTERVAL = 8000; // 8 seconds

export default function QueueWaitingRoom({
  eventId,
  eventoNombre,
  fechaLabel,
  prioridadInicial = 0,
  onAccess,
}: Props) {
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [dots, setDots] = useState("");
  const [pulsePos, setPulsePos] = useState(false);
  const [accessingNow, setAccessingNow] = useState(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/queue/status?eventId=${eventId}`);
      const data: QueueStatus = await res.json();
      setStatus(data);

      if (data.estado === "ACTIVO") {
        setAccessingNow(true);
        if (data.accessToken && data.accessExpiry) {
          onAccess(data.accessToken, data.accessExpiry);
          return;
        }

        // If token is momentarily missing, retry quickly instead of leaving the user at position 0.
        setTimeout(() => {
          void poll();
        }, 1200);
        return;
      }

      if (data.expiresInSeconds !== undefined) {
        setCountdown(data.expiresInSeconds);
      }

      setPulsePos(true);
      setTimeout(() => setPulsePos(false), 600);
    } catch {
      // Silently retry
    }
  }, [eventId, onAccess]);

  // Initial poll
  useEffect(() => { poll(); }, [poll]);

  // Polling interval
  useEffect(() => {
    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [poll]);

  // Countdown ticker
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  // Animated dots
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? "" : d + ".")), 500);
    return () => clearInterval(id);
  }, []);

  function formatCountdown(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function formatEstimatedWait(minutes: number) {
    if (pos <= 0) {
      return "Ingreso inmediato";
    }

    const safeMinutes = Math.max(1, Math.round(minutes));
    if (safeMinutes < 60) {
      return `~${safeMinutes} min`;
    }

    if (safeMinutes >= 240) {
      return "~4 h+";
    }

    const hours = Math.floor(safeMinutes / 60);
    const mins = safeMinutes % 60;
    if (mins === 0) {
      return `~${hours} h`;
    }

    return `~${hours} h ${mins} min`;
  }

  if (accessingNow) {
    return (
      <div className="bg-negro-suave border border-amarillo/30 rounded-2xl p-8 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-amarillo/10 border-2 border-amarillo/30 flex items-center justify-center mx-auto mb-4">
          <RefreshCw size={30} className="text-amarillo animate-spin" />
        </div>
        <h2 className="font-bebas text-3xl text-amarillo mb-2">Tu turno está listo</h2>
        <p className="text-gris-medio text-sm">Te estamos llevando directo a la compra...</p>
      </div>
    );
  }

  // ── EXPIRED — redirect to home ────────────────────────────────────────────
  if (status?.estado === "EXPIRADO") {
    if (typeof window !== "undefined") window.location.href = "/";
    return (
      <div className="bg-negro-suave border border-alerta-rojo/30 rounded-2xl p-8 text-center animate-fade-in">
        <AlertTriangle size={40} className="text-alerta-rojo mx-auto mb-4" />
        <h2 className="font-bebas text-2xl text-white mb-2">Se venció tu turno</h2>
        <p className="text-gris-medio text-sm">
          El tiempo de compra expiró. Volvés al inicio...
        </p>
      </div>
    );
  }

  // ── WAITING ROOM ──────────────────────────────────────────────────────────
  const pos = status?.posicion ?? 0;
  const est = status?.estimatedMinutes ?? 0;
  const total = status?.totalWaiting ?? 0;
  const prio = status?.prioridad ?? prioridadInicial;
  const pctProgress = total > 0 ? Math.max(5, Math.min(95, ((total - pos) / total) * 100)) : 50;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top banner */}
      <div className="bg-negro-suave border border-amarillo/20 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-negro via-negro-suave to-negro px-6 py-5 border-b border-white/5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full border border-amarillo/30 shadow-[0_0_0_4px_rgba(245,197,24,0.08)] overflow-hidden shrink-0 bg-negro">
            <Image
              src="/images/EscudoPeñarolFondoNegro.jpg"
              alt="Club Atlético Peñarol"
              width={56}
              height={56}
              className="w-full h-full object-cover"
              priority
              onError={(e) => { (e.target as HTMLImageElement).src = "/images/penarol-logo.svg"; }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-amarillo text-xs font-semibold uppercase tracking-widest mb-0.5">
              Fila Virtual — Alta demanda
            </div>
            <div className="text-white font-bold text-base truncate">{eventoNombre}</div>
            <div className="text-gris-oscuro text-xs">{fechaLabel}</div>
          </div>
          {prio >= 2 && (
            <div className="shrink-0 flex items-center gap-1.5 bg-amarillo/10 border border-amarillo/25 rounded-full px-3 py-1">
              <Star size={12} className="text-amarillo fill-amarillo" />
              <span className="text-amarillo text-xs font-semibold">Socio</span>
            </div>
          )}
          {prio === 1 && (
            <div className="shrink-0 flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/25 rounded-full px-3 py-1">
              <Shield size={12} className="text-blue-400" />
              <span className="text-blue-400 text-xs font-semibold">Adherente</span>
            </div>
          )}
        </div>

        {/* Queue position */}
        <div className="px-6 py-8 text-center">
          <div className="text-gris-oscuro text-xs uppercase tracking-widest mb-3">
            Tu posición en la fila
          </div>

          {/* Big position number with animation */}
          <div className={`transition-transform duration-300 ${pulsePos ? "scale-110" : "scale-100"}`}>
            <div className="font-bebas text-8xl text-amarillo leading-none tracking-tight mb-1"
              style={{ textShadow: "0 0 40px rgba(245,197,24,0.25)" }}>
              {pos.toLocaleString("es-UY")}
            </div>
          </div>
          <div className="text-gris-medio text-sm">
            {pos <= 0 ? "nadie delante de vos" : pos === 1 ? "persona delante de vos" : "personas delante de vos"}
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-6 pb-2">
          <div className="flex justify-between text-xs text-gris-oscuro mb-2">
            <span>Tu lugar</span>
            <span>Acceso a la compra</span>
          </div>
          <div className="h-2 bg-negro-medio rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amarillo/60 to-amarillo rounded-full transition-all duration-1000"
              style={{ width: `${pctProgress}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-white/5 border-t border-white/5 mt-4">
          <div className="px-4 py-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-gris-oscuro text-xs mb-1">
              <Clock size={11} />
              <span>Espera estimada</span>
            </div>
            <div className="text-white font-bold text-lg">
              {formatEstimatedWait(est)}
            </div>
          </div>
          <div className="px-4 py-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-gris-oscuro text-xs mb-1">
              <Users size={11} />
              <span>En la fila</span>
            </div>
            <div className="text-white font-bold text-lg">
              {total.toLocaleString("es-UY")}
            </div>
          </div>
          <div className="px-4 py-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-gris-oscuro text-xs mb-1">
              <RefreshCw size={11} className="animate-spin" style={{ animationDuration: "3s" }} />
              <span>Actualizando</span>
            </div>
            <div className="text-white font-bold text-lg">
              {dots || "···"}
            </div>
          </div>
        </div>
      </div>

      {/* Important notice */}
      <div className="bg-amarillo/5 border border-amarillo/15 rounded-xl px-5 py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={15} className="text-amarillo shrink-0 mt-0.5" />
          <div className="text-xs text-gris-medio leading-relaxed space-y-1.5">
            <p>
              <strong className="text-white">No cierres ni recargues esta pestaña.</strong>{" "}
              Tu posición se guarda automáticamente.
            </p>
            {prio >= 2 && (
              <p className="text-amarillo/80">
                Como socio activo, tenés prioridad en la fila frente a hinchas sin credencial.
              </p>
            )}
            <p>
              Cuando sea tu turno, tendrás <strong className="text-white">15 minutos</strong> para
              completar tu compra.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

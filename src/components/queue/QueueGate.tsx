"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, ChevronRight, ShieldCheck, CreditCard, Users, Ticket, Lock } from "lucide-react";
import Link from "next/link";
import QueueWaitingRoom from "./QueueWaitingRoom";
import StadiumSelector from "@/components/stadium/StadiumSelector";

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
  filaVirtual: boolean;
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
  userId?: string;
  ticketsComprados?: number;
  prioridad?: number;
}

type Phase = "loading" | "direct" | "info" | "joining" | "waiting" | "access" | "blocked";

const STORAGE_KEY = (eventId: string) => `queue_access_${eventId}`;

export default function QueueGate({ filaVirtual, eventoId, ticketsComprados = 0, userId, ...rest }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [accessExpiry, setAccessExpiry] = useState<string | null>(null);
  const [blockedMsg, setBlockedMsg] = useState<string>("");
  const [blockedPhase, setBlockedPhase] = useState<string | null>(null);

  // ── On mount ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!filaVirtual) { setPhase("info"); return; }

    // Not authenticated — never use a stored token
    if (!rest.isAuthenticated) {
      sessionStorage.removeItem(STORAGE_KEY(eventoId));
      setPhase("info");
      return;
    }

    // sessionStorage: persists across in-app navigation but clears on refresh/tab close
    const stored = sessionStorage.getItem(STORAGE_KEY(eventoId));
    if (stored) {
      try {
        const { token, expiresAt, userId: storedUserId } = JSON.parse(stored);
        const notExpired = Date.now() < new Date(expiresAt).getTime();
        const sameUser   = !storedUserId || !userId || storedUserId === userId;
        if (notExpired && sameUser) {
          setAccessToken(token);
          setAccessExpiry(expiresAt);
          setPhase("access");
          return;
        }
      } catch { /* ignore */ }
      sessionStorage.removeItem(STORAGE_KEY(eventoId));
    }

    checkStatus();
  }, [eventoId, filaVirtual]); // eslint-disable-line

  const checkStatus = useCallback(async () => {
    try {
      const res  = await fetch(`/api/queue/status?eventId=${eventoId}`);
      const data = await res.json();
      if (!data.authenticated)                          { setPhase("info");    return; }
      if (data.estado === "ACTIVO" && data.accessToken) { handleAccess(data.accessToken, data.accessExpiry); return; }
      if (data.inQueue && data.estado === "ESPERANDO")  { setPhase("waiting"); return; }
      setPhase("info");
    } catch {
      setPhase("info");
    }
  }, [eventoId]); // eslint-disable-line

  function handleAccess(token: string, expiry: string) {
    sessionStorage.setItem(STORAGE_KEY(eventoId), JSON.stringify({ token, expiresAt: expiry, userId }));
    setAccessToken(token);
    setAccessExpiry(expiry);
    setPhase("access");
  }

  // ── Release slot on F5 / tab close (beforeunload) ─────────────────────────
  // Next.js client-side navigation does NOT trigger beforeunload, so
  // navigating to home/tickets preserves the slot. Only hard refresh or
  // closing the tab releases it.
  useEffect(() => {
    if (phase !== "access") return;
    const release = () => {
      sessionStorage.removeItem(STORAGE_KEY(eventoId));
      navigator.sendBeacon(`/api/queue/release?eventId=${eventoId}`);
    };
    window.addEventListener("beforeunload", release);
    return () => window.removeEventListener("beforeunload", release);
  }, [phase, eventoId]);

  async function handleContinuar() {
    if (!rest.isAuthenticated) {
      window.location.href = `/login?callbackUrl=/eventos/${eventoId}`;
      return;
    }

    if (!filaVirtual) { setPhase("direct"); return; }

    setPhase("joining");
    try {
      const res  = await fetch("/api/queue/join", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ eventId: eventoId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.eligible === false) {
          setBlockedMsg(data.error ?? "No habilitado");
          setBlockedPhase(data.phaseLabel ?? null);
          setPhase("blocked");
        } else {
          setPhase("info");
        }
        return;
      }
      if (data.estado === "ACTIVO" && data.accessToken) {
        handleAccess(data.accessToken, data.accessExpiry);
      } else {
        setPhase("waiting");
      }
    } catch {
      setPhase("waiting");
    }
  }

  // ── No elegible para comprar en este momento ─────────────────────────────
  if (phase === "blocked") {
    return (
      <div className="bg-negro-suave border border-alerta-rojo/30 rounded-2xl p-8 text-center animate-fade-in">
        <div className="w-14 h-14 rounded-full bg-alerta-rojo/10 border-2 border-alerta-rojo/30 flex items-center justify-center mx-auto mb-4">
          <Lock size={26} className="text-alerta-rojo" />
        </div>
        <h2 className="font-bebas text-2xl text-white mb-2">Venta no habilitada para vos</h2>
        <p className="text-gris-medio text-sm mb-1">{blockedMsg}</p>
        {blockedPhase && (
          <p className="text-amarillo text-xs font-medium mb-5">
            Ahora mismo solo pueden comprar: <span className="text-white">{blockedPhase}</span>
          </p>
        )}
        {!blockedPhase && <div className="mb-5" />}
        <Link href="/" className="btn-primary inline-flex items-center gap-2 px-8 py-2.5 text-sm">
          Volver al inicio
        </Link>
      </div>
    );
  }

  // ── Alcanzó el límite — no puede comprar más ─────────────────────────────
  if (ticketsComprados >= rest.limiteXUsuario && phase !== "access" && phase !== "direct") {
    return (
      <div className="bg-negro-suave border border-alerta-verde/30 rounded-2xl p-8 text-center animate-fade-in">
        <div className="w-14 h-14 rounded-full bg-alerta-verde/10 border-2 border-alerta-verde/30 flex items-center justify-center mx-auto mb-4">
          <Ticket size={26} className="text-alerta-verde" />
        </div>
        <h2 className="font-bebas text-2xl text-white mb-1">Ya tenés {ticketsComprados} {ticketsComprados === 1 ? "entrada" : "entradas"} para este partido</h2>
        <p className="text-gris-medio text-sm mb-5">Alcanzaste el límite máximo de {rest.limiteXUsuario} entradas por usuario.</p>
        <Link href="/mis-tickets" className="btn-primary inline-flex items-center gap-2 px-8 py-2.5 text-sm">
          <Ticket size={15} />
          Ver mis entradas
        </Link>
      </div>
    );
  }

  // ── Selector de sectores ──────────────────────────────────────────────────
  if (phase === "direct" || phase === "access") {
    return (
      <StadiumSelector
        {...rest}
        eventoId={eventoId}
        limiteXUsuario={rest.limiteXUsuario - ticketsComprados}
        queueAccessToken={phase === "access" ? accessToken ?? undefined : undefined}
        queueExpiry={phase === "access" ? accessExpiry ?? undefined : undefined}
      />
    );
  }

  // ── Cargando ──────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="spinner w-6 h-6" />
      </div>
    );
  }

  // ── Ingresando a la fila ──────────────────────────────────────────────────
  if (phase === "joining") {
    return (
      <div className="flex flex-col items-center gap-4 py-16 animate-fade-in">
        <div className="spinner w-8 h-8" />
        <p className="text-white font-semibold">Ingresando a la fila virtual...</p>
        <p className="text-gris-oscuro text-sm">No recargues esta página</p>
      </div>
    );
  }

  // ── Sala de espera ────────────────────────────────────────────────────────
  if (phase === "waiting") {
    return (
      <QueueWaitingRoom
        eventId={eventoId}
        eventoNombre={rest.eventoNombre}
        fechaLabel={rest.fechaLabel}
        prioridadInicial={rest.prioridad ?? 0}
        onAccess={handleAccess}
      />
    );
  }

  // ── Pantalla pre-compra (info) — para todos los eventos ──────────────────
  const steps: { icon: React.ReactNode; text: string }[] = [
    {
      icon: <ShieldCheck size={15} className="text-amarillo" />,
      text: rest.isAuthenticated
        ? "Ya estás logueado. Tu cuenta está lista para comprar."
        : "Asegurate de ingresar con tu cuenta de TicketsCap o registrate para crear una.",
    },
    {
      icon: <CreditCard size={15} className="text-amarillo" />,
      text: "Revisá los medios de pago disponibles y tené cerca tus tarjetas y datos de cuentas para el pago.",
    },
    ...(filaVirtual
      ? [{
          icon: <Users size={15} className="text-amarillo" />,
          text: "Cuando se habilite la compra, te asignaremos un lugar aleatorio en la fila virtual. Por favor, no recargues esta página.",
        }]
      : []),
  ];

  const restantes = rest.limiteXUsuario - ticketsComprados;

  return (
    <div className="animate-fade-in">

      {/* Separador visual */}
      <div className="h-px bg-white/5 mb-8" />

      {/* Aviso de entradas ya compradas (pero puede comprar más) */}
      {ticketsComprados > 0 && (
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="inline-flex items-center gap-2 bg-alerta-verde/10 border border-alerta-verde/25 rounded-full px-4 py-1.5">
            <Ticket size={13} className="text-alerta-verde shrink-0" />
            <p className="text-alerta-verde text-xs font-medium">
              Ya tenés {ticketsComprados} {ticketsComprados === 1 ? "entrada" : "entradas"} — podés comprar hasta {restantes} más
            </p>
          </div>
        </div>
      )}

      {/* Aviso de fila virtual + botón centrado */}
      <div className="text-center mb-5 space-y-3">
        {filaVirtual && (
          <div className="inline-flex items-center gap-2 bg-amarillo/10 border border-amarillo/25 rounded-full px-4 py-1.5">
            <Zap size={13} className="text-amarillo shrink-0" />
            <p className="text-amarillo text-xs font-medium">
              Este espectáculo tiene alta demanda de compra. Ingresarás a una fila virtual.
            </p>
          </div>
        )}

        <div>
          <button
            onClick={handleContinuar}
            className="btn-primary inline-flex items-center gap-2 px-10 py-3 text-sm"
          >
            Continuar
            <ChevronRight size={16} />
          </button>

          {!rest.isAuthenticated && (
            <p className="text-gris-oscuro text-xs mt-1.5">
              Te pediremos que inicies sesión antes de proceder
            </p>
          )}
        </div>
      </div>

      {/* Steps horizontales */}
      <div>
        <p className="text-amarillo font-semibold text-xs mb-3">
          Al momento de comprar tus entradas:
        </p>

        <div className={`grid gap-3 ${steps.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
          {steps.map((step, i) => (
            <div
              key={i}
              className="bg-negro-suave border border-white/8 rounded-xl p-3 flex items-start gap-2.5 hover:border-amarillo/20 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-amarillo/10 border border-amarillo/20 flex items-center justify-center shrink-0">
                {step.icon}
              </div>
              <p className="text-gris-medio text-xs leading-relaxed pt-0.5">{step.text}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

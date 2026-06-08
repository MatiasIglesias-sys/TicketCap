import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { formatDate, torneoLabel } from "@/lib/utils";
import { AlertTriangle, Calendar, MapPin, ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// QueueGate is a heavy client component (polling logic + sector selector).
// Load it lazily so the event hero renders immediately.
const QueueGate = dynamic(() => import("@/components/queue/QueueGate"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-negro-suave border border-white/8 rounded-2xl p-8 text-center">
      <div className="h-4 bg-white/5 rounded w-1/3 mx-auto mb-3" />
      <div className="h-3 bg-white/5 rounded w-1/2 mx-auto" />
    </div>
  ),
});
import { templateUrl } from "@/lib/banner";
import { computeVentaEstado } from "@/lib/venta-escalonada";

const SPOTIFY_PLAYLIST_ID = "7ewGmI6roCcf3ZvRv8klOR";

const METODOS_PAGO = [
  "Anda", "Bandes (Uruguay)", "BBVA (Uruguay)", "Banco República (Uruguay)",
  "Cabal", "HSBC (Uruguay)", "Itaú (Uruguay)", "Mastercard",
  "OCA (Uruguay)", "Santander (Uruguay)", "Scotiabank (Uruguay)",
  "Pass Card", "Tarjeta D", "Visa",
];

async function getEvento(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: { sectores: { orderBy: { precio: "asc" } } },
  });
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const evento = await getEvento(params.id);
  if (!evento) return { title: "Evento no encontrado" };
  return { title: `${evento.nombre} — ${formatDate(evento.fecha)} | TicketsCap` };
}

const TORNEO_BADGE: Record<string, string> = {
  LIBERTADORES: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  SUDAMERICANA:  "bg-orange-500/15 text-orange-400 border-orange-500/30",
  CLAUSURA:      "bg-blue-500/15 text-blue-400 border-blue-500/30",
  APERTURA:      "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  COPA_URUGUAY:  "bg-purple-500/15 text-purple-400 border-purple-500/30",
  BASQUETBOL:    "bg-red-500/15 text-red-400 border-red-500/30",
  RUGBY:         "bg-teal-500/15 text-teal-400 border-teal-500/30",
};

export default async function EventoPage({ params }: { params: { id: string } }) {
  const [evento, session] = await Promise.all([
    getEvento(params.id),
    getServerSession(authOptions),
  ]);
  if (!evento) notFound();

  const ticketsComprados = session?.user.id
    ? await prisma.ticket.count({
        where: { userId: session.user.id, eventId: evento.id, estado: { in: ["ACTIVO", "USADO"] } },
      })
    : 0;

  const isSocioAlDia   = session?.user.socio?.cuotaAlDia === true;
  const socioCategoria = session?.user.socio?.categoria ?? "";

  const precios    = evento.sectores.filter((s) => s.habilitado && s.disponibles > 0).map((s) => s.precio);
  const precioMin  = precios.length ? Math.min(...precios) : 0;
  const precioMax  = precios.length ? Math.max(...precios) : 0;

  const fechaEvento = new Date(evento.fecha);
  const diasSemana  = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
  const meses       = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const fechaLabel  = `${diasSemana[fechaEvento.getDay()].charAt(0).toUpperCase() + diasSemana[fechaEvento.getDay()].slice(1)} ${fechaEvento.getDate()} de ${meses[fechaEvento.getMonth()]} — ${fechaEvento.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" })}h`;

  const ventaEstadoEfectivo = computeVentaEstado(evento);
  const ventaAbierta = ["VENTA_GENERAL","PREVENTA_SOCIOS","PREVENTA_ADHERENTES","FILA_VIRTUAL"].includes(ventaEstadoEfectivo);
  const puedeComprar = ventaAbierta && !["FINALIZADO","SUSPENDIDO"].includes(evento.estado);
  const torneoClass  = TORNEO_BADGE[evento.torneo] ?? "bg-white/5 text-gris-medio border-white/10";
  const isBasquet = ["BASQUETBOL", "BASQUETBOL_COPA"].includes(evento.torneo as string);
  const bannerSrc = isBasquet
    ? "/images/Plantilla basketball peñarol.jpg"
    : (evento.imageUrl || templateUrl(evento.torneo));

  return (
    <div className="min-h-screen flex flex-col bg-negro">
      <Navbar />

      <main className="flex-1">

        {/* ── Compact header bar (estilo Fever / Barcelona) ───────────────── */}
        <div className="relative overflow-hidden border-b border-amarillo/50">

          {/* Fondo: match-banner-3 con overlay oscuro */}
          <Image
            src="/images/match-banner-3.jpg"
            alt=""
            fill
            className="object-cover opacity-25"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-negro/90 via-negro/75 to-negro/60 pointer-events-none" />

          {/* Contenido sobre el fondo */}
          <div className="relative z-10">

            {/* Fila back */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-1">
              <Link
                href="/eventos"
                className="inline-flex items-center gap-1 text-[11px] text-gris-oscuro hover:text-white transition-colors"
              >
                <ChevronLeft size={13} />
                Volver a eventos
              </Link>
            </div>

            {/* Barra principal */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center gap-5">

                {/* Thumbnail del partido */}
                <div className="hidden sm:block relative w-[130px] h-[82px] rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-xl">
                  <Image
                    src={bannerSrc}
                    alt={evento.nombre}
                    fill
                    sizes="130px"
                    className="object-cover"
                    unoptimized
                  />
                </div>

                {/* Título + competición */}
                <div className="flex-1 min-w-0">
                  <h1 className="font-bebas text-xl sm:text-2xl md:text-[1.9rem] text-white tracking-wide leading-tight">
                    {evento.nombre}
                  </h1>
                  <span className={`inline-block mt-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${torneoClass}`}>
                    {torneoLabel(evento.torneo)}
                  </span>
                </div>

                {/* Fecha + estadio — iconos alineados, centrados verticalmente */}
                <div className="hidden md:grid grid-cols-[16px_1fr] items-center gap-x-2 gap-y-2.5 shrink-0 text-sm text-gris-medio">
                  <Calendar size={13} className="text-amarillo justify-self-center" />
                  <span>{fechaLabel}</span>
                  <MapPin   size={13} className="text-amarillo justify-self-center" />
                  <span>{evento.estadio}</span>
                </div>

              </div>

              {/* Mobile: fecha + estadio */}
              <div className="grid md:hidden grid-cols-[16px_1fr] items-center gap-x-2 gap-y-2 mt-3 text-xs text-gris-medio">
                <Calendar size={11} className="text-amarillo justify-self-center" />
                <span>{fechaLabel}</span>
                <MapPin   size={11} className="text-amarillo justify-self-center" />
                <span>{evento.estadio}</span>
              </div>
            </div>

          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Alerta socio moroso */}
          {session?.user.socio && !isSocioAlDia && (
            <div className="mb-6 bg-alerta-rojo/10 border border-alerta-rojo/25 rounded-xl p-3 flex items-center gap-2.5">
              <AlertTriangle size={16} className="text-alerta-rojo shrink-0" />
              <p className="text-alerta-rojo text-sm">
                Tu cuota está en mora. Regularizá para acceder a precios de socio.
              </p>
            </div>
          )}

          {/* Gate: pre-compra → selector de sectores */}
          <QueueGate
            filaVirtual={evento.filaVirtual}
            sectores={evento.sectores}
            eventoId={evento.id}
            eventoNombre={evento.nombre}
            eventoFecha={evento.fecha.toISOString()}
            fechaLabel={fechaLabel}
            torneo={evento.torneo}
            estadio={evento.estadio}
            esLocal={(evento as any).esLocal ?? true}
            visitorSectionIds={(() => {
              try { return JSON.parse((evento as any).visitorSections ?? "[]"); }
              catch { return []; }
            })()}
            isSocioAlDia={isSocioAlDia}
            socioCategoria={socioCategoria}
            puedeComprar={puedeComprar}
            limiteXUsuario={evento.limiteXUsuario}
            isAuthenticated={!!session}
            userId={session?.user.id}
            ticketsComprados={ticketsComprados}
            prioridad={
              isSocioAlDia
                ? ["ACTIVO","SUSCRIPTOR","VITALICIO","INTERIOR"].includes(socioCategoria) ? 2 : 1
                : 0
            }
          />

          {/* ── Spotify ────────────────────────────────────────────────────── */}
          <div className="mt-10 bg-negro-suave border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2.5">
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="#1DB954">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              <span className="text-white font-semibold text-sm">La playlist Carbonera</span>
              <span className="text-gris-oscuro text-xs ml-auto">Peñarol en Spotify</span>
            </div>
            <iframe
              src={`https://open.spotify.com/embed/playlist/${SPOTIFY_PLAYLIST_ID}?utm_source=generator&theme=0`}
              width="100%"
              height="352"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="block"
            />
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}

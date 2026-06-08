import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { formatDateTime, torneoLabel, ventaEstadoLabel, deporteLabel } from "@/lib/utils";
import { Calendar, Zap, ChevronRight } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { templateUrl } from "@/lib/banner";
import { KNOWN_LOGOS } from "@/lib/team-logos";
import { computeVentaEstado } from "@/lib/venta-escalonada";

async function getEventos(filter?: string) {
  const where = !filter
    ? undefined
    : filter === "FUTBOL"
    ? { torneo: { in: ["APERTURA","CLAUSURA","INTERMEDIO","LIBERTADORES","SUDAMERICANA","COPA_URUGUAY","SUPERCOPA","AMISTOSO"] as any } }
    : filter === "BASQUETBOL"
    ? { torneo: { in: ["BASQUETBOL","BASQUETBOL_COPA"] as any } }
    : filter === "RUGBY"
    ? { torneo: { in: ["RUGBY","RUGBY_COPA","RUGBY_AMERICAS"] as any } }
    : filter === "PARKING"
    ? { torneo: { in: ["PARKING"] as any } }
    : { torneo: filter as any };

  return prisma.event.findMany({
    where,
    include: { sectores: { select: { disponibles: true, precio: true } } },
    orderBy: { fecha: "asc" },
  });
}

const FILTER_GROUPS = [
  { key: "FUTBOL",     label: "Fútbol",      sub: [
    { value: "APERTURA",    label: "Apertura" },
    { value: "INTERMEDIO",  label: "Intermedio" },
    { value: "CLAUSURA",    label: "Clausura" },
    { value: "LIBERTADORES", label: "Copa Libertadores" },
    { value: "SUDAMERICANA", label: "Copa Sudamericana" },
    { value: "COPA_URUGUAY", label: "Copa AUF Uruguay" },
  ]},
  { key: "BASQUETBOL", label: "Básquetbol",  sub: [
    { value: "BASQUETBOL",      label: "Liga Uruguaya" },
    { value: "BASQUETBOL_COPA", label: "Copa" },
  ]},
  { key: "RUGBY",      label: "Rugby",       sub: [
    { value: "RUGBY",          label: "Liga Local" },
    { value: "RUGBY_COPA",     label: "Copa Rugby" },
    { value: "RUGBY_AMERICAS", label: "Súper Rugby Américas" },
  ]},
  { key: "PARKING",    label: "Parking",     sub: [
    { value: "PARKING", label: "Estacionamiento" },
  ]},
];

const TORNEO_BADGE: Record<string, string> = {
  LIBERTADORES:    "text-yellow-400 border-yellow-500/50 bg-yellow-500/15",
  SUDAMERICANA:    "text-orange-400 border-orange-500/50 bg-orange-500/15",
  CLAUSURA:        "text-blue-400   border-blue-500/50   bg-blue-500/15",
  APERTURA:        "text-green-400  border-green-500/50  bg-green-500/15",
  INTERMEDIO:      "text-cyan-400   border-cyan-500/50   bg-cyan-500/15",
  COPA_URUGUAY:    "text-purple-400 border-purple-500/50 bg-purple-500/15",
  BASQUETBOL:      "text-orange-300 border-orange-400/50 bg-orange-400/15",
  BASQUETBOL_COPA: "text-orange-300 border-orange-400/50 bg-orange-400/15",
  RUGBY:           "text-emerald-400 border-emerald-500/50 bg-emerald-500/15",
  RUGBY_COPA:      "text-emerald-400 border-emerald-500/50 bg-emerald-500/15",
  RUGBY_AMERICAS:  "text-emerald-300 border-emerald-400/50 bg-emerald-400/15",
  PARKING:         "text-sky-400    border-sky-500/50    bg-sky-500/15",
};

const VENTA_BADGE: Record<string, { label: string; cls: string }> = {
  VENTA_GENERAL:     { label: "Venta General",       cls: "text-alerta-verde border-alerta-verde/40 bg-alerta-verde/10" },
  PREVENTA_SOCIOS:   { label: "Preventa — Solo Socios", cls: "text-amarillo border-amarillo/40 bg-amarillo/10" },
  PREVENTA_ADHERENTES: { label: "Preventa Adherentes", cls: "text-amarillo border-amarillo/40 bg-amarillo/10" },
  FILA_VIRTUAL:      { label: "Fila Virtual Activa",  cls: "text-orange-400 border-orange-400/40 bg-orange-400/10" },
  AGOTADO:           { label: "Agotado",              cls: "text-alerta-rojo border-alerta-rojo/40 bg-alerta-rojo/10" },
  CERRADO:           { label: "Venta Cerrada",         cls: "text-gris-oscuro border-white/10 bg-white/5" },
};

const UY_DATE_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo" });

function uyDateKey(date: Date): string {
  return UY_DATE_FMT.format(date);
}

export default async function EventosPage({
  searchParams,
}: {
  searchParams: { deporte?: string; torneo?: string };
}) {
  const activeDeporte = searchParams.deporte ?? "";
  const activeTorneo  = searchParams.torneo  ?? "";
  const dbFilter      = activeTorneo || activeDeporte || undefined;
  const eventos       = await getEventos(dbFilter);
  const todayUy       = uyDateKey(new Date());

  // Hide same-day matches from upcoming cards (Uruguay local date).
  const proximos = eventos.filter((e) => uyDateKey(new Date(e.fecha)) > todayUy);

  const precioMin = (ev: typeof eventos[0]) =>
    ev.sectores.length ? Math.min(...ev.sectores.map((s) => s.precio)) : 0;

  const activeGroup = FILTER_GROUPS.find(
    (g) => g.key === activeDeporte || g.sub.some((s) => s.value === activeTorneo)
  );

  return (
    <div className="min-h-screen flex flex-col bg-negro">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="bg-negro-suave border-b border-white/5 py-7">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-bebas text-5xl text-white tracking-wide mb-1">EVENTOS</h1>
          <p className="text-gris-oscuro text-sm">
            Club Atlético Peñarol — Fútbol · Básquetbol · Rugby
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">

        {/* ── Filtros ───────────────────────────────────────────────────────── */}
        <div className="space-y-3 mb-8 animate-rise">
          <div className="flex flex-wrap gap-2">
            <Link href="/eventos" className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              !activeDeporte && !activeTorneo
                ? "bg-amarillo text-negro border-amarillo"
                : "border-white/10 text-gris-medio hover:border-amarillo/40 hover:text-white"
            }`}>
              Todos los eventos
            </Link>
            {FILTER_GROUPS.map((g) => (
              <Link key={g.key} href={`/eventos?deporte=${g.key}`} className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                activeDeporte === g.key
                  ? "bg-amarillo text-negro border-amarillo"
                  : "border-white/10 text-gris-medio hover:border-amarillo/40 hover:text-white"
              }`}>
                {g.label}
              </Link>
            ))}
          </div>

          {activeGroup && (
            <div className="flex flex-wrap gap-2 pl-1 animate-fade-in">
              <Link href={`/eventos?deporte=${activeGroup.key}`} className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                activeTorneo === "" ? "bg-white/10 text-white border-white/30" : "border-white/8 text-gris-oscuro hover:text-white hover:border-white/20"
              }`}>Todos</Link>
              {activeGroup.sub.map((s) => (
                <Link key={s.value} href={`/eventos?torneo=${s.value}`} className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  activeTorneo === s.value ? "bg-white/10 text-white border-white/30" : "border-white/8 text-gris-oscuro hover:text-white hover:border-white/20"
                }`}>{s.label}</Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Próximos eventos — GRID ───────────────────────────────────────── */}
        {proximos.length > 0 && (
          <section className="mb-12">
            <h2 className="text-white font-semibold text-lg mb-5 flex items-center gap-2">
              <Zap size={16} className="text-amarillo" />
              Próximos eventos
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {proximos.map((evento, index) => {
                const isBasquet = ["BASQUETBOL", "BASQUETBOL_COPA"].includes(evento.torneo);
                const banner = isBasquet
                  ? "/images/Plantilla basketball peñarol.jpg"
                  : (evento.imageUrl || templateUrl(evento.torneo));
                const rivalLogo = KNOWN_LOGOS[evento.rival] || evento.rivalEscudo || null;
                const torneoC    = TORNEO_BADGE[evento.torneo] ?? "text-gris-medio border-white/10 bg-white/5";
                const ventaEst   = computeVentaEstado(evento);
                const venta      = VENTA_BADGE[ventaEst] ?? VENTA_BADGE.CERRADO;
                const precio     = precioMin(evento);
                const totalDisp  = evento.sectores.reduce((a, s) => a + s.disponibles, 0);
                const isFilaVirt = ventaEst === "FILA_VIRTUAL";

                return (
                  <Link key={evento.id} href={`/eventos/${evento.id}`} className="group block animate-rise" style={{ animationDelay: `${index * 90}ms` }}>
                    <article className="overflow-hidden rounded-2xl bg-negro-suave border border-white/8 hover:border-amarillo/35 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-amarillo/8 h-full flex flex-col">

                      {/* ── Banner image ── */}
                      <div className="relative aspect-video overflow-hidden shrink-0">
                        {/* Background template */}
                        <Image
                          src={banner}
                          alt={evento.nombre}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          unoptimized
                          priority={false}
                        />

                        {isBasquet && rivalLogo && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full p-1 flex items-center justify-center">
                            <Image
                              src={rivalLogo}
                              alt={`Escudo ${evento.rival}`}
                              width={44}
                              height={44}
                              className="w-full h-full object-contain"
                              unoptimized
                            />
                          </div>
                        )}

                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-negro via-negro/25 to-transparent" />
                        <div className="absolute inset-0 bg-negro/20 group-hover:bg-negro/10 transition-colors duration-300" />

                        {/* Torneo badge */}
                        <div className="absolute top-3 left-3">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border backdrop-blur-sm ${torneoC}`}>
                            {torneoLabel(evento.torneo)}
                          </span>
                        </div>

                        {/* Fila virtual indicator */}
                        {isFilaVirt && (
                          <div className="absolute top-3 right-3">
                            <div className="flex items-center gap-1 bg-orange-500/20 border border-orange-500/40 rounded-full px-2 py-0.5 backdrop-blur-sm">
                              <Zap size={10} className="text-orange-400" />
                              <span className="text-orange-400 text-[10px] font-bold">FILA</span>
                            </div>
                          </div>
                        )}

                        {/* Bottom info on image */}
                        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                          <div className="text-gris-oscuro text-[10px] uppercase tracking-widest">Peñarol vs</div>
                          <div className="text-white font-bebas text-2xl tracking-wide leading-none truncate">
                            {evento.rival}
                          </div>
                        </div>
                      </div>

                      {/* ── Card body ── */}
                      <div className="p-4 flex flex-col flex-1">

                        {/* Date */}
                        <div className="flex items-center gap-1.5 text-gris-medio text-xs mb-3">
                          <Calendar size={11} className="text-amarillo shrink-0" />
                          {formatDateTime(evento.fecha)}
                        </div>

                        {/* Venta badge + price */}
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${venta.cls}`}>
                            {venta.label}
                          </span>
                          {precio > 0 && (
                            <span className="text-gris-oscuro text-xs">
                              desde <strong className="text-amarillo font-bold">${precio.toLocaleString("es-UY")}</strong>
                            </span>
                          )}
                        </div>

                        {/* Disponibles */}
                        <div className="text-gris-oscuro text-[11px] mb-3 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amarillo/50 shrink-0" />
                          {totalDisp.toLocaleString()} disponibles
                        </div>

                        {/* CTA */}
                        <div className="mt-auto pt-2 border-t border-white/5">
                          <span className="flex items-center gap-1 text-amarillo text-xs font-semibold group-hover:gap-2 transition-all">
                            Comprar entradas
                            <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {eventos.length === 0 && (
          <div className="bg-negro-suave border border-white/8 rounded-2xl p-16 text-center animate-rise">
            <Calendar size={48} className="text-gris-oscuro mx-auto mb-4" />
            <p className="text-gris-medio font-medium">No hay eventos en esta categoría</p>
            <Link href="/eventos" className="text-amarillo text-sm mt-2 inline-block hover:underline">
              Ver todos los eventos
            </Link>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

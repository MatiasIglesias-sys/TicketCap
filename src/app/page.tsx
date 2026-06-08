import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatDateTime, torneoLabel } from "@/lib/utils";
import { Calendar, ChevronRight, Trophy, Users, Shield, Zap, Star } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { templateUrl } from "@/lib/banner";
import { KNOWN_LOGOS } from "@/lib/team-logos";
import { computeVentaEstado } from "@/lib/venta-escalonada";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const UY_DATE_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo" });

function uyDateKey(date: Date): string {
  return UY_DATE_FMT.format(date);
}

async function getProximosEventos() {
  const events = await prisma.event.findMany({
    where: {
      estado: { in: ["EN_VENTA", "PROXIMO"] },
    },
    include: { sectores: { select: { disponibles: true, precio: true } } },
    orderBy: { fecha: "asc" },
  });

  const todayUy = uyDateKey(new Date());
  return events
    .filter((e) => uyDateKey(new Date(e.fecha)) > todayUy)
    .slice(0, 4);
}

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
  VENTA_GENERAL:       { label: "Venta General",          cls: "text-alerta-verde border-alerta-verde/40 bg-alerta-verde/10" },
  PREVENTA_SOCIOS:     { label: "Preventa — Solo Socios", cls: "text-amarillo border-amarillo/40 bg-amarillo/10" },
  PREVENTA_ADHERENTES: { label: "Preventa Adherentes",    cls: "text-amarillo border-amarillo/40 bg-amarillo/10" },
  FILA_VIRTUAL:        { label: "Fila Virtual Activa",    cls: "text-orange-400 border-orange-400/40 bg-orange-400/10" },
  AGOTADO:             { label: "Agotado",                cls: "text-alerta-rojo border-alerta-rojo/40 bg-alerta-rojo/10" },
  CERRADO:             { label: "Venta Cerrada",          cls: "text-gris-oscuro border-white/10 bg-white/5" },
};

export default async function HomePage() {
  const [eventos, session] = await Promise.all([
    getProximosEventos(),
    getServerSession(authOptions),
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-negro min-h-[500px] md:min-h-[580px] flex items-center">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/images/match-banner.png"
            alt="Peñarol"
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority
            quality={85}
          />
          {/* Heavy dark gradient so text is readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-negro via-negro/80 to-negro/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-negro via-transparent to-negro/60" />
        </div>

        {/* Yellow accent stripe on left edge */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amarillo" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 w-full">
          <div className="max-w-2xl animate-rise">
            {/* Official logo */}
            <div className="mb-6">
              <Image
                src="/images/penarol-logo.svg"
                alt="Club Atlético Peñarol"
                width={200}
                height={52}
                style={{ width: "auto" }}
                className="h-12 opacity-90"
              />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amarillo/40 bg-negro/50 backdrop-blur-sm text-amarillo text-xs font-semibold mb-5 tracking-wide animate-glow-pulse">
              <Star size={11} fill="currentColor" />
              PLATAFORMA OFICIAL DE ENTRADAS
            </div>

            <h1 className="font-bebas text-6xl md:text-8xl text-white leading-none tracking-wide mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-rise" style={{ animationDelay: "80ms" }}>
              TICKETS
              <span className="text-amarillo">CAP</span>
            </h1>

            <p className="text-gris-medio text-base md:text-lg mb-8 leading-relaxed max-w-lg animate-rise" style={{ animationDelay: "140ms" }}>
              Comprá tus entradas de forma segura, directa y sin intermediarios.
              Socios al día tienen acceso preferencial.
            </p>

            <div className="flex flex-wrap gap-3 animate-rise" style={{ animationDelay: "200ms" }}>
              <Link
                href="/eventos"
                className="btn-primary flex items-center gap-2 text-base shadow-[0_0_20px_rgba(245,197,24,0.3)]"
              >
                Ver próximos eventos
                <ChevronRight size={18} />
              </Link>
              {!session && (
                <Link
                  href="/registro"
                  className="btn-secondary flex items-center gap-2 text-base backdrop-blur-sm"
                >
                  Crear cuenta
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/5 bg-negro-suave">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Trophy, value: "51", label: "Campeonatos Uruguayos" },
              { icon: Star, value: "5", label: "Copas Libertadores" },
              { icon: Users, value: "85.000+", label: "Socios Activos" },
              { icon: Shield, value: "42.700", label: "Cap. Campeón del Siglo" },
            ].map((stat, index) => (
              <div key={stat.label} className="text-center animate-rise" style={{ animationDelay: `${index * 110}ms` }}>
                <stat.icon size={20} className="text-amarillo mx-auto mb-2" />
                <div className="font-bebas text-3xl text-white tracking-wide">
                  {stat.value}
                </div>
                <div className="text-gris-oscuro text-xs mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Próximos eventos */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="section-title">PRÓXIMOS EVENTOS</h2>
            <p className="text-gris-oscuro text-sm mt-1">
              Campeón del Siglo — Ruta 102, Montevideo
            </p>
          </div>
          <Link
            href="/eventos"
            className="hidden sm:flex items-center gap-1.5 text-amarillo text-sm hover:text-amarillo-light transition-colors"
          >
            Ver todos
            <ChevronRight size={16} />
          </Link>
        </div>

        {eventos.length === 0 ? (
          <div className="card-dark p-12 text-center">
            <Calendar size={40} className="text-gris-oscuro mx-auto mb-3" />
            <p className="text-gris-medio">No hay eventos próximos programados</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {eventos.map((evento, index) => {
              const isBasquet    = ["BASQUETBOL", "BASQUETBOL_COPA"].includes(evento.torneo);
              const banner       = isBasquet
                ? "/images/Plantilla basketball peñarol.jpg"
                : (evento.imageUrl || templateUrl(evento.torneo));
              const rivalLogo    = KNOWN_LOGOS[evento.rival] || evento.rivalEscudo || null;
              const torneoC      = TORNEO_BADGE[evento.torneo] ?? "text-gris-medio border-white/10 bg-white/5";
              const ventaEstado  = computeVentaEstado(evento);
              const venta        = VENTA_BADGE[ventaEstado] ?? VENTA_BADGE.CERRADO;
              const precio     = evento.sectores.length ? Math.min(...evento.sectores.map((s) => s.precio)) : 0;
              const totalDisp  = evento.sectores.reduce((a, s) => a + s.disponibles, 0);
              const isFilaVirt = ventaEstado === "FILA_VIRTUAL";

              return (
                <Link key={evento.id} href={`/eventos/${evento.id}`} className="group block animate-rise" style={{ animationDelay: `${index * 90}ms` }}>
                  <article className="overflow-hidden rounded-2xl bg-negro-suave border border-white/8 hover:border-amarillo/35 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-amarillo/8 h-full flex flex-col">

                    {/* ── Banner image ── */}
                    <div className="relative aspect-video overflow-hidden shrink-0">
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
        )}

        <div className="mt-6 text-center sm:hidden">
          <Link
            href="/eventos"
            className="btn-secondary inline-flex items-center gap-2"
          >
            Ver todos los eventos
            <ChevronRight size={16} />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-negro-suave border-t border-white/5 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center mb-12">
            ¿POR QUÉ TICKETSCAP?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: "QR Intransferible",
                desc: "Cada entrada tiene un QR único firmado criptográficamente. Imposible falsificar o revender.",
              },
              {
                icon: Zap,
                title: "Fila Virtual",
                desc: "Para partidos de alta demanda, la fila virtual garantiza orden y equidad para todos.",
              },
              {
                icon: Users,
                title: "Beneficios de Socio",
                desc: "Los socios al día acceden a preventa, descuentos y entradas gratis en el torneo local.",
              },
            ].map((f, index) => (
              <div key={f.title} className="card-dark p-6 animate-rise" style={{ animationDelay: `${index * 90}ms` }}>
                <div className="w-12 h-12 rounded-xl bg-amarillo/10 border border-amarillo/20 flex items-center justify-center mb-4">
                  <f.icon size={22} className="text-amarillo" />
                </div>
                <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                <p className="text-gris-oscuro text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { Calendar, Ticket, Users, TrendingUp, CheckCircle, AlertTriangle, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import AdminEventControls from "@/components/admin/AdminEventControls";

async function getStats() {
  const [
    totalTickets,
    ticketsActivos,
    ticketsUsados,
    totalEventos,
    totalSocios,
    totalOrders,
    recentOrders,
    eventos,
  ] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { estado: "ACTIVO" } }),
    prisma.ticket.count({ where: { estado: "USADO" } }),
    prisma.event.count(),
    prisma.socio.count(),
    prisma.order.count({ where: { estado: "PAGADA" } }),
    prisma.order.aggregate({
      where: { estado: "PAGADA" },
      _sum: { total: true },
    }),
    prisma.event.findMany({
      where: { fecha: { gte: new Date() } },
      include: {
        sectores: { select: { capacidad: true, disponibles: true } },
        _count: { select: { tickets: true } },
      },
      orderBy: { fecha: "asc" },
      take: 6,
    }),
  ]);

  return {
    totalTickets,
    ticketsActivos,
    ticketsUsados,
    totalEventos,
    totalSocios,
    totalOrders,
    totalRevenue: recentOrders._sum.total ?? 0,
    eventos,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  const statCards = [
    {
      label: "Entradas vendidas",
      value: stats.totalTickets.toLocaleString(),
      icon: Ticket,
      sub: `${stats.ticketsActivos} activas · ${stats.ticketsUsados} usadas`,
      color: "text-amarillo",
    },
    {
      label: "Ingresos totales",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      sub: `${stats.totalOrders} órdenes pagadas`,
      color: "text-alerta-verde",
    },
    {
      label: "Eventos activos",
      value: stats.totalEventos.toLocaleString(),
      icon: Calendar,
      sub: "En el sistema",
      color: "text-blue-400",
    },
    {
      label: "Socios registrados",
      value: stats.totalSocios.toLocaleString(),
      icon: Users,
      sub: "En el padrón",
      color: "text-purple-400",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-bebas text-4xl text-white tracking-wide">DASHBOARD</h1>
        <p className="text-gris-oscuro text-sm mt-0.5">
          Panel de control — TicketsCap
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="card-dark p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center`}>
                <card.icon size={18} className={card.color} />
              </div>
              <TrendingUp size={14} className="text-gris-oscuro" />
            </div>
            <div className="text-white font-bold text-2xl mb-0.5">{card.value}</div>
            <div className="text-gris-medio text-xs">{card.label}</div>
            <div className="text-gris-oscuro text-xs mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Events management */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-white font-semibold">Próximos eventos</h2>
        <Link href="/admin/eventos" className="text-amarillo text-sm hover:underline">
          Gestionar todos →
        </Link>
      </div>

      <div className="space-y-3">
        {stats.eventos.map((evento) => {
          const totalCap = evento.sectores.reduce((a, s) => a + s.capacidad, 0);
          const totalDisp = evento.sectores.reduce((a, s) => a + s.disponibles, 0);
          const vendidas = totalCap - totalDisp;
          const pctVendido = totalCap > 0 ? (vendidas / totalCap) * 100 : 0;

          return (
            <div key={evento.id} className="card-dark p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold text-sm truncate">
                      {evento.nombre}
                    </h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0 ${
                        evento.estado === "EN_VENTA"
                          ? "text-alerta-verde border-alerta-verde/30 bg-alerta-verde/10"
                          : "text-gris-oscuro border-white/10 bg-white/5"
                      }`}
                    >
                      {evento.estado}
                    </span>
                  </div>
                  <div className="text-gris-oscuro text-xs">
                    {new Date(evento.fecha).toLocaleDateString("es-UY", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gris-oscuro mb-1">
                      <span>{vendidas.toLocaleString()} vendidas</span>
                      <span>{pctVendido.toFixed(1)}% del aforo</span>
                    </div>
                    <div className="h-1.5 bg-negro-medio rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pctVendido}%`,
                          background:
                            pctVendido > 85
                              ? "#E53935"
                              : pctVendido > 60
                              ? "#f97316"
                              : "#F5C518",
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <div className="text-white font-bold">{evento._count.tickets}</div>
                    <div className="text-gris-oscuro text-xs">tickets</div>
                  </div>
                  <AdminEventControls
                    eventoId={evento.id}
                    currentEstado={evento.estado}
                    currentVentaEstado={evento.ventaEstado}
                    currentNombre={evento.nombre}
                    currentRival={evento.rival}
                    currentRivalEscudo={evento.rivalEscudo ?? ""}
                    currentFecha={evento.fecha.toISOString()}
                    currentTorneo={evento.torneo}
                    currentDescripcion={evento.descripcion ?? ""}
                    currentLimiteXUsuario={evento.limiteXUsuario}
                    currentVentaEscalonadaActiva={evento.ventaEscalonadaActiva}
                    currentDiasAntesRanking={evento.diasAntesRanking}
                    currentDiasAntesSocios={evento.diasAntesSocios}
                    currentDiasAntesGeneral={evento.diasAntesGeneral}
                    currentRankingMinAsistenciaPct={evento.rankingMinAsistenciaPct}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

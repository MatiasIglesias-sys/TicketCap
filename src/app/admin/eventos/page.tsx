import { prisma } from "@/lib/prisma";
import { formatDateTime, torneoLabel } from "@/lib/utils";
import { Calendar, Plus } from "lucide-react";
import Link from "next/link";
import AdminEventControls from "@/components/admin/AdminEventControls";
import dynamic from "next/dynamic";

// CreateEventForm contains a large modal + image handling — load only when needed
const CreateEventForm = dynamic(() => import("@/components/admin/CreateEventForm"), {
  ssr: false,
  loading: () => (
    <button disabled className="btn-primary flex items-center gap-2 text-sm opacity-60">
      <Plus size={16} />
      Nuevo evento
    </button>
  ),
});

async function getEventos() {
  return prisma.event.findMany({
    include: {
      sectores: { select: { id: true, nombre: true, capacidad: true, disponibles: true, precio: true } },
      _count: { select: { tickets: true } },
    },
    orderBy: { fecha: "asc" },
  });
}

export default async function AdminEventosPage() {
  const eventos = await getEventos();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-bebas text-4xl text-white tracking-wide">GESTIÓN DE EVENTOS</h1>
          <p className="text-gris-oscuro text-sm mt-0.5">{eventos.length} eventos en el sistema</p>
        </div>
        <CreateEventForm />
      </div>

      <div className="space-y-3">
        {eventos.map((evento) => {
          const totalCap = evento.sectores.reduce((a, s) => a + s.capacidad, 0);
          const totalDisp = evento.sectores.reduce((a, s) => a + s.disponibles, 0);
          const vendidas = totalCap - totalDisp;
          const pct = totalCap > 0 ? (vendidas / totalCap) * 100 : 0;
          const totalRev = evento.sectores.reduce(
            (a, s) => a + (s.capacidad - s.disponibles) * s.precio,
            0
          );

          return (
            <div key={evento.id} className="card-dark p-5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold">{evento.nombre}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-gris-oscuro">
                      {torneoLabel(evento.torneo)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gris-oscuro text-xs mb-3">
                    <Calendar size={11} />
                    {formatDateTime(evento.fecha)}
                  </div>

                  {/* Sectors summary */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                    {evento.sectores.map((s) => (
                      <div key={s.id} className="text-center bg-negro-medio rounded p-2">
                        <div className="text-white text-xs font-bold">
                          {s.disponibles}
                        </div>
                        <div className="text-gris-oscuro text-[10px] leading-tight truncate">
                          {s.nombre.split("—")[0].trim()}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-xs text-gris-oscuro mb-1">
                      <span>{vendidas.toLocaleString()} vendidas / {totalCap.toLocaleString()} cap.</span>
                      <span>{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-negro-medio rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: pct > 85 ? "#E53935" : pct > 60 ? "#f97316" : "#F5C518",
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center">
                    <div className="text-white font-bold">{evento._count.tickets}</div>
                    <div className="text-gris-oscuro text-xs">tickets</div>
                  </div>
                  <div className="text-center hidden sm:block">
                    <div className="text-alerta-verde font-bold text-sm">
                      ${totalRev.toLocaleString()}
                    </div>
                    <div className="text-gris-oscuro text-xs">ingresos est.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/eventos/${evento.id}`}
                      className="px-3 py-1.5 text-xs border border-white/10 rounded-lg text-gris-medio hover:border-amarillo/40 hover:text-white transition-all"
                    >
                      Ver
                    </Link>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

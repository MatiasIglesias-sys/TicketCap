import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { expireActiveTicketsForUser } from "@/lib/ticket-expiration";
import dynamic from "next/dynamic";
import { Ticket, Calendar, MapPin, CheckCircle, Clock, XCircle } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// QRDisplay depends on the `qrcode` canvas library — load it lazily
const QRDisplay = dynamic(() => import("@/components/tickets/QRDisplay"), {
  ssr: false,
  loading: () => (
    <div className="w-[90px] h-[90px] bg-white/5 rounded animate-pulse shrink-0" />
  ),
});

const UY_DATE_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo" });

function uyDateKey(date: Date): string {
  return UY_DATE_FMT.format(date);
}

async function getUserTickets(userId: string) {
  return prisma.ticket.findMany({
    where: { userId },
    include: {
      event: true,
      sector: true,
      order: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function MisTicketsPage({
  searchParams,
}: {
  searchParams: { nuevo?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  await expireActiveTicketsForUser(session.user.id);

  const tickets = await getUserTickets(session.user.id);
  const todayUy = uyDateKey(new Date());

  // Profile should only show usable tickets: active and before kickoff.
  const visibles = tickets.filter(
    (t) => t.estado === "ACTIVO" && uyDateKey(new Date(t.event.fecha)) > todayUy
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="bg-negro-suave border-b border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-bebas text-5xl text-white tracking-wide">
            MIS TICKETS
          </h1>
          <p className="text-gris-oscuro text-sm mt-1">
            {visibles.length} entrada{visibles.length !== 1 ? "s" : ""} activa{visibles.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Success banner */}
        {searchParams.nuevo === "1" && (
          <div className="flex items-center gap-3 bg-alerta-verde/10 border border-alerta-verde/30 rounded-xl p-4 mb-6 animate-fade-in">
            <CheckCircle size={20} className="text-alerta-verde shrink-0" />
            <div>
              <p className="text-alerta-verde font-semibold text-sm">
                ¡Compra confirmada!
              </p>
              <p className="text-gris-medio text-xs mt-0.5">
                Tus entradas están disponibles a continuación. Guardá los QR.
              </p>
            </div>
          </div>
        )}

        {visibles.length === 0 ? (
          <div className="card-dark p-16 text-center">
            <Ticket size={48} className="text-gris-oscuro mx-auto mb-4" />
            <p className="text-gris-medio font-medium mb-2">No tenés entradas activas</p>
            <p className="text-gris-oscuro text-sm mb-6">
              Comprá tus entradas para los próximos partidos de Peñarol
            </p>
            <a href="/eventos" className="btn-primary inline-flex items-center gap-2">
              <Calendar size={16} />
              Ver partidos
            </a>
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <CheckCircle size={16} className="text-alerta-verde" />
                Entradas activas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibles.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function TicketCard({ ticket }: { ticket: Awaited<ReturnType<typeof getUserTickets>>[0] }) {
  const precioLabel = ticket.order.total === 0 ? "Gratis" : formatCurrency(ticket.order.total);
  const qrDisponible = new Date(ticket.event.fecha) > new Date();

  return (
    <div className="ticket-container rounded-2xl overflow-hidden">
      {/* Top section */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-gris-oscuro text-xs mb-0.5">Club Atlético Peñarol</div>
            <h3 className="text-white font-bold text-base leading-tight">
              {ticket.event.nombre}
            </h3>
          </div>
          <span className="badge-available text-[10px]">ACTIVO</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gris-medio">
            <Calendar size={11} className="text-amarillo" />
            {formatDateTime(ticket.event.fecha)}
          </div>
          <div className="flex items-center gap-2 text-xs text-gris-medio">
            <MapPin size={11} className="text-amarillo" />
            {ticket.sector.nombre}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="relative flex items-center px-4">
        <div className="flex-1 border-t border-dashed border-white/10" />
        <div className="w-4 h-4 rounded-full bg-negro mx-2 shrink-0" />
        <div className="flex-1 border-t border-dashed border-white/10" />
      </div>

      {/* QR section */}
      {qrDisponible ? (
        <div className="p-5 flex items-center gap-4">
          <QRDisplay value={ticket.qrCode} size={90} />
          <div className="flex-1 min-w-0">
            <div className="text-gris-oscuro text-xs mb-1">ID de entrada</div>
            <div className="text-white font-mono text-xs break-all">{ticket.id}</div>
            <div className="text-gris-oscuro text-xs mt-2">Precio pagado</div>
            <div className="text-amarillo font-semibold text-sm">{precioLabel}</div>
          </div>
        </div>
      ) : (
        <div className="p-5">
          <div className="text-gris-oscuro text-xs mb-1">ID de entrada</div>
          <div className="text-white font-mono text-xs break-all">{ticket.id}</div>
          <div className="text-gris-oscuro text-xs mt-2">Precio pagado</div>
          <div className="text-amarillo font-semibold text-sm">{precioLabel}</div>
          <p className="text-alerta-rojo text-xs mt-3">
            El horario del evento ya pasó. El QR ya no está disponible.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="bg-amarillo/5 px-5 py-2.5 flex items-center justify-between">
        <span className="text-gris-oscuro text-xs">
          {qrDisponible ? "Presentá este QR en las puertas del estadio" : "Entrada fuera de horario"}
        </span>
        <span className="text-amarillo text-xs font-semibold">CAP ×</span>
      </div>
    </div>
  );
}

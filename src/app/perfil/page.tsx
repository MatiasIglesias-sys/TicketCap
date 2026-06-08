import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDate, categoriaLabel } from "@/lib/utils";
import { formatMatriculaForDisplay } from "@/lib/matricula";
import { expireActiveTicketsForUser } from "@/lib/ticket-expiration";
import { User, Shield, Ticket, Calendar, CheckCircle, AlertTriangle } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

async function getProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      socio: true,
      tickets: {
        include: { event: true, sector: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
}

export default async function PerfilPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  await expireActiveTicketsForUser(session.user.id);

  const profile = await getProfile(session.user.id);
  if (!profile) redirect("/login");

  const totalTickets = await prisma.ticket.count({ where: { userId: session.user.id } });
  const ticketsUsados = await prisma.ticket.count({
    where: { userId: session.user.id, estado: "USADO" },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="bg-negro-suave border-b border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-bebas text-5xl text-white tracking-wide">MI PERFIL</h1>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: User info */}
          <div className="space-y-4 animate-rise">
            {/* Avatar + name */}
            <div className="card-dark p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-amarillo/10 border-2 border-amarillo/30 flex items-center justify-center mx-auto mb-4">
                <User size={32} className="text-amarillo" />
              </div>
              <h2 className="text-white font-bold text-xl">{profile.name}</h2>
              <p className="text-gris-oscuro text-sm mt-0.5">{profile.email}</p>
              {profile.phone && (
                <p className="text-gris-oscuro text-xs mt-0.5">{profile.phone}</p>
              )}
              <div className="mt-3">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    session.user.role === "ADMIN"
                      ? "bg-amarillo text-negro"
                      : "bg-white/5 text-gris-medio"
                  }`}
                >
                  {session.user.role}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="card-dark p-5">
              <h3 className="text-gris-medio text-xs font-semibold uppercase tracking-wider mb-4">
                Estadísticas
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-gris-medio">
                    <Ticket size={14} className="text-amarillo" />
                    Total entradas
                  </div>
                  <span className="text-white font-bold">{totalTickets}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-gris-medio">
                    <CheckCircle size={14} className="text-alerta-verde" />
                    Partidos asistidos
                  </div>
                  <span className="text-white font-bold">{ticketsUsados}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-gris-medio">
                    <Calendar size={14} className="text-amarillo" />
                    Cuenta desde
                  </div>
                  <span className="text-white text-sm">{formatDate(profile.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Socio + tickets */}
          <div className="lg:col-span-2 space-y-4 animate-rise" style={{ animationDelay: "80ms" }}>
            {/* Socio card */}
            {profile.socio ? (
              <div
                className={`card-dark p-6 border-l-2 ${
                  profile.socio.cuotaAlDia
                    ? "border-l-amarillo"
                    : "border-l-alerta-rojo"
                } animate-rise`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-gris-oscuro text-xs mb-1">
                      Tarjeta CAP — Matrícula
                    </div>
                    <div className="font-mono text-amarillo font-bold text-lg">
                      {formatMatriculaForDisplay(profile.socio.matricula)}
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
                      profile.socio.cuotaAlDia
                        ? "bg-alerta-verde/15 text-alerta-verde"
                        : "bg-alerta-rojo/15 text-alerta-rojo"
                    }`}
                  >
                    {profile.socio.cuotaAlDia ? (
                      <><CheckCircle size={12} /> Al día</>
                    ) : (
                      <><AlertTriangle size={12} /> En mora</>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="text-gris-oscuro text-xs">Categoría</div>
                    <div className="text-white font-medium text-sm mt-0.5">
                      {categoriaLabel(profile.socio.categoria)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gris-oscuro text-xs">Estado</div>
                    <div className="text-white font-medium text-sm mt-0.5">
                      {profile.socio.estado.replace("_", " ")}
                    </div>
                  </div>
                  <div>
                    <div className="text-gris-oscuro text-xs">Antigüedad</div>
                    <div className="text-white font-medium text-sm mt-0.5">
                      {profile.socio.antiguedad} años
                    </div>
                  </div>
                </div>

                {!profile.socio.cuotaAlDia && (
                  <div className="mt-4 bg-alerta-rojo/10 border border-alerta-rojo/20 rounded-lg p-3 text-sm text-alerta-rojo flex items-center gap-2">
                    <AlertTriangle size={14} />
                    Regularizá tu cuota para acceder a los beneficios de socio
                  </div>
                )}
              </div>
            ) : (
              <div className="card-dark p-6 border border-dashed border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <Shield size={20} className="text-gris-oscuro" />
                  <h3 className="text-gris-medio font-semibold">Sin socio vinculado</h3>
                </div>
                <p className="text-gris-oscuro text-sm mb-4">
                  Vinculá tu número de matrícula CAP para acceder a entradas gratuitas, preventa y descuentos exclusivos.
                </p>
                <a
                  href="/perfil/vincular-socio"
                  className="btn-secondary inline-flex items-center gap-2 text-sm"
                >
                  Vincular matrícula CAP
                </a>
              </div>
            )}

            {/* Recent tickets */}
            {profile.tickets.length > 0 && (
              <div className="card-dark p-5 animate-rise">
                <h3 className="text-white font-semibold mb-4 text-sm flex items-center gap-2">
                  <Ticket size={14} className="text-amarillo" />
                  Últimas entradas
                </h3>
                <div className="space-y-3">
                  {profile.tickets.map((ticket, index) => (
                    <div key={ticket.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0 animate-soft-in" style={{ animationDelay: `${index * 60}ms` }}>
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          ticket.estado === "ACTIVO"
                            ? "bg-alerta-verde"
                            : ticket.estado === "USADO"
                            ? "bg-gris-oscuro"
                            : "bg-alerta-rojo"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm truncate">{ticket.event.nombre}</div>
                        <div className="text-gris-oscuro text-xs">{ticket.sector.nombre}</div>
                      </div>
                      <span className="text-gris-oscuro text-xs shrink-0">
                        {ticket.estado}
                      </span>
                    </div>
                  ))}
                </div>
                <a
                  href="/mis-tickets"
                  className="text-amarillo text-xs hover:underline mt-3 inline-block"
                >
                  Ver todas mis entradas →
                </a>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

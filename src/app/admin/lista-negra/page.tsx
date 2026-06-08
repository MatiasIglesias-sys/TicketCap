import { prisma } from "@/lib/prisma";
import { Ban, Clock, ShieldOff } from "lucide-react";
import LevantarSuspensionBtn from "@/components/admin/LevantarSuspensionBtn";

function tiempoRestante(hasta: Date): string {
  const diff = hasta.getTime() - Date.now();
  if (diff <= 0) return "Expirado";

  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (dias > 0) return `${dias}d ${horas}h ${minutos}m`;
  if (horas > 0) return `${horas}h ${minutos}m`;
  return `${minutos}m`;
}

export const dynamic = "force-dynamic";

export default async function ListaNegraPage() {
  const now = new Date();

  const suspendidos = await prisma.user.findMany({
    where: { suspendidoHasta: { gt: now } },
    include: {
      socio: { select: { matricula: true, nombre: true, categoria: true } },
    },
    orderBy: { suspendidoHasta: "asc" },
  });

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Ban size={28} className="text-alerta-rojo" />
          <div>
            <h1 className="font-bebas text-4xl text-white tracking-wide">LISTA NEGRA</h1>
            <p className="text-gris-oscuro text-sm mt-0.5">
              Usuarios con acceso a compra de entradas suspendido temporalmente
            </p>
          </div>
        </div>
      </div>

      {/* Stat */}
      <div className="flex justify-center mb-6">
        <div className="card-dark p-6 text-center w-48">
          <div className="font-bold text-3xl text-alerta-rojo">{suspendidos.length}</div>
          <div className="text-gris-oscuro text-xs mt-0.5">Usuarios suspendidos actualmente</div>
        </div>
      </div>

      {suspendidos.length === 0 ? (
        <div className="card-dark p-12 text-center">
          <ShieldOff size={40} className="text-gris-oscuro mx-auto mb-3" />
          <p className="text-white font-medium mb-1">Sin suspensiones activas</p>
          <p className="text-gris-oscuro text-sm">Todos los usuarios pueden comprar entradas</p>
        </div>
      ) : (
        <div className="card-dark overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-gris-oscuro text-xs">
                  <th className="text-left px-4 py-3 font-medium">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">CI</th>
                  <th className="text-left px-4 py-3 font-medium">Razón</th>
                  <th className="text-left px-4 py-3 font-medium">Suspendido hasta</th>
                  <th className="text-left px-4 py-3 font-medium">Tiempo restante</th>
                  <th className="text-right px-4 py-3 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {suspendidos.map((u) => {
                  const restante = tiempoRestante(u.suspendidoHasta!);
                  return (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">
                        {u.name ?? u.socio?.nombre ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gris-oscuro text-xs hidden sm:table-cell truncate max-w-[160px]">
                        {u.email}
                      </td>
                      <td className="px-4 py-3 text-gris-oscuro text-xs hidden md:table-cell font-mono">
                        {u.ci ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gris-medio text-xs max-w-[200px]">
                        {u.razonSuspension ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gris-medio text-xs font-mono">
                        {u.suspendidoHasta!.toLocaleString("es-UY")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-orange-400 text-xs font-medium">
                          <Clock size={11} />
                          {restante}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <LevantarSuspensionBtn userId={u.id} nombre={u.name ?? u.email} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-white/5 text-xs text-gris-oscuro">
            Las suspensiones se levantan automáticamente al vencer el plazo. Esta página se actualiza al recargar.
          </div>
        </div>
      )}
    </div>
  );
}

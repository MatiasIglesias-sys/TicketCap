import { prisma } from "@/lib/prisma";
import { Search, UserCircle2 } from "lucide-react";
import UsuariosTable from "@/components/admin/UsuariosTable";

async function getUsuarios(q?: string) {
  return prisma.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { ci: { contains: q } },
            { socio: { matricula: { contains: q } } },
          ],
        }
      : undefined,
    include: {
      socio: {
        select: {
          id: true,
          matricula: true,
          nombre: true,
          categoria: true,
          estado: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const usuarios = await getUsuarios(searchParams.q);

  const now = new Date();

  const stats = {
    total: await prisma.user.count(),
    conSocio: await prisma.user.count({ where: { socio: { isNot: null } } }),
    suspendidos: await prisma.user.count({ where: { suspendidoHasta: { gt: now } } }),
  };

  const usuariosData = usuarios.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    suspendidoHasta: u.suspendidoHasta ? u.suspendidoHasta.toISOString() : null,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-bebas text-4xl text-white tracking-wide">GESTIÓN DE USUARIOS</h1>
        <p className="text-gris-oscuro text-sm mt-0.5">
          Todas las cuentas registradas en TicketsCap
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total usuarios", value: stats.total, cls: "text-white" },
          { label: "Con socio vinculado", value: stats.conSocio, cls: "text-alerta-verde" },
          { label: "Suspendidos activos", value: stats.suspendidos, cls: "text-alerta-rojo" },
        ].map((s) => (
          <div key={s.label} className="card-dark p-4 text-center">
            <div className={`font-bold text-2xl ${s.cls}`}>{s.value}</div>
            <div className="text-gris-oscuro text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <form className="mb-5">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gris-oscuro" />
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q}
            placeholder="Buscar por nombre, email, CI o matrícula..."
            className="input-dark pl-9 text-sm"
          />
        </div>
      </form>

      <UsuariosTable usuarios={usuariosData as any} />
    </div>
  );
}

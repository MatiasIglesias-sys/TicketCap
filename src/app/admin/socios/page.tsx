import { prisma } from "@/lib/prisma";
import { Search, Users, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import SociosTable from "@/components/admin/SociosTable";

async function getSocios(q?: string) {
  return prisma.socio.findMany({
    where: q
      ? {
          OR: [
            { matricula: { contains: q } },
            { nombre: { contains: q } },
            { ci: { contains: q } },
          ],
        }
      : undefined,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          suspendidoHasta: true,
          razonSuspension: true,
        },
      },
    },
    orderBy: { matricula: "asc" },
    take: 50,
  });
}

export default async function SociosPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const socios = await getSocios(searchParams.q);

  const now = new Date();
  const stats = {
    total: await prisma.socio.count(),
    alDia: await prisma.socio.count({ where: { cuotaAlDia: true } }),
    morosos: await prisma.socio.count({ where: { cuotaAlDia: false } }),
    bloqueados: await prisma.socio.count({ where: { bloqueado: true } }),
    // La suspensión vive en User, no en Socio
    suspendidos: await prisma.user.count({
      where: { suspendidoHasta: { gt: now }, socioId: { not: null } },
    }),
  };

  // Serialize dates for client component
  const sociosData = socios.map((s) => ({
    ...s,
    suspendidoHasta: s.user?.suspendidoHasta ? s.user.suspendidoHasta.toISOString() : null,
    razonSuspension: s.user?.razonSuspension ?? null,
    user: s.user ? { id: s.user.id, email: s.user.email } : null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-bebas text-4xl text-white tracking-wide">GESTIÓN DE SOCIOS</h1>
        <p className="text-gris-oscuro text-sm mt-0.5">Padrón CAP — {stats.total.toLocaleString()} socios registrados</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total socios", value: stats.total, cls: "text-white" },
          { label: "Al día", value: stats.alDia, cls: "text-alerta-verde" },
          { label: "En mora", value: stats.morosos, cls: "text-amarillo" },
          { label: "Bloqueados", value: stats.bloqueados, cls: "text-alerta-rojo" },
          { label: "Suspendidos", value: stats.suspendidos, cls: "text-orange-400" },
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
            placeholder="Buscar por matrícula, nombre o CI..."
            className="input-dark pl-9 text-sm"
          />
        </div>
      </form>

      <SociosTable socios={sociosData as any} />
    </div>
  );
}

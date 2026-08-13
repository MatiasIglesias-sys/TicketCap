"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertTriangle, XCircle, Ban, ShieldOff } from "lucide-react";
import SuspenderModal from "./SuspenderModal";
import { categoriaLabel, formatDate } from "@/lib/utils";
import { formatMatriculaForDisplay } from "@/lib/matricula";

interface Socio {
  id: string;
  matricula: string;
  nombre: string;
  ci: string;
  categoria: string;
  estado: string;
  antiguedad: number;
  suspendidoHasta: string | null;
  razonSuspension: string | null;
  user: { email: string; id: string } | null;
}

const ESTADO_CONFIG = {
  AL_DIA: { label: "Al día", icon: CheckCircle, cls: "text-alerta-verde" },
  MOROSO: { label: "En mora", icon: AlertTriangle, cls: "text-amarillo" },
  BLOQUEADO: { label: "Bloqueado", icon: XCircle, cls: "text-alerta-rojo" },
  INACTIVO: { label: "Inactivo", icon: XCircle, cls: "text-gris-oscuro" },
};

export default function SociosTable({ socios }: { socios: Socio[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<{ userId: string; nombre: string; suspendidoHasta: string | null } | null>(null);

  const now = new Date();

  function isSuspendido(s: Socio) {
    return s.suspendidoHasta && new Date(s.suspendidoHasta) > now;
  }

  function handleDone() {
    setModal(null);
    router.refresh();
  }

  return (
    <>
      {modal && (
        <SuspenderModal
          userId={modal.userId}
          nombre={modal.nombre}
          suspendidoHasta={modal.suspendidoHasta}
          onClose={() => setModal(null)}
          onDone={handleDone}
        />
      )}

      <div className="card-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-gris-oscuro text-xs">
                <th className="text-left px-4 py-3 font-medium">Matrícula</th>
                <th className="text-left px-4 py-3 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">CI</th>
                <th className="text-left px-4 py-3 font-medium">Categoría</th>
                <th className="text-left px-4 py-3 font-medium">Estado</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Antigüedad</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Email</th>
                <th className="text-right px-4 py-3 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {socios.map((socio) => {
                const cfg = ESTADO_CONFIG[socio.estado as keyof typeof ESTADO_CONFIG];
                const Icon = cfg?.icon ?? CheckCircle;
                const suspendido = isSuspendido(socio);

                return (
                  <tr key={socio.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 font-mono text-amarillo text-xs">{formatMatriculaForDisplay(socio.matricula)}</td>
                    <td className="px-4 py-3 text-white font-medium">
                      <div>{socio.nombre}</div>
                      {suspendido && (
                        <div className="text-xs text-alerta-rojo flex items-center gap-1 mt-0.5">
                          <Ban size={10} />
                          Suspendido hasta {new Date(socio.suspendidoHasta!).toLocaleDateString("es-UY")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gris-medio hidden sm:table-cell font-mono text-xs">{socio.ci}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-white/5 text-gris-medio px-2 py-0.5 rounded">
                        {categoriaLabel(socio.categoria)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`flex items-center gap-1 text-xs ${cfg?.cls}`}>
                        <Icon size={11} />
                        {cfg?.label}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gris-oscuro text-xs hidden md:table-cell">
                      {socio.antiguedad} años
                    </td>
                    <td className="px-4 py-3 text-gris-oscuro text-xs hidden lg:table-cell truncate max-w-[160px]">
                      {socio.user?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() =>
                          socio.user &&
                          setModal({ userId: socio.user.id, nombre: socio.nombre, suspendidoHasta: socio.suspendidoHasta })
                        }
                        disabled={!socio.user}
                        title={socio.user ? undefined : "El socio no tiene cuenta vinculada"}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          suspendido
                            ? "bg-alerta-rojo/10 hover:bg-alerta-rojo/20 text-alerta-rojo border border-alerta-rojo/30"
                            : "bg-white/5 hover:bg-white/10 text-gris-medio border border-white/10"
                        }`}
                      >
                        {suspendido ? <ShieldOff size={11} /> : <Ban size={11} />}
                        {suspendido ? "Suspendido" : "Suspender"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {socios.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gris-medio text-sm">No se encontraron socios</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

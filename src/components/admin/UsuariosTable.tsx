"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, ShieldOff, UserCircle2, Link2, Link2Off } from "lucide-react";
import SuspenderModal from "./SuspenderModal";
import { categoriaLabel } from "@/lib/utils";
import { formatMatriculaForDisplay } from "@/lib/matricula";

interface SocioInfo {
  id: string;
  matricula: string;
  nombre: string;
  categoria: string;
  estado: string;
}

interface Usuario {
  id: string;
  name: string | null;
  email: string;
  ci: string | null;
  role: string;
  suspendidoHasta: string | null;
  razonSuspension: string | null;
  createdAt: string;
  socio: SocioInfo | null;
}

export default function UsuariosTable({ usuarios }: { usuarios: Usuario[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<{
    userId: string;
    nombre: string;
    suspendidoHasta: string | null;
  } | null>(null);

  const now = new Date();

  function isSuspendido(u: Usuario) {
    return u.suspendidoHasta && new Date(u.suspendidoHasta) > now;
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
                <th className="text-left px-4 py-3 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">CI</th>
                <th className="text-left px-4 py-3 font-medium">Socio vinculado</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Rol</th>
                <th className="text-right px-4 py-3 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const suspendido = isSuspendido(u);

                return (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">
                      <div className="flex items-center gap-2">
                        <UserCircle2 size={14} className="text-gris-oscuro shrink-0" />
                        <div>
                          <div>{u.name ?? "—"}</div>
                          {suspendido && (
                            <div className="text-xs text-alerta-rojo flex items-center gap-1 mt-0.5">
                              <Ban size={10} />
                              Suspendido hasta{" "}
                              {new Date(u.suspendidoHasta!).toLocaleDateString("es-UY")}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gris-medio text-xs hidden sm:table-cell truncate max-w-[180px]">
                      {u.email}
                    </td>
                    <td className="px-4 py-3 text-gris-oscuro text-xs hidden md:table-cell font-mono">
                      {u.ci ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {u.socio ? (
                        <div className="flex items-center gap-1.5">
                          <Link2 size={11} className="text-amarillo shrink-0" />
                          <div>
                            <span className="font-mono text-xs text-amarillo">
                              {formatMatriculaForDisplay(u.socio.matricula)}
                            </span>
                            <span className="text-xs text-gris-medio ml-1.5">
                              {categoriaLabel(u.socio.categoria)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gris-oscuro text-xs">
                          <Link2Off size={11} />
                          Sin socio
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          u.role === "ADMIN"
                            ? "bg-amarillo/10 text-amarillo"
                            : u.role === "OPERADOR"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-white/5 text-gris-medio"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() =>
                          setModal({
                            userId: u.id,
                            nombre: u.name ?? u.email,
                            suspendidoHasta: u.suspendidoHasta,
                          })
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
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

          {usuarios.length === 0 && (
            <div className="text-center py-12">
              <UserCircle2 size={32} className="text-gris-oscuro mx-auto mb-3" />
              <p className="text-gris-medio text-sm">No se encontraron usuarios</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import { Ban, X, ShieldOff } from "lucide-react";

interface Props {
  userId: string;
  nombre: string;
  suspendidoHasta: string | null; // ISO string or null
  onClose: () => void;
  onDone: () => void;
}

export default function SuspenderModal({ userId, nombre, suspendidoHasta, onClose, onDone }: Props) {
  const [dias, setDias] = useState("1");
  const [razon, setRazon] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isSuspendido = suspendidoHasta && new Date(suspendidoHasta) > new Date();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/socios/suspender", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, dias: Number(dias), horas: 0, razon }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Error al suspender");
      return;
    }
    onDone();
  }

  async function handleLevantar() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/socios/suspender", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, dias: 0 }),
    });

    setLoading(false);
    if (!res.ok) {
      setError("Error al levantar la suspensión");
      return;
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="bg-negro-suave border border-white/10 rounded-xl w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Ban size={18} className="text-alerta-rojo" />
            <span className="font-semibold text-white">
              {isSuspendido ? "Gestionar suspensión" : "Suspender usuario"}
            </span>
          </div>
          <button onClick={onClose} className="text-gris-oscuro hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-gris-medio text-sm mb-4">
            Usuario: <span className="text-white font-medium">{nombre}</span>
          </p>

          {isSuspendido && (
            <div className="mb-4 p-3 bg-alerta-rojo/10 border border-alerta-rojo/30 rounded-lg">
              <p className="text-alerta-rojo text-xs font-medium mb-1">Actualmente suspendido hasta:</p>
              <p className="text-white text-sm font-mono">
                {new Date(suspendidoHasta!).toLocaleString("es-UY")}
              </p>
              <button
                onClick={handleLevantar}
                disabled={loading}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-alerta-verde/10 hover:bg-alerta-verde/20 border border-alerta-verde/30 text-alerta-verde rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <ShieldOff size={14} />
                Levantar suspensión ahora
              </button>
            </div>
          )}

          {/* Form para nueva suspensión */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-gris-oscuro text-xs uppercase tracking-wider">
              {isSuspendido ? "Aplicar nueva suspensión" : "Duración de la suspensión"}
            </p>

            <div>
              <label className="block text-xs text-gris-oscuro mb-1">Días</label>
              <input
                type="number"
                min="1"
                max="365"
                value={dias}
                onChange={(e) => setDias(e.target.value)}
                className="input-dark w-full text-center"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gris-oscuro mb-1">Razón (opcional)</label>
              <input
                type="text"
                value={razon}
                onChange={(e) => setRazon(e.target.value)}
                placeholder="Ej: Reventa de entradas"
                className="input-dark w-full"
              />
            </div>

            {error && <p className="text-alerta-rojo text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-alerta-rojo hover:bg-alerta-rojo/90 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <Ban size={14} />
              {loading ? "Aplicando..." : isSuspendido ? "Aplicar nueva suspensión" : "Suspender usuario"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

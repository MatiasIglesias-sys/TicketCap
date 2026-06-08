"use client";

import { AlertTriangle, X } from "lucide-react";

interface Props {
  titulo: string;
  mensaje: string;
  labelConfirmar?: string;
  labelCancelar?: string;
  variante?: "danger" | "warning";
  loading?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export default function ConfirmModal({
  titulo,
  mensaje,
  labelConfirmar = "Confirmar",
  labelCancelar = "Cancelar",
  variante = "danger",
  loading = false,
  onConfirmar,
  onCancelar,
}: Props) {
  const colorBtn =
    variante === "danger"
      ? "bg-alerta-rojo hover:bg-alerta-rojo/90 text-white"
      : "bg-amarillo hover:bg-amarillo/90 text-negro";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onCancelar}
    >
      <div
        className="bg-negro-suave border border-white/10 rounded-xl w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <AlertTriangle
              size={18}
              className={variante === "danger" ? "text-alerta-rojo" : "text-amarillo"}
            />
            <span className="font-semibold text-white">{titulo}</span>
          </div>
          <button
            onClick={onCancelar}
            className="text-gris-oscuro hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="text-gris-medio text-sm leading-relaxed">{mensaje}</p>

          <div className="flex gap-3 mt-5">
            <button
              onClick={onCancelar}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-gris-medio text-sm font-medium hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              {labelCancelar}
            </button>
            <button
              onClick={onConfirmar}
              disabled={loading}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${colorBtn}`}
            >
              {loading ? "Procesando..." : labelConfirmar}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

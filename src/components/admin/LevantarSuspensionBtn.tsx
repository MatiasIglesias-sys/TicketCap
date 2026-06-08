"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldOff } from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface Props {
  userId: string;
  nombre: string;
}

export default function LevantarSuspensionBtn({ userId, nombre }: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLevantar() {
    setLoading(true);

    await fetch("/api/admin/socios/suspender", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, dias: 0 }),
    });

    setLoading(false);
    setConfirm(false);
    router.refresh();
  }

  return (
    <>
      {confirm && (
        <ConfirmModal
          titulo="Levantar suspensión"
          mensaje={`¿Estás seguro de que querés levantar la suspensión de ${nombre}? El usuario podrá volver a comprar entradas de inmediato.`}
          labelConfirmar="Sí, levantar"
          labelCancelar="No, cancelar"
          variante="warning"
          loading={loading}
          onConfirmar={handleLevantar}
          onCancelar={() => setConfirm(false)}
        />
      )}

      <button
        onClick={() => setConfirm(true)}
        disabled={loading}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-alerta-verde/10 hover:bg-alerta-verde/20 text-alerta-verde border border-alerta-verde/30 transition-colors disabled:opacity-50"
      >
        <ShieldOff size={11} />
        {loading ? "..." : "Levantar"}
      </button>
    </>
  );
}

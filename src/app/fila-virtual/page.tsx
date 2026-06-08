"use client";

import { useEffect, useState } from "react";
import { Users, Zap, Clock, CheckCircle } from "lucide-react";
import Navbar from "@/components/layout/Navbar";

export default function FilaVirtualPage() {
  const [posicion, setPosicion] = useState(4328);
  const [total, setTotal] = useState(18750);
  const [tiempoEst, setTiempoEst] = useState(12);
  const [listo, setListo] = useState(false);

  // Simulate queue progression
  useEffect(() => {
    if (listo) return;
    const interval = setInterval(() => {
      setPosicion((p) => {
        const nuevo = Math.max(0, p - Math.floor(Math.random() * 80 + 100));
        if (nuevo <= 0) {
          setListo(true);
          clearInterval(interval);
          return 0;
        }
        setTiempoEst(Math.ceil(nuevo / 350));
        return nuevo;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [listo]);

  const pct = Math.max(0, Math.min(100, ((total - posicion) / total) * 100));

  return (
    <div className="min-h-screen bg-negro flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        {!listo ? (
          <div className="text-center max-w-md w-full">
            {/* Icon */}
            <div className="w-20 h-20 rounded-full bg-amarillo/10 border-2 border-amarillo/30 flex items-center justify-center mx-auto mb-8 animate-pulse-yellow">
              <Users size={36} className="text-amarillo" />
            </div>

            <div className="mb-2 text-gris-oscuro text-sm font-medium uppercase tracking-widest">
              Fila virtual activa
            </div>
            <h1 className="font-bebas text-7xl md:text-9xl text-white mb-2">
              #{posicion.toLocaleString()}
            </h1>
            <p className="text-gris-medio text-lg mb-8">
              Tu posición en la fila
            </p>

            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex justify-between text-xs text-gris-oscuro mb-2">
                <span>Progreso</span>
                <span>{pct.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-negro-medio rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${pct}%`,
                    background: "linear-gradient(90deg, #F5C518, #FAD02C)",
                  }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="card-dark p-4 text-center">
                <Clock size={18} className="text-amarillo mx-auto mb-1.5" />
                <div className="text-white font-bold text-2xl font-mono">{tiempoEst}</div>
                <div className="text-gris-oscuro text-xs">min. estimados</div>
              </div>
              <div className="card-dark p-4 text-center">
                <Zap size={18} className="text-amarillo mx-auto mb-1.5" />
                <div className="text-white font-bold text-2xl font-mono">~350</div>
                <div className="text-gris-oscuro text-xs">usuarios / 30s</div>
              </div>
            </div>

            <div className="card-dark p-4 text-xs text-gris-oscuro text-left space-y-1.5">
              <p className="text-gris-medio font-semibold mb-2 flex items-center gap-1.5">
                <Zap size={12} className="text-amarillo" />
                ¿Cómo funciona la fila virtual?
              </p>
              <p>• Tu posición está reservada. No cierres esta ventana.</p>
              <p>• Si se corta la conexión, tu lugar se conserva por 5 minutos.</p>
              <p>• Serás notificado cuando sea tu turno.</p>
              <p>• Se liberan ~350 usuarios cada 30 segundos al checkout.</p>
            </div>
          </div>
        ) : (
          <div className="text-center max-w-md w-full animate-fade-in">
            <div className="w-24 h-24 rounded-full bg-alerta-verde/10 border-2 border-alerta-verde/40 flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={44} className="text-alerta-verde" />
            </div>
            <h1 className="font-bebas text-5xl text-white mb-2">¡ES TU TURNO!</h1>
            <p className="text-gris-medio mb-8">
              Ya podés comprar tus entradas. Tenés 10 minutos para completar la compra.
            </p>
            <a href="/eventos" className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4">
              <Zap size={20} />
              Ir al checkout
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { QrCode, CheckCircle, XCircle, AlertTriangle, Search } from "lucide-react";

type ScanResult = {
  valid: boolean;
  error?: string;
  ticket?: {
    id: string;
    evento: string;
    sector: string;
    titular: string;
    usadoAt?: string;
  };
};

export default function ScannerPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function scan() {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode: input.trim() }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ valid: false, error: "Error de conexión" });
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setInput("");
    setResult(null);
  }

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="mb-8 text-center">
        <h1 className="font-bebas text-4xl md:text-5xl text-white tracking-wide">SCANNER QR</h1>
        <p className="text-gris-oscuro text-sm mt-1">
          Validación de entradas — Puertas del Campeón del Siglo
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-6 items-start">
        <div className="space-y-4">
          <div className="card-dark p-6 md:p-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amarillo/10 border border-amarillo/20 flex items-center justify-center">
                <QrCode size={22} className="text-amarillo" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-lg">Escanear entrada</h2>
                <p className="text-gris-oscuro text-xs">
                  Ingresá o escaneá el código QR de la entrada
                </p>
              </div>
            </div>

            <div className="relative mb-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && scan()}
                placeholder="TCAP:TKT-XXXXXX:xxxxxxxxxxxxxxxx"
                className="input-dark font-mono text-sm pr-12"
                autoFocus
              />
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gris-oscuro" />
            </div>

            <div className="flex gap-2">
              <button
                onClick={scan}
                disabled={loading || !input.trim()}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><div className="spinner w-4 h-4" />Validando...</>
                ) : (
                  <><QrCode size={16} />Validar QR</>
                )}
              </button>
              <button onClick={reset} className="btn-ghost px-4">
                Limpiar
              </button>
            </div>
          </div>

          {result && (
            <div
              className={`rounded-xl border p-5 md:p-6 animate-fade-in ${
                result.valid
                  ? "bg-alerta-verde/10 border-alerta-verde/30"
                  : "bg-alerta-rojo/10 border-alerta-rojo/30"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                {result.valid ? (
                  <CheckCircle size={28} className="text-alerta-verde" />
                ) : result.error?.includes("DUPLICADA") ? (
                  <AlertTriangle size={28} className="text-amarillo" />
                ) : (
                  <XCircle size={28} className="text-alerta-rojo" />
                )}
                <div>
                  <p
                    className={`font-bold text-lg ${
                      result.valid ? "text-alerta-verde" : "text-alerta-rojo"
                    }`}
                  >
                    {result.valid ? "ACCESO VÁLIDO" : "ACCESO DENEGADO"}
                  </p>
                  {result.error && (
                    <p className="text-sm text-white/70">{result.error}</p>
                  )}
                </div>
              </div>

              {result.ticket && (
                <dl className="space-y-2 text-sm border-t border-white/10 pt-4">
                  <div className="flex justify-between gap-3">
                    <dt className="text-gris-oscuro">Evento</dt>
                    <dd className="text-white font-medium text-right">{result.ticket.evento}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gris-oscuro">Sector</dt>
                    <dd className="text-white text-right">{result.ticket.sector}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gris-oscuro">Titular</dt>
                    <dd className="text-white text-right">{result.ticket.titular}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gris-oscuro">ID Entrada</dt>
                    <dd className="text-white font-mono text-xs text-right">{result.ticket.id}</dd>
                  </div>
                </dl>
              )}
            </div>
          )}
        </div>

        <div className="card-dark p-5 md:p-6 text-sm text-gris-oscuro space-y-3 xl:sticky xl:top-6">
          <p className="text-gris-medio font-semibold uppercase tracking-wider text-xs">Instrucciones</p>
          <p>• Apuntá el lector QR a la entrada del hincha</p>
          <p>• El código tiene formato <code className="text-amarillo">TCAP:ID:firma</code></p>
          <p>• Verde = acceso permitido | Rojo = denegado</p>
          <p>• Si aparece &quot;DUPLICADA&quot; notificá al supervisor</p>
        </div>
      </div>
    </div>
  );
}

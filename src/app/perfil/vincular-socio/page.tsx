"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, CheckCircle, AlertCircle } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function VincularSocioPage() {
  const router = useRouter();
  const [matricula, setMatricula] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/me/vincular-socio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricula }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al vincular");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/perfil"), 1800);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md card-dark p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-amarillo/10 border-2 border-amarillo/40 flex items-center justify-center mx-auto mb-4">
              <Shield size={24} className="text-amarillo" />
            </div>
            <h1 className="font-bebas text-3xl text-white tracking-wide">VINCULAR NÚMERO DE SOCIO</h1>
            <p className="text-gris-oscuro text-sm mt-1">
              Ingresá tu número de socio para acceder a beneficios exclusivos
            </p>
          </div>

          {success ? (
            <div className="text-center">
              <CheckCircle size={40} className="text-alerta-verde mx-auto mb-3" />
              <p className="text-alerta-verde font-semibold">¡Número de socio vinculado correctamente!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-alerta-rojo text-sm bg-alerta-rojo/10 border border-alerta-rojo/20 rounded-lg p-3">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm text-gris-medio mb-1.5">Número de socio</label>
                <input
                  type="text"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value.replace(/\D/g, ""))}
                  placeholder="001234"
                  className="input-dark font-mono"
                  maxLength={10}
                  required
                />
                <p className="text-gris-oscuro text-xs mt-1">Ingresá solo los números de tu carnet de socio</p>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <><div className="spinner w-4 h-4" />Verificando...</> : "Vincular matrícula"}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

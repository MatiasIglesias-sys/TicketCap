"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn, AlertCircle, ShieldCheck } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Credenciales incorrectas. Verificá el nro. de socio o email.");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="card-dark p-8 shadow-2xl shadow-black/60">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <Image
              src="/images/penarol-logo.svg"
              alt="Club Atlético Peñarol"
              width={160}
              height={42}
              style={{ width: "auto" }}
              className="h-14"
              priority
            />
          </div>
          <h1 className="font-bebas text-3xl text-white tracking-wide">
            INGRESAR AL SISTEMA
          </h1>
          <p className="text-gris-oscuro text-sm mt-1">
            Usá tu nro. de socio o email para acceder
          </p>
        </div>

        {/* Test credentials info */}
        <div className="bg-amarillo/5 border border-amarillo/20 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={13} className="text-amarillo" />
            <span className="text-amarillo text-xs font-semibold uppercase tracking-wider">Cuentas de prueba</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gris-oscuro">Admin</span>
              <span className="text-white font-mono">admin@ticketscap.com.uy / admin2026</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gris-oscuro">Socio (mat.)</span>
              <span className="text-white font-mono">001234 / penarol2026</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gris-oscuro">Socio (email)</span>
              <span className="text-white font-mono">carlos@example.com / penarol2026</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gris-oscuro">Hincha</span>
              <span className="text-white font-mono">hincha@example.com / penarol2026</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 bg-alerta-rojo/10 border border-alerta-rojo/30 text-alerta-rojo rounded-xl p-3 mb-5 text-sm animate-fade-in">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gris-medio mb-1.5 font-medium">
              Nro. de Socio o Email
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="001234 o tu@email.com"
              className="input-dark"
              required
              autoComplete="username"
              autoFocus
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm text-gris-medio font-medium">Contraseña</label>
            </div>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-dark pr-12"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gris-oscuro hover:text-gris-medio transition-colors"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-2 py-3.5 text-base"
          >
            {loading ? (
              <><div className="spinner w-4 h-4" />Ingresando...</>
            ) : (
              <><LogIn size={18} />Ingresar</>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/5 text-center">
          <p className="text-gris-oscuro text-sm">
            ¿No tenés cuenta?{" "}
            <Link href="/registro" className="text-amarillo hover:text-amarillo-light font-medium transition-colors">
              Registrarse gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

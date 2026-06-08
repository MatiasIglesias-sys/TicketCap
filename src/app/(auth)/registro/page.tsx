"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from "lucide-react";

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    ci: "",
    phone: "",
    matricula: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          ci: form.ci || undefined,
          phone: form.phone || undefined,
          matricula: form.matricula || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al registrarse. Intentá de nuevo.");
        return;
      }

      // Auto login
      await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      setSuccess(true);
      setTimeout(() => router.push("/"), 1500);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md text-center">
        <div className="card-dark p-10">
          <div className="w-16 h-16 rounded-full bg-alerta-verde/10 border-2 border-alerta-verde/40 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-alerta-verde" />
          </div>
          <h2 className="font-bebas text-3xl text-white mb-2">
            ¡CUENTA CREADA!
          </h2>
          <p className="text-gris-medio text-sm">
            Bienvenido a TicketsCap. Redirigiendo...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="card-dark p-8 shadow-2xl shadow-black/50">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-amarillo/10 border-2 border-amarillo/40 flex items-center justify-center mx-auto mb-4">
            <UserPlus size={24} className="text-amarillo" />
          </div>
          <h1 className="font-bebas text-3xl text-white tracking-wide">
            CREAR CUENTA
          </h1>
          <p className="text-gris-oscuro text-sm mt-1">
            Registrate para comprar entradas
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 bg-alerta-rojo/10 border border-alerta-rojo/30 text-alerta-rojo rounded-lg p-3 mb-5 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gris-medio mb-1.5">
              Nombre completo *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={set("name")}
              placeholder="Juan Pérez"
              className="input-dark"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gris-medio mb-1.5">
              Email *
            </label>
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="juan@email.com"
              className="input-dark"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gris-medio mb-1.5">
                Cédula de Identidad
              </label>
              <input
                type="text"
                value={form.ci}
                onChange={set("ci")}
                placeholder="12345678"
                className="input-dark"
              />
            </div>
            <div>
              <label className="block text-sm text-gris-medio mb-1.5">
                Teléfono
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                placeholder="09X XXX XXX"
                className="input-dark"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gris-medio mb-1.5">
              Número de socio (opcional)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={form.matricula}
              onChange={(e) => setForm((prev) => ({ ...prev, matricula: e.target.value.replace(/\D/g, "") }))}
              placeholder="Ej: 1234"
              className="input-dark font-mono"
              maxLength={10}
            />
            <p className="text-gris-oscuro text-xs mt-1">
              Solo los números de tu carnet de socio
            </p>
          </div>

          <div>
            <label className="block text-sm text-gris-medio mb-1.5">
              Contraseña *
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                placeholder="Mínimo 8 caracteres"
                className="input-dark pr-12"
                required
                minLength={8}
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

          <div>
            <label className="block text-sm text-gris-medio mb-1.5">
              Confirmar contraseña *
            </label>
            <input
              type={showPass ? "text" : "password"}
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              placeholder="Repetí la contraseña"
              className="input-dark"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <div className="spinner w-4 h-4" />
                Creando cuenta...
              </>
            ) : (
              <>
                <UserPlus size={18} />
                Crear cuenta gratis
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/5 text-center">
          <p className="text-gris-oscuro text-sm">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-amarillo hover:text-amarillo-light font-medium transition-colors">
              Ingresar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

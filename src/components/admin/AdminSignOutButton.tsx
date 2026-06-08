"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function AdminSignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gris-medio hover:text-alerta-rojo hover:bg-alerta-rojo/5 transition-all w-full"
    >
      <LogOut size={14} />
      Salir
    </button>
  );
}

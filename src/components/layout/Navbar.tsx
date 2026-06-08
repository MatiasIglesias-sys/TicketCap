"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";
import {
  Ticket,
  User,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronDown,
  Home,
  Calendar,
} from "lucide-react";
import { categoriaLabel } from "@/lib/utils";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-negro/95 backdrop-blur-md border-b border-white/5 shadow-lg shadow-black/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/images/penarol-logo.svg"
              alt="Club Atlético Peñarol"
              width={130}
              height={34}
              style={{ width: "auto" }}
              className="h-8 opacity-95 group-hover:opacity-100 transition-opacity"
              priority
            />
            <div className="hidden sm:block border-l border-white/15 pl-3">
              <span className="text-white font-bebas text-lg tracking-widest">TICKETS</span>
              <span className="text-amarillo font-bebas text-lg tracking-widest">CAP</span>
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-gris-medio hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
            >
              <Home size={15} />
              Inicio
            </Link>
            <Link
              href="/eventos"
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-gris-medio hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
            >
              <Calendar size={15} />
              Eventos
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {session ? (
              <>
                {/* Mis Tickets btn */}
                <Link
                  href="/mis-tickets"
                  className="hidden sm:flex items-center gap-2 bg-amarillo text-negro font-semibold text-sm px-4 py-2 rounded-lg hover:bg-amarillo-hover transition-all duration-200 active:scale-95"
                >
                  <Ticket size={16} />
                  Mis Tickets
                </Link>

                {/* Admin btn */}
                {(session.user.role === "ADMIN" || session.user.role === "OPERADOR") && (
                  <Link
                    href="/admin"
                    className="hidden sm:flex items-center gap-2 border border-amarillo/40 text-amarillo text-sm px-3 py-2 rounded-lg hover:bg-amarillo/10 transition-all duration-200"
                  >
                    <Shield size={15} />
                    Admin
                  </Link>
                )}

                {/* User dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-all duration-200"
                  >
                    <div className="w-8 h-8 rounded-full bg-negro-medio border border-amarillo/30 flex items-center justify-center">
                      <User size={16} className="text-amarillo" />
                    </div>
                    <div className="hidden md:block text-left">
                      <div className="text-white text-sm font-medium leading-tight max-w-[120px] truncate">
                        {session.user.name?.split(" ")[0]}
                      </div>
                      {session.user.socio && (
                        <div className="text-amarillo text-xs leading-tight">
                          {categoriaLabel(session.user.socio.categoria)}
                        </div>
                      )}
                    </div>
                    <ChevronDown size={14} className="text-gris-oscuro hidden md:block" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-52 bg-negro-suave border border-white/10 rounded-xl shadow-xl shadow-black/50 py-1 z-50 animate-slide-in">
                      <div className="px-4 py-2 border-b border-white/5">
                        <div className="text-white text-sm font-medium truncate">
                          {session.user.name}
                        </div>
                        <div className="text-gris-oscuro text-xs truncate">
                          {session.user.email}
                        </div>
                        {session.user.socio && (
                          <div className="mt-1">
                            <span className="badge-socio">
                              {categoriaLabel(session.user.socio.categoria)}
                            </span>
                          </div>
                        )}
                      </div>
                      <Link
                        href="/perfil"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gris-medio hover:text-white hover:bg-white/5 transition-all"
                      >
                        <User size={15} />
                        Mi Perfil
                      </Link>
                      <Link
                        href="/mis-tickets"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gris-medio hover:text-white hover:bg-white/5 transition-all"
                      >
                        <Ticket size={15} />
                        Mis Tickets
                      </Link>
                      <div className="border-t border-white/5 mt-1 pt-1">
                        <button
                          onClick={() => {
                            // Clear all queue access tokens so another user can't inherit them
                            Object.keys(sessionStorage)
                              .filter(k => k.startsWith("queue_access_"))
                              .forEach(k => sessionStorage.removeItem(k));
                            signOut({ callbackUrl: "/" });
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-alerta-rojo hover:bg-alerta-rojo/10 transition-all"
                        >
                          <LogOut size={15} />
                          Cerrar sesión
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-sm text-gris-medio hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 transition-all duration-200"
                >
                  Ingresar
                </Link>
                <Link
                  href="/registro"
                  className="text-sm bg-amarillo text-negro font-semibold px-4 py-2 rounded-lg hover:bg-amarillo-hover transition-all duration-200"
                >
                  Registrarse
                </Link>
              </div>
            )}

            {/* Mobile menu btn */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-all duration-200"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/5 bg-negro-suave py-3 px-4 space-y-1 animate-slide-in">
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-gris-medio hover:text-white hover:bg-white/5 rounded-lg transition-all"
          >
            <Home size={15} /> Inicio
          </Link>
          <Link
            href="/eventos"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-gris-medio hover:text-white hover:bg-white/5 rounded-lg transition-all"
          >
            <Calendar size={15} /> Eventos
          </Link>
          {session && (
            <Link
              href="/mis-tickets"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-amarillo hover:bg-amarillo/10 rounded-lg transition-all"
            >
              <Ticket size={15} /> Mis Tickets
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}

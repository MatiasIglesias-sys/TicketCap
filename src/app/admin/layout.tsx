import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Calendar, Users, QrCode, Zap, Ban } from "lucide-react";
import AdminSignOutButton from "@/components/admin/AdminSignOutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "OPERADOR"].includes(session.user.role)) {
    redirect("/");
  }

  const navLinks = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/eventos", label: "Eventos", icon: Calendar },
    { href: "/admin/usuarios", label: "Usuarios", icon: Users },
    { href: "/admin/scanner", label: "Scanner QR", icon: QrCode },
    { href: "/admin/cola", label: "Fila Virtual", icon: Zap },
    { href: "/admin/lista-negra", label: "Lista Negra", icon: Ban },
  ];

  return (
    <div className="min-h-screen flex bg-negro">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-negro-suave border-r border-white/5 flex flex-col">
        <div className="p-5 border-b border-white/5">
          <Link href="/" className="block hover:opacity-80 transition-opacity">
            <Image
              src="/images/penarol-logo.svg"
              alt="Club Atlético Peñarol"
              width={90}
              height={24}
              className="h-6 w-auto"
            />
            <div className="text-[10px] text-amarillo font-bebas tracking-widest leading-none mt-1">
              TICKETS<span className="text-white">CAP</span>
            </div>
          </Link>
          <div className="mt-2 text-[10px] text-amarillo font-semibold uppercase tracking-widest">
            Panel Admin
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gris-medio hover:text-white hover:bg-white/5 transition-all duration-150 group"
            >
              <link.icon size={15} className="text-gris-oscuro group-hover:text-amarillo transition-colors" />
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5">
          <div className="px-3 py-2 text-xs text-gris-oscuro truncate">
            {session.user.name}
          </div>
          <AdminSignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-negro flex flex-col">
      {/* Header minimal */}
      <header className="border-b border-white/5 py-4 px-6">
        <Link href="/" className="flex items-center gap-3 w-fit group">
          <Image
            src="/images/penarol-logo.svg"
            alt="Club Atlético Peñarol"
            width={130}
            height={34}
            style={{ width: "auto" }}
            className="h-8 opacity-95 group-hover:opacity-100 transition-opacity"
            priority
          />
          <div className="border-l border-white/15 pl-3">
            <span className="font-bebas text-lg tracking-widest text-white">TICKETS</span>
            <span className="font-bebas text-lg tracking-widest text-amarillo">CAP</span>
          </div>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>

      <footer className="py-4 text-center text-gris-oscuro text-xs border-t border-white/5">
        © {new Date().getFullYear()} Club Atlético Peñarol — Todos los derechos reservados
      </footer>
    </div>
  );
}

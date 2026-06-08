import Link from "next/link";
import Navbar from "@/components/layout/Navbar";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-negro">
      <Navbar />
      <div className="flex-1 flex items-center justify-center text-center px-4">
        <div>
          <div className="font-bebas text-[180px] leading-none text-amarillo/10 select-none">
            404
          </div>
          <h1 className="font-bebas text-4xl text-white -mt-8 mb-3">
            PÁGINA NO ENCONTRADA
          </h1>
          <p className="text-gris-medio mb-8 max-w-sm mx-auto">
            La página que buscás no existe o fue movida.
          </p>
          <Link href="/" className="btn-primary inline-flex items-center gap-2">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

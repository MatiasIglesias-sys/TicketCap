import Link from "next/link";
import Image from "next/image";
import { MapPin, Phone, Mail, Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-negro-suave border-t border-white/5 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/images/penarol-logo.svg"
                alt="Club Atlético Peñarol"
                width={160}
                height={42}
                className="h-10 w-auto"
              />
              <div className="border-l border-white/15 pl-3">
                <div className="text-white font-bebas text-2xl tracking-widest leading-none">TICKETS</div>
                <div className="text-amarillo font-bebas text-2xl tracking-widest leading-none">CAP</div>
              </div>
            </div>
            <p className="text-gris-oscuro text-sm leading-relaxed max-w-xs">
              La plataforma oficial de venta y gestión de entradas del Club Atlético Peñarol.
              Fundado el 28 de septiembre de 1891.
            </p>
            <p className="text-amarillo/60 text-xs mt-3 font-bebas tracking-widest">
              CAMPEÓN DEL SIGLO — EN LAS CANCHAS Y EN LA TECNOLOGÍA
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Plataforma</h4>
            <ul className="space-y-2.5">
              {[
                { href: "/eventos", label: "Eventos" },
                { href: "/mis-tickets", label: "Mis Tickets" },
                { href: "/perfil", label: "Mi Cuenta" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gris-oscuro hover:text-amarillo text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Contacto</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-gris-oscuro text-sm">
                <MapPin size={14} className="text-amarillo mt-0.5 shrink-0" />
                <span>Magallanes 1721, Montevideo</span>
              </li>
              <li className="flex items-center gap-2.5 text-gris-oscuro text-sm">
                <Phone size={14} className="text-amarillo shrink-0" />
                <span>+598 2915 0001</span>
              </li>
              <li className="flex items-center gap-2.5 text-gris-oscuro text-sm">
                <Mail size={14} className="text-amarillo shrink-0" />
                <span>tickets@penarol.org</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-gris-oscuro text-xs">
            © {new Date().getFullYear()} Club Atlético Peñarol. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-1.5 text-gris-oscuro text-xs">
            <Shield size={12} className="text-amarillo" />
            <span>Plataforma segura con cifrado SSL</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

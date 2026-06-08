import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "TicketsCap — Club Atlético Peñarol",
    template: "%s | TicketsCap",
  },
  description:
    "Plataforma oficial de venta y gestión de entradas del Club Atlético Peñarol. Campeón del Siglo.",
  keywords: ["Peñarol", "tickets", "entradas", "fútbol", "Uruguay", "Campeón del Siglo"],
  openGraph: {
    title: "TicketsCap — Club Atlético Peñarol",
    description: "La plataforma oficial de entradas del Campeón del Siglo",
    locale: "es_UY",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&family=Roboto+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-negro text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

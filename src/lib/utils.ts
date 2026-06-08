import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd 'de' MMMM yyyy", { locale: es });
}

export function formatDateTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd MMM yyyy — HH:mm", { locale: es });
}

export function formatRelative(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

export function formatCurrency(amount: number, currency = "UYU") {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function torneoLabel(torneo: string): string {
  const map: Record<string, string> = {
    // Fútbol
    APERTURA: "Apertura",
    CLAUSURA: "Clausura",
    INTERMEDIO: "Intermedio",
    LIBERTADORES: "Copa Libertadores",
    SUDAMERICANA: "Copa Sudamericana",
    COPA_URUGUAY: "Copa AUF Uruguay",
    SUPERCOPA: "Supercopa",
    AMISTOSO: "Amistoso",
    // Básquetbol
    BASQUETBOL: "Liga Uruguaya",
    BASQUETBOL_COPA: "Copa Básquetbol",
    // Rugby
    RUGBY: "Rugby",
    RUGBY_COPA: "Copa Rugby",
    RUGBY_AMERICAS: "Súper Rugby Américas",
    // Otros
    MUNDIAL_CLUBES: "Mundial de Clubes",
    PARKING: "Estacionamiento",
  };
  return map[torneo] ?? torneo;
}

export function deporteLabel(torneo: string): string {
  const basquet = ["BASQUETBOL", "BASQUETBOL_COPA"];
  const rugby = ["RUGBY", "RUGBY_COPA", "RUGBY_AMERICAS"];
  if (basquet.includes(torneo)) return "Básquetbol";
  if (rugby.includes(torneo)) return "Rugby";
  if (torneo === "PARKING") return "Parking";
  return "Fútbol";
}

export function ventaEstadoLabel(estado: string): string {
  const map: Record<string, string> = {
    PREVENTA_SOCIOS: "Preventa — Solo Socios",
    PREVENTA_ADHERENTES: "Preventa — Socios y Adherentes",
    VENTA_GENERAL: "Venta General",
    AGOTADO: "Agotado",
    CERRADO: "Venta Cerrada",
    FILA_VIRTUAL: "Venta Cerrada",
  };
  return map[estado] ?? estado;
}

export function categoriaLabel(cat: string): string {
  const map: Record<string, string> = {
    ACTIVO: "Socio Activo",
    SUSCRIPTOR: "Suscriptor",
    INFANTIL: "Socio Infantil",
    CADETE: "Cadete",
    ADHERENTE: "Adherente",
    INTERIOR: "Socio del Interior",
    EXTERIOR: "Socio del Exterior",
    VITALICIO: "Socio Vitalicio",
    PALQUISTA: "Palquista",
    BUTAQUISTA: "Butaquista",
  };
  return map[cat] ?? cat;
}

export function generateQRData(
  ticketId: string,
  userId: string,
  eventId: string
): string {
  const timestamp = Date.now();
  const secret = process.env.QR_SECRET ?? "default-secret";
  const data = `${ticketId}|${userId}|${eventId}|${timestamp}`;
  return data;
}

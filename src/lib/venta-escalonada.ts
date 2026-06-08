/**
 * Computes the effective ventaEstado for an event that has ventaEscalonadaActiva=true.
 * Mirrors the same date logic used in /api/tickets (canBuyByPhasedVenta).
 */

type EventForVenta = {
  ventaEscalonadaActiva: boolean;
  ventaEstado: string;
  fecha: Date | string;
  diasAntesRanking: number;
  diasAntesSocios: number;
  diasAntesGeneral: number;
};

function openDate(eventDate: Date, diasAntes: number): Date {
  const d = new Date(eventDate);
  d.setDate(d.getDate() - Math.max(0, diasAntes));
  return d;
}

export function computeVentaEstado(event: EventForVenta): string {
  // If manual mode or already sold out, return stored value
  if (!event.ventaEscalonadaActiva) return event.ventaEstado;
  if (event.ventaEstado === "AGOTADO") return "AGOTADO";

  const now       = new Date();
  const eventDate = new Date(event.fecha);

  // Event already happened — don't change
  if (now >= eventDate) return event.ventaEstado;

  const generalAt = openDate(eventDate, event.diasAntesGeneral);
  const sociosAt  = openDate(eventDate, event.diasAntesSocios);
  const rankingAt = openDate(eventDate, event.diasAntesRanking);

  if (now >= generalAt)                                    return "VENTA_GENERAL";
  if (now >= sociosAt)                                     return "PREVENTA_SOCIOS";
  if (event.diasAntesRanking > 0 && now >= rankingAt)     return "PREVENTA_SOCIOS";

  return "CERRADO";
}

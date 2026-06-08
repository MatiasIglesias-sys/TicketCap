import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomBytes, createHmac } from "crypto";
import { verifyAccessToken } from "@/lib/queue";
import { expireActiveTicketsForUser } from "@/lib/ticket-expiration";

const SOCIO_RANKING_CATEGORIAS = ["ACTIVO", "SUSCRIPTOR", "VITALICIO", "INTERIOR", "EXTERIOR", "PALQUISTA", "BUTAQUISTA"];

function isSocioAlDia(socio: { cuotaAlDia: boolean; estado?: string } | null | undefined): boolean {
  if (!socio?.cuotaAlDia) return false;
  if (!socio.estado) return true;
  return socio.estado === "AL_DIA";
}

async function getUserAttendancePercent(userId: string, now: Date): Promise<number> {
  const [totalPastTickets, usedPastTickets] = await Promise.all([
    prisma.ticket.count({
      where: {
        userId,
        event: { fecha: { lt: now } },
        estado: { in: ["ACTIVO", "USADO", "VENCIDO"] },
      },
    }),
    prisma.ticket.count({
      where: {
        userId,
        event: { fecha: { lt: now } },
        estado: "USADO",
      },
    }),
  ]);

  if (totalPastTickets === 0) return 0;
  return (usedPastTickets / totalPastTickets) * 100;
}

function getOpenDate(eventDate: Date, diasAntes: number): Date {
  const d = new Date(eventDate);
  d.setDate(d.getDate() - Math.max(0, diasAntes));
  return d;
}

function canBuyByManualVentaEstado(
  ventaEstado: string,
  isSocioAlDia: boolean,
  isAdherente: boolean
): { allowed: boolean; reason?: string } {
  if (ventaEstado === "CERRADO" || ventaEstado === "AGOTADO") {
    return { allowed: false, reason: "La venta no está habilitada para este evento" };
  }
  if (ventaEstado === "PREVENTA_SOCIOS" && !isSocioAlDia) {
    return { allowed: false, reason: "La preventa actual es exclusiva para socios al día" };
  }
  if (ventaEstado === "PREVENTA_ADHERENTES" && !(isSocioAlDia && isAdherente)) {
    return { allowed: false, reason: "La preventa actual es exclusiva para adherentes al día" };
  }
  return { allowed: true };
}

async function canBuyByPhasedVenta(
  userId: string,
  eventDate: Date,
  now: Date,
  diasAntesRanking: number,
  diasAntesSocios: number,
  diasAntesGeneral: number,
  rankingMinAsistenciaPct: number,
  socio: { categoria: string; cuotaAlDia: boolean; estado: string } | null
): Promise<{ allowed: boolean; reason?: string }> {
  const rankingAt = getOpenDate(eventDate, diasAntesRanking);
  const sociosAt = getOpenDate(eventDate, diasAntesSocios);
  const generalAt = getOpenDate(eventDate, diasAntesGeneral);
  const requiredAttendance = Math.max(0, Math.min(100, rankingMinAsistenciaPct));

  const socioAlDia = isSocioAlDia(socio);
  const isRankingCategory = !!socio?.categoria && SOCIO_RANKING_CATEGORIAS.includes(socio.categoria);

  if (now >= generalAt) {
    return { allowed: true };
  }

  if (now >= sociosAt) {
    if (!socioAlDia) {
      return { allowed: false, reason: "Esta etapa está habilitada solo para socios al día" };
    }
    return { allowed: true };
  }

  if (now >= rankingAt) {
    if (!socioAlDia || !isRankingCategory) {
      return {
        allowed: false,
        reason: "Esta etapa es solo para socios ranking al día",
      };
    }

    const attendancePct = await getUserAttendancePercent(userId, now);
    if (attendancePct < requiredAttendance) {
      return {
        allowed: false,
        reason: `Asistencia insuficiente para ranking: ${attendancePct.toFixed(1)}% (mínimo ${requiredAttendance}%)`,
      };
    }

    return { allowed: true };
  }

  return { allowed: false, reason: "La venta todavía no está habilitada para esta etapa" };
}

function generateQRCode(ticketId: string, userId: string, eventId: string): string {
  const timestamp = Date.now();
  const secret = process.env.QR_SECRET!;
  const payload = `${ticketId}|${userId}|${eventId}|${timestamp}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex").slice(0, 16);
  return `TCAP:${ticketId}:${signature}`;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  await expireActiveTicketsForUser(session.user.id);

  const tickets = await prisma.ticket.findMany({
    where: { userId: session.user.id },
    include: {
      event: true,
      sector: true,
      order: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tickets);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const { sectorId, cantidad, metodoPago, emailEntradas, queueToken } = await req.json();

    if (!sectorId || !cantidad) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // Check suspension
    const userCheck = await prisma.user.findUnique({ where: { id: session.user.id }, select: { suspendidoHasta: true, razonSuspension: true } });
    if (userCheck?.suspendidoHasta && userCheck.suspendidoHasta > new Date()) {
      const hasta = userCheck.suspendidoHasta.toLocaleString("es-UY");
      return NextResponse.json({ error: `Tu cuenta está suspendida hasta el ${hasta}. ${userCheck.razonSuspension ?? ""}`.trim() }, { status: 403 });
    }

    // Get sector with event
    const sector = await prisma.sector.findUnique({
      where: { id: sectorId },
      include: { event: true },
    });

    if (!sector) {
      return NextResponse.json({ error: "Sector no encontrado" }, { status: 404 });
    }

    // Validate queue token if event has fila virtual active
    if (sector.event.filaVirtual) {
      if (!queueToken) {
        return NextResponse.json({ error: "Se requiere token de acceso de fila virtual" }, { status: 403 });
      }
      const tokenData = verifyAccessToken(queueToken);
      if (!tokenData || tokenData.userId !== session.user.id || tokenData.eventId !== sector.eventId) {
        return NextResponse.json({ error: "Token de fila virtual inválido o expirado" }, { status: 403 });
      }
    }

    if (!sector.habilitado) {
      return NextResponse.json({ error: "Sector no habilitado" }, { status: 400 });
    }

    if (sector.disponibles < cantidad) {
      return NextResponse.json({ error: "No hay suficientes entradas disponibles" }, { status: 409 });
    }

    // Check event limit
    const existingTickets = await prisma.ticket.count({
      where: {
        userId: session.user.id,
        eventId: sector.eventId,
        estado: { in: ["ACTIVO", "USADO"] },
      },
    });

    if (existingTickets + cantidad > sector.event.limiteXUsuario) {
      return NextResponse.json({
        error: `Límite de ${sector.event.limiteXUsuario} entradas por usuario para este evento`,
      }, { status: 409 });
    }

    // Enforce sale mode access (manual ventaEstado or phased windows)
    const socio = session.user.socio;
    const socioAlDia = isSocioAlDia(socio);
    const isAdherente = socio?.categoria === "ADHERENTE";

    const access = sector.event.ventaEscalonadaActiva
      ? await canBuyByPhasedVenta(
          session.user.id,
          new Date(sector.event.fecha),
          new Date(),
          sector.event.diasAntesRanking,
          sector.event.diasAntesSocios,
          sector.event.diasAntesGeneral,
          sector.event.rankingMinAsistenciaPct,
          socio
            ? {
                categoria: socio.categoria,
                cuotaAlDia: socio.cuotaAlDia,
                estado: socio.estado,
              }
            : null
        )
      : canBuyByManualVentaEstado(sector.event.ventaEstado, socioAlDia, isAdherente);

    if (!access.allowed) {
      return NextResponse.json({ error: access.reason ?? "No autorizado para comprar en esta etapa" }, { status: 403 });
    }

    // Calculate price
    let precioUnit = sector.precio;

    if (socioAlDia && (session.user.socio?.categoria === "ACTIVO" ||
      session.user.socio?.categoria === "SUSCRIPTOR" ||
      session.user.socio?.categoria === "VITALICIO" ||
      session.user.socio?.categoria === "INTERIOR")) {
      precioUnit = sector.precioSocio;
    } else if (isAdherente && socioAlDia) {
      precioUnit = sector.precio * 0.70; // 30% off
    }

    const total = precioUnit * cantidad;

    // Create order and tickets in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Re-check availability inside transaction
      const freshSector = await tx.sector.findUnique({ where: { id: sectorId } });
      if (!freshSector || freshSector.disponibles < cantidad) {
        throw new Error("SOLD_OUT");
      }

      // Create order
      const order = await tx.order.create({
        data: {
          userId: session.user.id,
          total,
          estado: "PAGADA",
          metodoPago: metodoPago ?? "DEMO",
          referencia: `REF-${randomBytes(4).toString("hex").toUpperCase()}`,
        },
      });

      // Create tickets
      const tickets = [];
      for (let i = 0; i < cantidad; i++) {
        const ticketId = `TKT-${randomBytes(6).toString("hex").toUpperCase()}`;
        const qrCode = generateQRCode(ticketId, session.user.id, sector.eventId);
        const ticket = await tx.ticket.create({
          data: {
            id: ticketId,
            eventId: sector.eventId,
            sectorId,
            userId: session.user.id,
            orderId: order.id,
            qrCode,
            qrData: `${ticketId}|${session.user.id}|${sector.eventId}|${Date.now()}`,
            estado: "ACTIVO",
          },
        });
        tickets.push(ticket);
      }

      // Decrement availability
      await tx.sector.update({
        where: { id: sectorId },
        data: { disponibles: { decrement: cantidad } },
      });

      return { order, tickets };
    });

    // Mark queue entry as completed if applicable
    if (sector.event.filaVirtual) {
      await prisma.queueEntry.updateMany({
        where: { userId: session.user.id, eventId: sector.eventId, estado: "ACTIVO" },
        data: { estado: "COMPLETADO" },
      });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "SOLD_OUT") {
      return NextResponse.json({ error: "Entradas agotadas" }, { status: 409 });
    }
    console.error("Ticket creation error:", err);
    return NextResponse.json({ error: "Error al procesar la compra" }, { status: 500 });
  }
}

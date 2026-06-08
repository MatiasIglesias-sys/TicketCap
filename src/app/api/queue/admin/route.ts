import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signAccessToken, QUEUE_ADVANCE_BATCH, getConcurrentViewers } from "@/lib/queue";
import { computeVentaEstado } from "@/lib/venta-escalonada";

function isAdmin(role: string) {
  return role === "ADMIN" || role === "OPERADOR";
}

/** GET — metrics for admin dashboard */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role))
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  if (eventId) {
    const [waiting, active, expired, completed] = await Promise.all([
      prisma.queueEntry.count({ where: { eventId, estado: "ESPERANDO" } }),
      prisma.queueEntry.count({ where: { eventId, estado: "ACTIVO" } }),
      prisma.queueEntry.count({ where: { eventId, estado: "EXPIRADO" } }),
      prisma.queueEntry.count({ where: { eventId, estado: "COMPLETADO" } }),
    ]);
    const concurrent = getConcurrentViewers(eventId);
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        filaVirtual: true,
        ventaEstado: true,
        ventaEscalonadaActiva: true,
        fecha: true,
        diasAntesRanking: true,
        diasAntesSocios: true,
        diasAntesGeneral: true,
        nombre: true,
      },
    });
    const ventaEstadoEfectivo = event ? computeVentaEstado(event) : "";
    return NextResponse.json({
      waiting,
      active,
      expired,
      completed,
      concurrent,
      filaVirtual: event?.filaVirtual ?? false,
      ventaEstado: ventaEstadoEfectivo,
    });
  }

  // All events with queue activity
  const events = await prisma.event.findMany({
    where: { filaVirtual: true },
    select: { id: true, nombre: true, fecha: true, ventaEstado: true },
  });
  return NextResponse.json({ events });
}

/** PATCH — toggle fila virtual, advance queue, clear expired */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role))
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { eventId, action } = await req.json();
  if (!eventId || !action)
    return NextResponse.json({ error: "eventId y action requeridos" }, { status: 400 });

  if (action === "activate") {
    await prisma.event.update({
      where: { id: eventId },
      data: { filaVirtual: true },
    });
    return NextResponse.json({ ok: true, message: "Fila virtual activada" });
  }

  if (action === "deactivate") {
    await prisma.event.update({
      where: { id: eventId },
      data: { filaVirtual: false },
    });
    return NextResponse.json({ ok: true, message: "Fila virtual desactivada" });
  }

  if (action === "advance") {
    const candidates = await prisma.queueEntry.findMany({
      where: { eventId, estado: "ESPERANDO" },
      orderBy: [{ prioridad: "desc" }, { posicion: "asc" }],
      take: QUEUE_ADVANCE_BATCH,
    });
    await prisma.$transaction(
      candidates.map((entry) => {
        const accessToken = signAccessToken(entry.userId, eventId);
        return prisma.queueEntry.update({
          where: { id: entry.id },
          data: {
            estado: "ACTIVO",
            accessToken,
            accessExpiry: new Date(Date.now() + 10 * 60 * 1000),
            posicion: 0,
          },
        });
      })
    );
    return NextResponse.json({ ok: true, advanced: candidates.length });
  }

  if (action === "clear_expired") {
    const { count } = await prisma.queueEntry.deleteMany({
      where: { eventId, estado: { in: ["EXPIRADO", "COMPLETADO"] } },
    });
    return NextResponse.json({ ok: true, cleared: count });
  }

  if (action === "clear_all") {
    const { count } = await prisma.queueEntry.deleteMany({ where: { eventId } });
    return NextResponse.json({ ok: true, cleared: count });
  }

  return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { newQueueToken, computePrioridad, signAccessToken, QUEUE_MAX_CONCURRENT, QUEUE_ACCESS_MINUTES } from "@/lib/queue";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  }

  const { eventId } = await req.json();
  if (!eventId) return NextResponse.json({ error: "eventId requerido" }, { status: 400 });

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  if (!event.filaVirtual) {
    return NextResponse.json({ error: "Este evento no tiene fila virtual" }, { status: 400 });
  }

  // ── Check suspension ──────────────────────────────────────────────────────
  const userCheck = await prisma.user.findUnique({ where: { id: session.user.id }, select: { suspendidoHasta: true, razonSuspension: true } });
  if (userCheck?.suspendidoHasta && userCheck.suspendidoHasta > new Date()) {
    const hasta = userCheck.suspendidoHasta.toLocaleString("es-UY");
    return NextResponse.json({ error: `Tu cuenta está suspendida hasta el ${hasta}. ${userCheck.razonSuspension ?? ""}`.trim(), eligible: false }, { status: 403 });
  }

  // ── Check purchase eligibility before letting user join the queue ──────────
  {
    const socio       = session.user.socio;
    const socioAlDia  = socio?.cuotaAlDia === true;
    const RANKING_CATS = ["ACTIVO","SUSCRIPTOR","VITALICIO","INTERIOR","EXTERIOR","PALQUISTA","BUTAQUISTA"];
    const isRanking    = !!socio?.categoria && RANKING_CATS.includes(socio.categoria);

    if (event.ventaEscalonadaActiva) {
      const now       = new Date();
      const eventDate = new Date(event.fecha);
      const openDate  = (dias: number) => { const d = new Date(eventDate); d.setDate(d.getDate() - Math.max(0, dias)); return d; };
      const rankingAt = openDate(event.diasAntesRanking);
      const sociosAt  = openDate(event.diasAntesSocios);
      const generalAt = openDate(event.diasAntesGeneral);

      if (now < rankingAt) {
        return NextResponse.json({ error: "La venta aún no comenzó", eligible: false, phaseLabel: null }, { status: 403 });
      }
      if (now < sociosAt && (!socioAlDia || !isRanking)) {
        return NextResponse.json({ error: "Solo pueden entrar a la fila socios ranking al día", eligible: false, phaseLabel: "socios ranking al día" }, { status: 403 });
      }
      if (now < generalAt && !socioAlDia) {
        return NextResponse.json({ error: "Solo pueden entrar a la fila socios al día", eligible: false, phaseLabel: "socios al día" }, { status: 403 });
      }
    } else {
      const ve = event.ventaEstado;
      if (ve === "CERRADO" || ve === "AGOTADO") {
        return NextResponse.json({ error: "La venta no está habilitada para este evento", eligible: false, phaseLabel: null }, { status: 403 });
      }
      if (ve === "PREVENTA_SOCIOS" && !socioAlDia) {
        return NextResponse.json({ error: "Solo pueden entrar a la fila socios al día", eligible: false, phaseLabel: "socios al día" }, { status: 403 });
      }
      if (ve === "PREVENTA_ADHERENTES" && !(socioAlDia && socio?.categoria === "ADHERENTE")) {
        return NextResponse.json({ error: "Solo pueden entrar a la fila adherentes al día", eligible: false, phaseLabel: "adherentes al día" }, { status: 403 });
      }
    }
  }

  // Expire stale ACTIVO entries before checking slots
  await prisma.queueEntry.updateMany({
    where: { eventId, estado: "ACTIVO", accessExpiry: { lt: new Date() } },
    data: { estado: "EXPIRADO" },
  });

  // Check for existing entry
  const existing = await prisma.queueEntry.findUnique({
    where: { userId_eventId: { userId: session.user.id, eventId } },
  });

  if (existing?.estado === "ACTIVO") {
    // Renew the timer — user re-joined after losing their session (logout/refresh)
    const freshToken  = signAccessToken(session.user.id, eventId);
    const freshExpiry = new Date(Date.now() + QUEUE_ACCESS_MINUTES * 60 * 1000);
    await prisma.queueEntry.update({
      where: { id: existing.id },
      data:  { accessToken: freshToken, accessExpiry: freshExpiry },
    });
    return NextResponse.json({
      ok: true,
      estado: "ACTIVO",
      posicion: 0,
      accessToken: freshToken,
      accessExpiry: freshExpiry,
    });
  }

  if (existing?.estado === "ESPERANDO") {
    return NextResponse.json({
      ok: true,
      estado: "ESPERANDO",
      posicion: existing.posicion,
      entryToken: existing.token,
    });
  }

  // Check if a slot is immediately available
  const activoCount = await prisma.queueEntry.count({
    where: { eventId, estado: "ACTIVO" },
  });
  const slotAvailable = activoCount < QUEUE_MAX_CONCURRENT;

  const prioridad = computePrioridad(
    session.user.socio?.categoria,
    session.user.socio?.cuotaAlDia ?? false
  );
  const newToken  = newQueueToken();
  const newExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000);

  if (slotAvailable) {
    // Grant immediate access
    const accessToken  = signAccessToken(session.user.id, eventId);
    const accessExpiry = new Date(Date.now() + QUEUE_ACCESS_MINUTES * 60 * 1000);

    if (existing) {
      await prisma.queueEntry.update({
        where: { id: existing.id },
        data: { token: newToken, posicion: 0, prioridad, estado: "ACTIVO", accessToken, accessExpiry, expiresAt: newExpiry },
      });
    } else {
      await prisma.queueEntry.create({
        data: { userId: session.user.id, eventId, token: newToken, posicion: 0, prioridad, estado: "ACTIVO", accessToken, accessExpiry, expiresAt: newExpiry },
      });
    }

    return NextResponse.json({ ok: true, estado: "ACTIVO", posicion: 0, accessToken, accessExpiry });
  }

  // No slot — enqueue
  const queueLength = await prisma.queueEntry.count({
    where: { eventId, estado: "ESPERANDO" },
  });
  const newPosicion = queueLength + 1;

  let entry;
  if (existing) {
    entry = await prisma.queueEntry.update({
      where: { id: existing.id },
      data: { token: newToken, posicion: newPosicion, prioridad, estado: "ESPERANDO", accessToken: null, accessExpiry: null, expiresAt: newExpiry },
    });
  } else {
    entry = await prisma.queueEntry.create({
      data: { userId: session.user.id, eventId, token: newToken, posicion: newPosicion, prioridad, estado: "ESPERANDO", expiresAt: newExpiry },
    });
  }

  return NextResponse.json({ ok: true, estado: "ESPERANDO", posicion: entry.posicion, entryToken: entry.token });
}

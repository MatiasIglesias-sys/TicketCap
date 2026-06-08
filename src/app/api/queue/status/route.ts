import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  signAccessToken,
  QUEUE_MAX_CONCURRENT,
  QUEUE_ACCESS_MINUTES,
  estimatedWaitMinutes,
  trackEventView,
  getConcurrentViewers,
} from "@/lib/queue";

/** Called by client every ~8 seconds to poll position */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId requerido" }, { status: 400 });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  // Track concurrency
  const concurrent = trackEventView(eventId, ip);

  const session = await getServerSession(authOptions);

  // ── 1. Expire stale ACTIVO entries ─────────────────────────────────────────
  await prisma.queueEntry.updateMany({
    where: { eventId, estado: "ACTIVO", accessExpiry: { lt: new Date() } },
    data: { estado: "EXPIRADO" },
  });

  // ── 2. Advance queue if slots available ────────────────────────────────────
  const activoCount = await prisma.queueEntry.count({
    where: { eventId, estado: "ACTIVO" },
  });

  if (activoCount < QUEUE_MAX_CONCURRENT) {
    const slots = QUEUE_MAX_CONCURRENT - activoCount;

    // Pick highest prioridad first, then oldest
    const candidates = await prisma.queueEntry.findMany({
      where: { eventId, estado: "ESPERANDO" },
      orderBy: [{ prioridad: "desc" }, { posicion: "asc" }],
      take: slots,
    });

    if (candidates.length > 0) {
      // Advance candidates in a single batched transaction
      const now = Date.now();
      const advancedIds = candidates.map((c) => c.id);

      await prisma.$transaction(
        candidates.map((entry) => {
          const accessToken = signAccessToken(entry.userId, eventId);
          const accessExpiry = new Date(now + QUEUE_ACCESS_MINUTES * 60 * 1000);
          return prisma.queueEntry.update({
            where: { id: entry.id },
            data: { estado: "ACTIVO", accessToken, accessExpiry, posicion: 0 },
          });
        })
      );

      // Re-calculate positions for remaining ESPERANDO entries (single batched transaction)
      const remaining = await prisma.queueEntry.findMany({
        where: { eventId, estado: "ESPERANDO", id: { notIn: advancedIds } },
        orderBy: [{ prioridad: "desc" }, { posicion: "asc" }],
      });

      if (remaining.length > 0) {
        await prisma.$transaction(
          remaining.map((entry, i) =>
            prisma.queueEntry.update({
              where: { id: entry.id },
              data: { posicion: i + 1 },
            })
          )
        );
      }
    }
  }

  // ── 3. Return user's status ─────────────────────────────────────────────────
  if (!session) {
    const totalWaiting = await prisma.queueEntry.count({
      where: { eventId, estado: "ESPERANDO" },
    });
    return NextResponse.json({
      totalWaiting,
      concurrentViewers: concurrent,
      authenticated: false,
    });
  }

  const entry = await prisma.queueEntry.findUnique({
    where: { userId_eventId: { userId: session.user.id, eventId } },
  });

  const totalWaiting = await prisma.queueEntry.count({
    where: { eventId, estado: "ESPERANDO" },
  });

  if (!entry) {
    return NextResponse.json({
      inQueue: false,
      totalWaiting,
      concurrentViewers: concurrent,
    });
  }

  if (entry.estado === "ACTIVO") {
    let accessToken = entry.accessToken;
    let accessExpiry = entry.accessExpiry;

    if (!accessToken || !accessExpiry) {
      accessToken = signAccessToken(session.user.id, eventId);
      accessExpiry = new Date(Date.now() + QUEUE_ACCESS_MINUTES * 60 * 1000);
      await prisma.queueEntry.update({
        where: { id: entry.id },
        data: { accessToken, accessExpiry, posicion: 0 },
      });
    }

    const expiresIn = Math.max(
      0,
      Math.floor((new Date(accessExpiry).getTime() - Date.now()) / 1000)
    );
    return NextResponse.json({
      inQueue: true,
      estado: "ACTIVO",
      posicion: 0,
      accessToken,
      accessExpiry,
      expiresInSeconds: expiresIn,
      totalWaiting,
    });
  }

  if (entry.estado === "EXPIRADO") {
    return NextResponse.json({ inQueue: true, estado: "EXPIRADO", totalWaiting });
  }

  return NextResponse.json({
    inQueue: true,
    estado: "ESPERANDO",
    posicion: entry.posicion,
    estimatedMinutes: estimatedWaitMinutes(entry.posicion),
    prioridad: entry.prioridad,
    totalWaiting,
  });
}

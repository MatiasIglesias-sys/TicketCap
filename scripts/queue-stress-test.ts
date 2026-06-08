import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { QUEUE_MAX_CONCURRENT, computePrioridad, signAccessToken } from "../src/lib/queue";

function loadEnvLocal() {
  if (process.env.DATABASE_URL) return;

  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const prisma = new PrismaClient();

const TOTAL_USERS = 3_000;
const OPEN_WINDOW_MS = 15_000;
const TEST_BUY_SECONDS = 5;
const LOOP_INTERVAL_MS = 1_000;
const EVENT_ID = `queue-stress-${Date.now()}`;
const TEST_USER_PREFIX = "stress-user-";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const start = Date.now();
  console.log(`[queue-stress] Starting full queue simulation with ${TOTAL_USERS} test users`);

  const event = await prisma.event.create({
    data: {
      id: EVENT_ID,
      nombre: "Juventud - Prueba Fila Virtual 3000 (flujo completo)",
      rival: "Simulado",
      fecha: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      torneo: "AMISTOSO",
      estado: "EN_VENTA",
      ventaEstado: "VENTA_GENERAL",
      filaVirtual: true,
      limiteXUsuario: 4,
    },
  });

  try {
    const entries = Array.from({ length: TOTAL_USERS }, (_, index) => {
      const userNumber = index + 1;
      const categoria = userNumber % 7 === 0
        ? "ACTIVO"
        : userNumber % 11 === 0
        ? "ADHERENTE"
        : undefined;
      const cuotaAlDia = userNumber % 13 !== 0;
      return {
        userId: `stress-user-${userNumber}`,
        eventId: event.id,
        token: `stress-token-${userNumber}`,
        posicion: userNumber,
        prioridad: computePrioridad(categoria, cuotaAlDia),
        estado: "ESPERANDO",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      };
    });

    const insertedAt = Date.now();
    await prisma.queueEntry.createMany({ data: entries });
    const insertMs = Date.now() - insertedAt;

    const countsAt = Date.now();
    const [waitingBefore, activeBefore] = await Promise.all([
      prisma.queueEntry.count({ where: { eventId: event.id, estado: "ESPERANDO" } }),
      prisma.queueEntry.count({ where: { eventId: event.id, estado: "ACTIVO" } }),
    ]);
    const countsMs = Date.now() - countsAt;

    console.log(`[queue-stress] Event ready: ${event.nombre}`);
    console.log(`[queue-stress] Open the admin queue screen now: /admin/cola`);
    console.log(`[queue-stress] You can join now with your real user at /eventos while this simulation runs.`);
    console.log(`[queue-stress] First advance in ${Math.round(OPEN_WINDOW_MS / 1000)}s so you can enter the queue.`);
    console.log(`[queue-stress] Before advance: waiting=${waitingBefore}, active=${activeBefore}`);
    console.log(`[queue-stress] Inserted ${TOTAL_USERS} queue entries in ${insertMs}ms`);
    console.log(`[queue-stress] Counted waiting/active in ${countsMs}ms`);

    await sleep(OPEN_WINDOW_MS);

    let ticks = 0;
    let totalPromoted = 0;
    let totalCompleted = 0;

    while (true) {
      ticks += 1;

      // 1) Test users in active state stay 5 seconds, then leave as COMPLETADO
      const completeResult = await prisma.queueEntry.updateMany({
        where: {
          eventId: event.id,
          estado: "ACTIVO",
          userId: { startsWith: TEST_USER_PREFIX },
          accessExpiry: { lte: new Date() },
        },
        data: { estado: "COMPLETADO" },
      });
      totalCompleted += completeResult.count;

      // 2) Keep queue filled up to QUEUE_MAX_CONCURRENT
      const activeCount = await prisma.queueEntry.count({
        where: { eventId: event.id, estado: "ACTIVO" },
      });
      const slots = Math.max(0, QUEUE_MAX_CONCURRENT - activeCount);

      let changedThisTick = completeResult.count > 0;

      if (slots > 0) {
        const candidates = await prisma.queueEntry.findMany({
          where: { eventId: event.id, estado: "ESPERANDO" },
          orderBy: [{ prioridad: "desc" }, { posicion: "asc" }],
          take: slots,
        });

        for (const entry of candidates) {
          const isTestUser = entry.userId.startsWith(TEST_USER_PREFIX);
          const accessExpiry = isTestUser
            ? new Date(Date.now() + TEST_BUY_SECONDS * 1000)
            : new Date(Date.now() + 10 * 60 * 1000);

          await prisma.queueEntry.update({
            where: { id: entry.id },
            data: {
              estado: "ACTIVO",
              accessToken: signAccessToken(entry.userId, event.id),
              accessExpiry,
              posicion: 0,
            },
          });
        }

        totalPromoted += candidates.length;
        if (candidates.length > 0) changedThisTick = true;
      }

      // 3) Recalculate waiting positions every few ticks when there were real changes.
      if (changedThisTick && ticks % 5 === 0) {
        const waitingEntries = await prisma.queueEntry.findMany({
          where: { eventId: event.id, estado: "ESPERANDO" },
          orderBy: [{ prioridad: "desc" }, { posicion: "asc" }],
          select: { id: true },
        });
        for (let i = 0; i < waitingEntries.length; i++) {
          await prisma.queueEntry.update({
            where: { id: waitingEntries[i].id },
            data: { posicion: i + 1 },
          });
        }
      }

      const [waiting, active, completed, expired, waitingTests, activeTests] = await Promise.all([
        prisma.queueEntry.count({ where: { eventId: event.id, estado: "ESPERANDO" } }),
        prisma.queueEntry.count({ where: { eventId: event.id, estado: "ACTIVO" } }),
        prisma.queueEntry.count({ where: { eventId: event.id, estado: "COMPLETADO" } }),
        prisma.queueEntry.count({ where: { eventId: event.id, estado: "EXPIRADO" } }),
        prisma.queueEntry.count({ where: { eventId: event.id, estado: "ESPERANDO", userId: { startsWith: TEST_USER_PREFIX } } }),
        prisma.queueEntry.count({ where: { eventId: event.id, estado: "ACTIVO", userId: { startsWith: TEST_USER_PREFIX } } }),
      ]);

      const queueStillRunning = waitingTests > 0 || activeTests > 0;
      if (ticks % 2 === 0 || !queueStillRunning) {
        console.log(
          `[queue-stress] Tick ${ticks}: waiting=${waiting}, active=${active}, completed=${completed}, expired=${expired}, testWaiting=${waitingTests}, testActive=${activeTests}`
        );
      }

      if (!queueStillRunning) {
        console.log("[queue-stress] Test queue completed fully. No test users left waiting or active.");
        console.log(`[queue-stress] Summary: promoted=${totalPromoted}, completed=${totalCompleted}`);
        break;
      }

      await sleep(LOOP_INTERVAL_MS);
    }

    console.log(`[queue-stress] Total runtime: ${Date.now() - start}ms`);
  } finally {
    await prisma.queueEntry.deleteMany({ where: { eventId: event.id } });
    await prisma.event.delete({ where: { id: event.id } });
    await prisma.$disconnect();
  }
}

main().catch(async (err) => {
  console.error("[queue-stress] Failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});

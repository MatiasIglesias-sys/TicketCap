/**
 * DEMO FILA VIRTUAL — TicketsCap
 *
 * Simula 500 usuarios en cola para un evento.
 * Cada 5 segundos, 50 usuarios "compran" y salen de la cola.
 * Ideal para mostrarle al cliente cómo funciona el sistema en tiempo real.
 *
 * Uso:
 *   npx tsx scripts/demo-fila.ts
 *   npx tsx scripts/demo-fila.ts --limpiar   (solo limpia los datos del demo)
 *
 * Abrí el panel admin en http://localhost:3000/admin/cola para verlo en vivo.
 */

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

// ── Carga .env.local ────────────────────────────────────────────────────────
function loadEnv() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const sep = t.indexOf("=");
    if (sep === -1) continue;
    const key = t.slice(0, sep).trim();
    const val = t.slice(sep + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const prisma = new PrismaClient();

const TOTAL_USUARIOS = 500;
const BATCH_CADA_TICK = 50;   // usuarios que "compran" por tick
const TICK_MS = 5_000;        // cada 5 segundos
const QUEUE_MAX_CONCURRENT = 50;    // debe coincidir con src/lib/queue.ts
const QUEUE_ACCESS_MINUTES = 15;    // debe coincidir con src/lib/queue.ts

// ── Helpers ─────────────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function log(msg: string) {
  const ts = new Date().toLocaleTimeString("es-UY");
  console.log(`[${ts}] ${msg}`);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const limpiar = process.argv.includes("--limpiar");

  // ── Obtener el primer evento disponible ─────────────────────────────────
  const evento = await prisma.event.findFirst({
    orderBy: { fecha: "asc" },
    where: { fecha: { gte: new Date() } },
  });

  if (!evento) {
    console.error("❌  No hay eventos futuros. Creá uno desde el panel admin primero.");
    process.exit(1);
  }

  log(`📋 Evento seleccionado: ${evento.nombre}`);

  // ── Modo limpieza ────────────────────────────────────────────────────────
  if (limpiar) {
    const { count } = await prisma.queueEntry.deleteMany({
      where: { eventId: evento.id, userId: { startsWith: "demo-" } },
    });
    log(`🧹 Eliminados ${count} registros del demo.`);
    await prisma.$disconnect();
    return;
  }

  // ── Limpiar demo anterior si hubiera ────────────────────────────────────
  await prisma.queueEntry.deleteMany({
    where: { eventId: evento.id, userId: { startsWith: "demo-" } },
  });

  // ── Activar fila virtual en el evento ────────────────────────────────────
  await prisma.event.update({
    where: { id: evento.id },
    data: { filaVirtual: true },
  });
  log(`✅ Fila virtual activada para "${evento.nombre}"`);

  // ── Insertar 500 usuarios ficticios en la cola ──────────────────────────
  log(`⏳ Insertando ${TOTAL_USUARIOS} usuarios en la cola...`);

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // expira en 24h

  const accessExpiry = new Date(Date.now() + QUEUE_ACCESS_MINUTES * 60 * 1000);

  const entries = Array.from({ length: TOTAL_USUARIOS }, (_, i) => {
    const isActivo = i < QUEUE_MAX_CONCURRENT; // primeros 50 ocupan slots ACTIVO
    return {
      id: `demo-entry-${i}`,
      userId: `demo-user-${i}`,
      eventId: evento.id,
      token: `demo-token-${i}-${Date.now()}`,
      estado: isActivo ? "ACTIVO" : "ESPERANDO",
      posicion: isActivo ? 0 : i - QUEUE_MAX_CONCURRENT + 1,
      prioridad: i % 5 === 0 ? 1 : 0,
      expiresAt,
      createdAt: new Date(Date.now() - (TOTAL_USUARIOS - i) * 1000),
      ...(isActivo ? { accessExpiry } : {}),
    };
  });

  // Insertar en lotes de 100 para no saturar SQLite
  for (let i = 0; i < entries.length; i += 100) {
    await prisma.queueEntry.createMany({
      data: entries.slice(i, i + 100) as any,
    });
  }

  log(`✅ ${TOTAL_USUARIOS} usuarios en cola.`);
  log(`🎬 Iniciando demo — cada 5s salen ${BATCH_CADA_TICK} usuarios.`);
  log(`👁️  Abrí http://localhost:3000/admin/cola para verlo en vivo.\n`);

  // ── Loop: cada tick, un lote de ACTIVOS "compra" y se reemplazan con ESPERANDO ──
  let completados = 0;

  while (true) {
    await sleep(TICK_MS);

    // 1. Completar un lote de ACTIVOS (simulan que terminaron la compra)
    const activosACompletar = await prisma.queueEntry.findMany({
      where: { eventId: evento.id, userId: { startsWith: "demo-" }, estado: "ACTIVO" },
      take: BATCH_CADA_TICK,
      select: { id: true },
    });

    if (activosACompletar.length === 0) break;

    await prisma.queueEntry.updateMany({
      where: { id: { in: activosACompletar.map((c) => c.id) } },
      data: { estado: "COMPLETADO" },
    });
    completados += activosACompletar.length;

    // 2. Avanzar ESPERANDO → ACTIVO para llenar los slots liberados
    const nuevosActivos = await prisma.queueEntry.findMany({
      where: { eventId: evento.id, userId: { startsWith: "demo-" }, estado: "ESPERANDO" },
      orderBy: [{ prioridad: "desc" }, { posicion: "asc" }],
      take: activosACompletar.length,
      select: { id: true },
    });

    if (nuevosActivos.length > 0) {
      const newAccessExpiry = new Date(Date.now() + QUEUE_ACCESS_MINUTES * 60 * 1000);
      await prisma.queueEntry.updateMany({
        where: { id: { in: nuevosActivos.map((c) => c.id) } },
        data: { estado: "ACTIVO", posicion: 0, accessExpiry: newAccessExpiry },
      });
    }

    const esperando = await prisma.queueEntry.count({
      where: { eventId: evento.id, userId: { startsWith: "demo-" }, estado: "ESPERANDO" },
    });
    const activos = await prisma.queueEntry.count({
      where: { eventId: evento.id, userId: { startsWith: "demo-" }, estado: "ACTIVO" },
    });

    log(`🎫 ${activosACompletar.length} compraron, ${nuevosActivos.length} avanzaron → ${activos} activos, ${esperando} esperando, ${completados} completados`);
  }

  log(`\n🏁 Demo finalizado. Todos los usuarios pasaron por la fila.`);
  log(`🧹 Limpiando... (o corré con --limpiar para hacerlo manualmente)`);

  await prisma.queueEntry.deleteMany({
    where: { eventId: evento.id, userId: { startsWith: "demo-" } },
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});

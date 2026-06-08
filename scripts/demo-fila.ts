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

  const entries = Array.from({ length: TOTAL_USUARIOS }, (_, i) => ({
    id: `demo-entry-${i}`,
    userId: `demo-user-${i}`,
    eventId: evento.id,
    token: `demo-token-${i}-${Date.now()}`,
    estado: "ESPERANDO",
    posicion: i + 1,
    prioridad: i % 5 === 0 ? 1 : 0, // 1 de cada 5 es socio con prioridad
    expiresAt,
    createdAt: new Date(Date.now() - (TOTAL_USUARIOS - i) * 1000),
  }));

  // Insertar en lotes de 100 para no saturar SQLite
  for (let i = 0; i < entries.length; i += 100) {
    await prisma.queueEntry.createMany({
      data: entries.slice(i, i + 100) as any,
    });
  }

  log(`✅ ${TOTAL_USUARIOS} usuarios en cola.`);
  log(`🎬 Iniciando demo — cada 5s salen ${BATCH_CADA_TICK} usuarios.`);
  log(`👁️  Abrí http://localhost:3000/admin/cola para verlo en vivo.\n`);

  // ── Loop: cada 5 segundos, marcar 50 como COMPLETADO ────────────────────
  let total = TOTAL_USUARIOS;

  while (total > 0) {
    await sleep(TICK_MS);

    // Tomar los primeros BATCH_CADA_TICK en ESPERANDO
    const candidatos = await prisma.queueEntry.findMany({
      where: { eventId: evento.id, userId: { startsWith: "demo-" }, estado: "ESPERANDO" },
      orderBy: { posicion: "asc" },
      take: BATCH_CADA_TICK,
      select: { id: true },
    });

    if (candidatos.length === 0) break;

    // Marcarlos ACTIVO (comprando) por 2 segundos, luego COMPLETADO
    await prisma.queueEntry.updateMany({
      where: { id: { in: candidatos.map((c) => c.id) } },
      data: { estado: "ACTIVO", accessExpiry: new Date(Date.now() + 2000) },
    });

    await sleep(2000);

    await prisma.queueEntry.updateMany({
      where: { id: { in: candidatos.map((c) => c.id) } },
      data: { estado: "COMPLETADO" },
    });

    total -= candidatos.length;

    const esperando = await prisma.queueEntry.count({
      where: { eventId: evento.id, userId: { startsWith: "demo-" }, estado: "ESPERANDO" },
    });

    log(`🎫 ${candidatos.length} usuarios compraron → ${esperando} en espera, ${TOTAL_USUARIOS - esperando} completados`);
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

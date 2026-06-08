/**
 * Simulación de fila virtual — modo interactivo para probar como usuario real.
 *
 * Modos:
 *   --setup   Crea el evento + llena la cola con usuarios falsos. Luego entrá al evento en el browser.
 *   --drain   Libera slots de a poco (cada N segundos) para que veas cómo avanzás. (Ctrl+C para parar)
 *   --clean   Borra todos los datos de simulación.
 *
 * Ejemplo de uso:
 *   1) npx tsx scripts/simulate-queue.ts --setup
 *   2) Entrás al evento en el browser y te unís a la fila
 *   3) npx tsx scripts/simulate-queue.ts --drain --interval=8
 */

import { PrismaClient } from "@prisma/client";
import { createHmac, randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const QUEUE_MAX_CONCURRENT = 50;
const QUEUE_ACCESS_MINUTES = 15;
const SECRET              = process.env.QR_SECRET ?? "queue-secret";
const SIM_TAG             = "SIM_QUEUE_";
const FAKE_ACTIVO         = 50;   // llenar todos los slots
const FAKE_ESPERANDO      = 1000; // cuántos poner en la fila antes que vos

function signAccessToken(userId: string, eventId: string): string {
  const expiresAt = Date.now() + QUEUE_ACCESS_MINUTES * 60 * 1000;
  const payload   = `${userId}:${eventId}:${expiresAt}`;
  const sig       = createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 24);
  return Buffer.from(JSON.stringify({ userId, eventId, expiresAt, sig })).toString("base64url");
}

function newToken() { return randomBytes(24).toString("hex"); }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function getSimEvent() {
  return prisma.event.findFirst({ where: { nombre: { startsWith: SIM_TAG } } });
}

// ── SETUP ─────────────────────────────────────────────────────────────────────

async function setup() {
  const existing = await getSimEvent();
  if (existing) {
    console.log(`\n⚠️  Ya existe un evento de simulación: "${existing.nombre}"`);
    console.log(`   Corré --clean primero si querés empezar de cero.\n`);
    return;
  }

  console.log("\n🔧 SETUP — Creando escenario de prueba");
  console.log("─".repeat(50));

  // Crear evento
  const event = await prisma.event.create({
    data: {
      nombre:        `${SIM_TAG}Clásico del Siglo`,
      rival:         "Nacional",
      fecha:         new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      torneo:        "CLAUSURA",
      estado:        "PROXIMO",
      ventaEstado:   "VENTA_GENERAL",
      filaVirtual:   true,
      limiteXUsuario: 4,
    },
  });
  await prisma.sector.create({
    data: {
      eventId:     event.id,
      nombre:      "Tribuna Popular",
      tipo:        "POPULAR",
      capacidad:   500,
      disponibles: 500,
      precio:      500,
      precioSocio: 0,
    },
  });
  console.log(`✅ Evento creado: "${event.nombre}"`);
  console.log(`   ID: ${event.id}`);

  // Crear usuarios falsos en lotes para velocidad
  const totalFake = FAKE_ACTIVO + FAKE_ESPERANDO;
  console.log(`\n👥 Creando ${totalFake} usuarios falsos (en lotes)...`);
  const hashedPwd = await bcrypt.hash("sim-password", 10);
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const BATCH     = 50;

  // Crear todos los usuarios de una en lotes
  const userRows = Array.from({ length: totalFake }, (_, i) => ({
    email:    `${SIM_TAG}user${i + 1}@sim.test`,
    name:     `Simulado ${i + 1}`,
    password: hashedPwd,
    role:     "HINCHA",
  }));

  for (let b = 0; b < userRows.length; b += BATCH) {
    await prisma.user.createMany({ data: userRows.slice(b, b + BATCH) });
    process.stdout.write(`\r   Usuarios: ${Math.min(b + BATCH, totalFake)}/${totalFake}`);
  }
  console.log();

  // Obtener IDs en orden
  const users = await prisma.user.findMany({
    where:   { email: { startsWith: SIM_TAG } },
    orderBy: { email: "asc" },
    select:  { id: true },
  });

  // Crear entradas de cola en lotes
  console.log(`   Creando entradas de cola...`);
  const queueRows: any[] = [];
  for (let i = 0; i < users.length; i++) {
    const isActivo = i < FAKE_ACTIVO;
    if (isActivo) {
      const accessToken  = signAccessToken(users[i].id, event.id);
      const accessExpiry = new Date(Date.now() + QUEUE_ACCESS_MINUTES * 60 * 1000);
      queueRows.push({
        userId: users[i].id, eventId: event.id,
        token: newToken(), posicion: 0, prioridad: 0,
        estado: "ACTIVO", accessToken, accessExpiry, expiresAt,
      });
    } else {
      queueRows.push({
        userId: users[i].id, eventId: event.id,
        token: newToken(), posicion: i - FAKE_ACTIVO + 1, prioridad: 0,
        estado: "ESPERANDO", expiresAt,
      });
    }
  }

  for (let b = 0; b < queueRows.length; b += BATCH) {
    await (prisma.queueEntry as any).createMany({ data: queueRows.slice(b, b + BATCH) });
    process.stdout.write(`\r   Cola: ${Math.min(b + BATCH, queueRows.length)}/${queueRows.length}`);
  }
  console.log();

  console.log(`\n\n✅ Cola lista:`);
  console.log(`   Comprando ahora : ${FAKE_ACTIVO} (slots llenos al tope)`);
  console.log(`   En la fila      : ${FAKE_ESPERANDO} usuarios falsos esperando`);

  console.log(`\n${"─".repeat(50)}`);
  console.log(`🌐 PRÓXIMO PASO:`);
  console.log(`   Abrí el browser y andá a:`);
  console.log(`   http://localhost:3000/eventos/${event.id}`);
  console.log(`\n   Al dar "Continuar" vas a entrar a la fila en posición ~${FAKE_ESPERANDO + 1}`);
  console.log(`\n   Después corré en otra terminal:`);
  console.log(`   npx tsx scripts/simulate-queue.ts --drain`);
  console.log(`${"─".repeat(50)}\n`);
}

// ── DRAIN ─────────────────────────────────────────────────────────────────────

async function drain(intervalSeconds: number, batch: number = 1) {
  const event = await getSimEvent();
  if (!event) {
    console.log("\n❌ No hay evento de simulación. Corré --setup primero.\n");
    return;
  }

  console.log(`\n🔄 DRAIN — Liberando ${batch} slot(s) cada ${intervalSeconds}s`);
  console.log(`   Evento: "${event.nombre}"`);
  console.log(`   Ctrl+C para parar\n`);
  console.log("─".repeat(50));

  let ronda = 0;

  while (true) {
    ronda++;

    // Contar estado actual
    const [activo, esperando, completado] = await Promise.all([
      (prisma.queueEntry as any).count({ where: { eventId: event.id, estado: "ACTIVO" } }),
      (prisma.queueEntry as any).count({ where: { eventId: event.id, estado: "ESPERANDO" } }),
      (prisma.queueEntry as any).count({ where: { eventId: event.id, estado: "COMPLETADO" } }),
    ]);

    const ts = new Date().toLocaleTimeString("es-UY");

    if (activo === 0 && esperando === 0) {
      console.log(`[${ts}] ✅ Cola vacía — todos completados (${completado} total).`);
      break;
    }

    // Obtener IDs de usuarios falsos
    const simUserIds = await prisma.user
      .findMany({ where: { email: { startsWith: SIM_TAG } }, select: { id: true } })
      .then(us => us.map(u => u.id));

    // Tomar N usuarios falsos ACTIVOS y marcarlos como COMPLETADO
    const fakesActivos = await (prisma.queueEntry as any).findMany({
      where: { eventId: event.id, estado: "ACTIVO", userId: { in: simUserIds } },
      take: batch,
    });

    if (fakesActivos.length > 0) {
      await (prisma.queueEntry as any).updateMany({
        where: { id: { in: fakesActivos.map((e: any) => e.id) } },
        data:  { estado: "COMPLETADO" },
      });

      const nuevosComp = completado + fakesActivos.length;
      console.log(`[${ts}] Ronda ${ronda}: ${fakesActivos.length} slots liberados → Comprando: ${activo - fakesActivos.length} | En fila: ${esperando} | Completados: ${nuevosComp}`);
      console.log(`        (el browser actualiza posición en ~8s)`);
    } else {
      console.log(`[${ts}] No quedan falsos comprando. Activos reales: ${activo}, En fila: ${esperando}`);
    }

    console.log();
    await sleep(intervalSeconds * 1000);
  }

  console.log("\n─".repeat(50));
  console.log("Cuando termines de probar, limpiá con:");
  console.log("npx tsx scripts/simulate-queue.ts --clean\n");
}

// ── CLEAN ─────────────────────────────────────────────────────────────────────

async function clean() {
  console.log("\n🧹 Limpiando datos de simulación...");

  const event = await getSimEvent();
  const simUsers = await prisma.user.findMany({ where: { email: { startsWith: SIM_TAG } } });
  const simUserIds = simUsers.map(u => u.id);

  if (!event && simUserIds.length === 0) {
    console.log("   No hay datos de simulación.\n");
    return;
  }

  if (event) {
    await (prisma.queueEntry as any).deleteMany({ where: { eventId: event.id } });
    await prisma.ticket.deleteMany({ where: { eventId: event.id } });
  }

  if (simUserIds.length) {
    await prisma.order.deleteMany({ where: { userId: { in: simUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: simUserIds } } });
  }

  if (event) {
    await prisma.sector.deleteMany({ where: { eventId: event.id } });
    await prisma.event.delete({ where: { id: event.id } });
  }

  console.log(`   Evento eliminado: ${event?.nombre ?? "(ya no existía)"}`);
  console.log(`   Usuarios eliminados: ${simUserIds.length}`);
  console.log("✅ Limpieza completa.\n");
}

// ── Entry point ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const intervalArg = args.find(a => a.startsWith("--interval="));
const intervalSec = intervalArg ? parseInt(intervalArg.split("=")[1]) : 3;
const batchArg    = args.find(a => a.startsWith("--batch="));
const batchSize   = batchArg ? parseInt(batchArg.split("=")[1]) : 1;

(async () => {
  try {
    if (args.includes("--clean"))       await clean();
    else if (args.includes("--drain"))  await drain(intervalSec, batchSize);
    else if (args.includes("--setup"))  await setup();
    else {
      console.log("\nUso:");
      console.log("  npx tsx scripts/simulate-queue.ts --setup");
      console.log("  npx tsx scripts/simulate-queue.ts --drain [--interval=10]");
      console.log("  npx tsx scripts/simulate-queue.ts --clean\n");
    }
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();

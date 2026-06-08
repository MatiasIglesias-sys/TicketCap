/**
 * Genera banners para todos los eventos en la DB.
 * Uso: DATABASE_URL="file:./dev.db" npx tsx scripts/generate-banners.ts
 */
import { PrismaClient } from "@prisma/client";
import { generateMatchBanner } from "../src/lib/banner";

const prisma = new PrismaClient();

async function main() {
  const events = await prisma.event.findMany({
    select: { id: true, torneo: true, rival: true, rivalEscudo: true, nombre: true },
  });

  console.log(`\n🎨 Generando banners para ${events.length} eventos...\n`);

  for (const ev of events) {
    process.stdout.write(`  ${ev.nombre.padEnd(40)} → `);
    await new Promise((r) => setTimeout(r, 600)); // throttle to avoid Wikimedia rate limits
    const url = await generateMatchBanner({
      eventId:    ev.id,
      torneo:     ev.torneo,
      rivalEscudo: ev.rivalEscudo,
      rivalName:  ev.rival,
    });

    if (url) {
      await prisma.event.update({ where: { id: ev.id }, data: { imageUrl: url } });
      console.log(`✅ ${url}`);
    } else {
      console.log("❌ error");
    }
  }

  console.log("\n✅ Listo!\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });

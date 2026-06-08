/**
 * Busca logos de equipos rivales en TheSportsDB y Wikipedia,
 * actualiza rivalEscudo en la DB y regenera todos los banners.
 *
 * Uso: DATABASE_URL="file:./dev.db" npx tsx scripts/fetch-logos.ts
 */
import { PrismaClient } from "@prisma/client";
import { generateMatchBanner } from "../src/lib/banner";

const prisma = new PrismaClient();

// ── Overrides manuales con URLs conocidas y verificadas ───────────────────────
const MANUAL_LOGOS: Record<string, string> = {
  "Nacional":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Club_Nacional_de_Football.png/330px-Club_Nacional_de_Football.png",
  "Corinthians":
    "https://upload.wikimedia.org/wikipedia/en/thumb/5/5a/Sport_Club_Corinthians_Paulista_crest.svg/330px-Sport_Club_Corinthians_Paulista_crest.svg.png",
  "Liverpool FC":
    "https://upload.wikimedia.org/wikipedia/commons/2/22/Liverpool_fc_uy_logo.png",
  "Racing Club":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Racing_Club_Escudo.png/330px-Racing_Club_Escudo.png",
  "Montevideo Wanderers":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Escudo_del_Montevideo_Wanderers_Futbol_Club.png/330px-Escudo_del_Montevideo_Wanderers_Futbol_Club.png",
  "Defensor Sporting":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Defensor_Sporting.svg/330px-Defensor_Sporting.svg.png",
  "Cerro Largo FC":
    "https://upload.wikimedia.org/wikipedia/commons/e/ef/Cerro_Largo_2020.png",
  "CA Juventud":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Juventud_de_Las_Piedras.png/330px-Juventud_de_Las_Piedras.png",
  "Platense":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Club_Alt%C3%A9tico_Platense_crest_%282025%29.svg/330px-Club_Alt%C3%A9tico_Platense_crest_%282025%29.svg.png",
  "Independiente Santa Fe":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Independiente_Santa_Fe_logo.svg/330px-Independiente_Santa_Fe_logo.svg.png",
};

// ── Búsquedas específicas en TheSportsDB por equipo ───────────────────────────
// El campo `country` filtra resultados cuando hay ambigüedad (ej: Racing, Liverpool)
const SEARCH_CONFIG: Record<string, { query: string; country?: string }> = {
  "Liverpool FC":          { query: "Liverpool",            country: "Uruguay"   },
  "CA Juventud":           { query: "Juventud",             country: "Uruguay"   },
  "Racing Club":           { query: "Racing Club",          country: "Uruguay"   },
  "Montevideo Wanderers":  { query: "Wanderers",            country: "Uruguay"   },
  "Defensor Sporting":     { query: "Defensor Sporting",    country: "Uruguay"   },
  "Cerro Largo FC":        { query: "Cerro Largo",          country: "Uruguay"   },
  "Platense":              { query: "Platense",              country: "Argentina" },
  "Independiente Santa Fe":{ query: "Independiente Santa Fe", country: "Colombia"},
  "Malvín":                { query: "Malvin",               country: "Uruguay"   },
};

// ── TheSportsDB search ────────────────────────────────────────────────────────
async function searchSportsDB(query: string, country?: string): Promise<string | null> {
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(query)}`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    const data = await res.json();

    if (!data?.teams?.length) return null;

    let teams = data.teams as Array<{ strTeamBadge?: string; strCountry?: string }>;

    // Filter by country if provided
    if (country) {
      const filtered = teams.filter((t) =>
        t.strCountry?.toLowerCase().includes(country.toLowerCase())
      );
      if (filtered.length) teams = filtered;
    }

    const logo = teams[0]?.strTeamBadge;
    return logo ?? null;
  } catch {
    return null;
  }
}

const FETCH_HEADERS = { "User-Agent": "TicketCAP/1.0 (ticketscap.com)" };

// ── Verify a URL actually returns an image ────────────────────────────────────
async function verifyUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", headers: FETCH_HEADERS, signal: AbortSignal.timeout(5_000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const events = await prisma.event.findMany({
    select: { id: true, rival: true, rivalEscudo: true, torneo: true, nombre: true },
  });

  console.log(`\n🔍 Buscando logos para ${events.length} eventos...\n`);

  for (const ev of events) {
    const pad = ev.nombre.padEnd(42);
    process.stdout.write(`  ${pad} → `);

    // 1. Manual override
    const manual = MANUAL_LOGOS[ev.rival];
    if (manual) {
      await prisma.event.update({ where: { id: ev.id }, data: { rivalEscudo: manual } });
      console.log(`✅ manual  ${manual.slice(0, 60)}...`);
      continue;
    }

    // 2. Existing URL still valid
    if (ev.rivalEscudo) {
      const ok = await verifyUrl(ev.rivalEscudo);
      if (ok) {
        console.log(`✅ existente`);
        continue;
      }
    }

    // 3. TheSportsDB search
    const cfg   = SEARCH_CONFIG[ev.rival];
    const query = cfg?.query ?? ev.rival;
    const logo  = await searchSportsDB(query, cfg?.country);

    if (logo) {
      await prisma.event.update({ where: { id: ev.id }, data: { rivalEscudo: logo } });
      console.log(`✅ TheSportsDB  ${logo.slice(0, 60)}...`);
    } else {
      console.log("⚠️  no encontrado — se usarán iniciales");
    }
  }

  // ── Regenerar todos los banners ───────────────────────────────────────────
  console.log("\n🎨 Regenerando banners...\n");

  const updated = await prisma.event.findMany({
    select: { id: true, rival: true, rivalEscudo: true, torneo: true, nombre: true },
  });

  for (const ev of updated) {
    process.stdout.write(`  ${ev.nombre.padEnd(42)} → `);
    const url = await generateMatchBanner({
      eventId:    ev.id,
      torneo:     ev.torneo,
      rivalEscudo: ev.rivalEscudo,
      rivalName:  ev.rival,
    });
    if (url) {
      await prisma.event.update({ where: { id: ev.id }, data: { imageUrl: url } });
      console.log(`✅`);
    } else {
      console.log("❌");
    }
  }

  console.log("\n✅ Listo!\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });

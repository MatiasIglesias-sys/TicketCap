/**
 * Team logo lookup — used by the API to auto-fetch logos on event creation.
 * Priority: 1) KNOWN_LOGOS (case-insensitive, fuzzy)  2) TheSportsDB  3) Wikipedia
 *
 * Formats soportados:
 *   "Boca Juniors"           exacto
 *   "boca juniors"           minúsculas
 *   "BOCA JUNIORS"           mayúsculas
 *   "Boca Juniors (arg)"     con hint de país → filtra TheSportsDB por Argentina
 *   "Racing Uruguay"         palabra final como país → se prueba "Racing" sola
 *   "Defensor Sporting Club" → encuentra "Defensor Sporting" por matching parcial
 */

// ── Normalización ─────────────────────────────────────────────────────────────
// IMPORTANTE: normStr se define PRIMERO porque KNOWN_LOGOS_NORMALIZED la usa
// al inicializarse (scope de módulo).

function normStr(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ── Known logos (verified URLs, todas testeadas 200) ──────────────────────────
export const KNOWN_LOGOS: Record<string, string> = {
  // Uruguay — Fútbol
  "Nacional":               "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Club_Nacional_de_Football.png/330px-Club_Nacional_de_Football.png",
  "Liverpool FC":           "https://upload.wikimedia.org/wikipedia/commons/2/22/Liverpool_fc_uy_logo.png",
  "Racing Club":            "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Racing_Club_Escudo.png/330px-Racing_Club_Escudo.png",
  "Montevideo Wanderers":   "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Escudo_del_Montevideo_Wanderers_Futbol_Club.png/330px-Escudo_del_Montevideo_Wanderers_Futbol_Club.png",
  "Defensor Sporting":      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Defensor_Sporting.svg/330px-Defensor_Sporting.svg.png",
  "Cerro Largo FC":         "https://upload.wikimedia.org/wikipedia/commons/e/ef/Cerro_Largo_2020.png",
  "CA Juventud":            "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Juventud_de_Las_Piedras.png/330px-Juventud_de_Las_Piedras.png",
  "Cerro":                  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Escudo_del_Club_Atl%C3%A9tico_Cerro.svg/200px-Escudo_del_Club_Atl%C3%A9tico_Cerro.svg.png",
  "Danubio":                "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Danubio_F.C._Logo.svg/200px-Danubio_F.C._Logo.svg.png",
  "Fenix":                  "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Centro_Atletico_Fenix.png/200px-Centro_Atletico_Fenix.png",
  "Boston River":           "https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Boston_River_FC_Logo.svg/200px-Boston_River_FC_Logo.svg.png",
  "Plaza Colonia":          "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Plaza_Colonia_logo.svg/200px-Plaza_Colonia_logo.svg.png",
  "Malvín":                 "/images/logos/malvin.png",
  // Argentina — Fútbol
  "Boca Juniors":           "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Boca_Juniors_logo18.svg/250px-Boca_Juniors_logo18.svg.png",
  "River Plate":            "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Club_Atl%C3%A9tico_River_Plate_logo.svg/250px-Club_Atl%C3%A9tico_River_Plate_logo.svg.png",
  "Platense":               "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Club_Alt%C3%A9tico_Platense_crest_%282025%29.svg/330px-Club_Alt%C3%A9tico_Platense_crest_%282025%29.svg.png",
  // Brasil — Fútbol
  "Corinthians":            "https://upload.wikimedia.org/wikipedia/en/thumb/5/5a/Sport_Club_Corinthians_Paulista_crest.svg/330px-Sport_Club_Corinthians_Paulista_crest.svg.png",
  "Flamengo":               "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Clube_de_Regatas_do_Flamengo_logo.svg/250px-Clube_de_Regatas_do_Flamengo_logo.svg.png",
  "Fluminense":             "https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Fluminense_football_club_crest.svg/200px-Fluminense_football_club_crest.svg.png",
  "Palmeiras":              "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Palmeiras_logo.svg/200px-Palmeiras_logo.svg.png",
  "Santos":                 "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Santos_FC_Logo.svg/200px-Santos_FC_Logo.svg.png",
  "Atlético Mineiro":       "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Clube_Atletico_Mineiro_crest.svg/200px-Clube_Atletico_Mineiro_crest.svg.png",
  // Colombia — Fútbol
  "Independiente Santa Fe": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Independiente_Santa_Fe_logo.svg/330px-Independiente_Santa_Fe_logo.svg.png",
  // Rugby — Súper Rugby Américas
  "Capibaras XV":           "https://upload.wikimedia.org/wikipedia/en/thumb/9/9e/Capibaras_xv_logo.png/250px-Capibaras_xv_logo.png",
  "Dogos XV":               "https://upload.wikimedia.org/wikipedia/en/thumb/f/ff/Dogos_xv_rugby_logo.png/250px-Dogos_xv_rugby_logo.png",
  "Pampas":                 "https://upload.wikimedia.org/wikipedia/en/thumb/1/1c/Pampas_XV_logo.png/250px-Pampas_XV_logo.png",
};

// Mapa normalizado: clave → URL (construido después de normStr)
const KNOWN_LOGOS_NORMALIZED = new Map<string, string>(
  Object.entries(KNOWN_LOGOS).map(([k, v]) => [normStr(k), v])
);

// ── Country hints ─────────────────────────────────────────────────────────────
const COUNTRY_HINTS: Record<string, string> = {
  arg: "Argentina", ar: "Argentina",
  uru: "Uruguay",   uy: "Uruguay",
  bra: "Brazil",    br: "Brazil",
  col: "Colombia",  co: "Colombia",
  chi: "Chile",     cl: "Chile",
  par: "Paraguay",  py: "Paraguay",
  bol: "Bolivia",   bo: "Bolivia",
  per: "Peru",      pe: "Peru",
  ven: "Venezuela", ve: "Venezuela",
  ecu: "Ecuador",   ec: "Ecuador",
  mex: "Mexico",    mx: "Mexico",
  usa: "United States", us: "United States",
};

const FETCH_HEADERS = {
  "User-Agent": "TicketCAP/1.0 (ticketscap.com)",
  Accept: "image/png,image/jpeg,image/*,*/*",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** "Boca Juniors (arg)" → { name: "Boca Juniors", country: "Argentina" } */
function parseName(raw: string): { name: string; country?: string } {
  const hintMatch = raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (hintMatch) {
    const name    = hintMatch[1].trim();
    const code    = hintMatch[2].trim().toLowerCase();
    const country = COUNTRY_HINTS[code];
    return { name, country };
  }
  return { name: raw.trim() };
}

/** Genera variaciones del nombre para maximizar chances de match */
function variations(name: string): string[] {
  const words   = name.trim().split(/\s+/);
  const set     = new Set<string>();

  set.add(name.trim());

  // Sin la última palabra ("Racing Uruguay" → "Racing")
  if (words.length >= 2) set.add(words.slice(0, -1).join(" "));

  // Solo la primera palabra
  if (words.length >= 2) set.add(words[0]);

  // Sin sufijos comunes: FC, Club, XV, CF, AC, SC, RC, SA, SAD
  const stripped = name
    .replace(/\b(FC|Club|XV|CF|AC|SC|RC|SA|SAD|SL|CD|CF)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped && stripped !== name.trim()) set.add(stripped);

  return [...set].filter(Boolean);
}

/** Busca en KNOWN_LOGOS con matching fuzzy:
 *  1. Exacto normalizado
 *  2. La variante contiene una clave conocida
 *  3. Una clave conocida contiene la variante
 */
function lookupKnown(input: string): string | null {
  const norm = normStr(input);

  // 1. Exacto
  const exact = KNOWN_LOGOS_NORMALIZED.get(norm);
  if (exact) return exact;

  // 2. El input contiene una clave conocida
  //    Ej: "defensor sporting club" contiene "defensor sporting" → match
  //    Requiere que la clave tenga al menos 2 palabras para evitar falsos positivos
  //    con palabras comunes como "Montevideo", "Nacional", etc.
  for (const [key, url] of KNOWN_LOGOS_NORMALIZED) {
    if (key.includes(" ") && norm.includes(key)) return url;
  }

  return null;
}

async function searchTheSportsDB(query: string, country?: string): Promise<string | null> {
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    const data = await res.json();
    if (!data?.teams?.length) return null;

    let teams = data.teams as Array<{ strTeamBadge?: string; strCountry?: string }>;
    if (country) {
      const filtered = teams.filter((t) =>
        t.strCountry?.toLowerCase().includes(country.toLowerCase())
      );
      if (filtered.length) teams = filtered;
    }
    return teams[0]?.strTeamBadge ?? null;
  } catch {
    return null;
  }
}

async function searchWikipedia(query: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const d = await res.json();
    return d.thumbnail?.source ?? d.originalimage?.source ?? null;
  } catch {
    return null;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function findTeamLogo(teamName: string): Promise<string | null> {
  const { name, country } = parseName(teamName);
  const vars = variations(name);

  // Con hint de país: saltear KNOWN_LOGOS, ir directo a TheSportsDB filtrado
  if (country) {
    for (const v of vars) {
      const hit = await searchTheSportsDB(v, country);
      if (hit) return hit;
    }
    for (const v of vars) {
      const hit = await searchWikipedia(`${v} ${country}`);
      if (hit) return hit;
    }
    for (const v of vars) {
      const hit = await searchWikipedia(v);
      if (hit) return hit;
    }
    return null;
  }

  // Sin hint de país: KNOWN_LOGOS primero (fuzzy), luego TheSportsDB, luego Wikipedia
  for (const v of vars) {
    const hit = lookupKnown(v);
    if (hit) return hit;
  }

  for (const v of vars) {
    const hit = await searchTheSportsDB(v);
    if (hit) return hit;
  }

  for (const v of vars) {
    const hit = await searchWikipedia(v);
    if (hit) return hit;
  }

  return null;
}

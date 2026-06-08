/**
 * Banner generation — composites rival logo onto a tournament template.
 * Output: public/images/banners/{eventId}.webp  (1200×675, 16:9)
 */
import sharp from "sharp";
import path from "path";
import fs from "fs";

// ─── Template selection ───────────────────────────────────────────────────────

const LIBERTADORES_TORNEOS = ["LIBERTADORES", "SUDAMERICANA"];
const BASQUET_TORNEOS = ["BASQUETBOL", "BASQUETBOL_COPA"];
const RUGBY_TORNEOS = ["RUGBY", "RUGBY_COPA", "RUGBY_AMERICAS"];

function templatePath(torneo: string): string {
  const base = path.join(process.cwd(), "public/images");
  if (BASQUET_TORNEOS.includes(torneo)) {
    return path.join(base, "Plantilla basketball peñarol.jpg");
  }
  if (RUGBY_TORNEOS.includes(torneo)) {
    return path.join(base, "Plantilla rugby.png");
  }
  if (LIBERTADORES_TORNEOS.includes(torneo)) {
    return path.join(base, "plantilla libertadores.jpg");
  }
  return path.join(base, "Plantilla uruguayo peñarol.png");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FETCH_HEADERS = {
  "User-Agent": "TicketCAP/1.0 (ticketscap.com)",
  "Accept": "image/png,image/jpeg,image/webp,image/*,*/*",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchBuffer(url: string): Promise<Buffer | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await sleep(1500 * attempt); // 1.5s, 3s backoff
      const res = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(10_000) });
      if (res.status === 429) continue; // rate limited — retry
      if (!res.ok) return null;
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.startsWith("image/")) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      // timeout or network error — retry
    }
  }
  return null;
}

/** SVG circle with team initials — used when no logo URL is available */
function initialsCircle(initials: string, size: number): Buffer {
  const fs2 = Math.round(size * 0.32);
  const r   = size / 2;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${r}" cy="${r}" r="${r - 2}" fill="#2A2A2A" stroke="#555" stroke-width="3"/>
    <text x="${r}" y="${r + fs2 * 0.38}"
      text-anchor="middle" dominant-baseline="middle"
      fill="white" font-family="Arial Black, Arial, sans-serif"
      font-weight="900" font-size="${fs2}px">${initials}</text>
  </svg>`;
  return Buffer.from(svg);
}


// ─── Main export ──────────────────────────────────────────────────────────────

const TARGET_W = 1200;
const TARGET_H = 675;
const LOGO_SIZE = 210; // rival logo size in px

export async function generateMatchBanner(params: {
  eventId: string;
  torneo: string;
  rivalEscudo?: string | null;
  rivalName: string;
}): Promise<string | null> {
  const { eventId, torneo, rivalEscudo, rivalName } = params;

  try {
    // Ensure output directory exists
    const outDir = path.join(process.cwd(), "public/images/banners");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const outPath = path.join(outDir, `${eventId}.webp`);
    const isLib   = LIBERTADORES_TORNEOS.includes(torneo);

    // ── 1. Get rival logo buffer ────────────────────────────────────────────
    let logoBuf: Buffer | null = null;
    if (rivalEscudo) {
      if (rivalEscudo.startsWith("/")) {
        // Local upload — read from disk instead of HTTP fetch
        const localPath = path.join(process.cwd(), "public", rivalEscudo);
        if (fs.existsSync(localPath)) logoBuf = fs.readFileSync(localPath);
      } else {
        logoBuf = await fetchBuffer(rivalEscudo);
      }
    }

    if (!logoBuf) {
      const initials = rivalName
        .split(/\s+/)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2);
      logoBuf = initialsCircle(initials, LOGO_SIZE);
    }

    // ── 2. Resize the rival logo (preserve shape, no circular crop) ─────────
    const logoCircle = await sharp(logoBuf)
      .resize(LOGO_SIZE, LOGO_SIZE, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    // ── 3. Position on template ─────────────────────────────────────────────
    //
    // Libertadores template (1440×810 native):
    //   · CONMEBOL logo + text → LEFT third
    //   · Peñarol shield       → CENTER-RIGHT (~x:620 in 1200px canvas)
    //   · Rival logo           → FAR RIGHT
    //
    // Uruguayo template (native ~800×450):
    //   · Peñarol shield       → LEFT (~x:80)
    //   · Liga logo (small)    → BOTTOM-RIGHT
    //   · Rival logo           → RIGHT CENTER

    let logoTop: number;
    let logoLeft: number;

    if (isLib) {
      logoTop  = Math.round(TARGET_H * 0.20);          // 135px from top
      logoLeft = TARGET_W - LOGO_SIZE - 55;             // 55px from right edge
    } else {
      logoTop  = Math.round((TARGET_H - LOGO_SIZE) * 0.38); // slightly above center
      logoLeft = Math.round(TARGET_W * 0.68);           // right zone
    }

    // ── 4. Composite and export ─────────────────────────────────────────────
    await sharp(templatePath(torneo))
      .resize(TARGET_W, TARGET_H, { fit: "cover", position: "centre" })
      .composite([
        { input: logoCircle, top: logoTop, left: logoLeft, blend: "over" },
      ])
      .webp({ quality: 88 })
      .toFile(outPath);

    return `/images/banners/${eventId}.webp`;
  } catch (err) {
    console.error(`[banner] Failed for ${eventId}:`, err);
    return null;
  }
}

/** Returns the CSS/fallback template URL (no sharp, instant) */
export function templateUrl(torneo: string): string {
  if (BASQUET_TORNEOS.includes(torneo)) return "/images/Plantilla basketball peñarol.jpg";
  if (RUGBY_TORNEOS.includes(torneo)) return "/images/Plantilla rugby.png";
  if (LIBERTADORES_TORNEOS.includes(torneo)) return "/images/plantilla libertadores.jpg";
  return "/images/Plantilla uruguayo peñarol.png";
}

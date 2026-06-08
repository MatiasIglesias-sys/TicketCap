import { createHmac, randomBytes } from "crypto";

const SECRET = process.env.QR_SECRET;
if (!SECRET) {
  throw new Error(
    "La variable de entorno QR_SECRET no está definida.\n" +
    "Generá un secret seguro con:\n" +
    "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"\n" +
    "y agregala a tu archivo .env como QR_SECRET=<valor>"
  );
}

/** Max users simultaneously in purchase window */
export const QUEUE_MAX_CONCURRENT = 50;
/** Minutes a user has to buy once they reach the front */
export const QUEUE_ACCESS_MINUTES = 15;
/** How many users advance per batch */
export const QUEUE_ADVANCE_BATCH = 6;
/** UX cap for displayed wait estimate to avoid unrealistic very long values */
export const QUEUE_ESTIMATE_MAX_MINUTES = 720;

// ── Access token (signed, base64url) ────────────────────────────────────────

export function signAccessToken(userId: string, eventId: string): string {
  const expiresAt = Date.now() + QUEUE_ACCESS_MINUTES * 60 * 1000;
  const payload = `${userId}:${eventId}:${expiresAt}`;
  const sig = createHmac("sha256", SECRET!).update(payload).digest("hex").slice(0, 24);
  return Buffer.from(JSON.stringify({ userId, eventId, expiresAt, sig })).toString(
    "base64url"
  );
}

export function verifyAccessToken(
  token: string
): { userId: string; eventId: string; expiresAt: number } | null {
  try {
    const parsed = JSON.parse(Buffer.from(token, "base64url").toString());
    const { userId, eventId, expiresAt, sig } = parsed as {
      userId: string;
      eventId: string;
      expiresAt: number;
      sig: string;
    };
    const payload = `${userId}:${eventId}:${expiresAt}`;
    const expected = createHmac("sha256", SECRET!)
      .update(payload)
      .digest("hex")
      .slice(0, 24);
    if (sig !== expected) return null;
    if (Date.now() > expiresAt) return null;
    return { userId, eventId, expiresAt };
  } catch {
    return null;
  }
}

export function newQueueToken(): string {
  return randomBytes(24).toString("hex");
}

/** Compute prioridad based on socio category */
export function computePrioridad(socioCategoria: string | undefined, cuotaAlDia: boolean): number {
  if (!cuotaAlDia || !socioCategoria) return 0;
  if (["ACTIVO", "SUSCRIPTOR", "VITALICIO", "INTERIOR"].includes(socioCategoria)) return 2;
  if (socioCategoria === "ADHERENTE") return 1;
  return 0;
}

/** Estimated wait time in minutes given position and concurrency */
export function estimatedWaitMinutes(position: number): number {
  // Approximation: every QUEUE_ACCESS_MINUTES, up to QUEUE_MAX_CONCURRENT users can complete purchase.
  const wavesAhead = Math.ceil(position / QUEUE_MAX_CONCURRENT);
  return Math.max(1, Math.min(wavesAhead * QUEUE_ACCESS_MINUTES, QUEUE_ESTIMATE_MAX_MINUTES));
}

// ── In-memory concurrency tracker (resets on server restart) ────────────────
// Tracks unique IPs viewing an event page in the last 2 minutes

interface Tracker {
  views: Map<string, number>; // ip → last seen timestamp
}

const _trackers = new Map<string, Tracker>();
const VIEW_WINDOW_MS = 120_000; // 2 minutes

export function trackEventView(eventId: string, ip: string): number {
  const now = Date.now();
  if (!_trackers.has(eventId)) {
    _trackers.set(eventId, { views: new Map() });
  }
  const tracker = _trackers.get(eventId)!;
  tracker.views.set(ip, now);

  // Prune stale
  Array.from(tracker.views.entries()).forEach(([k, ts]) => {
    if (now - ts > VIEW_WINDOW_MS) tracker.views.delete(k);
  });

  return tracker.views.size;
}

export function getConcurrentViewers(eventId: string): number {
  const tracker = _trackers.get(eventId);
  if (!tracker) return 0;
  const now = Date.now();
  let count = 0;
  Array.from(tracker.views.values()).forEach((ts) => {
    if (now - ts <= VIEW_WINDOW_MS) count++;
  });
  return count;
}

/** Threshold above which queue auto-activates */
export const QUEUE_AUTO_THRESHOLD = 40;

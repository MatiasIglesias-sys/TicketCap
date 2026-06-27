/**
 * Tests para src/lib/queue.ts
 * Cubre: signAccessToken, verifyAccessToken, computePrioridad,
 *        estimatedWaitMinutes, newQueueToken, trackEventView, getConcurrentViewers
 */

import {
  signAccessToken,
  verifyAccessToken,
  computePrioridad,
  estimatedWaitMinutes,
  newQueueToken,
  trackEventView,
  getConcurrentViewers,
  QUEUE_ACCESS_MINUTES,
  QUEUE_MAX_CONCURRENT,
  QUEUE_ADVANCE_BATCH,
} from "@/lib/queue";

describe("signAccessToken / verifyAccessToken", () => {
  const userId  = "user-abc-123";
  const eventId = "event-xyz-456";

  it("genera un token que se puede verificar", () => {
    const token = signAccessToken(userId, eventId);
    const result = verifyAccessToken(token);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe(userId);
    expect(result!.eventId).toBe(eventId);
  });

  it("el token expira en QUEUE_ACCESS_MINUTES minutos", () => {
    const before = Date.now();
    const token  = signAccessToken(userId, eventId);
    const result = verifyAccessToken(token)!;
    const expected = before + QUEUE_ACCESS_MINUTES * 60 * 1000;
    // tolerancia de 1 segundo
    expect(result.expiresAt).toBeGreaterThanOrEqual(expected - 1000);
    expect(result.expiresAt).toBeLessThanOrEqual(expected + 1000);
  });

  it("retorna null para un token alterado", () => {
    const token   = signAccessToken(userId, eventId);
    const tampered = token.slice(0, -4) + "XXXX";
    expect(verifyAccessToken(tampered)).toBeNull();
  });

  it("retorna null para un token expirado", () => {
    // Creamos un token con expiresAt en el pasado
    const payload = Buffer.from(
      JSON.stringify({ userId, eventId, expiresAt: Date.now() - 1000, sig: "invalidsig" })
    ).toString("base64url");
    expect(verifyAccessToken(payload)).toBeNull();
  });

  it("retorna null para token inválido (no JSON)", () => {
    expect(verifyAccessToken("not-a-valid-base64url-token")).toBeNull();
  });

  it("retorna null para string vacío", () => {
    expect(verifyAccessToken("")).toBeNull();
  });
});

describe("newQueueToken", () => {
  it("genera un string hexadecimal de 48 caracteres", () => {
    const token = newQueueToken();
    expect(token).toMatch(/^[a-f0-9]{48}$/);
  });

  it("genera tokens únicos en cada llamada", () => {
    const t1 = newQueueToken();
    const t2 = newQueueToken();
    expect(t1).not.toBe(t2);
  });
});

describe("computePrioridad", () => {
  it("retorna 2 para socio ACTIVO al día", () => {
    expect(computePrioridad("ACTIVO", true)).toBe(2);
  });

  it("retorna 2 para socio SUSCRIPTOR al día", () => {
    expect(computePrioridad("SUSCRIPTOR", true)).toBe(2);
  });

  it("retorna 2 para socio VITALICIO al día", () => {
    expect(computePrioridad("VITALICIO", true)).toBe(2);
  });

  it("retorna 2 para socio INTERIOR al día", () => {
    expect(computePrioridad("INTERIOR", true)).toBe(2);
  });

  it("retorna 1 para ADHERENTE al día", () => {
    expect(computePrioridad("ADHERENTE", true)).toBe(1);
  });

  it("retorna 0 para HINCHA (sin categoría)", () => {
    expect(computePrioridad(undefined, false)).toBe(0);
  });

  it("retorna 0 si cuota NO está al día", () => {
    expect(computePrioridad("ACTIVO", false)).toBe(0);
    expect(computePrioridad("ADHERENTE", false)).toBe(0);
  });

  it("retorna 0 para categoría INFANTIL al día", () => {
    expect(computePrioridad("INFANTIL", true)).toBe(0);
  });
});

describe("estimatedWaitMinutes", () => {
  it("retorna al menos 1 para posición 1", () => {
    expect(estimatedWaitMinutes(1)).toBeGreaterThanOrEqual(1);
  });

  it("posición mayor tiene mayor espera estimada", () => {
    const wait10  = estimatedWaitMinutes(10);
    const wait101 = estimatedWaitMinutes(101);
    expect(wait101).toBeGreaterThan(wait10);
  });

  it("retorna número positivo siempre", () => {
    for (const pos of [1, 5, 10, 50, 200]) {
      expect(estimatedWaitMinutes(pos)).toBeGreaterThan(0);
    }
  });
});

describe("trackEventView / getConcurrentViewers", () => {
  const eventId = "test-event-track";

  it("incrementa el contador al agregar un IP", () => {
    const count = trackEventView(eventId, "192.168.1.1");
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("el mismo IP no cuenta doble", () => {
    const c1 = trackEventView(eventId, "10.0.0.1");
    const c2 = trackEventView(eventId, "10.0.0.1");
    expect(c2).toBe(c1);
  });

  it("IPs distintos incrementan el contador", () => {
    const eventId2 = "test-event-multi";
    const c1 = trackEventView(eventId2, "1.1.1.1");
    const c2 = trackEventView(eventId2, "2.2.2.2");
    expect(c2).toBe(c1 + 1);
  });

  it("getConcurrentViewers retorna 0 para evento sin vistas", () => {
    expect(getConcurrentViewers("evento-nuevo-sin-vistas")).toBe(0);
  });

  it("getConcurrentViewers refleja vistas registradas", () => {
    const eventId3 = "test-event-get";
    trackEventView(eventId3, "5.5.5.5");
    expect(getConcurrentViewers(eventId3)).toBeGreaterThanOrEqual(1);
  });
});

describe("Constantes de configuración", () => {
  it("QUEUE_MAX_CONCURRENT es un número positivo", () => {
    expect(QUEUE_MAX_CONCURRENT).toBeGreaterThan(0);
  });

  it("QUEUE_ACCESS_MINUTES es un número positivo", () => {
    expect(QUEUE_ACCESS_MINUTES).toBeGreaterThan(0);
  });

  it("QUEUE_ADVANCE_BATCH es un número positivo", () => {
    expect(QUEUE_ADVANCE_BATCH).toBeGreaterThan(0);
  });
});

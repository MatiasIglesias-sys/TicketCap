/** @jest-environment node */
/**
 * Tests para GET y POST /api/tickets
 * Cubre: autenticación, compra exitosa, sector agotado, límite por usuario
 */
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/tickets/route";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockFindMany  = jest.fn();
const mockFindUnique = jest.fn();
const mockCount     = jest.fn();
const mockTicketUpdateMany = jest.fn();
const mockTransaction = jest.fn();
const mockUpdateMany = jest.fn();
const mockUserFindUnique = jest.fn();
const mockGetServerSession = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/lib/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findMany:   (...args: unknown[]) => mockFindMany(...args),
      count:      (...args: unknown[]) => mockCount(...args),
      updateMany: (...args: unknown[]) => mockTicketUpdateMany(...args),
    },
    sector: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    queueEntry: {
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}));

jest.mock("@/lib/queue", () => ({
  verifyAccessToken: jest.fn().mockReturnValue({
    userId: "user-123",
    eventId: "event-1",
    expiresAt: Date.now() + 60_000,
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SESSION_HINCHA = {
  user: { id: "user-123", email: "hincha@test.com", role: "HINCHA", socio: null },
};

const SESSION_SOCIO_ACTIVO = {
  user: {
    id: "user-456",
    email: "socio@test.com",
    role: "HINCHA",
    socio: { categoria: "ACTIVO", cuotaAlDia: true, estado: "AL_DIA" },
  },
};

const SECTOR_BASE = {
  id: "sector-1",
  eventId: "event-1",
  nombre: "Popular",
  tipo: "POPULAR",
  precio: 2000,
  precioSocio: 1000,
  disponibles: 10,
  habilitado: true,
  event: {
    id: "event-1",
    limiteXUsuario: 4,
    filaVirtual: false,
  },
};

function makePostRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const makeGetRequest = () =>
  new NextRequest("http://localhost/api/tickets", { method: "GET" });

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockTicketUpdateMany.mockResolvedValue({ count: 0 });
  // Por defecto el usuario no está suspendido
  mockUserFindUnique.mockResolvedValue({ suspendidoHasta: null, razonSuspension: null });
});

describe("GET /api/tickets — autenticación", () => {
  it("retorna 401 si no hay sesión", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("retorna los tickets del usuario autenticado", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_HINCHA);
    mockFindMany.mockResolvedValue([{ id: "t1" }, { id: "t2" }]);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it("solo retorna tickets del usuario en sesión (no de otros)", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_HINCHA);
    mockFindMany.mockResolvedValue([]);
    await GET(makeGetRequest());
    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.userId).toBe(SESSION_HINCHA.user.id);
  });
});

describe("POST /api/tickets — autenticación y validaciones", () => {
  it("retorna 401 si no hay sesión", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makePostRequest({ sectorId: "s1", cantidad: 1 }));
    expect(res.status).toBe(401);
  });

  it("retorna 400 si faltan sectorId o cantidad", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_HINCHA);
    const res = await POST(makePostRequest({ sectorId: "s1" }));
    expect(res.status).toBe(400);
  });

  it("retorna 404 si el sector no existe", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_HINCHA);
    mockFindUnique.mockResolvedValue(null);
    const res = await POST(makePostRequest({ sectorId: "s99", cantidad: 1 }));
    expect(res.status).toBe(404);
  });

  it("retorna 400 si el sector está deshabilitado", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_HINCHA);
    mockFindUnique.mockResolvedValue({ ...SECTOR_BASE, habilitado: false });
    const res = await POST(makePostRequest({ sectorId: "sector-1", cantidad: 1 }));
    expect(res.status).toBe(400);
  });

  it("retorna 409 si no hay disponibles suficientes", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_HINCHA);
    mockFindUnique.mockResolvedValue({ ...SECTOR_BASE, disponibles: 0 });
    const res = await POST(makePostRequest({ sectorId: "sector-1", cantidad: 1 }));
    expect(res.status).toBe(409);
  });
});

describe("POST /api/tickets — límite por usuario", () => {
  it("retorna 409 si el usuario ya tiene el máximo de entradas", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_HINCHA);
    mockFindUnique.mockResolvedValue(SECTOR_BASE);
    mockCount.mockResolvedValue(4); // ya tiene el límite (4)

    const res = await POST(makePostRequest({ sectorId: "sector-1", cantidad: 1 }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/límite/i);
  });
});

describe("POST /api/tickets — compra exitosa", () => {
  it("retorna 201 con order y tickets en compra válida", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_HINCHA);
    mockFindUnique.mockResolvedValue(SECTOR_BASE);
    mockCount.mockResolvedValue(0);
    mockTransaction.mockImplementation(async (fn: Function) =>
      fn({
        sector: { findUnique: jest.fn().mockResolvedValue(SECTOR_BASE) },
        order:  { create: jest.fn().mockResolvedValue({ id: "order-1", total: 2000 }) },
        ticket: { create: jest.fn().mockResolvedValue({ id: "TKT-ABC", qrCode: "TCAP:TKT-ABC:abc123" }) },
        sector_update: jest.fn(),
      })
    );
    // El transaction llama a varios sub-métodos; mockemos la función directamente
    mockTransaction.mockResolvedValue({
      order: { id: "order-1", total: 2000 },
      tickets: [{ id: "TKT-ABC", qrCode: "TCAP:TKT-ABC:abc123" }],
    });

    const res = await POST(
      makePostRequest({ sectorId: "sector-1", cantidad: 1, metodoPago: "DEMO" })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.order).toBeDefined();
    expect(body.tickets).toBeDefined();
  });
});

describe("POST /api/tickets — precio de socio", () => {
  it("un socio activo al día paga precio de socio", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_SOCIO_ACTIVO);
    mockFindUnique.mockResolvedValue(SECTOR_BASE);
    mockCount.mockResolvedValue(0);
    mockTransaction.mockResolvedValue({
      order: { id: "order-1", total: 1000 },
      tickets: [{ id: "TKT-XYZ" }],
    });

    const res = await POST(
      makePostRequest({ sectorId: "sector-1", cantidad: 1, metodoPago: "DEMO" })
    );
    expect(res.status).toBe(201);
    // El precio de socio es 1000, no 2000
    const body = await res.json();
    expect(body.order.total).toBe(1000);
  });
});

describe("POST /api/tickets — venta escalonada ranking por asistencia", () => {
  const now = new Date();
  const eventDate = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000); // ranking abierta (7), socios cerrada (3)

  const sectorEscalonado = {
    ...SECTOR_BASE,
    event: {
      ...SECTOR_BASE.event,
      fecha: eventDate.toISOString(),
      ventaEstado: "CERRADO",
      ventaEscalonadaActiva: true,
      diasAntesRanking: 7,
      diasAntesSocios: 3,
      diasAntesGeneral: 1,
      rankingMinAsistenciaPct: 45,
    },
  };

  it("bloquea socio ranking con asistencia menor a 45%", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_SOCIO_ACTIVO);
    mockFindUnique.mockResolvedValue(sectorEscalonado);

    // 1) tickets actuales del evento para límite = 0
    // 2) total históricos = 20
    // 3) usados históricos = 8 => 40%
    mockCount.mockResolvedValueOnce(0).mockResolvedValueOnce(20).mockResolvedValueOnce(8);

    const res = await POST(makePostRequest({ sectorId: "sector-1", cantidad: 1 }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/45%/i);
  });

  it("permite socio ranking con asistencia de 45% o más", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_SOCIO_ACTIVO);
    mockFindUnique.mockResolvedValue(sectorEscalonado);

    // 1) tickets actuales del evento para límite = 0
    // 2) total históricos = 20
    // 3) usados históricos = 9 => 45%
    mockCount.mockResolvedValueOnce(0).mockResolvedValueOnce(20).mockResolvedValueOnce(9);

    mockTransaction.mockResolvedValue({
      order: { id: "order-1", total: 1000 },
      tickets: [{ id: "TKT-RANK" }],
    });

    const res = await POST(makePostRequest({ sectorId: "sector-1", cantidad: 1, metodoPago: "DEMO" }));
    expect(res.status).toBe(201);
  });
});

/** @jest-environment node */
/**
 * Tests para GET y POST /api/events y GET/PATCH/DELETE /api/events/[id]
 * Cubre: autenticación, autorización ADMIN, creación, modificación, borrado
 */
import { NextRequest } from "next/server";
import { GET as getEvents, POST as postEvent } from "@/app/api/events/route";
import { GET as getById, PATCH as patchEvent, DELETE as deleteEvent } from "@/app/api/events/[id]/route";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockEventFindMany  = jest.fn();
const mockEventFindUnique = jest.fn();
const mockEventCreate    = jest.fn();
const mockEventUpdate    = jest.fn();
const mockEventDelete    = jest.fn();
const mockGetServerSession = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findMany:   (...args: unknown[]) => mockEventFindMany(...args),
      findUnique: (...args: unknown[]) => mockEventFindUnique(...args),
      create:     (...args: unknown[]) => mockEventCreate(...args),
      update:     (...args: unknown[]) => mockEventUpdate(...args),
      delete:     (...args: unknown[]) => mockEventDelete(...args),
    },
  },
}));

jest.mock("@/lib/banner", () => ({
  generateMatchBanner: jest.fn().mockResolvedValue(null),
}));

jest.mock("fs", () => ({
  unlinkSync: jest.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SESSION_ADMIN  = { user: { id: "admin-1", role: "ADMIN" } };
const SESSION_HINCHA = { user: { id: "user-1",  role: "HINCHA" } };

const EVENT_BASE = {
  id: "evt-1",
  nombre: "Peñarol vs Nacional",
  rival: "Nacional",
  fecha: new Date("2025-06-15T20:00:00Z"),
  torneo: "CLAUSURA",
  estado: "PROXIMO",
  ventaEstado: "CERRADO",
  imageUrl: null,
  sectores: [],
};

function makeRequest(method: string, body?: Record<string, unknown>, url = "http://localhost/api/events") {
  return new NextRequest(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

describe("GET /api/events — público", () => {
  it("retorna lista de eventos sin autenticación", async () => {
    mockGetServerSession.mockResolvedValue(null);
    mockEventFindMany.mockResolvedValue([EVENT_BASE]);
    const res = await getEvents(makeRequest("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  it("acepta filtro por torneo", async () => {
    mockEventFindMany.mockResolvedValue([]);
    const req = new NextRequest("http://localhost/api/events?torneo=CLAUSURA", { method: "GET" });
    await getEvents(req);
    const callArgs = mockEventFindMany.mock.calls[0][0];
    expect(callArgs.where.torneo).toBe("CLAUSURA");
  });

  it("acepta filtro upcoming=true (solo eventos futuros)", async () => {
    mockEventFindMany.mockResolvedValue([]);
    const req = new NextRequest("http://localhost/api/events?upcoming=true", { method: "GET" });
    await getEvents(req);
    const callArgs = mockEventFindMany.mock.calls[0][0];
    expect(callArgs.where.fecha).toBeDefined();
  });
});

describe("POST /api/events — autorización ADMIN", () => {
  it("retorna 403 si no hay sesión", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await postEvent(makeRequest("POST", { nombre: "Test" }));
    expect(res.status).toBe(403);
  });

  it("retorna 403 si el usuario no es ADMIN", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_HINCHA);
    const res = await postEvent(makeRequest("POST", { nombre: "Test" }));
    expect(res.status).toBe(403);
  });

  it("crea el evento si el usuario es ADMIN", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_ADMIN);
    mockEventCreate.mockResolvedValue({ ...EVENT_BASE, sectores: [] });

    const res = await postEvent(
      makeRequest("POST", {
        nombre: "Peñarol vs Nacional",
        rival: "Nacional",
        fecha: "2025-06-15T20:00:00Z",
        torneo: "CLAUSURA",
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.nombre).toBe("Peñarol vs Nacional");
  });
});

describe("GET /api/events/[id]", () => {
  it("retorna el evento por ID", async () => {
    mockEventFindUnique.mockResolvedValue(EVENT_BASE);
    const req = new NextRequest("http://localhost/api/events/evt-1", { method: "GET" });
    const res = await getById(req, { params: { id: "evt-1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("evt-1");
  });

  it("retorna 404 si el evento no existe", async () => {
    mockEventFindUnique.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/events/no-existe", { method: "GET" });
    const res = await getById(req, { params: { id: "no-existe" } });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/events/[id] — autorización", () => {
  it("retorna 403 si no es ADMIN", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_HINCHA);
    const req = new NextRequest("http://localhost/api/events/evt-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ventaEstado: "VENTA_GENERAL" }),
    });
    const res = await patchEvent(req, { params: { id: "evt-1" } });
    expect(res.status).toBe(403);
  });

  it("actualiza correctamente si es ADMIN", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_ADMIN);
    mockEventUpdate.mockResolvedValue({ ...EVENT_BASE, ventaEstado: "VENTA_GENERAL" });
    const req = new NextRequest("http://localhost/api/events/evt-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ventaEstado: "VENTA_GENERAL" }),
    });
    const res = await patchEvent(req, { params: { id: "evt-1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ventaEstado).toBe("VENTA_GENERAL");
  });
});

describe("DELETE /api/events/[id] — autorización", () => {
  it("retorna 403 si no es ADMIN", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_HINCHA);
    const req = new NextRequest("http://localhost/api/events/evt-1", { method: "DELETE" });
    const res = await deleteEvent(req, { params: { id: "evt-1" } });
    expect(res.status).toBe(403);
  });

  it("elimina el evento si es ADMIN", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_ADMIN);
    mockEventFindUnique.mockResolvedValue({ imageUrl: null });
    mockEventDelete.mockResolvedValue({});
    const req = new NextRequest("http://localhost/api/events/evt-1", { method: "DELETE" });
    const res = await deleteEvent(req, { params: { id: "evt-1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

/** @jest-environment node */
/**
 * Tests para POST /api/scanner
 * Cubre: roles, QR válido, QR inexistente, QR ya usado,
 *        QR cancelado/vencido, validación de horario de evento
 */
import { NextRequest } from "next/server";
import { POST } from "@/app/api/scanner/route";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockFindUnique = jest.fn();
const mockUpdate     = jest.fn();
const mockGetServerSession = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update:     (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/scanner", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Fecha de evento que está dentro de la ventana de acceso (ahora mismo)
const fechaDentroVentana = new Date(Date.now() - 60 * 60 * 1000); // hace 1 hora (entre -3h y +2h)

const TICKET_BASE = {
  id: "TKT-001",
  estado: "ACTIVO",
  usadoAt: null,
  event: {
    nombre: "Peñarol vs Nacional",
    fecha:  fechaDentroVentana,
  },
  sector: { nombre: "Popular" },
  user:   { name: "Carlos López", email: "carlos@test.com" },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

describe("POST /api/scanner — autorización", () => {
  it("retorna 403 si no hay sesión", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ qrCode: "TCAP:TKT-001:abc" }));
    expect(res.status).toBe(403);
  });

  it("retorna 403 si el rol es HINCHA", async () => {
    mockGetServerSession.mockResolvedValue({ user: { role: "HINCHA" } });
    const res = await POST(makeRequest({ qrCode: "TCAP:TKT-001:abc" }));
    expect(res.status).toBe(403);
  });

  it("acepta rol ADMIN", async () => {
    mockGetServerSession.mockResolvedValue({ user: { role: "ADMIN" } });
    mockFindUnique.mockResolvedValue(TICKET_BASE);
    mockUpdate.mockResolvedValue({});
    const res = await POST(makeRequest({ qrCode: "TCAP:TKT-001:abc" }));
    expect(res.status).toBe(200);
  });

  it("acepta rol PORTERO", async () => {
    mockGetServerSession.mockResolvedValue({ user: { role: "PORTERO" } });
    mockFindUnique.mockResolvedValue(TICKET_BASE);
    mockUpdate.mockResolvedValue({});
    const res = await POST(makeRequest({ qrCode: "TCAP:TKT-001:abc" }));
    expect(res.status).toBe(200);
  });

  it("acepta rol OPERADOR", async () => {
    mockGetServerSession.mockResolvedValue({ user: { role: "OPERADOR" } });
    mockFindUnique.mockResolvedValue(TICKET_BASE);
    mockUpdate.mockResolvedValue({});
    const res = await POST(makeRequest({ qrCode: "TCAP:TKT-001:abc" }));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/scanner — validación de QR", () => {
  const SESSION_ADMIN = { user: { role: "ADMIN" } };

  it("retorna 400 si qrCode está vacío", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_ADMIN);
    const res = await POST(makeRequest({ qrCode: "" }));
    expect(res.status).toBe(400);
  });

  it("retorna valid:false si el QR no existe en la DB", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_ADMIN);
    mockFindUnique.mockResolvedValue(null);
    const res = await POST(makeRequest({ qrCode: "TCAP:INVALIDO:zzz" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.error).toMatch(/no encontrado/i);
  });

  it("retorna valid:false si la entrada ya fue USADA", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_ADMIN);
    mockFindUnique.mockResolvedValue({
      ...TICKET_BASE,
      estado: "USADO",
      usadoAt: new Date(),
    });
    const res = await POST(makeRequest({ qrCode: "TCAP:TKT-001:abc" }));
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.error).toMatch(/duplicada/i);
  });

  it("retorna valid:false si la entrada está CANCELADA", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_ADMIN);
    mockFindUnique.mockResolvedValue({ ...TICKET_BASE, estado: "CANCELADO" });
    const res = await POST(makeRequest({ qrCode: "TCAP:TKT-001:abc" }));
    const body = await res.json();
    expect(body.valid).toBe(false);
  });
});

describe("POST /api/scanner — ventana horaria", () => {
  const SESSION_ADMIN = { user: { role: "ADMIN" } };

  it("retorna valid:false si el evento es en más de 3 horas", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_ADMIN);
    const fechaFutura = new Date(Date.now() + 4 * 60 * 60 * 1000); // en 4 horas
    mockFindUnique.mockResolvedValue({
      ...TICKET_BASE,
      event: { ...TICKET_BASE.event, fecha: fechaFutura },
    });
    const res = await POST(makeRequest({ qrCode: "TCAP:TKT-001:abc" }));
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.error).toMatch(/horario/i);
  });

  it("retorna valid:false si el evento terminó hace más de 2 horas", async () => {
    mockGetServerSession.mockResolvedValue(SESSION_ADMIN);
    const fechaVieja = new Date(Date.now() - 3 * 60 * 60 * 1000); // hace 3 horas
    mockFindUnique.mockResolvedValue({
      ...TICKET_BASE,
      event: { ...TICKET_BASE.event, fecha: fechaVieja },
    });
    const res = await POST(makeRequest({ qrCode: "TCAP:TKT-001:abc" }));
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.error).toMatch(/horario/i);
  });
});

describe("POST /api/scanner — escaneo válido", () => {
  it("retorna valid:true y marca la entrada como USADA", async () => {
    mockGetServerSession.mockResolvedValue({ user: { role: "ADMIN" } });
    mockFindUnique.mockResolvedValue(TICKET_BASE);
    mockUpdate.mockResolvedValue({ ...TICKET_BASE, estado: "USADO" });

    const res = await POST(makeRequest({ qrCode: "TCAP:TKT-001:abc" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.ticket.titular).toBe("Carlos López");

    // Verificar que se llamó a update con estado USADO
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ estado: "USADO" }),
      })
    );
  });
});

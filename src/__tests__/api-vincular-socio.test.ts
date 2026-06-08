/** @jest-environment node */
/**
 * Tests para POST /api/me/vincular-socio
 * Cubre: auth, normalización de matrícula, socio no encontrado,
 *        matrícula ya vinculada a otra cuenta, vinculación exitosa
 */
import { NextRequest } from "next/server";
import { POST } from "@/app/api/me/vincular-socio/route";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSocioFindFirst = jest.fn();
const mockUserFindFirst  = jest.fn();
const mockUpdate     = jest.fn();
const mockGetServerSession = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    socio: { findFirst: (...args: unknown[]) => mockSocioFindFirst(...args) },
    user: {
      findFirst: (...args: unknown[]) => mockUserFindFirst(...args),
      update:    (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SESSION = { user: { id: "user-abc", email: "u@test.com", role: "HINCHA" } };

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/me/vincular-socio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/me/vincular-socio — autenticación", () => {
  it("retorna 401 si no hay sesión", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ matricula: "001234" }));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/me/vincular-socio — validación", () => {
  it("retorna 400 si no se envía matrícula", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("retorna 400 si la matrícula no contiene dígitos", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    const res = await POST(makeRequest({ matricula: "ABC---" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/me/vincular-socio — normalización de número", () => {
  it("normaliza número corto y busca por múltiples candidatos", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    mockSocioFindFirst.mockResolvedValue(null); // socio no encontrado → 404

    await POST(makeRequest({ matricula: "1234" }));

    const call = mockSocioFindFirst.mock.calls[0][0];
    const candidates = call.where.OR.map((x: { matricula: string }) => x.matricula);
    expect(candidates).toContain("1234");
    expect(candidates).toContain("CAP-001234");
  });

  it("acepta formato legacy CAP y busca por candidatos equivalentes", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    mockSocioFindFirst.mockResolvedValue(null);

    await POST(makeRequest({ matricula: "CAP-005678" }));

    const call = mockSocioFindFirst.mock.calls[0][0];
    const candidates = call.where.OR.map((x: { matricula: string }) => x.matricula);
    expect(candidates).toContain("CAP-005678");
    expect(candidates).toContain("5678");
  });
});

describe("POST /api/me/vincular-socio — socio no encontrado", () => {
  it("retorna 404 si el socio no está en el padrón", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    mockSocioFindFirst.mockResolvedValue(null);

    const res = await POST(makeRequest({ matricula: "999999" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/no encontrado/i);
  });
});

describe("POST /api/me/vincular-socio — ya vinculado", () => {
  it("retorna 409 si la matrícula ya pertenece a OTRO usuario", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    mockSocioFindFirst.mockResolvedValue({ id: "socio-1", matricula: "CAP-001234" });
    mockUserFindFirst.mockResolvedValue({ id: "OTRO-USER-ID" }); // distinto al de sesión

    const res = await POST(makeRequest({ matricula: "001234" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/vinculada a otra cuenta/i);
  });

  it("NO retorna 409 si la matrícula ya está vinculada al MISMO usuario", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    mockSocioFindFirst.mockResolvedValue({ id: "socio-1", matricula: "CAP-001234" });
    mockUserFindFirst.mockResolvedValue({ id: "user-abc" }); // mismo usuario de sesión
    mockUpdate.mockResolvedValue({});

    const res = await POST(makeRequest({ matricula: "001234" }));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/me/vincular-socio — vinculación exitosa", () => {
  it("retorna 200 con success:true y datos del socio", async () => {
    mockGetServerSession.mockResolvedValue(SESSION);
    const socio = {
      id: "socio-99",
      matricula: "CAP-001234",
      nombre: "Carlos López",
      categoria: "ACTIVO",
      estado: "AL_DIA",
    };
    mockSocioFindFirst.mockResolvedValue(socio);
    mockUserFindFirst.mockResolvedValue(null); // no vinculado a nadie
    mockUpdate.mockResolvedValue({});

    const res = await POST(makeRequest({ matricula: "1234" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.socio.matricula).toBe("CAP-001234");
  });
});

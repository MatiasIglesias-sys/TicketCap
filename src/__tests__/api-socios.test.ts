/** @jest-environment node */
/**
 * Tests para GET /api/socios
 * Cubre: roles, búsqueda con/sin query
 */
import { NextRequest } from "next/server";
import { GET } from "@/app/api/socios/route";

const mockFindMany = jest.fn();
const mockGetServerSession = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    socio: { findMany: (...args: unknown[]) => mockFindMany(...args) },
  },
}));

const SOCIOS_MOCK = [
  { id: "s1", matricula: "CAP-001234", nombre: "Carlos López", ci: "12345678", user: null },
  { id: "s2", matricula: "CAP-005678", nombre: "María García", ci: "87654321", user: { email: "maria@test.com" } },
];

beforeEach(() => jest.clearAllMocks());

describe("GET /api/socios — autorización", () => {
  it("retorna 403 sin sesión", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET(new NextRequest("http://localhost/api/socios", { method: "GET" }));
    expect(res.status).toBe(403);
  });

  it("retorna 403 para rol HINCHA", async () => {
    mockGetServerSession.mockResolvedValue({ user: { role: "HINCHA" } });
    const res = await GET(new NextRequest("http://localhost/api/socios", { method: "GET" }));
    expect(res.status).toBe(403);
  });

  it("retorna 403 para rol PORTERO", async () => {
    mockGetServerSession.mockResolvedValue({ user: { role: "PORTERO" } });
    const res = await GET(new NextRequest("http://localhost/api/socios", { method: "GET" }));
    expect(res.status).toBe(403);
  });

  it("permite acceso a ADMIN", async () => {
    mockGetServerSession.mockResolvedValue({ user: { role: "ADMIN" } });
    mockFindMany.mockResolvedValue(SOCIOS_MOCK);
    const res = await GET(new NextRequest("http://localhost/api/socios", { method: "GET" }));
    expect(res.status).toBe(200);
  });

  it("permite acceso a OPERADOR", async () => {
    mockGetServerSession.mockResolvedValue({ user: { role: "OPERADOR" } });
    mockFindMany.mockResolvedValue(SOCIOS_MOCK);
    const res = await GET(new NextRequest("http://localhost/api/socios", { method: "GET" }));
    expect(res.status).toBe(200);
  });
});

describe("GET /api/socios — búsqueda", () => {
  it("retorna todos los socios sin query", async () => {
    mockGetServerSession.mockResolvedValue({ user: { role: "ADMIN" } });
    mockFindMany.mockResolvedValue(SOCIOS_MOCK);
    const res = await GET(new NextRequest("http://localhost/api/socios", { method: "GET" }));
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it("filtra con query ?q=López", async () => {
    mockGetServerSession.mockResolvedValue({ user: { role: "ADMIN" } });
    mockFindMany.mockResolvedValue([SOCIOS_MOCK[0]]);
    const res = await GET(new NextRequest("http://localhost/api/socios?q=López", { method: "GET" }));
    await res.json();
    const callArgs = mockFindMany.mock.calls[0][0];
    // Debe pasar where con OR que incluye nombre/matricula/ci
    expect(callArgs.where?.OR).toBeDefined();
  });

  it("limita los resultados a 100", async () => {
    mockGetServerSession.mockResolvedValue({ user: { role: "ADMIN" } });
    mockFindMany.mockResolvedValue([]);
    await GET(new NextRequest("http://localhost/api/socios", { method: "GET" }));
    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.take).toBe(100);
  });
});

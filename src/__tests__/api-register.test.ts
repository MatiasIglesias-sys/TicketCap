/** @jest-environment node */
/**
 * Tests para POST /api/auth/register
 * Mockea Prisma para no depender de la DB real.
 */
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/register/route";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockFindUnique = jest.fn();
const mockCreate     = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create:     (...args: unknown[]) => mockCreate(...args),
    },
    socio: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
}));

jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn().mockReturnValue({ limited: false, remaining: 9 }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Default: no user/socio exists
  mockFindUnique.mockResolvedValue(null);
  mockCreate.mockResolvedValue({ id: "uid", email: "test@test.com", name: "Test" });
});

describe("POST /api/auth/register — campos requeridos", () => {
  it("retorna 400 si faltan nombre, email o contraseña", async () => {
    const res = await POST(makeRequest({ email: "a@b.com" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("retorna 400 si falta email", async () => {
    const res = await POST(makeRequest({ name: "Juan", password: "pass123" }));
    expect(res.status).toBe(400);
  });

  it("retorna 400 si falta contraseña", async () => {
    const res = await POST(makeRequest({ name: "Juan", email: "a@b.com" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/register — duplicados", () => {
  it("retorna 409 si el email ya existe", async () => {
    mockFindUnique.mockResolvedValue({ id: "existing-id", email: "a@b.com" });

    const res = await POST(
      makeRequest({ name: "Juan", email: "a@b.com", password: "pass12345" })
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/email/i);
  });
});

describe("POST /api/auth/register — registro exitoso", () => {
  it("retorna 200 con success:true al registrar un usuario nuevo", async () => {
    // email no existe, ci no existe
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "new-user-id",
      email: "nuevo@test.com",
      name: "Nuevo",
    });

    const res = await POST(
      makeRequest({ name: "Nuevo", email: "nuevo@test.com", password: "segura123" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user.email).toBe("nuevo@test.com");
  });

  it("no expone el password en la respuesta", async () => {
    mockCreate.mockResolvedValue({ id: "u1", email: "test@example.com", name: "TestUser" });

    const res = await POST(
      makeRequest({ name: "TestUser", email: "test@example.com", password: "securepass123" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.password).toBeUndefined();
  });
});

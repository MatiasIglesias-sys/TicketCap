import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { matriculaLookupCandidates } from "@/lib/matricula";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  // Rate limiting: 10 registrations per IP per 15 minutes
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const { limited } = rateLimit(`register:${ip}`, 10, 15 * 60 * 1000);
  if (limited) {
    return NextResponse.json(
      { error: "Demasiados intentos. Esperá unos minutos antes de volver a intentarlo." },
      { status: 429 }
    );
  }

  try {
    const { name, email, password, ci, phone, matricula } = await req.json();

    // ── Input validation ──────────────────────────────────────────────────────
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nombre, email y contraseña son obligatorios." },
        { status: 400 }
      );
    }

    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json(
        { error: "El nombre debe tener entre 2 y 100 caracteres." },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json(
        { error: "Ingresá un email válido." },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 8 || password.length > 72) {
      return NextResponse.json(
        { error: "La contraseña debe tener entre 8 y 72 caracteres." },
        { status: 400 }
      );
    }

    // Check existing user
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese email." },
        { status: 409 }
      );
    }

    if (ci) {
      if (typeof ci !== "string" || ci.length > 20) {
        return NextResponse.json({ error: "Cédula de identidad inválida." }, { status: 400 });
      }
      const existingCI = await prisma.user.findUnique({ where: { ci } });
      if (existingCI) {
        return NextResponse.json(
          { error: "Ya existe una cuenta con esa cédula de identidad." },
          { status: 409 }
        );
      }
    }

    // Find socio by matricula
    let socioId: string | undefined;
    if (matricula) {
      const candidates = matriculaLookupCandidates(String(matricula));
      const socio = await prisma.socio.findFirst({
        where: {
          OR: candidates.map((m) => ({ matricula: m })),
        },
      });
      if (!socio) {
        return NextResponse.json(
          { error: "Número de socio no encontrado. Verificá el número." },
          { status: 404 }
        );
      }
      const linked = await prisma.user.findUnique({
        where: { socioId: socio.id },
      });
      if (linked) {
        return NextResponse.json(
          { error: "Esta matrícula ya está vinculada a otra cuenta." },
          { status: 409 }
        );
      }
      socioId = socio.id;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        password: hashedPassword,
        ci: ci || null,
        phone: phone ? String(phone).slice(0, 20) : null,
        socioId: socioId || null,
      },
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}

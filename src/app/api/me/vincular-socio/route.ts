import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { matriculaLookupCandidates } from "@/lib/matricula";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { matricula: rawMatricula } = await req.json();
  if (!rawMatricula) return NextResponse.json({ error: "Número de socio requerido" }, { status: 400 });

  const candidates = matriculaLookupCandidates(String(rawMatricula));
  if (!candidates.length) {
    return NextResponse.json({ error: "Número de socio inválido" }, { status: 400 });
  }

  const socio = await prisma.socio.findFirst({
    where: {
      OR: candidates.map((m) => ({ matricula: m })),
    },
  });
  if (!socio) {
    return NextResponse.json({ error: "Número de socio no encontrado en el padrón" }, { status: 404 });
  }

  const yaVinculado = await prisma.user.findFirst({ where: { socioId: socio.id } });
  if (yaVinculado && yaVinculado.id !== session.user.id) {
    return NextResponse.json({ error: "Esta matrícula ya está vinculada a otra cuenta" }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { socioId: socio.id },
  });

  return NextResponse.json({ success: true, socio });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/admin/socios/suspender
// Body: { userId, dias, horas?, razon? }  — dias=0 levanta la suspensión
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { userId, dias, horas = 0, razon } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "userId requerido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // dias=0 significa levantar la suspensión
  if (dias === 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { suspendidoHasta: null, razonSuspension: null },
    });
    return NextResponse.json({ ok: true, levantada: true });
  }

  const totalMs = (Number(dias) * 24 * 60 + Number(horas) * 60) * 60 * 1000;
  if (totalMs <= 0) {
    return NextResponse.json({ error: "Duración inválida" }, { status: 400 });
  }

  const suspendidoHasta = new Date(Date.now() + totalMs);

  await prisma.user.update({
    where: { id: userId },
    data: {
      suspendidoHasta,
      razonSuspension: razon || "Suspendido por administrador",
    },
  });

  return NextResponse.json({ ok: true, suspendidoHasta });
}

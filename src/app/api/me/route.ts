import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      socio: true,
      tickets: {
        where: { estado: "ACTIVO" },
        include: { event: true, sector: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    ci: user.ci,
    role: user.role,
    socio: user.socio,
    ticketsActivos: user.tickets,
  });
}

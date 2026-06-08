import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateMatchBanner } from "@/lib/banner";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const torneo = searchParams.get("torneo");
  const upcoming = searchParams.get("upcoming");

  const where: Record<string, unknown> = {};
  if (torneo) where.torneo = torneo;
  if (upcoming === "true") where.fecha = { gte: new Date() };

  const events = await prisma.event.findMany({
    where,
    include: {
      sectores: {
        select: {
          id: true,
          nombre: true,
          tipo: true,
          precio: true,
          precioSocio: true,
          disponibles: true,
          capacidad: true,
          soloSocios: true,
          esVisitante: true,
          esFamiliar: true,
          habilitado: true,
        },
      },
    },
    orderBy: { fecha: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const event = await prisma.event.create({
      data: {
        nombre: body.nombre,
        rival: body.rival,
        rivalEscudo: body.rivalEscudo,
        fecha: new Date(body.fecha),
        horaGate: body.horaGate ? new Date(body.horaGate) : null,
        torneo: body.torneo,
        estadio: body.estadio ?? "Estadio Campeón del Siglo",
        esLocal: body.esLocal ?? true,
        estado: body.estado ?? "PROXIMO",
        ventaEstado: body.ventaEstado ?? "CERRADO",
        descripcion: body.descripcion,
        imageUrl: body.imageUrl || null,
        filaVirtual: true,
        limiteXUsuario: body.limiteXUsuario ?? 4,
        ventaEscalonadaActiva: body.ventaEscalonadaActiva ?? false,
        diasAntesRanking: body.diasAntesRanking ?? 7,
        diasAntesSocios: body.diasAntesSocios ?? 3,
        diasAntesGeneral: body.diasAntesGeneral ?? 1,
        rankingMinAsistenciaPct: body.rankingMinAsistenciaPct ?? 45,
        sectores: body.sectores
          ? { create: body.sectores }
          : undefined,
      },
      include: { sectores: true },
    });
    // Auto-generate banner in background (don't block the response)
    generateMatchBanner({
      eventId:     event.id,
      torneo:      event.torneo,
      rivalEscudo: event.rivalEscudo,
      rivalName:   event.rival,
    }).then(async (url) => {
      if (url) await prisma.event.update({ where: { id: event.id }, data: { imageUrl: url } });
    }).catch(() => {/* silently ignore banner errors */});

    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al crear evento" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      sectores: true,
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  }

  return NextResponse.json(event);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.ventaEstado  !== undefined) data.ventaEstado  = body.ventaEstado;
  if (body.estado       !== undefined) data.estado       = body.estado;
  if (body.filaVirtual  !== undefined) data.filaVirtual  = body.filaVirtual;
  if (body.nombre       !== undefined) data.nombre       = body.nombre;
  if (body.rival        !== undefined) data.rival        = body.rival;
  if (body.rivalEscudo  !== undefined) data.rivalEscudo  = body.rivalEscudo;
  if (body.fecha        !== undefined) data.fecha        = new Date(body.fecha);
  if (body.torneo       !== undefined) data.torneo       = body.torneo;
  if (body.descripcion  !== undefined) data.descripcion  = body.descripcion;
  if (body.limiteXUsuario !== undefined) data.limiteXUsuario = Number(body.limiteXUsuario);
  if (body.ventaEscalonadaActiva !== undefined) data.ventaEscalonadaActiva = Boolean(body.ventaEscalonadaActiva);
  if (body.diasAntesRanking !== undefined) data.diasAntesRanking = Number(body.diasAntesRanking);
  if (body.diasAntesSocios !== undefined) data.diasAntesSocios = Number(body.diasAntesSocios);
  if (body.diasAntesGeneral !== undefined) data.diasAntesGeneral = Number(body.diasAntesGeneral);
  if (body.rankingMinAsistenciaPct !== undefined) data.rankingMinAsistenciaPct = Number(body.rankingMinAsistenciaPct);

  const event = await prisma.event.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(event);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const event = await prisma.event.findUnique({ where: { id: params.id }, select: { imageUrl: true } });

  // Borrar banner del disco si existe
  if (event?.imageUrl?.startsWith("/images/banners/")) {
    try { fs.unlinkSync(`${process.cwd()}/public${event.imageUrl}`); } catch {}
  }

  // Borrar registros relacionados antes de borrar el evento
  await prisma.queueEntry.deleteMany({ where: { eventId: params.id } });
  await prisma.ticket.deleteMany({ where: { eventId: params.id } });
  await prisma.event.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}

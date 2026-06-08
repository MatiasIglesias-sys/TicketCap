import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isPastAccessWindow } from "@/lib/ticket-expiration";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "OPERADOR", "PORTERO"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const { qrCode } = await req.json();

    if (!qrCode) {
      return NextResponse.json({ error: "QR vacío" }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { qrCode },
      include: {
        event: true,
        sector: true,
        user: { select: { name: true, email: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json({
        valid: false,
        error: "QR inválido — no encontrado en el sistema",
      }, { status: 200 });
    }

    if (ticket.estado === "USADO") {
      return NextResponse.json({
        valid: false,
        error: "ENTRADA DUPLICADA — QR ya fue utilizado",
        ticket: {
          id: ticket.id,
          usadoAt: ticket.usadoAt,
          evento: ticket.event.nombre,
          sector: ticket.sector.nombre,
          titular: ticket.user.name,
        },
      }, { status: 200 });
    }

    // Auto-expire tickets once the access window is over.
    if (ticket.estado === "ACTIVO" && isPastAccessWindow(ticket.event.fecha)) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { estado: "VENCIDO" },
      });

      return NextResponse.json({
        valid: false,
        error: "Fuera del horario de acceso para este evento",
      }, { status: 200 });
    }

    if (ticket.estado !== "ACTIVO") {
      return NextResponse.json({
        valid: false,
        error: `Entrada ${ticket.estado.toLowerCase()} — acceso denegado`,
      }, { status: 200 });
    }

    // Check event time (allow from 3h before to 2h after)
    const now = new Date();
    const eventTime = new Date(ticket.event.fecha);
    const threeHoursBefore = new Date(eventTime.getTime() - 3 * 60 * 60 * 1000);
    const twoHoursAfter = new Date(eventTime.getTime() + 2 * 60 * 60 * 1000);

    if (now < threeHoursBefore || now > twoHoursAfter) {
      return NextResponse.json({
        valid: false,
        error: "Fuera del horario de acceso para este evento",
        ticket: {
          id: ticket.id,
          evento: ticket.event.nombre,
          fecha: ticket.event.fecha,
        },
      }, { status: 200 });
    }

    // Mark as used
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { estado: "USADO", usadoAt: now },
    });

    return NextResponse.json({
      valid: true,
      ticket: {
        id: ticket.id,
        evento: ticket.event.nombre,
        sector: ticket.sector.nombre,
        titular: ticket.user.name,
        usadoAt: now,
      },
    });
  } catch (err) {
    console.error("Scanner error:", err);
    return NextResponse.json({ error: "Error del sistema" }, { status: 500 });
  }
}

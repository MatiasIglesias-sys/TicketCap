import { prisma } from "@/lib/prisma";

const POST_EVENT_GRACE_HOURS = 2;

export function getTicketExpiryCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - POST_EVENT_GRACE_HOURS * 60 * 60 * 1000);
}

export async function expireActiveTicketsForUser(userId: string, now: Date = new Date()): Promise<void> {
  const cutoff = getTicketExpiryCutoff(now);

  await prisma.ticket.updateMany({
    where: {
      userId,
      estado: "ACTIVO",
      event: {
        fecha: { lt: cutoff },
      },
    },
    data: {
      estado: "VENCIDO",
    },
  });
}

export function isPastAccessWindow(eventDate: Date | string, now: Date = new Date()): boolean {
  const eventTime = new Date(eventDate);
  const accessLimit = new Date(eventTime.getTime() + POST_EVENT_GRACE_HOURS * 60 * 60 * 1000);
  return now > accessLimit;
}

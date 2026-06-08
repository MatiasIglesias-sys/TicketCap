import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Called via sendBeacon on beforeunload (F5 / tab close).
 * Releases the user's ACTIVO slot so the next person in queue can advance.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({}, { status: 401 });

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({}, { status: 400 });

  await prisma.queueEntry.updateMany({
    where: { userId: session.user.id, eventId, estado: "ACTIVO" },
    data:  { estado: "EXPIRADO", accessToken: null, accessExpiry: null },
  });

  return NextResponse.json({ ok: true });
}

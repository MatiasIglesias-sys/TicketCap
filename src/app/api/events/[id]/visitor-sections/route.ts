import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const visitorSectionIds: string[] = body.visitorSectionIds ?? [];

  const event = await (prisma.event as any).update({
    where: { id: params.id },
    data: { visitorSections: JSON.stringify(visitorSectionIds) },
  });

  return NextResponse.json({ ok: true, visitorSections: visitorSectionIds });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const event = await (prisma.event as any).findUnique({
    where: { id: params.id },
    select: { visitorSections: true },
  });

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ids = JSON.parse(event.visitorSections ?? "[]");
  return NextResponse.json({ visitorSectionIds: ids });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "OPERADOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  const socios = await prisma.socio.findMany({
    where: q
      ? {
          OR: [
            { matricula: { contains: q } },
            { nombre: { contains: q } },
            { ci: { contains: q } },
          ],
        }
      : undefined,
    include: { user: { select: { email: true } } },
    orderBy: { matricula: "asc" },
    take: 100,
  });

  return NextResponse.json(socios);
}

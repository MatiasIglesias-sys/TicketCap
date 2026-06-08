import { NextRequest, NextResponse } from "next/server";
import { findTeamLogo } from "@/lib/team-logos";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name || name.length < 2) {
    return NextResponse.json({ url: null });
  }
  const url = await findTeamLogo(name);
  return NextResponse.json({ url });
}

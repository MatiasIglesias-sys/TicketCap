import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES: Record<string, string> = {
  "image/png":    "png",
  "image/jpeg":   "jpg",
  "image/webp":   "webp",
  "image/svg+xml": "svg",
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });

  // Validate content type (from browser-provided MIME type)
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Formato no soportado (usá PNG, JPG, WEBP o SVG)" },
      { status: 400 }
    );
  }

  // Validate file size BEFORE reading into memory
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "El archivo supera el límite de 5 MB." },
      { status: 413 }
    );
  }

  // Use sanitized, server-determined extension — never trust the client filename
  const name    = `logo-${Date.now()}.${ext}`;
  const outDir  = path.join(process.cwd(), "public", "images", "logos");
  const outPath = path.join(outDir, name);

  // Ensure the output path is still inside the intended directory (path traversal guard)
  if (!outPath.startsWith(outDir + path.sep) && outPath !== outDir) {
    return NextResponse.json({ error: "Ruta de archivo inválida." }, { status: 400 });
  }

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(outPath, buf);

  return NextResponse.json({ url: `/images/logos/${name}` });
}

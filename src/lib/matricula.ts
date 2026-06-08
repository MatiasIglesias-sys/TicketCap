export function extractMatriculaDigits(value: string): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizeMatriculaNumber(value: string): string {
  const digits = extractMatriculaDigits(value);
  if (!digits) return "";
  const normalized = digits.replace(/^0+/, "");
  return normalized || "0";
}

export function formatMatriculaForDisplay(value: string): string {
  return normalizeMatriculaNumber(value) || value;
}

export function matriculaLookupCandidates(value: string): string[] {
  const raw = String(value ?? "").trim();
  if (!raw) return [];

  const digitsRaw = extractMatriculaDigits(raw);
  if (!digitsRaw) return [];

  const upperRaw = raw.toUpperCase();
  const normalizedNumber = normalizeMatriculaNumber(raw);

  const candidates = [
    upperRaw,
    digitsRaw,
    normalizedNumber,
    digitsRaw ? `CAP-${digitsRaw}` : "",
    normalizedNumber ? `CAP-${normalizedNumber}` : "",
    normalizedNumber ? `CAP-${normalizedNumber.padStart(6, "0")}` : "",
  ].filter(Boolean);

  return Array.from(new Set(candidates));
}

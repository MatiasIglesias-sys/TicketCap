/**
 * Validates that critical environment variables are set.
 * Called once at startup (imported by auth.ts and queue.ts).
 * Logs a prominent warning in production if any are missing.
 */

const REQUIRED_VARS = [
  "NEXTAUTH_SECRET",
  "QR_SECRET",
  "DATABASE_URL",
];

if (process.env.NODE_ENV === "production") {
  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(
      `[SECURITY] CRITICAL: Missing required environment variables in production: ${missing.join(", ")}. ` +
        "The application is running with insecure defaults. Set these variables immediately."
    );
  }
}

if (!process.env.QR_SECRET) {
  console.warn(
    "[SECURITY] QR_SECRET is not set. Using insecure default. " +
      "Set QR_SECRET in your .env.local file."
  );
}

if (!process.env.NEXTAUTH_SECRET) {
  console.warn(
    "[SECURITY] NEXTAUTH_SECRET is not set. NextAuth will use an insecure default. " +
      "Set NEXTAUTH_SECRET in your .env.local file."
  );
}

export {};

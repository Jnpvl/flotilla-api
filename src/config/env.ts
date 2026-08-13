function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function bool(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

function parseCorsOrigins(raw: string | undefined): string[] {
  return (raw ?? "http://localhost:4200")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/** true si el Origin del browser está permitido (exacto, * o *.dominio). */
export function isCorsOriginAllowed(
  origin: string | undefined,
  allowed: string[],
): boolean {
  if (!origin) return false;
  if (allowed.includes("*")) return true;
  if (allowed.includes(origin)) return true;

  try {
    const { protocol, host } = new URL(origin);
    for (const entry of allowed) {
      if (!entry.startsWith("*.") && !entry.includes("://*.")) continue;
      // Formatos: *.vercel.app  |  https://*.vercel.app
      const normalized = entry.replace(/^\*:\/\//, "").replace(/^https?:\/\/\*\./, "*.");
      if (!normalized.startsWith("*.")) continue;
      const suffix = normalized.slice(1); // .vercel.app
      if (host === suffix.slice(1) || host.endsWith(suffix)) {
        if (entry.startsWith("http://") && protocol !== "http:") continue;
        if (entry.startsWith("https://") && protocol !== "https:") continue;
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

export const env = {
  port: Number(process.env.PORT ?? 3001),
  /** Dev fallback only — set JWT_SECRET in production. */
  jwtSecret: process.env.JWT_SECRET ?? "flotilla-dev-jwt-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  /**
   * Orígenes CORS separados por coma.
   * Ej: http://localhost:4200,https://flotilla-web.vercel.app,*.vercel.app
   */
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  db: {
    host: required("DB_HOST"),
    port: Number(process.env.DB_PORT ?? 1433),
    name: required("DB_NAME"),
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),
    synchronize: bool("DB_SYNC", false),
  },
};

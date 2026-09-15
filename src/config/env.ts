function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  const value = process.env[name]?.trim();
  if (value === undefined || value === "") return fallback;
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
      const normalized = entry
        .replace(/^\*:\/\//, "")
        .replace(/^https?:\/\/\*\./, "*.");
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

const dbHost = required("DB_HOST");
const dbPort = Number(process.env.DB_PORT ?? 1433);
const dbUser = required("DB_USER");
const dbPassword = required("DB_PASSWORD");

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
  /** BD principal de Flotilla / Ventas (app). */
  db: {
    host: dbHost,
    port: dbPort,
    name: required("DB_NAME"),
    user: dbUser,
    password: dbPassword,
    synchronize: bool("DB_SYNC", false),
  },
  /**
   * BD Contpaq PROMAC (clientes / productos / agentes).
   * Mismo host, puerto y credenciales; solo cambia el nombre.
   */
  dbCatalog: {
    host: dbHost,
    port: dbPort,
    name: optional("DB_CATALOG_NAME", "PROMAC"),
    user: dbUser,
    password: dbPassword,
    synchronize: false,
    required: bool("DB_CATALOG_REQUIRED", false),
  },
  seedAdmin: {
    nombre: process.env.ADMIN_NOMBRE ?? "Administrador",
    username: process.env.ADMIN_USERNAME ?? "admin",
    password: process.env.ADMIN_PASSWORD ?? "Se20sepaad80$",
  },
};

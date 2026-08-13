const LOCAL_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/;

export function nowLocalWallClock(date = new Date()): string {
  return formatParts(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

/** Normaliza a `YYYY-MM-DD HH:mm:ss.SSS` sin zona horaria. */
export function normalizeLocalWallClock(value: string): string | null {
  const match = LOCAL_DATETIME_RE.exec(value.trim());
  if (!match) return null;

  const [, y, mo, d, h, mi, s = "00", ms = "0"] = match;
  return formatParts(
    Number(y),
    Number(mo),
    Number(d),
    Number(h),
    Number(mi),
    Number(s),
    Number(ms.padEnd(3, "0")),
  );
}

/**
 * Convierte reloj de pared a Date para SQL Server/tedious:
 * los componentes UTC del Date = la hora local que queremos guardar.
 */
export function wallClockToDbDate(value: string): Date {
  const normalized = normalizeLocalWallClock(value);
  if (!normalized) {
    throw new Error(`Fecha local inválida: ${value}`);
  }

  const match = LOCAL_DATETIME_RE.exec(normalized.replace(" ", "T"));
  if (!match) {
    throw new Error(`Fecha local inválida: ${value}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? "0");
  const ms = Number((match[7] ?? "0").padEnd(3, "0"));

  return new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms));
}

/**
 * Lee un Date de SQL (wall clock en componentes UTC) o string, y lo
 * devuelve como reloj de pared sin zona.
 */
export function dbDateToWallClock(value: Date | string | null | undefined): string {
  if (value == null) {
    return nowLocalWallClock();
  }
  if (typeof value === "string") {
    return normalizeLocalWallClock(value) ?? value;
  }
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return nowLocalWallClock();
  }

  return formatParts(
    value.getUTCFullYear(),
    value.getUTCMonth() + 1,
    value.getUTCDate(),
    value.getUTCHours(),
    value.getUTCMinutes(),
    value.getUTCSeconds(),
    value.getUTCMilliseconds(),
  );
}

export function resolveClientLocalWallClock(
  headerValue: string | string[] | undefined,
): string {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (raw) {
    const normalized = normalizeLocalWallClock(raw);
    if (normalized) return normalized;
  }
  return nowLocalWallClock();
}

/** `YYYY-MM-DD` desde un wall clock. */
export function wallClockDay(value: string | Date): string {
  const wall =
    typeof value === "string" ? (normalizeLocalWallClock(value) ?? value) : dbDateToWallClock(value);
  return wall.slice(0, 10);
}

/** Minutos entre dos wall clocks (null si inválidos). */
export function minutesBetweenWallClocks(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
): number | null {
  if (!start || !end) return null;
  const startWall = typeof start === "string" ? start : dbDateToWallClock(start);
  const endWall = typeof end === "string" ? end : dbDateToWallClock(end);
  try {
    const a = wallClockToDbDate(startWall).getTime();
    const b = wallClockToDbDate(endWall).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
    return Math.round((b - a) / 60000);
  } catch {
    return null;
  }
}

function formatParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number,
): string {
  const pad = (n: number, size = 2) => String(n).padStart(size, "0");
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}.${pad(ms, 3)}`;
}

export type LineaPedidoComercial = {
  codigo: string;
  nombre: string;
  cantidad: number;
  precioSinIva: number | null;
  cantidadSurtida: number | null;
};

export function buildPedidoDetalle(
  lineas: LineaPedidoComercial[],
  notas: string,
): string {
  const lines = lineas.map((l) => {
    let line = `${l.codigo} x${l.cantidad} | ${l.nombre}`;
    if (l.precioSinIva != null && Number.isFinite(l.precioSinIva)) {
      const n = Math.round(l.precioSinIva * 100) / 100;
      line += ` | precio:${Number.isInteger(n) ? String(n) : n.toFixed(2)}`;
    }
    if (l.cantidadSurtida != null) {
      line += ` | surtido:${l.cantidadSurtida}`;
    }
    return line;
  });
  if (notas) {
    lines.push(`Notas: ${notas}`);
  }
  return lines.join("\n");
}

export const DETALLE_MAX_LEN = 2000;

export function parsePedidoDetalle(detalle: string | null): {
  lineas: LineaPedidoComercial[];
  notas: string;
} {
  if (!detalle?.trim()) return { lineas: [], notas: "" };
  const lineas: LineaPedidoComercial[] = [];
  let notas = "";
  for (const raw of detalle.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.toLowerCase().startsWith("notas:")) {
      notas = line.slice(6).trim();
      continue;
    }
    const match =
      /^(\S+)\s+x(\d+)\s*\|\s*(.+?)(?:\s*\|\s*precio:([\d.]+))?(?:\s*\|\s*surtido:(\d+))?$/i.exec(
        line,
      );
    if (match) {
      lineas.push({
        codigo: match[1] ?? "",
        cantidad: Number(match[2]) || 1,
        nombre: (match[3] ?? "").trim(),
        precioSinIva:
          match[4] !== undefined && match[4] !== ""
            ? Number(match[4])
            : null,
        cantidadSurtida: match[5] !== undefined ? Number(match[5]) : null,
      });
    }
  }
  return { lineas, notas };
}

/** Identidad de productos/cantidades/precio (ignora surtido). */
export function productFingerprint(lineas: LineaPedidoComercial[]): string {
  return lineas
    .map((l) => `${l.codigo}:${l.cantidad}:${l.precioSinIva ?? ""}`)
    .sort()
    .join("|");
}

export function detalleProductFingerprint(detalle: string | null): string {
  return productFingerprint(parsePedidoDetalle(detalle).lineas);
}

/**
 * Conserva productos del base; solo aplica surtido del incoming.
 * Nunca trunca de forma que se pierdan líneas: si no cabe, lanza error.
 */
export function applySurtidoOntoDetalle(
  baseDetalle: string | null,
  incomingDetalle: string | null,
): string | null {
  const base = parsePedidoDetalle(baseDetalle);
  if (base.lineas.length === 0) {
    return typeof incomingDetalle === "string" && incomingDetalle.trim()
      ? incomingDetalle.trim().slice(0, DETALLE_MAX_LEN)
      : null;
  }
  const incoming = parsePedidoDetalle(incomingDetalle);
  const surtidoByCode = new Map(
    incoming.lineas.map((l) => [l.codigo, l.cantidadSurtida]),
  );
  const merged = base.lineas.map((l) => ({
    ...l,
    cantidadSurtida: surtidoByCode.has(l.codigo)
      ? (surtidoByCode.get(l.codigo) ?? null)
      : l.cantidadSurtida,
  }));
  const notas = incoming.notas || base.notas;
  const result = buildPedidoDetalle(merged, notas);
  if (result.length > DETALLE_MAX_LEN) {
    const truncated = result.slice(0, DETALLE_MAX_LEN);
    if (parsePedidoDetalle(truncated).lineas.length !== merged.length) {
      throw Object.assign(
        new Error(
          "El detalle del pedido es demasiado largo al guardar surtido. Reduce notas o nombres antes de continuar.",
        ),
        { status: 400, code: "DETALLE_TOO_LONG" },
      );
    }
    return truncated;
  }
  return result;
}

/** Quita `| surtido:N` de cada línea. */
export function stripSurtidoFromDetalle(detalle: string | null): string | null {
  if (!detalle?.trim()) return detalle;
  const lines = detalle.split("\n").map((raw) => {
    const line = raw.trim();
    if (!line || line.toLowerCase().startsWith("notas:")) return raw;
    return raw.replace(/\s*\|\s*surtido:\d+\s*$/i, "");
  });
  return lines.join("\n");
}

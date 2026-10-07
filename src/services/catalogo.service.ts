import { CatalogDataSource } from "../config/database.js";
import type {
  FacturaDocumento,
  FacturaPartida,
} from "../interfaces/factura.interface.js";

export type CatalogItem = {
  codigo: string;
  nombre: string;
};

export type CatalogAgente = {
  id: number;
  codigo: string;
  nombre: string;
};

function clampLimit(limit: number): number {
  return Math.min(Math.max(Number(limit) || 8, 1), 50);
}

export class CatalogoService {
  private ensureReady(): void {
    if (!CatalogDataSource?.isInitialized) {
      const err = new Error("Catálogo no disponible (BD PROMAC no conectada)") as Error & {
        status?: number;
      };
      err.status = 503;
      throw err;
    }
  }

  /**
   * Clientes activos Contpaq (admClientes).
   * Solo CTIPOCLIENTE = 1 (cliente); 2 = cliente/proveedor, 3 = proveedor.
   * Opcional: filtrar por CIDAGENTEVENTA (admAgentes).
   */
  async searchClientes(
    q = "",
    limit = 8,
    agenteId?: number,
  ): Promise<CatalogItem[]> {
    this.ensureReady();
    const take = clampLimit(limit);
    const term = q.trim();
    const params: unknown[] = [take];
    const filters = [
      "CESTATUS = 1",
      "CTIPOCLIENTE = 1",
      "LTRIM(RTRIM(CCODIGOCLIENTE)) NOT LIKE '(Ninguno)%'",
    ];

    if (Number.isInteger(agenteId) && (agenteId as number) > 0) {
      filters.push(`CIDAGENTEVENTA = @${params.length}`);
      params.push(agenteId);
    }

    if (term) {
      filters.push(
        `(LTRIM(RTRIM(CCODIGOCLIENTE)) LIKE @${params.length} OR LTRIM(RTRIM(CRAZONSOCIAL)) LIKE @${params.length} OR LTRIM(RTRIM(CDENCOMERCIAL)) LIKE @${params.length})`,
      );
      params.push(`%${term}%`);
    }

    const sql = `
      SELECT TOP (@0)
        LTRIM(RTRIM(CCODIGOCLIENTE)) AS codigo,
        LTRIM(RTRIM(
          CASE
            WHEN NULLIF(LTRIM(RTRIM(CDENCOMERCIAL)), '') IS NOT NULL
              THEN CDENCOMERCIAL
            ELSE CRAZONSOCIAL
          END
        )) AS nombre
      FROM dbo.admClientes
      WHERE ${filters.join(" AND ")}
      ORDER BY CRAZONSOCIAL
    `;

    return this.mapItems(await CatalogDataSource!.query(sql, params));
  }

  /** Productos activos Contpaq (admProductos). */
  async searchProductos(q = "", limit = 8): Promise<CatalogItem[]> {
    this.ensureReady();
    const take = clampLimit(limit);
    const term = q.trim();
    const params: unknown[] = [take];
    const filters = [
      "CSTATUSPRODUCTO = 1",
      "LTRIM(RTRIM(CCODIGOPRODUCTO)) NOT LIKE '(Ninguno)%'",
    ];

    if (term) {
      filters.push(
        `(LTRIM(RTRIM(CCODIGOPRODUCTO)) LIKE @${params.length} OR LTRIM(RTRIM(CNOMBREPRODUCTO)) LIKE @${params.length} OR LTRIM(RTRIM(ISNULL(CCODALTERN, ''))) LIKE @${params.length})`,
      );
      params.push(`%${term}%`);
    }

    const sql = `
      SELECT TOP (@0)
        LTRIM(RTRIM(CCODIGOPRODUCTO)) AS codigo,
        LTRIM(RTRIM(CNOMBREPRODUCTO)) AS nombre
      FROM dbo.admProductos
      WHERE ${filters.join(" AND ")}
      ORDER BY CNOMBREPRODUCTO
    `;

    return this.mapItems(await CatalogDataSource!.query(sql, params));
  }

  /**
   * Resuelve código Contpaq por nombre exacto (denominación comercial o razón social).
   * Si el catálogo no está disponible o no hay match único, regresa null.
   */
  async resolveClienteCodigoByNombre(nombre: string): Promise<string | null> {
    if (!CatalogDataSource?.isInitialized) return null;
    const term = nombre.trim();
    if (!term) return null;

    try {
      const rows = (await CatalogDataSource.query(
        `
        SELECT TOP 10
          LTRIM(RTRIM(CCODIGOCLIENTE)) AS codigo,
          LTRIM(RTRIM(CRAZONSOCIAL)) AS razonSocial,
          LTRIM(RTRIM(ISNULL(CDENCOMERCIAL, ''))) AS denComercial
        FROM dbo.admClientes
        WHERE CESTATUS = 1
          AND CTIPOCLIENTE = 1
          AND LTRIM(RTRIM(CCODIGOCLIENTE)) NOT LIKE '(Ninguno)%'
          AND (
            LOWER(LTRIM(RTRIM(CRAZONSOCIAL))) = LOWER(@0)
            OR LOWER(LTRIM(RTRIM(CDENCOMERCIAL))) = LOWER(@0)
          )
        ORDER BY CRAZONSOCIAL
        `,
        [term],
      )) as Array<{
        codigo: string | null;
        razonSocial: string | null;
        denComercial: string | null;
      }>;

      const items = rows
        .map((r) => ({
          codigo: String(r.codigo ?? "").trim(),
          razonSocial: String(r.razonSocial ?? "").trim(),
          denComercial: String(r.denComercial ?? "").trim(),
        }))
        .filter((r) => r.codigo);

      if (items.length === 0) return null;
      if (items.length === 1) return items[0]!.codigo;

      const byDen = items.filter(
        (r) => r.denComercial.toLowerCase() === term.toLowerCase(),
      );
      if (byDen.length === 1) return byDen[0]!.codigo;

      const byRaz = items.filter(
        (r) => r.razonSocial.toLowerCase() === term.toLowerCase(),
      );
      if (byRaz.length === 1) return byRaz[0]!.codigo;

      // Varios matches ambiguos: no adivinar
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Facturas timbradas (admDocumentos + admFoliosDigitales) por folio.
   * Un folio puede repetirse en otra serie: se devuelve cada documento.
   */
  async findFacturasByFolio(folio: number): Promise<FacturaDocumento[]> {
    return this.queryFacturas("d.CFOLIO = @0", [folio]);
  }

  async findFacturaByDocumentoId(
    idDocumento: number,
  ): Promise<FacturaDocumento | null> {
    const items = await this.queryFacturas("d.CIDDOCUMENTO = @0", [idDocumento]);
    return items[0] ?? null;
  }

  /** Agentes de venta Contpaq (admAgentes) — útiles para filtrar clientes. */
  async listAgentes(): Promise<CatalogAgente[]> {
    this.ensureReady();
    const rows = (await CatalogDataSource!.query(`
      SELECT
        CIDAGENTE AS id,
        LTRIM(RTRIM(CCODIGOAGENTE)) AS codigo,
        LTRIM(RTRIM(CNOMBREAGENTE)) AS nombre
      FROM dbo.admAgentes
      WHERE CIDAGENTE > 0
        AND LTRIM(RTRIM(CCODIGOAGENTE)) NOT LIKE '(Ninguno)%'
      ORDER BY CNOMBREAGENTE
    `)) as Array<{ id: number; codigo: string; nombre: string }>;

    return rows.map((r) => ({
      id: Number(r.id),
      codigo: String(r.codigo ?? "").trim(),
      nombre: String(r.nombre ?? "").trim(),
    }));
  }

  private async queryFacturas(
    where: string,
    params: unknown[],
  ): Promise<FacturaDocumento[]> {
    this.ensureReady();

    const sql = `
      SELECT
        d.CIDDOCUMENTO AS idDocumento,
        d.CFOLIO AS factura,
        LTRIM(RTRIM(d.CSERIEDOCUMENTO)) AS serie,
        CONVERT(varchar(19), d.CFECHA, 120) AS fechaDocumento,
        d.CTOTAL AS totalFactura,
        LTRIM(RTRIM(f.CUUID)) AS uuid,
        CONVERT(varchar(19), f.CFECHAEMI, 120) AS fechaTimbrado,
        CONVERT(varchar(8), f.CHORAEMI, 108) AS horaTimbrado,
        f.CESTADO AS estadoTimbrado,
        c.CIDCLIENTEPROVEEDOR AS idCliente,
        LTRIM(RTRIM(c.CCODIGOCLIENTE)) AS codigoCliente,
        LTRIM(RTRIM(c.CRAZONSOCIAL)) AS cliente,
        LTRIM(RTRIM(c.CRFC)) AS rfc,
        p.CIDPRODUCTO AS idProducto,
        LTRIM(RTRIM(p.CCODIGOPRODUCTO)) AS codigoProducto,
        LTRIM(RTRIM(p.CNOMBREPRODUCTO)) AS producto,
        m.CUNIDADES AS cantidad,
        m.CPRECIO AS precioUnitario,
        m.CTOTAL AS totalPartida,
        m.CIDMOVIMIENTO AS idMovimiento
      FROM dbo.admDocumentos AS d
      INNER JOIN dbo.admFoliosDigitales AS f
        ON f.CIDDOCTO = d.CIDDOCUMENTO
        AND f.CUUID IS NOT NULL
        AND LTRIM(RTRIM(f.CUUID)) <> ''
      LEFT JOIN dbo.admClientes AS c
        ON c.CIDCLIENTEPROVEEDOR = d.CIDCLIENTEPROVEEDOR
      LEFT JOIN dbo.admMovimientos AS m
        ON m.CIDDOCUMENTO = d.CIDDOCUMENTO
      LEFT JOIN dbo.admProductos AS p
        ON p.CIDPRODUCTO = m.CIDPRODUCTO
      WHERE ${where}
      ORDER BY d.CIDDOCUMENTO, f.CFECHAEMI DESC, m.CIDMOVIMIENTO
    `;

    const rows = (await CatalogDataSource!.query(sql, params)) as FacturaRow[];
    return this.groupFacturas(rows);
  }

  private groupFacturas(rows: FacturaRow[]): FacturaDocumento[] {
    const byDocumento = new Map<number, FacturaDocumento>();
    const seenMovimientos = new Map<number, Set<number>>();

    for (const row of rows) {
      const idDocumento = Number(row.idDocumento);
      if (!Number.isInteger(idDocumento) || idDocumento <= 0) continue;

      let doc = byDocumento.get(idDocumento);
      if (!doc) {
        doc = {
          idDocumento,
          factura: Number(row.factura) || 0,
          serie: text(row.serie),
          fechaDocumento: text(row.fechaDocumento) || null,
          totalFactura: money(row.totalFactura),
          uuid: text(row.uuid),
          fechaTimbrado: text(row.fechaTimbrado) || null,
          horaTimbrado: text(row.horaTimbrado) || null,
          estadoTimbrado:
            row.estadoTimbrado == null || row.estadoTimbrado === ""
              ? null
              : Number(row.estadoTimbrado),
          idCliente:
            row.idCliente == null ? null : Number(row.idCliente) || null,
          codigoCliente: text(row.codigoCliente),
          cliente: text(row.cliente),
          rfc: text(row.rfc),
          partidas: [],
        };
        byDocumento.set(idDocumento, doc);
        seenMovimientos.set(idDocumento, new Set());
      }

      const idMovimiento = Number(row.idMovimiento);
      if (!Number.isInteger(idMovimiento) || idMovimiento <= 0) continue;
      const seen = seenMovimientos.get(idDocumento)!;
      if (seen.has(idMovimiento)) continue;
      seen.add(idMovimiento);

      const partida: FacturaPartida = {
        codigoProducto: text(row.codigoProducto),
        producto: text(row.producto),
        cantidad: money(row.cantidad),
        precioUnitario: money(row.precioUnitario),
        totalPartida: money(row.totalPartida),
      };
      if (!partida.codigoProducto && !partida.producto && partida.cantidad === 0) {
        continue;
      }
      doc.partidas.push(partida);
    }

    return [...byDocumento.values()];
  }

  private mapItems(
    rows: Array<{ codigo: string | null; nombre: string | null }>,
  ): CatalogItem[] {
    return rows
      .map((r) => ({
        codigo: String(r.codigo ?? "").trim(),
        nombre: String(r.nombre ?? "").trim(),
      }))
      .filter((r) => r.codigo && r.nombre);
  }
}

type FacturaRow = {
  idDocumento: number;
  factura: number | string | null;
  serie: string | null;
  fechaDocumento: string | null;
  totalFactura: number | string | null;
  uuid: string | null;
  fechaTimbrado: string | null;
  horaTimbrado: string | null;
  estadoTimbrado: number | string | null;
  idCliente: number | null;
  codigoCliente: string | null;
  cliente: string | null;
  rfc: string | null;
  idProducto: number | null;
  codigoProducto: string | null;
  producto: string | null;
  cantidad: number | string | null;
  precioUnitario: number | string | null;
  totalPartida: number | string | null;
  idMovimiento: number | null;
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function money(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 1e6) / 1e6;
}

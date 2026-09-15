import { CatalogDataSource } from "../config/database.js";

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
   * CTIPOCLIENTE 1 = cliente, 3 = cliente/proveedor.
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
      "CTIPOCLIENTE IN (1, 3)",
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

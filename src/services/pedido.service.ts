import { AppDataSource } from "../config/database.js";
import { PedidoEstatus } from "../constants/pedido-estatus.enum.js";
import { Pedido } from "../entities/pedido.entity.js";
import type { FacturaDocumento, FacturaPartida } from "../interfaces/factura.interface.js";
import type {
  CreatePedidoDto,
  PedidoListQuery,
  PedidoListResult,
  PedidoPublic,
  UpdatePedidoDto,
} from "../interfaces/pedido.interface.js";
import { CatalogoService } from "./catalogo.service.js";
import { getClientLocalWallClock } from "../utils/client-time-context.js";
import {
  dbDateToWallClock,
  wallClockToDbDate,
} from "../utils/local-datetime.js";

const ESTATUS = new Set<string>(Object.values(PedidoEstatus));

export class PedidoService {
  private readonly repo = AppDataSource.getRepository(Pedido);
  private readonly catalogo = new CatalogoService();

  async findAll(query: PedidoListQuery = {}): Promise<PedidoListResult> {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 10));
    const q = typeof query.q === "string" ? query.q.trim() : "";
    const estatus =
      typeof query.estatus === "string" && query.estatus && ESTATUS.has(query.estatus)
        ? query.estatus
        : "";

    const baseWhere = this.repo.createQueryBuilder("p");

    if (estatus) {
      baseWhere.andWhere("p.estatus = :estatus", { estatus });
    }
    if (q) {
      baseWhere.andWhere(
        `(LOWER(p.lugarEntrega) LIKE :q
          OR LOWER(ISNULL(p.clienteNombre, '')) LIKE :q
          OR LOWER(ISNULL(p.clienteCodigo, '')) LIKE :q
          OR CAST(ISNULL(p.facturaFolio, 0) AS varchar(20)) LIKE :q)`,
        { q: `%${q.toLowerCase()}%` },
      );
    }

    const total = await baseWhere.getCount();

    const qb = this.repo
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.creadoPor", "creadoPor")
      .leftJoinAndSelect("p.rutaPedidos", "rutaPedidos")
      .addSelect(
        `CASE WHEN p.estatus = :entregadoOrden THEN 1 ELSE 0 END`,
        "entregado_orden",
      )
      .setParameter("entregadoOrden", PedidoEstatus.ENTREGADO)
      .orderBy("entregado_orden", "ASC")
      .addOrderBy("p.id", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (estatus) {
      qb.andWhere("p.estatus = :estatus", { estatus });
    }
    if (q) {
      qb.andWhere(
        `(LOWER(p.lugarEntrega) LIKE :q
          OR LOWER(ISNULL(p.clienteNombre, '')) LIKE :q
          OR LOWER(ISNULL(p.clienteCodigo, '')) LIKE :q
          OR CAST(ISNULL(p.facturaFolio, 0) AS varchar(20)) LIKE :q)`,
        { q: `%${q.toLowerCase()}%` },
      );
    }

    const pedidos = await qb.getMany();

    return {
      items: pedidos.map((p) => this.toPublic(p)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async findById(id: number): Promise<PedidoPublic | null> {
    const pedido = await this.repo.findOne({
      where: { id },
      relations: { creadoPor: true, rutaPedidos: true },
    });
    return pedido ? this.toPublic(pedido, true) : null;
  }

  async create(dto: CreatePedidoDto): Promise<PedidoPublic> {
    if (!Number.isInteger(dto.creadoPorId) || dto.creadoPorId <= 0) {
      throw Object.assign(new Error("creadoPorId inválido"), { status: 400 });
    }

    const factura = await this.resolveFactura(dto);
    const lugarEntrega = factura
      ? lugarDesdeFactura(factura)
      : dto.lugarEntrega?.trim() ?? "";

    if (!lugarEntrega) {
      throw Object.assign(new Error("lugarEntrega es requerido"), {
        status: 400,
      });
    }

    const now = wallClockToDbDate(getClientLocalWallClock());
    const pedido = this.repo.create({
      lugarEntrega,
      creadoPorId: dto.creadoPorId,
      estatus: PedidoEstatus.LISTO_PARA_ENTREGAR,
      documentoId: factura?.idDocumento ?? null,
      facturaFolio: factura?.factura ?? null,
      facturaSerie: factura?.serie || null,
      facturaFecha: factura?.fechaDocumento ?? null,
      facturaUuid: factura?.uuid || null,
      clienteCodigo: factura?.codigoCliente || null,
      clienteNombre: factura?.cliente || null,
      clienteRfc: factura?.rfc || null,
      facturaTotal:
        factura == null ? null : factura.totalFactura.toFixed(6),
      partidas: factura ? JSON.stringify(factura.partidas) : null,
      createdAt: now,
      updatedAt: now,
    });

    const saved = await this.repo.save(pedido);
    const full = await this.repo.findOne({
      where: { id: saved.id },
      relations: { creadoPor: true, rutaPedidos: true },
    });
    return this.toPublic(full ?? saved);
  }

  async update(id: number, dto: UpdatePedidoDto): Promise<PedidoPublic | null> {
    const pedido = await this.repo.findOne({
      where: { id },
      relations: { creadoPor: true, rutaPedidos: true },
    });
    if (!pedido) return null;

    if (pedido.estatus === PedidoEstatus.ENTREGADO) {
      throw Object.assign(
        new Error("Un pedido entregado no se puede editar ni cambiar de estatus"),
        { status: 400 },
      );
    }

    if (dto.lugarEntrega !== undefined) {
      throw Object.assign(
        new Error("El cliente viene de la factura y no se puede editar"),
        { status: 400 },
      );
    }

    if (dto.estatus !== undefined) {
      if (!ESTATUS.has(dto.estatus)) {
        throw Object.assign(new Error("estatus inválido"), { status: 400 });
      }
      pedido.estatus = dto.estatus;
    }

    if (dto.firma !== undefined || dto.recibidoPor !== undefined) {
      if (pedido.estatus !== PedidoEstatus.ENTREGADO) {
        throw Object.assign(
          new Error("La firma solo se registra al marcar el pedido como entregado"),
          { status: 400 },
        );
      }
      if (typeof dto.recibidoPor === "string" && dto.recibidoPor.trim()) {
        pedido.recibidoPor = dto.recibidoPor.trim().slice(0, 120);
      }
      if (typeof dto.firma === "string" && dto.firma.trim()) {
        pedido.firma = normalizeFirma(dto.firma);
        pedido.firmadoAt = wallClockToDbDate(getClientLocalWallClock());
      }
    }

    if (dto.entregados !== undefined) {
      if (pedido.estatus !== PedidoEstatus.ENTREGADO) {
        throw Object.assign(
          new Error("Los productos entregados solo se registran al entregar"),
          { status: 400 },
        );
      }
      if (!Array.isArray(dto.entregados)) {
        throw Object.assign(new Error("entregados inválido"), { status: 400 });
      }
      const partidas = parsePartidas(pedido.partidas);
      if (dto.entregados.length !== partidas.length) {
        throw Object.assign(
          new Error("El listado de productos no coincide con la factura"),
          { status: 400 },
        );
      }
      pedido.partidas = JSON.stringify(
        partidas.map((partida, index) => ({
          ...partida,
          entregado: dto.entregados?.[index] === true,
        })),
      );
    }

    pedido.updatedAt = wallClockToDbDate(getClientLocalWallClock());
    const saved = await this.repo.save(pedido);
    return this.toPublic(saved);
  }

  async remove(id: number): Promise<boolean> {
    const pedido = await this.repo.findOne({ where: { id } });
    if (!pedido) return false;
    if (pedido.estatus !== PedidoEstatus.LISTO_PARA_ENTREGAR) {
      throw Object.assign(
        new Error(
          "Solo se pueden eliminar pedidos en estatus listo para entregar",
        ),
        { status: 400 },
      );
    }
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  private toPublic(pedido: Pedido, includeFirma = false): PedidoPublic {
    const rutaIds = (pedido.rutaPedidos ?? []).map((rp) => rp.rutaId);
    const rutaId = rutaIds.length > 0 ? Math.max(...rutaIds) : null;

    return {
      id: pedido.id,
      lugarEntrega: pedido.lugarEntrega,
      estatus: pedido.estatus,
      creadoPorId: pedido.creadoPorId,
      creadoPorNombre: pedido.creadoPor?.nombre ?? null,
      rutaId,
      documentoId: pedido.documentoId ?? null,
      facturaFolio: pedido.facturaFolio ?? null,
      facturaSerie: pedido.facturaSerie ?? null,
      facturaFecha: pedido.facturaFecha ?? null,
      facturaUuid: pedido.facturaUuid ?? null,
      clienteCodigo: pedido.clienteCodigo ?? null,
      clienteNombre: pedido.clienteNombre ?? null,
      clienteRfc: pedido.clienteRfc ?? null,
      facturaTotal:
        pedido.facturaTotal == null ? null : Number(pedido.facturaTotal),
      partidas: parsePartidas(pedido.partidas),
      recibidoPor: pedido.recibidoPor ?? null,
      tieneFirma: Boolean(pedido.firma),
      firma: includeFirma ? pedido.firma ?? null : null,
      firmadoAt: pedido.firmadoAt ? dbDateToWallClock(pedido.firmadoAt) : null,
      createdAt: dbDateToWallClock(pedido.createdAt),
      updatedAt: dbDateToWallClock(pedido.updatedAt),
    };
  }

  private async resolveFactura(
    dto: CreatePedidoDto,
  ): Promise<FacturaDocumento | null> {
    if (dto.idDocumento == null) return null;
    if (!Number.isInteger(dto.idDocumento) || dto.idDocumento <= 0) {
      throw Object.assign(new Error("idDocumento inválido"), { status: 400 });
    }

    const duplicado = await this.repo.findOne({
      where: { documentoId: dto.idDocumento },
    });
    if (duplicado) {
      throw Object.assign(
        new Error(
          `Esa factura ya está registrada en el pedido #${duplicado.id}`,
        ),
        { status: 409 },
      );
    }

    const factura = await this.catalogo.findFacturaByDocumentoId(dto.idDocumento);
    if (!factura) {
      throw Object.assign(new Error("No se encontró la factura timbrada"), {
        status: 404,
      });
    }
    if (!factura.cliente.trim()) {
      throw Object.assign(new Error("La factura no tiene cliente"), {
        status: 400,
      });
    }
    return factura;
  }
}

function lugarDesdeFactura(factura: FacturaDocumento): string {
  const codigo = factura.codigoCliente.trim();
  const cliente = factura.cliente.trim();
  const label = codigo ? `${codigo} — ${cliente}` : cliente;
  return label.slice(0, 160);
}

export function parsePartidas(raw: string | null | undefined): FacturaPartida[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      return [
        {
          codigoProducto: String(row.codigoProducto ?? "").trim(),
          producto: String(row.producto ?? "").trim(),
          cantidad: Number(row.cantidad) || 0,
          precioUnitario: Number(row.precioUnitario) || 0,
          totalPartida: Number(row.totalPartida) || 0,
          ...(typeof row.entregado === "boolean"
            ? { entregado: row.entregado }
            : {}),
        },
      ];
    });
  } catch {
    return [];
  }
}

function normalizeFirma(raw: string): string {
  const trimmed = raw.trim();
  const payload = trimmed.startsWith("data:")
    ? trimmed.slice(trimmed.indexOf(",") + 1)
    : trimmed;
  const compact = payload.replace(/\s/g, "");
  if (compact.length < 32 || compact.length > 800_000) {
    throw Object.assign(new Error("La firma no es válida"), { status: 400 });
  }
  if (!/^[A-Za-z0-9+/=]+$/.test(compact)) {
    throw Object.assign(new Error("La firma no es válida"), { status: 400 });
  }
  return compact;
}

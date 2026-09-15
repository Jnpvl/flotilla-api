import { AppDataSource } from "../config/database.js";
import { PedidoComercialEstatus } from "../constants/pedido-comercial-estatus.enum.js";
import { RolUsuario } from "../constants/rol.enum.js";
import { PedidoComercial } from "../entities/pedido-comercial.entity.js";
import type {
  CreatePedidoComercialDto,
  PedidoComercialListQuery,
  PedidoComercialListResult,
  PedidoComercialPublic,
  PedidoComercialUpdateContext,
  UpdatePedidoComercialDto,
} from "../interfaces/pedido-comercial.interface.js";
import {
  applySurtidoOntoDetalle,
  stripSurtidoFromDetalle,
} from "../utils/pedido-comercial-detalle.js";
import { getClientLocalWallClock } from "../utils/client-time-context.js";
import {
  dbDateToWallClock,
  wallClockToDbDate,
} from "../utils/local-datetime.js";

const ESTATUS = new Set<string>(Object.values(PedidoComercialEstatus));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isPrefacturaStatus(estatus: PedidoComercialEstatus): boolean {
  return (
    estatus === PedidoComercialEstatus.PREFACTURADO ||
    estatus === PedidoComercialEstatus.EN_FACTURACION
  );
}

export class PedidoComercialService {
  private readonly repo = AppDataSource.getRepository(PedidoComercial);

  async findAll(
    query: PedidoComercialListQuery = {},
  ): Promise<PedidoComercialListResult> {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const q = typeof query.q === "string" ? query.q.trim() : "";
    let estatus =
      typeof query.estatus === "string" &&
      query.estatus &&
      ESTATUS.has(query.estatus)
        ? query.estatus
        : "";
    const vendedorId =
      Number.isInteger(query.vendedorId) && (query.vendedorId ?? 0) > 0
        ? query.vendedorId
        : undefined;
    const excludeBorrador = query.excludeBorrador === true;

    // Facturista no ve borradores: si pide ese filtro, lista vacía
    if (excludeBorrador && estatus === PedidoComercialEstatus.BORRADOR) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 1,
      };
    }

    const applyFilters = (
      qb: ReturnType<typeof this.repo.createQueryBuilder>,
    ) => {
      if (estatus) {
        qb.andWhere("p.estatus = :estatus", { estatus });
      } else if (excludeBorrador) {
        qb.andWhere("p.estatus <> :borrador", {
          borrador: PedidoComercialEstatus.BORRADOR,
        });
      }
      if (vendedorId) {
        qb.andWhere("p.vendedorId = :vendedorId", { vendedorId });
      }
      if (q) {
        qb.andWhere(
          "(LOWER(p.clienteNombre) LIKE :q OR LOWER(p.detalle) LIKE :q)",
          { q: `%${q.toLowerCase()}%` },
        );
      }
    };

    const baseWhere = this.repo.createQueryBuilder("p");
    applyFilters(baseWhere);
    const total = await baseWhere.getCount();

    const qb = this.repo
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.vendedor", "vendedor")
      .orderBy("p.id", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize);
    applyFilters(qb);

    const items = await qb.getMany();
    return {
      items: items.map((p) => this.toPublic(p)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async findById(id: number): Promise<PedidoComercialPublic | null> {
    const pedido = await this.repo.findOne({
      where: { id },
      relations: { vendedor: true },
    });
    return pedido ? this.toPublic(pedido) : null;
  }

  async create(dto: CreatePedidoComercialDto): Promise<PedidoComercialPublic> {
    if (typeof dto.clienteNombre !== "string" || !dto.clienteNombre.trim()) {
      throw Object.assign(new Error("clienteNombre es requerido"), {
        status: 400,
      });
    }
    if (
      typeof dto.fechaPedido !== "string" ||
      !DATE_RE.test(dto.fechaPedido.trim())
    ) {
      throw Object.assign(new Error("fechaPedido inválida (YYYY-MM-DD)"), {
        status: 400,
      });
    }
    if (!Number.isInteger(dto.vendedorId) || dto.vendedorId <= 0) {
      throw Object.assign(new Error("vendedorId inválido"), { status: 400 });
    }

    let estatus = PedidoComercialEstatus.BORRADOR;
    if (dto.estatus !== undefined) {
      if (!ESTATUS.has(dto.estatus)) {
        throw Object.assign(new Error("estatus inválido"), { status: 400 });
      }
      estatus = dto.estatus;
    }

    const detalle =
      typeof dto.detalle === "string" && dto.detalle.trim()
        ? dto.detalle.trim().slice(0, 2000)
        : null;

    const now = wallClockToDbDate(getClientLocalWallClock());
    const pedido = this.repo.create({
      clienteNombre: dto.clienteNombre.trim(),
      detalle,
      fechaPedido: dto.fechaPedido.trim(),
      estatus,
      vendedorId: dto.vendedorId,
      createdAt: now,
      updatedAt: now,
      capturadoAt: null,
      prefacturadoAt: null,
      facturadoAt: null,
      requiereRevision: false,
      modificadoEnPrefacturaAt: null,
    });
    this.applyStatusTimestamps(pedido, estatus, now);

    const saved = await this.repo.save(pedido);
    const full = await this.repo.findOne({
      where: { id: saved.id },
      relations: { vendedor: true },
    });
    return this.toPublic(full ?? saved);
  }

  async update(
    id: number,
    dto: UpdatePedidoComercialDto,
    ctx: PedidoComercialUpdateContext = {},
  ): Promise<PedidoComercialPublic | null> {
    const pedido = await this.repo.findOne({
      where: { id },
      relations: { vendedor: true },
    });
    if (!pedido) return null;

    if (pedido.estatus === PedidoComercialEstatus.FACTURADO) {
      throw Object.assign(
        new Error("Un pedido facturado no se puede modificar"),
        { status: 400 },
      );
    }

    const actorRol = ctx.actorRol;
    const wasPrefactura = isPrefacturaStatus(pedido.estatus);
    const prevDetalle = pedido.detalle;

    if (dto.clienteNombre !== undefined) {
      if (typeof dto.clienteNombre !== "string" || !dto.clienteNombre.trim()) {
        throw Object.assign(new Error("clienteNombre inválido"), {
          status: 400,
        });
      }
      pedido.clienteNombre = dto.clienteNombre.trim();
    }

    if (dto.detalle !== undefined) {
      const surtidoOnly =
        wasPrefactura &&
        (actorRol === RolUsuario.FACTURISTA ||
          (actorRol === RolUsuario.ADMIN &&
            dto.clienteNombre === undefined &&
            dto.fechaPedido === undefined));

      if (surtidoOnly) {
        // El pedido del vendedor manda: solo se aplica surtido
        pedido.detalle = applySurtidoOntoDetalle(prevDetalle, dto.detalle);
      } else {
        pedido.detalle =
          typeof dto.detalle === "string" && dto.detalle.trim()
            ? dto.detalle.trim().slice(0, 2000)
            : null;
      }
    }

    if (dto.fechaPedido !== undefined) {
      if (
        typeof dto.fechaPedido !== "string" ||
        !DATE_RE.test(dto.fechaPedido.trim())
      ) {
        throw Object.assign(new Error("fechaPedido inválida (YYYY-MM-DD)"), {
          status: 400,
        });
      }
      pedido.fechaPedido = dto.fechaPedido.trim();
    }

    const now = wallClockToDbDate(getClientLocalWallClock());
    const detalleChanged =
      dto.detalle !== undefined && (pedido.detalle ?? null) !== (prevDetalle ?? null);

    const nextEstatus = dto.estatus !== undefined ? dto.estatus : pedido.estatus;

    // Candado estricto: el pedido del vendedor manda; hay que guardar surtido primero
    if (
      nextEstatus === PedidoComercialEstatus.FACTURADO &&
      Boolean(pedido.requiereRevision)
    ) {
      throw Object.assign(
        new Error(
          "Este pedido fue modificado por el vendedor después de prefactura. Revisa productos, guarda surtido y vuelve a facturar.",
        ),
        { status: 409, code: "REQUIERE_REVISION" },
      );
    }

    if (dto.estatus !== undefined) {
      if (!ESTATUS.has(dto.estatus)) {
        throw Object.assign(new Error("estatus inválido"), { status: 400 });
      }
      if (dto.estatus !== pedido.estatus) {
        this.applyStatusTimestamps(pedido, dto.estatus, now);
      }
      pedido.estatus = dto.estatus;
    }

    // Vendedor editó líneas estando en prefactura → marcar revisión y limpiar surtido
    if (
      wasPrefactura &&
      detalleChanged &&
      actorRol === RolUsuario.VENDEDOR
    ) {
      pedido.detalle = stripSurtidoFromDetalle(pedido.detalle);
      pedido.requiereRevision = true;
      pedido.modificadoEnPrefacturaAt = now;
    }

    // Facturista/admin: si hay modificación del vendedor, exige acuse explícito al guardar surtido
    if (
      wasPrefactura &&
      dto.detalle !== undefined &&
      (actorRol === RolUsuario.FACTURISTA ||
        (actorRol === RolUsuario.ADMIN &&
          dto.clienteNombre === undefined &&
          dto.fechaPedido === undefined))
    ) {
      if (Boolean(pedido.requiereRevision) && dto.ackRevision !== true) {
        throw Object.assign(
          new Error(
            "El vendedor modificó este pedido. Debes confirmar que revisaste los productos nuevos antes de guardar surtido.",
          ),
          { status: 409, code: "REQUIERE_REVISION" },
        );
      }
      pedido.requiereRevision = false;
    }

    // Al facturar se limpia el candado
    if (pedido.estatus === PedidoComercialEstatus.FACTURADO) {
      pedido.requiereRevision = false;
    }

    pedido.updatedAt = now;
    const saved = await this.repo.save(pedido);
    return this.toPublic(saved);
  }

  async remove(id: number): Promise<boolean> {
    const pedido = await this.repo.findOne({ where: { id } });
    if (!pedido) return false;
    if (pedido.estatus === PedidoComercialEstatus.FACTURADO) {
      throw Object.assign(
        new Error("Un pedido facturado no se puede eliminar"),
        { status: 400 },
      );
    }
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Marca la primera vez que el pedido entra a cada estatus.
   * Usa reloj del device (wall clock), sin conversión de zona.
   */
  private applyStatusTimestamps(
    pedido: PedidoComercial,
    estatus: PedidoComercialEstatus,
    now: Date,
  ): void {
    if (
      estatus === PedidoComercialEstatus.CAPTURADO &&
      !pedido.capturadoAt
    ) {
      pedido.capturadoAt = now;
    }

    if (
      (estatus === PedidoComercialEstatus.PREFACTURADO ||
        estatus === PedidoComercialEstatus.EN_FACTURACION) &&
      !pedido.prefacturadoAt
    ) {
      pedido.prefacturadoAt = now;
    }

    if (
      estatus === PedidoComercialEstatus.FACTURADO &&
      !pedido.facturadoAt
    ) {
      pedido.facturadoAt = now;
    }
  }

  private toPublic(pedido: PedidoComercial): PedidoComercialPublic {
    return {
      id: pedido.id,
      clienteNombre: pedido.clienteNombre,
      detalle: pedido.detalle,
      fechaPedido: pedido.fechaPedido,
      estatus: pedido.estatus,
      vendedorId: pedido.vendedorId,
      vendedorNombre: pedido.vendedor?.nombre ?? null,
      createdAt: dbDateToWallClock(pedido.createdAt),
      updatedAt: dbDateToWallClock(pedido.updatedAt),
      capturadoAt: pedido.capturadoAt
        ? dbDateToWallClock(pedido.capturadoAt)
        : null,
      prefacturadoAt: pedido.prefacturadoAt
        ? dbDateToWallClock(pedido.prefacturadoAt)
        : null,
      facturadoAt: pedido.facturadoAt
        ? dbDateToWallClock(pedido.facturadoAt)
        : null,
      requiereRevision: Boolean(pedido.requiereRevision),
      modificadoEnPrefacturaAt: pedido.modificadoEnPrefacturaAt
        ? dbDateToWallClock(pedido.modificadoEnPrefacturaAt)
        : null,
    };
  }
}

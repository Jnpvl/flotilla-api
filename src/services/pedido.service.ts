import { AppDataSource } from "../config/database.js";
import { PedidoEstatus } from "../constants/pedido-estatus.enum.js";
import { Pedido } from "../entities/pedido.entity.js";
import type {
  CreatePedidoDto,
  PedidoListQuery,
  PedidoListResult,
  PedidoPublic,
  UpdatePedidoDto,
} from "../interfaces/pedido.interface.js";
import { getClientLocalWallClock } from "../utils/client-time-context.js";
import {
  dbDateToWallClock,
  wallClockToDbDate,
} from "../utils/local-datetime.js";

const ESTATUS = new Set<string>(Object.values(PedidoEstatus));

export class PedidoService {
  private readonly repo = AppDataSource.getRepository(Pedido);

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
      baseWhere.andWhere("LOWER(p.lugarEntrega) LIKE :q", {
        q: `%${q.toLowerCase()}%`,
      });
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
      qb.andWhere("LOWER(p.lugarEntrega) LIKE :q", {
        q: `%${q.toLowerCase()}%`,
      });
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
    return pedido ? this.toPublic(pedido) : null;
  }

  async create(dto: CreatePedidoDto): Promise<PedidoPublic> {
    if (typeof dto.lugarEntrega !== "string" || !dto.lugarEntrega.trim()) {
      throw Object.assign(new Error("lugarEntrega es requerido"), {
        status: 400,
      });
    }
    if (!Number.isInteger(dto.creadoPorId) || dto.creadoPorId <= 0) {
      throw Object.assign(new Error("creadoPorId inválido"), { status: 400 });
    }

    const now = wallClockToDbDate(getClientLocalWallClock());
    const pedido = this.repo.create({
      lugarEntrega: dto.lugarEntrega.trim(),
      creadoPorId: dto.creadoPorId,
      estatus: PedidoEstatus.LISTO_PARA_ENTREGAR,
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
      if (typeof dto.lugarEntrega !== "string" || !dto.lugarEntrega.trim()) {
        throw Object.assign(new Error("lugarEntrega inválido"), { status: 400 });
      }
      pedido.lugarEntrega = dto.lugarEntrega.trim();
    }

    if (dto.estatus !== undefined) {
      if (!ESTATUS.has(dto.estatus)) {
        throw Object.assign(new Error("estatus inválido"), { status: 400 });
      }
      pedido.estatus = dto.estatus;
    }

    pedido.updatedAt = wallClockToDbDate(getClientLocalWallClock());
    const saved = await this.repo.save(pedido);
    return this.toPublic(saved);
  }

  async remove(id: number): Promise<boolean> {
    const pedido = await this.repo.findOne({ where: { id } });
    if (!pedido) return false;
    if (pedido.estatus === PedidoEstatus.ENTREGADO) {
      throw Object.assign(
        new Error("Un pedido entregado no se puede eliminar"),
        { status: 400 },
      );
    }
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  private toPublic(pedido: Pedido): PedidoPublic {
    const rutaIds = (pedido.rutaPedidos ?? []).map((rp) => rp.rutaId);
    const rutaId = rutaIds.length > 0 ? Math.max(...rutaIds) : null;

    return {
      id: pedido.id,
      lugarEntrega: pedido.lugarEntrega,
      estatus: pedido.estatus,
      creadoPorId: pedido.creadoPorId,
      creadoPorNombre: pedido.creadoPor?.nombre ?? null,
      rutaId,
      createdAt: dbDateToWallClock(pedido.createdAt),
      updatedAt: dbDateToWallClock(pedido.updatedAt),
    };
  }
}

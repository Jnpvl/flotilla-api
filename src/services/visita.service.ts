import { Between, IsNull, LessThanOrEqual, MoreThanOrEqual } from "typeorm";
import { AppDataSource } from "../config/database.js";
import { RolUsuario } from "../constants/rol.enum.js";
import {
  VISITA_ESTATUS_LEGACY_OMITIDA,
  VisitaEstatus,
} from "../constants/visita-estatus.enum.js";
import { Visita } from "../entities/visita.entity.js";
import type {
  CancelarVisitaDto,
  CheckInVisitaDto,
  CreateVisitaDto,
  EliminarVisitaDto,
  UpdateVisitaDto,
  VisitaListQuery,
  VisitaPublic,
  VisitaPublicOptions,
} from "../interfaces/visita.interface.js";
import { getClientLocalWallClock } from "../utils/client-time-context.js";
import {
  dbDateToWallClock,
  wallClockToDbDate,
} from "../utils/local-datetime.js";

const ESTATUS = new Set<string>(Object.values(VisitaEstatus));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function requireMotivo(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) {
    throw Object.assign(new Error("El motivo es obligatorio"), { status: 400 });
  }
  return raw.trim().slice(0, 500);
}

function normalizeEstatus(raw: string): VisitaEstatus {
  if (raw === VISITA_ESTATUS_LEGACY_OMITIDA) return VisitaEstatus.CANCELADA;
  if (ESTATUS.has(raw)) return raw as VisitaEstatus;
  return VisitaEstatus.PLANEADA;
}

export class VisitaService {
  private readonly repo = AppDataSource.getRepository(Visita);

  async findAll(
    query: VisitaListQuery = {},
    opts: VisitaPublicOptions = {},
  ): Promise<VisitaPublic[]> {
    const where: Record<string, unknown> = {
      eliminadaAt: IsNull(),
    };

    if (
      typeof query.estatus === "string" &&
      query.estatus &&
      ESTATUS.has(query.estatus)
    ) {
      where.estatus = query.estatus;
    }

    if (Number.isInteger(query.vendedorId) && (query.vendedorId ?? 0) > 0) {
      where.vendedorId = query.vendedorId;
    }

    if (typeof query.fecha === "string" && DATE_RE.test(query.fecha.trim())) {
      where.fechaPlanificada = query.fecha.trim();
    } else {
      const desde =
        typeof query.desde === "string" && DATE_RE.test(query.desde.trim())
          ? query.desde.trim()
          : "";
      const hasta =
        typeof query.hasta === "string" && DATE_RE.test(query.hasta.trim())
          ? query.hasta.trim()
          : "";
      if (desde && hasta) {
        where.fechaPlanificada = Between(desde, hasta);
      } else if (desde) {
        where.fechaPlanificada = MoreThanOrEqual(desde);
      } else if (hasta) {
        where.fechaPlanificada = LessThanOrEqual(hasta);
      }
    }

    const visitas = await this.repo.find({
      where,
      relations: { vendedor: true },
      order: { fechaPlanificada: "ASC", horaPlanificada: "ASC", id: "ASC" },
    });
    return visitas.map((v) => this.toPublic(v, opts));
  }

  async findById(
    id: number,
    opts: VisitaPublicOptions = {},
  ): Promise<VisitaPublic | null> {
    const visita = await this.repo.findOne({
      where: { id, eliminadaAt: IsNull() },
      relations: { vendedor: true },
    });
    return visita ? this.toPublic(visita, opts) : null;
  }

  async create(
    dto: CreateVisitaDto,
    opts: VisitaPublicOptions = {},
  ): Promise<VisitaPublic> {
    if (typeof dto.clienteNombre !== "string" || !dto.clienteNombre.trim()) {
      throw Object.assign(new Error("clienteNombre es requerido"), {
        status: 400,
      });
    }
    if (
      typeof dto.fechaPlanificada !== "string" ||
      !DATE_RE.test(dto.fechaPlanificada.trim())
    ) {
      throw Object.assign(
        new Error("fechaPlanificada inválida (YYYY-MM-DD)"),
        { status: 400 },
      );
    }
    if (!Number.isInteger(dto.vendedorId) || dto.vendedorId <= 0) {
      throw Object.assign(new Error("vendedorId inválido"), { status: 400 });
    }

    let hora: string | null = null;
    if (dto.horaPlanificada !== undefined && dto.horaPlanificada !== null) {
      const raw = String(dto.horaPlanificada).trim();
      if (raw && !TIME_RE.test(raw)) {
        throw Object.assign(new Error("horaPlanificada inválida (HH:mm)"), {
          status: 400,
        });
      }
      hora = raw || null;
    }

    const notas =
      typeof dto.notas === "string" && dto.notas.trim()
        ? dto.notas.trim().slice(0, 500)
        : null;

    const now = wallClockToDbDate(getClientLocalWallClock());
    const visita = this.repo.create({
      vendedorId: dto.vendedorId,
      clienteNombre: dto.clienteNombre.trim(),
      fechaPlanificada: dto.fechaPlanificada.trim(),
      horaPlanificada: hora,
      notas,
      estatus: VisitaEstatus.PLANEADA,
      visitadaAt: null,
      lat: null,
      lng: null,
      accuracy: null,
      origenRegistro: null,
      notasVisita: null,
      hizoPedido: null,
      promociono: null,
      productosPromocion: null,
      motivo: null,
      eliminadaAt: null,
      createdAt: now,
      updatedAt: now,
    });

    const saved = await this.repo.save(visita);
    const full = await this.repo.findOne({
      where: { id: saved.id },
      relations: { vendedor: true },
    });
    return this.toPublic(full ?? saved, opts);
  }

  async update(
    id: number,
    dto: UpdateVisitaDto,
    opts: VisitaPublicOptions = {},
  ): Promise<VisitaPublic | null> {
    const visita = await this.repo.findOne({
      where: { id, eliminadaAt: IsNull() },
      relations: { vendedor: true },
    });
    if (!visita) return null;

    if (normalizeEstatus(visita.estatus) !== VisitaEstatus.PLANEADA) {
      throw Object.assign(
        new Error("Solo se pueden editar visitas planeadas"),
        { status: 400 },
      );
    }

    if (dto.clienteNombre !== undefined) {
      if (typeof dto.clienteNombre !== "string" || !dto.clienteNombre.trim()) {
        throw Object.assign(new Error("clienteNombre inválido"), {
          status: 400,
        });
      }
      visita.clienteNombre = dto.clienteNombre.trim();
    }

    if (dto.fechaPlanificada !== undefined) {
      if (
        typeof dto.fechaPlanificada !== "string" ||
        !DATE_RE.test(dto.fechaPlanificada.trim())
      ) {
        throw Object.assign(
          new Error("fechaPlanificada inválida (YYYY-MM-DD)"),
          { status: 400 },
        );
      }
      visita.fechaPlanificada = dto.fechaPlanificada.trim();
    }

    if (dto.horaPlanificada !== undefined) {
      if (dto.horaPlanificada === null || dto.horaPlanificada === "") {
        visita.horaPlanificada = null;
      } else {
        const raw = String(dto.horaPlanificada).trim();
        if (!TIME_RE.test(raw)) {
          throw Object.assign(new Error("horaPlanificada inválida (HH:mm)"), {
            status: 400,
          });
        }
        visita.horaPlanificada = raw;
      }
    }

    if (dto.notas !== undefined) {
      visita.notas =
        typeof dto.notas === "string" && dto.notas.trim()
          ? dto.notas.trim().slice(0, 500)
          : null;
    }

    visita.updatedAt = wallClockToDbDate(getClientLocalWallClock());
    const saved = await this.repo.save(visita);
    return this.toPublic(saved, opts);
  }

  /** Check-in: marca visitada con hora/ubicación (app o web). */
  async checkIn(
    id: number,
    dto: CheckInVisitaDto,
    ctx: { vendedorId?: number; actorRol?: string } = {},
    opts: VisitaPublicOptions = {},
  ): Promise<VisitaPublic | null> {
    const visita = await this.repo.findOne({
      where: { id, eliminadaAt: IsNull() },
      relations: { vendedor: true },
    });
    if (!visita) return null;

    const isAdmin = ctx.actorRol === RolUsuario.ADMIN;
    if (
      !isAdmin &&
      ctx.vendedorId !== undefined &&
      Number.isInteger(ctx.vendedorId) &&
      visita.vendedorId !== ctx.vendedorId
    ) {
      throw Object.assign(
        new Error("Solo el vendedor asignado puede registrar la visita"),
        { status: 403 },
      );
    }

    if (normalizeEstatus(visita.estatus) !== VisitaEstatus.PLANEADA) {
      throw Object.assign(
        new Error("Solo se puede registrar check-in en visitas planeadas"),
        { status: 400 },
      );
    }

    const nowWall = getClientLocalWallClock();
    visita.estatus = VisitaEstatus.VISITADA;
    visita.visitadaAt = wallClockToDbDate(nowWall);
    visita.updatedAt = wallClockToDbDate(nowWall);
    this.applyGeoAndOrigen(visita, dto, "mobile");

    if (typeof dto.hizoPedido !== "boolean") {
      throw Object.assign(new Error("Indica si le hicieron pedido (sí o no)"), {
        status: 400,
      });
    }
    if (typeof dto.promociono !== "boolean") {
      throw Object.assign(
        new Error("Indica si promocionaron algo (sí o no)"),
        { status: 400 },
      );
    }
    visita.hizoPedido = dto.hizoPedido;
    visita.promociono = dto.promociono;
    if (dto.promociono) {
      if (
        typeof dto.productosPromocion !== "string" ||
        !dto.productosPromocion.trim()
      ) {
        throw Object.assign(
          new Error("Indica qué productos promocionaron"),
          { status: 400 },
        );
      }
      visita.productosPromocion = dto.productosPromocion.trim().slice(0, 500);
    } else {
      visita.productosPromocion = null;
    }

    if (dto.notasVisita !== undefined) {
      visita.notasVisita =
        typeof dto.notasVisita === "string" && dto.notasVisita.trim()
          ? dto.notasVisita.trim().slice(0, 500)
          : null;
    }

    const saved = await this.repo.save(visita);
    return this.toPublic(saved, opts);
  }

  /** Cancelar: motivo obligatorio; puede incluir GPS (web o app). */
  async cancelar(
    id: number,
    dto: CancelarVisitaDto,
    opts: VisitaPublicOptions = {},
  ): Promise<VisitaPublic | null> {
    const visita = await this.repo.findOne({
      where: { id, eliminadaAt: IsNull() },
      relations: { vendedor: true },
    });
    if (!visita) return null;

    if (normalizeEstatus(visita.estatus) !== VisitaEstatus.PLANEADA) {
      throw Object.assign(
        new Error("Solo se pueden cancelar visitas planeadas"),
        { status: 400 },
      );
    }

    const motivo = requireMotivo(dto.motivo);
    const now = wallClockToDbDate(getClientLocalWallClock());
    visita.estatus = VisitaEstatus.CANCELADA;
    visita.motivo = motivo;
    visita.visitadaAt = now;
    visita.updatedAt = now;
    this.applyGeoAndOrigen(visita, dto, "web");

    const saved = await this.repo.save(visita);
    return this.toPublic(saved, opts);
  }

  /** Soft-delete con motivo obligatorio. */
  async eliminar(id: number, dto: EliminarVisitaDto): Promise<boolean> {
    const visita = await this.repo.findOne({
      where: { id, eliminadaAt: IsNull() },
    });
    if (!visita) return false;

    if (normalizeEstatus(visita.estatus) !== VisitaEstatus.PLANEADA) {
      throw Object.assign(
        new Error("Solo se pueden eliminar visitas planeadas"),
        { status: 400 },
      );
    }

    const motivo = requireMotivo(dto.motivo);
    const now = wallClockToDbDate(getClientLocalWallClock());
    visita.motivo = motivo;
    visita.eliminadaAt = now;
    visita.updatedAt = now;
    await this.repo.save(visita);
    return true;
  }

  private applyGeoAndOrigen(
    visita: Visita,
    dto: { lat?: number; lng?: number; accuracy?: number; origen?: string },
    defaultOrigen: "mobile" | "web",
  ): void {
    if (typeof dto.lat === "number" && Number.isFinite(dto.lat)) {
      visita.lat = String(dto.lat);
    }
    if (typeof dto.lng === "number" && Number.isFinite(dto.lng)) {
      visita.lng = String(dto.lng);
    }
    if (typeof dto.accuracy === "number" && Number.isFinite(dto.accuracy)) {
      visita.accuracy = dto.accuracy;
    }
    const origen =
      dto.origen === "mobile" || dto.origen === "web"
        ? dto.origen
        : defaultOrigen;
    visita.origenRegistro = origen;
  }

  private toPublic(
    visita: Visita,
    opts: VisitaPublicOptions = {},
  ): VisitaPublic {
    const includeDetail = opts.includeCheckInDetail === true;
    const estatus = normalizeEstatus(String(visita.estatus));
    const origen =
      visita.origenRegistro === "mobile" || visita.origenRegistro === "web"
        ? visita.origenRegistro
        : null;

    return {
      id: visita.id,
      vendedorId: visita.vendedorId,
      vendedorNombre: visita.vendedor?.nombre ?? null,
      clienteNombre: visita.clienteNombre,
      fechaPlanificada: visita.fechaPlanificada,
      horaPlanificada: visita.horaPlanificada,
      notas: visita.notas,
      estatus,
      visitadaAt:
        includeDetail && visita.visitadaAt
          ? dbDateToWallClock(visita.visitadaAt)
          : null,
      lat:
        includeDetail && visita.lat != null ? Number(visita.lat) : null,
      lng:
        includeDetail && visita.lng != null ? Number(visita.lng) : null,
      accuracy: includeDetail ? visita.accuracy : null,
      origenRegistro: includeDetail ? origen : null,
      notasVisita: visita.notasVisita,
      hizoPedido: includeDetail ? (visita.hizoPedido ?? null) : null,
      promociono: includeDetail ? (visita.promociono ?? null) : null,
      productosPromocion: includeDetail
        ? (visita.productosPromocion ?? null)
        : null,
      motivo: visita.motivo,
      createdAt: dbDateToWallClock(visita.createdAt),
      updatedAt: dbDateToWallClock(visita.updatedAt),
    };
  }
}

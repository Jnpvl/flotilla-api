import { In } from "typeorm";
import { AppDataSource } from "../config/database.js";
import { GpsEvento, isGpsEvento } from "../constants/gps-evento.enum.js";
import { PedidoEstatus } from "../constants/pedido-estatus.enum.js";
import { RolUsuario } from "../constants/rol.enum.js";
import { RutaEstatus } from "../constants/ruta-estatus.enum.js";
import { Almacen } from "../entities/almacen.entity.js";
import { GpsSenal } from "../entities/gps-senal.entity.js";
import { Pedido } from "../entities/pedido.entity.js";
import { Ruta } from "../entities/ruta.entity.js";
import { RutaPedido } from "../entities/ruta-pedido.entity.js";
import { Usuario } from "../entities/usuario.entity.js";
import type {
  CreateGpsSenalDto,
  DashboardStats,
  FinalizarRutaDto,
  IniciarRutaDto,
  RutaGpsPoint,
  RutaListQuery,
  RutaListResult,
  RutaPublic,
} from "../interfaces/ruta.interface.js";
import { getClientLocalWallClock } from "../utils/client-time-context.js";
import { pathLengthKm } from "../utils/geo.js";
import {
  dbDateToWallClock,
  minutesBetweenWallClocks,
  wallClockDay,
  wallClockToDbDate,
} from "../utils/local-datetime.js";

const FECHA_DIA_RE = /^\d{4}-\d{2}-\d{2}$/;

export class RutaService {
  private readonly rutaRepo = AppDataSource.getRepository(Ruta);
  private readonly rutaPedidoRepo = AppDataSource.getRepository(RutaPedido);
  private readonly pedidoRepo = AppDataSource.getRepository(Pedido);
  private readonly usuarioRepo = AppDataSource.getRepository(Usuario);
  private readonly almacenRepo = AppDataSource.getRepository(Almacen);
  private readonly gpsRepo = AppDataSource.getRepository(GpsSenal);

  async list(query: RutaListQuery = {}): Promise<RutaListResult> {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 10));

    let fecha =
      typeof query.fecha === "string" && FECHA_DIA_RE.test(query.fecha.trim())
        ? query.fecha.trim()
        : "";

    if (!fecha && query.hoy) {
      fecha = wallClockDay(getClientLocalWallClock());
    }

    const baseQb = this.rutaRepo.createQueryBuilder("r");
    if (fecha) {
      // Comparar solo el día (YYYY-MM-DD) sin depender de Date/timezone del driver
      baseQb.andWhere(
        "CONVERT(varchar(10), COALESCE(r.iniciadaAt, r.createdAt), 23) = :fecha",
        { fecha },
      );
    }

    const total = await baseQb.clone().getCount();

    const idRows = await baseQb
      .clone()
      .select(["r.id"])
      .orderBy("r.id", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    const ids = idRows.map((row) => row.id);

    if (ids.length === 0) {
      return {
        items: [],
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    }

    const rutas = await this.rutaRepo.find({
      where: { id: In(ids) },
      relations: {
        chofer: true,
        almacen: true,
        rutaPedidos: { pedido: true },
      },
    });

    const byId = new Map(rutas.map((r) => [r.id, r]));
    const items = ids
      .map((id) => byId.get(id))
      .filter((r): r is Ruta => Boolean(r))
      .map((r) => this.toPublic(r));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async findById(id: number): Promise<RutaPublic | null> {
    const ruta = await this.rutaRepo.findOne({
      where: { id },
      relations: {
        chofer: true,
        almacen: true,
        rutaPedidos: { pedido: true },
        gpsSenales: true,
      },
    });
    if (!ruta) return null;
    return this.toPublic(ruta, true);
  }

  async dashboard(): Promise<DashboardStats> {
    const [rutas, pedidos] = await Promise.all([
      this.rutaRepo.find({
        relations: { chofer: true },
        order: { id: "DESC" },
      }),
      this.pedidoRepo.find(),
    ]);

    const today = wallClockDay(getClientLocalWallClock());
    const rutasHoy = rutas.filter((r) => {
      const ref = r.iniciadaAt ? dbDateToWallClock(r.iniciadaAt) : dbDateToWallClock(r.createdAt);
      return wallClockDay(ref) === today;
    });

    const kmTotales = rutas.reduce((sum, r) => sum + Number(r.kmRecorridos || 0), 0);
    const kmHoy = rutasHoy.reduce((sum, r) => sum + Number(r.kmRecorridos || 0), 0);

    const duraciones = rutas
      .map((r) => minutesBetweenWallClocks(r.iniciadaAt, r.finalizadaAt))
      .filter((m): m is number => m !== null);

    const promedioMinutosRuta =
      duraciones.length > 0
        ? Math.round(duraciones.reduce((a, b) => a + b, 0) / duraciones.length)
        : null;

    const pedidosEntregadosHoy = pedidos.filter((p) => {
      if (p.estatus !== PedidoEstatus.ENTREGADO) return false;
      return wallClockDay(p.updatedAt) === today;
    }).length;

    const choferesActivosHoy = new Set(
      rutasHoy.filter((r) => r.estatus === RutaEstatus.EN_RUTA).map((r) => r.choferId),
    ).size;

    return {
      rutasTotales: rutas.length,
      rutasHoy: rutasHoy.length,
      rutasActivas: rutas.filter((r) => r.estatus === RutaEstatus.EN_RUTA).length,
      kmTotales: round2(kmTotales),
      kmHoy: round2(kmHoy),
      promedioMinutosRuta,
      pedidosPendientes: pedidos.filter(
        (p) =>
          p.estatus === PedidoEstatus.LISTO_PARA_ENTREGAR ||
          p.estatus === PedidoEstatus.CARGADO,
      ).length,
      pedidosEnRuta: pedidos.filter((p) => p.estatus === PedidoEstatus.EN_RUTA)
        .length,
      pedidosEntregadosHoy,
      choferesActivosHoy,
    };
  }

  async iniciar(dto: IniciarRutaDto): Promise<RutaPublic> {
    if (!Number.isInteger(dto.choferId) || dto.choferId <= 0) {
      throw Object.assign(new Error("choferId inválido"), { status: 400 });
    }
    if (!Array.isArray(dto.pedidoIds) || dto.pedidoIds.length === 0) {
      throw Object.assign(new Error("Selecciona al menos un pedido"), {
        status: 400,
      });
    }

    const chofer = await this.usuarioRepo.findOne({
      where: { id: dto.choferId, rol: RolUsuario.CHOFER },
    });
    if (!chofer) {
      throw Object.assign(new Error("El chofer no existe o no tiene rol chofer"), {
        status: 400,
      });
    }

    const pedidos = await this.pedidoRepo.findBy({
      id: In(dto.pedidoIds),
    });
    if (pedidos.length !== dto.pedidoIds.length) {
      throw Object.assign(new Error("Uno o más pedidos no existen"), {
        status: 400,
      });
    }

    const noDisponibles = pedidos.filter(
      (p) =>
        p.estatus !== PedidoEstatus.LISTO_PARA_ENTREGAR &&
        p.estatus !== PedidoEstatus.CARGADO,
    );
    if (noDisponibles.length > 0) {
      throw Object.assign(
        new Error(
          "Solo se pueden iniciar pedidos en estatus listo_para_entregar o cargado",
        ),
        { status: 400 },
      );
    }

    const almacen = await this.resolveAlmacen(dto.almacenId);
    const now = wallClockToDbDate(getClientLocalWallClock());

    const ruta = this.rutaRepo.create({
      choferId: chofer.id,
      almacenId: almacen.id,
      estatus: RutaEstatus.EN_RUTA,
      kmRecorridos: "0",
      iniciadaAt: now,
      finalizadaAt: null,
      createdAt: now,
      updatedAt: now,
    });
    const savedRuta = await this.rutaRepo.save(ruta);

    const links = dto.pedidoIds.map((pedidoId, index) =>
      this.rutaPedidoRepo.create({
        rutaId: savedRuta.id,
        pedidoId,
        ordenEntrega: index + 1,
        createdAt: now,
      }),
    );
    await this.rutaPedidoRepo.save(links);

    for (const pedido of pedidos) {
      pedido.estatus = PedidoEstatus.EN_RUTA;
      pedido.updatedAt = now;
    }
    await this.pedidoRepo.save(pedidos);

    const full = await this.rutaRepo.findOne({
      where: { id: savedRuta.id },
      relations: {
        chofer: true,
        almacen: true,
        rutaPedidos: { pedido: true },
      },
    });
    return this.toPublic(full ?? savedRuta);
  }

  async finalizar(id: number, dto: FinalizarRutaDto): Promise<RutaPublic | null> {
    const ruta = await this.rutaRepo.findOne({
      where: { id },
      relations: {
        chofer: true,
        almacen: true,
        rutaPedidos: { pedido: true },
      },
    });
    if (!ruta) return null;

    if (ruta.estatus === RutaEstatus.RUTA_FINALIZADA) {
      throw Object.assign(new Error("La ruta ya está finalizada"), { status: 400 });
    }

    const pedidosRuta = (ruta.rutaPedidos ?? [])
      .map((rp) => rp.pedido)
      .filter(Boolean);
    const pendientes = pedidosRuta.filter(
      (p) => p && p.estatus !== PedidoEstatus.ENTREGADO,
    );
    if (pendientes.length > 0) {
      throw Object.assign(
        new Error(
          "Entrega todos los pedidos antes de marcar regreso al almacén",
        ),
        { status: 400 },
      );
    }

    const now = wallClockToDbDate(getClientLocalWallClock());
    ruta.estatus = RutaEstatus.RUTA_FINALIZADA;
    ruta.finalizadaAt = now;
    ruta.updatedAt = now;

    const computedKm = await this.computeKmRecorridos(id);
    if (
      dto.kmRecorridos !== undefined &&
      typeof dto.kmRecorridos === "number" &&
      Number.isFinite(dto.kmRecorridos) &&
      dto.kmRecorridos > 0
    ) {
      ruta.kmRecorridos = String(round2(dto.kmRecorridos));
    } else {
      ruta.kmRecorridos = String(computedKm);
    }

    await this.rutaRepo.save(ruta);

    const full = await this.rutaRepo.findOne({
      where: { id },
      relations: {
        chofer: true,
        almacen: true,
        rutaPedidos: { pedido: true },
        gpsSenales: true,
      },
    });
    return this.toPublic(full ?? ruta, true);
  }

  async findActivaByChofer(choferId: number): Promise<RutaPublic | null> {
    const rutas = await this.rutaRepo.find({
      where: { choferId, estatus: RutaEstatus.EN_RUTA },
      relations: {
        chofer: true,
        almacen: true,
        rutaPedidos: { pedido: true },
        gpsSenales: true,
      },
      order: { id: "DESC" },
      take: 1,
    });
    const ruta = rutas[0];
    return ruta ? this.toPublic(ruta, true) : null;
  }

  async addGpsPoint(
    rutaId: number,
    dto: CreateGpsSenalDto,
    choferId?: number,
  ): Promise<RutaGpsPoint> {
    const ruta = await this.rutaRepo.findOne({ where: { id: rutaId } });
    if (!ruta) {
      throw Object.assign(new Error("Ruta no encontrada"), { status: 404 });
    }
    if (ruta.estatus !== RutaEstatus.EN_RUTA) {
      throw Object.assign(
        new Error("Solo se puede enviar GPS en una ruta activa"),
        { status: 400 },
      );
    }
    // Sin filtro de chofer estricto en GPS: el token ya autentica.
    // (evita fallos si el JWT/ruta se desincronizan en pruebas)
    if (typeof dto.lat !== "number" || typeof dto.lng !== "number") {
      throw Object.assign(new Error("lat y lng son requeridos"), { status: 400 });
    }
    if (!Number.isFinite(dto.lat) || !Number.isFinite(dto.lng)) {
      throw Object.assign(new Error("lat/lng inválidos"), { status: 400 });
    }

    if (!isGpsEvento(dto.tipo)) {
      throw Object.assign(
        new Error(
          "tipo inválido: usa inicio_ruta, pedido_entregado o regreso_almacen",
        ),
        { status: 400 },
      );
    }
    const tipo = dto.tipo;

    let label =
      typeof dto.label === "string" && dto.label.trim()
        ? dto.label.trim().slice(0, 200)
        : null;

    // Solo un evento de inicio por ruta
    if (tipo === GpsEvento.INICIO_RUTA) {
      const already = await this.gpsRepo.findOne({
        where: { rutaId, tipo: GpsEvento.INICIO_RUTA },
        order: { id: "ASC" },
      });
      if (already) {
        return {
          id: already.id,
          lat: Number(already.lat),
          lng: Number(already.lng),
          recordedAt: dbDateToWallClock(already.recordedAt),
          speed: already.speed,
          tipo: already.tipo,
          pedidoId: already.pedidoId,
          label: already.label,
        };
      }
    }

    const pedidoId =
      dto.pedidoId !== undefined &&
      dto.pedidoId !== null &&
      Number.isInteger(dto.pedidoId)
        ? dto.pedidoId
        : null;

    const nowWall = getClientLocalWallClock();
    const recordedAt = dto.recordedAt
      ? wallClockToDbDate(dto.recordedAt)
      : wallClockToDbDate(nowWall);
    const createdAt = wallClockToDbDate(nowWall);

    const point = this.gpsRepo.create({
      rutaId,
      lat: String(dto.lat),
      lng: String(dto.lng),
      accuracy: dto.accuracy ?? null,
      speed: dto.speed ?? null,
      tipo,
      pedidoId,
      label,
      recordedAt,
      createdAt,
    });
    const saved = await this.gpsRepo.save(point);
    console.log(
      `[gps] ruta=${rutaId} tipo=${saved.tipo} lat=${saved.lat} lng=${saved.lng} at=${dbDateToWallClock(saved.recordedAt)}`,
    );

    const km = await this.computeKmRecorridos(rutaId);
    await this.rutaRepo.update(rutaId, {
      kmRecorridos: String(km),
      updatedAt: createdAt,
    });

    return {
      id: saved.id,
      lat: Number(saved.lat),
      lng: Number(saved.lng),
      recordedAt: dbDateToWallClock(saved.recordedAt),
      speed: saved.speed,
      tipo: saved.tipo,
      pedidoId: saved.pedidoId,
      label: saved.label,
    };
  }

  private async computeKmRecorridos(rutaId: number): Promise<number> {
    const points = await this.gpsRepo.find({
      where: { rutaId },
      order: { recordedAt: "ASC", id: "ASC" },
    });
    const eventos = points.filter((p) => isGpsEvento(p.tipo));
    return round2(
      pathLengthKm(
        eventos.map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) })),
      ),
    );
  }

  private async resolveAlmacen(almacenId?: number): Promise<Almacen> {
    if (almacenId !== undefined) {
      const found = await this.almacenRepo.findOne({ where: { id: almacenId } });
      if (!found) {
        throw Object.assign(new Error("Almacén no encontrado"), { status: 400 });
      }
      return found;
    }

    const existing = await this.almacenRepo.find({
      order: { id: "ASC" },
      take: 1,
    });
    if (existing[0]) return existing[0];

    const now = wallClockToDbDate(getClientLocalWallClock());
    const created = this.almacenRepo.create({
      nombre: "Bodega principal",
      direccion: "Sin dirección",
      lat: "0",
      lng: "0",
      radioMetros: 100,
      createdAt: now,
      updatedAt: now,
    });
    return this.almacenRepo.save(created);
  }

  private toPublic(ruta: Ruta, includeGps = false): RutaPublic {
    const pedidos = [...(ruta.rutaPedidos ?? [])]
      .sort((a, b) => a.ordenEntrega - b.ordenEntrega)
      .map((rp) => ({
        id: rp.id,
        pedidoId: rp.pedidoId,
        lugarEntrega: rp.pedido?.lugarEntrega ?? "—",
        estatus: rp.pedido?.estatus ?? PedidoEstatus.LISTO_PARA_ENTREGAR,
        ordenEntrega: rp.ordenEntrega,
      }));

    const base: RutaPublic = {
      id: ruta.id,
      choferId: ruta.choferId,
      choferNombre: ruta.chofer?.nombre ?? null,
      almacenId: ruta.almacenId,
      almacenNombre: ruta.almacen?.nombre ?? null,
      estatus: ruta.estatus,
      kmRecorridos: Number(ruta.kmRecorridos || 0),
      pedidos,
      iniciadaAt: ruta.iniciadaAt ? dbDateToWallClock(ruta.iniciadaAt) : null,
      finalizadaAt: ruta.finalizadaAt ? dbDateToWallClock(ruta.finalizadaAt) : null,
      createdAt: dbDateToWallClock(ruta.createdAt),
      updatedAt: dbDateToWallClock(ruta.updatedAt),
      duracionMinutos: minutesBetweenWallClocks(ruta.iniciadaAt, ruta.finalizadaAt),
    };

    if (!includeGps) return base;

    const gps = [...(ruta.gpsSenales ?? [])]
      .filter((g) => isGpsEvento(g.tipo))
      .sort((a, b) => {
        const aw = a.recordedAt ? dbDateToWallClock(a.recordedAt) : "";
        const bw = b.recordedAt ? dbDateToWallClock(b.recordedAt) : "";
        return aw.localeCompare(bw);
      })
      .map((g) => ({
        id: g.id,
        lat: Number(g.lat),
        lng: Number(g.lng),
        recordedAt: dbDateToWallClock(g.recordedAt),
        speed: g.speed,
        tipo: g.tipo,
        pedidoId: g.pedidoId ?? null,
        label: g.label ?? null,
      }));

    return { ...base, gps };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

import { Between, LessThanOrEqual, MoreThanOrEqual } from "typeorm";
import { AppDataSource } from "../config/database.js";
import { Asistencia } from "../entities/asistencia.entity.js";
import { AsistenciaConfig } from "../entities/asistencia-config.entity.js";
import { AsistenciaFestivo } from "../entities/asistencia-festivo.entity.js";
import type {
  AsistenciaChecadaTipo,
  AsistenciaConfigPublic,
  AsistenciaEstatus,
  AsistenciaFestivoPublic,
  AsistenciaHoyPublic,
  AsistenciaListQuery,
  AsistenciaOrigen,
  AsistenciaPublic,
  AsistenciaPunchDto,
  AsistenciaReglasPublic,
  CreateAsistenciaFestivoDto,
  UpdateAsistenciaConfigDto,
} from "../interfaces/asistencia.interface.js";
import { getClientLocalWallClock } from "../utils/client-time-context.js";
import {
  dbDateToWallClock,
  wallClockDay,
  wallClockToDbDate,
} from "../utils/local-datetime.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const CONFIG_ID = 1;
const DEFAULT_CONFIG: AsistenciaConfigPublic = {
  entradaEsperada: "08:00",
  toleranciaRetardoMin: 10,
  salidaEsperada: "17:00",
  diasLaborales: [1, 2, 3, 4, 5],
  exigeComida: false,
  comidaInicioEsperada: "13:00",
  comidaFinEsperada: "14:00",
  checadas: ["entrada", "salida"],
};

function parseTimeToMinutes(hhmm: string): number | null {
  if (!TIME_RE.test(hhmm)) return null;
  const parts = hhmm.split(":").map(Number);
  const h = parts[0] ?? NaN;
  const m = parts[1] ?? NaN;
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function wallClockToMinutes(value: string): number | null {
  const match = /(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function parseDiasLaborales(raw: string): number[] {
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
}

function buildChecadas(exigeComida: boolean): AsistenciaChecadaTipo[] {
  if (exigeComida) {
    return ["entrada", "comida_inicio", "comida_fin", "salida"];
  }
  return ["entrada", "salida"];
}

export class AsistenciaService {
  private readonly repo = AppDataSource.getRepository(Asistencia);
  private readonly configRepo = AppDataSource.getRepository(AsistenciaConfig);
  private readonly festivoRepo = AppDataSource.getRepository(AsistenciaFestivo);

  async hoy(usuarioId: number): Promise<AsistenciaHoyPublic> {
    const fecha = wallClockDay(getClientLocalWallClock());
    const config = await this.getConfig();
    const diaNoLaboral = await this.isDiaNoLaboral(fecha);
    const row = await this.repo.findOne({
      where: { usuarioId, fecha },
      relations: { usuario: true },
    });
    const asistencia = row ? this.toPublic(row, config) : null;
    const reglas = this.configToReglas(config);
    const opciones = diaNoLaboral
      ? []
      : this.resolveOpciones(asistencia, config.exigeComida);
    const siguiente = opciones[0] ?? null;

    return {
      fecha,
      asistencia,
      reglas,
      opciones,
      siguiente,
      diaNoLaboral,
      puedeEntrada: opciones.includes("entrada"),
      puedeSalida: opciones.includes("salida"),
    };
  }

  async findAll(query: AsistenciaListQuery = {}): Promise<AsistenciaPublic[]> {
    const where: Record<string, unknown> = {};
    const config = await this.getConfig();

    if (Number.isInteger(query.usuarioId) && (query.usuarioId ?? 0) > 0) {
      where.usuarioId = query.usuarioId;
    }

    if (typeof query.fecha === "string" && DATE_RE.test(query.fecha.trim())) {
      where.fecha = query.fecha.trim();
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
        where.fecha = Between(desde, hasta);
      } else if (desde) {
        where.fecha = MoreThanOrEqual(desde);
      } else if (hasta) {
        where.fecha = LessThanOrEqual(hasta);
      }
    }

    const rows = await this.repo.find({
      where,
      relations: { usuario: true },
      order: { fecha: "DESC", id: "DESC" },
    });
    return rows.map((r) => this.toPublic(r, config));
  }

  async registrarEntrada(
    usuarioId: number,
    dto: AsistenciaPunchDto = {},
  ): Promise<AsistenciaPublic> {
    return this.registrarChecada(usuarioId, "entrada", dto);
  }

  async registrarComidaInicio(
    usuarioId: number,
    dto: AsistenciaPunchDto = {},
  ): Promise<AsistenciaPublic> {
    return this.registrarChecada(usuarioId, "comida_inicio", dto);
  }

  async registrarComidaFin(
    usuarioId: number,
    dto: AsistenciaPunchDto = {},
  ): Promise<AsistenciaPublic> {
    return this.registrarChecada(usuarioId, "comida_fin", dto);
  }

  async registrarSalida(
    usuarioId: number,
    dto: AsistenciaPunchDto = {},
  ): Promise<AsistenciaPublic> {
    return this.registrarChecada(usuarioId, "salida", dto);
  }

  private async registrarChecada(
    usuarioId: number,
    tipo: AsistenciaChecadaTipo,
    dto: AsistenciaPunchDto,
  ): Promise<AsistenciaPublic> {
    const geo = this.requireGeoIfNeeded(dto);
    const nowWall = getClientLocalWallClock();
    const fecha = wallClockDay(nowWall);
    const now = wallClockToDbDate(nowWall);
    const config = await this.getConfig();

    if (await this.isDiaNoLaboral(fecha)) {
      throw Object.assign(new Error("Hoy no es día laboral"), { status: 400 });
    }

    if (
      (tipo === "comida_inicio" || tipo === "comida_fin") &&
      !config.exigeComida
    ) {
      throw Object.assign(
        new Error("La marca de comida no está habilitada"),
        { status: 400 },
      );
    }

    let existing = await this.repo.findOne({
      where: { usuarioId, fecha },
      relations: { usuario: true },
    });

    const pub = existing ? this.toPublic(existing, config) : null;
    const opciones = this.resolveOpciones(pub, config.exigeComida);
    if (!opciones.includes(tipo)) {
      const msg =
        opciones.length === 0
          ? "Ya completaste las checadas de hoy"
          : `Ahora puedes marcar: ${opciones.map((o) => o.replace(/_/g, " ")).join(" o ")}`;
      throw Object.assign(new Error(msg), { status: 409 });
    }

    const origen = this.normalizeOrigen(dto.origen, "mobile");

    if (!existing) {
      existing = this.repo.create({
        usuarioId,
        fecha,
        entradaAt: null,
        entradaLat: null,
        entradaLng: null,
        entradaAccuracy: null,
        origenEntrada: null,
        comidaInicioAt: null,
        comidaInicioLat: null,
        comidaInicioLng: null,
        comidaInicioAccuracy: null,
        origenComidaInicio: null,
        comidaFinAt: null,
        comidaFinLat: null,
        comidaFinLng: null,
        comidaFinAccuracy: null,
        origenComidaFin: null,
        salidaAt: null,
        salidaLat: null,
        salidaLng: null,
        salidaAccuracy: null,
        origenSalida: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (tipo === "entrada") {
      existing.entradaAt = now;
      existing.entradaLat = geo.lat;
      existing.entradaLng = geo.lng;
      existing.entradaAccuracy = geo.accuracy;
      existing.origenEntrada = origen;
    } else if (tipo === "comida_inicio") {
      existing.comidaInicioAt = now;
      existing.comidaInicioLat = geo.lat;
      existing.comidaInicioLng = geo.lng;
      existing.comidaInicioAccuracy = geo.accuracy;
      existing.origenComidaInicio = origen;
    } else if (tipo === "comida_fin") {
      existing.comidaFinAt = now;
      existing.comidaFinLat = geo.lat;
      existing.comidaFinLng = geo.lng;
      existing.comidaFinAccuracy = geo.accuracy;
      existing.origenComidaFin = origen;
    } else {
      existing.salidaAt = now;
      existing.salidaLat = geo.lat;
      existing.salidaLng = geo.lng;
      existing.salidaAccuracy = geo.accuracy;
      existing.origenSalida = origen;
    }

    existing.updatedAt = now;
    const saved = await this.repo.save(existing);
    const full = await this.repo.findOne({
      where: { id: saved.id },
      relations: { usuario: true },
    });
    return this.toPublic(full ?? saved, config);
  }

  // --- Config ---

  async getConfig(): Promise<AsistenciaConfigPublic> {
    let row = await this.configRepo.findOne({ where: { id: CONFIG_ID } });
    if (!row) {
      const now = wallClockToDbDate(getClientLocalWallClock());
      row = this.configRepo.create({
        id: CONFIG_ID,
        entradaEsperada: DEFAULT_CONFIG.entradaEsperada,
        toleranciaRetardoMin: DEFAULT_CONFIG.toleranciaRetardoMin,
        salidaEsperada: DEFAULT_CONFIG.salidaEsperada,
        diasLaborales: DEFAULT_CONFIG.diasLaborales.join(","),
        exigeComida: false,
        comidaInicioEsperada: DEFAULT_CONFIG.comidaInicioEsperada,
        comidaFinEsperada: DEFAULT_CONFIG.comidaFinEsperada,
        updatedAt: now,
      });
      try {
        row = await this.configRepo.save(row);
      } catch {
        row =
          (await this.configRepo.findOne({ where: { id: CONFIG_ID } })) ?? row;
      }
    }
    return this.configToPublic(row);
  }

  async updateConfig(
    dto: UpdateAsistenciaConfigDto,
  ): Promise<AsistenciaConfigPublic> {
    const current = await this.getConfig();
    let row = await this.configRepo.findOne({ where: { id: CONFIG_ID } });
    if (!row) {
      await this.getConfig();
      row = await this.configRepo.findOne({ where: { id: CONFIG_ID } });
    }
    if (!row) {
      throw Object.assign(new Error("No se pudo cargar la configuración"), {
        status: 500,
      });
    }

    if (dto.entradaEsperada !== undefined) {
      if (parseTimeToMinutes(dto.entradaEsperada.trim()) == null) {
        throw Object.assign(new Error("entradaEsperada inválida (HH:mm)"), {
          status: 400,
        });
      }
      row.entradaEsperada = dto.entradaEsperada.trim();
    }

    if (dto.salidaEsperada !== undefined) {
      if (parseTimeToMinutes(dto.salidaEsperada.trim()) == null) {
        throw Object.assign(new Error("salidaEsperada inválida (HH:mm)"), {
          status: 400,
        });
      }
      row.salidaEsperada = dto.salidaEsperada.trim();
    }

    if (dto.toleranciaRetardoMin !== undefined) {
      const n = Number(dto.toleranciaRetardoMin);
      if (!Number.isInteger(n) || n < 0 || n > 180) {
        throw Object.assign(
          new Error("toleranciaRetardoMin debe ser 0–180"),
          { status: 400 },
        );
      }
      row.toleranciaRetardoMin = n;
    }

    if (dto.diasLaborales !== undefined) {
      if (!Array.isArray(dto.diasLaborales) || dto.diasLaborales.length === 0) {
        throw Object.assign(
          new Error("diasLaborales debe ser un arreglo no vacío"),
          { status: 400 },
        );
      }
      const dias = [
        ...new Set(
          dto.diasLaborales.filter(
            (n) => Number.isInteger(n) && n >= 0 && n <= 6,
          ),
        ),
      ].sort((a, b) => a - b);
      if (dias.length === 0) {
        throw Object.assign(new Error("diasLaborales inválidos"), {
          status: 400,
        });
      }
      row.diasLaborales = dias.join(",");
    }

    if (dto.exigeComida !== undefined) {
      row.exigeComida = Boolean(dto.exigeComida);
    }

    if (dto.comidaInicioEsperada !== undefined) {
      if (dto.comidaInicioEsperada === null || dto.comidaInicioEsperada === "") {
        row.comidaInicioEsperada = null;
      } else {
        if (parseTimeToMinutes(dto.comidaInicioEsperada.trim()) == null) {
          throw Object.assign(
            new Error("comidaInicioEsperada inválida (HH:mm)"),
            { status: 400 },
          );
        }
        row.comidaInicioEsperada = dto.comidaInicioEsperada.trim();
      }
    }

    if (dto.comidaFinEsperada !== undefined) {
      if (dto.comidaFinEsperada === null || dto.comidaFinEsperada === "") {
        row.comidaFinEsperada = null;
      } else {
        if (parseTimeToMinutes(dto.comidaFinEsperada.trim()) == null) {
          throw Object.assign(
            new Error("comidaFinEsperada inválida (HH:mm)"),
            { status: 400 },
          );
        }
        row.comidaFinEsperada = dto.comidaFinEsperada.trim();
      }
    }

    // comidaInicio/Fin esperada: solo referencia opcional; no se exige horario fijo

    const entrada =
      parseTimeToMinutes(row.entradaEsperada) ??
      parseTimeToMinutes(current.entradaEsperada)!;
    const salida =
      parseTimeToMinutes(row.salidaEsperada) ??
      parseTimeToMinutes(current.salidaEsperada)!;
    if (salida <= entrada) {
      throw Object.assign(
        new Error("La salida esperada debe ser después de la entrada"),
        { status: 400 },
      );
    }

    row.updatedAt = wallClockToDbDate(getClientLocalWallClock());
    const saved = await this.configRepo.save(row);
    return this.configToPublic(saved);
  }

  // --- Festivos ---

  async listFestivos(query: {
    desde?: string;
    hasta?: string;
  } = {}): Promise<AsistenciaFestivoPublic[]> {
    const where: Record<string, unknown> = {};
    const desde =
      typeof query.desde === "string" && DATE_RE.test(query.desde.trim())
        ? query.desde.trim()
        : "";
    const hasta =
      typeof query.hasta === "string" && DATE_RE.test(query.hasta.trim())
        ? query.hasta.trim()
        : "";
    if (desde && hasta) {
      where.fecha = Between(desde, hasta);
    } else if (desde) {
      where.fecha = MoreThanOrEqual(desde);
    } else if (hasta) {
      where.fecha = LessThanOrEqual(hasta);
    }

    const rows = await this.festivoRepo.find({
      where,
      order: { fecha: "ASC" },
    });
    return rows.map((r) => this.festivoToPublic(r));
  }

  async createFestivo(
    dto: CreateAsistenciaFestivoDto,
  ): Promise<AsistenciaFestivoPublic> {
    if (typeof dto.fecha !== "string" || !DATE_RE.test(dto.fecha.trim())) {
      throw Object.assign(new Error("fecha inválida (YYYY-MM-DD)"), {
        status: 400,
      });
    }
    const fecha = dto.fecha.trim();
    const existing = await this.festivoRepo.findOne({ where: { fecha } });
    if (existing) {
      throw Object.assign(new Error("Ese día ya está marcado como festivo"), {
        status: 409,
      });
    }
    const nombre =
      typeof dto.nombre === "string" && dto.nombre.trim()
        ? dto.nombre.trim().slice(0, 120)
        : null;
    const row = this.festivoRepo.create({
      fecha,
      nombre,
      createdAt: wallClockToDbDate(getClientLocalWallClock()),
    });
    const saved = await this.festivoRepo.save(row);
    return this.festivoToPublic(saved);
  }

  async removeFestivo(id: number): Promise<boolean> {
    const result = await this.festivoRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async isDiaNoLaboral(fecha: string): Promise<boolean> {
    if (!DATE_RE.test(fecha)) return false;
    const config = await this.getConfig();
    const parts = fecha.split("-").map(Number);
    const y = parts[0];
    const m = parts[1];
    const d = parts[2];
    if (y == null || m == null || d == null) return false;
    const weekday = new Date(y, m - 1, d).getDay();
    if (!config.diasLaborales.includes(weekday)) return true;
    const festivo = await this.festivoRepo.findOne({ where: { fecha } });
    return Boolean(festivo);
  }

  /**
   * Comida opcional: tras entrada pueden ir a comida o salir directo.
   * Si ya iniciaron comida, deben cerrarla antes de salir.
   */
  private resolveOpciones(
    asistencia: AsistenciaPublic | null,
    permiteComida: boolean,
  ): AsistenciaChecadaTipo[] {
    if (!asistencia?.entradaAt) return ["entrada"];
    if (asistencia.salidaAt) return [];

    if (permiteComida && asistencia.comidaInicioAt && !asistencia.comidaFinAt) {
      return ["comida_fin"];
    }

    if (permiteComida && !asistencia.comidaInicioAt) {
      return ["comida_inicio", "salida"];
    }

    return ["salida"];
  }

  private resolveEstatus(
    entradaAt: string | null,
    salidaAt: string | null,
    config: AsistenciaConfigPublic,
  ): AsistenciaEstatus | null {
    if (!entradaAt) return null;

    const entradaMin = wallClockToMinutes(entradaAt);
    const entradaEsperada = parseTimeToMinutes(config.entradaEsperada) ?? 8 * 60;
    const limite = entradaEsperada + Math.max(0, config.toleranciaRetardoMin);
    const esRetardo = entradaMin != null && entradaMin > limite;

    if (!salidaAt) return "sin_salida";

    const salidaMin = wallClockToMinutes(salidaAt);
    const salidaEsperada =
      parseTimeToMinutes(config.salidaEsperada) ?? 17 * 60;
    const esTemprana = salidaMin != null && salidaMin < salidaEsperada;

    if (esRetardo) return "retardo";
    if (esTemprana) return "salida_temprana";
    return "a_tiempo";
  }

  private requireGeoIfNeeded(dto: AsistenciaPunchDto): {
    lat: string | null;
    lng: string | null;
    accuracy: number | null;
  } {
    const hasLat = typeof dto.lat === "number" && Number.isFinite(dto.lat);
    const hasLng = typeof dto.lng === "number" && Number.isFinite(dto.lng);
    if (dto.requireGeo) {
      if (!hasLat || !hasLng) {
        throw Object.assign(
          new Error("Se requiere ubicación GPS para registrar asistencia"),
          { status: 400 },
        );
      }
    }
    return {
      lat: hasLat ? String(dto.lat) : null,
      lng: hasLng ? String(dto.lng) : null,
      accuracy:
        typeof dto.accuracy === "number" && Number.isFinite(dto.accuracy)
          ? dto.accuracy
          : null,
    };
  }

  private normalizeOrigen(
    raw: unknown,
    fallback: AsistenciaOrigen,
  ): AsistenciaOrigen {
    return raw === "mobile" || raw === "web" ? raw : fallback;
  }

  private configToReglas(config: AsistenciaConfigPublic): AsistenciaReglasPublic {
    return {
      entradaEsperada: config.entradaEsperada,
      toleranciaRetardoMin: config.toleranciaRetardoMin,
      salidaEsperada: config.salidaEsperada,
      exigeComida: config.exigeComida,
      comidaInicioEsperada: config.comidaInicioEsperada,
      comidaFinEsperada: config.comidaFinEsperada,
      checadas: config.checadas,
    };
  }

  private configToPublic(row: AsistenciaConfig): AsistenciaConfigPublic {
    const dias = parseDiasLaborales(row.diasLaborales);
    const exigeComida = Boolean(row.exigeComida);
    return {
      entradaEsperada: row.entradaEsperada,
      toleranciaRetardoMin: row.toleranciaRetardoMin,
      salidaEsperada: row.salidaEsperada,
      diasLaborales: dias.length ? dias : DEFAULT_CONFIG.diasLaborales,
      exigeComida,
      comidaInicioEsperada:
        row.comidaInicioEsperada ?? DEFAULT_CONFIG.comidaInicioEsperada,
      comidaFinEsperada:
        row.comidaFinEsperada ?? DEFAULT_CONFIG.comidaFinEsperada,
      checadas: buildChecadas(exigeComida),
    };
  }

  private festivoToPublic(row: AsistenciaFestivo): AsistenciaFestivoPublic {
    return {
      id: row.id,
      fecha: row.fecha,
      nombre: row.nombre,
      createdAt: dbDateToWallClock(row.createdAt),
    };
  }

  private toOrigen(raw: string | null | undefined): AsistenciaOrigen | null {
    return raw === "mobile" || raw === "web" ? raw : null;
  }

  private toPublic(
    row: Asistencia,
    config: AsistenciaConfigPublic,
  ): AsistenciaPublic {
    const entradaAt = row.entradaAt ? dbDateToWallClock(row.entradaAt) : null;
    const salidaAt = row.salidaAt ? dbDateToWallClock(row.salidaAt) : null;

    return {
      id: row.id,
      usuarioId: row.usuarioId,
      usuarioNombre: row.usuario?.nombre ?? null,
      usuarioRol: row.usuario?.rol ?? null,
      fecha: row.fecha,
      entradaAt,
      entradaLat: row.entradaLat != null ? Number(row.entradaLat) : null,
      entradaLng: row.entradaLng != null ? Number(row.entradaLng) : null,
      entradaAccuracy: row.entradaAccuracy,
      origenEntrada: this.toOrigen(row.origenEntrada),
      comidaInicioAt: row.comidaInicioAt
        ? dbDateToWallClock(row.comidaInicioAt)
        : null,
      comidaInicioLat:
        row.comidaInicioLat != null ? Number(row.comidaInicioLat) : null,
      comidaInicioLng:
        row.comidaInicioLng != null ? Number(row.comidaInicioLng) : null,
      comidaInicioAccuracy: row.comidaInicioAccuracy,
      origenComidaInicio: this.toOrigen(row.origenComidaInicio),
      comidaFinAt: row.comidaFinAt
        ? dbDateToWallClock(row.comidaFinAt)
        : null,
      comidaFinLat:
        row.comidaFinLat != null ? Number(row.comidaFinLat) : null,
      comidaFinLng:
        row.comidaFinLng != null ? Number(row.comidaFinLng) : null,
      comidaFinAccuracy: row.comidaFinAccuracy,
      origenComidaFin: this.toOrigen(row.origenComidaFin),
      salidaAt,
      salidaLat: row.salidaLat != null ? Number(row.salidaLat) : null,
      salidaLng: row.salidaLng != null ? Number(row.salidaLng) : null,
      salidaAccuracy: row.salidaAccuracy,
      origenSalida: this.toOrigen(row.origenSalida),
      estatus: this.resolveEstatus(entradaAt, salidaAt, config),
      createdAt: dbDateToWallClock(row.createdAt),
      updatedAt: dbDateToWallClock(row.updatedAt),
    };
  }
}

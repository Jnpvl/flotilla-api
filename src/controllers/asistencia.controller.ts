import type { Response } from "express";
import { RolUsuario } from "../constants/rol.enum.js";
import type { AuthedRequest } from "../middlewares/auth.middleware.js";
import { AsistenciaService } from "../services/asistencia.service.js";

type HttpError = Error & { status?: number };

export class AsistenciaController {
  private readonly service = new AsistenciaService();

  hoy = async (req: AuthedRequest, res: Response): Promise<void> => {
    const usuarioId = req.auth?.sub;
    if (!usuarioId) {
      res.status(401).json({ message: "No autorizado" });
      return;
    }
    try {
      const estado = await this.service.hoy(usuarioId);
      res.status(200).json(estado);
    } catch (error) {
      console.error("Error obteniendo asistencia de hoy:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };

  list = async (req: AuthedRequest, res: Response): Promise<void> => {
    if (req.auth?.rol !== RolUsuario.ADMIN) {
      res.status(403).json({ message: "Solo administradores" });
      return;
    }
    try {
      const fecha = typeof req.query.fecha === "string" ? req.query.fecha : "";
      const desde = typeof req.query.desde === "string" ? req.query.desde : "";
      const hasta = typeof req.query.hasta === "string" ? req.query.hasta : "";
      const usuarioIdRaw = Number(req.query.usuarioId);
      const result = await this.service.findAll({
        fecha,
        desde,
        hasta,
        ...(Number.isInteger(usuarioIdRaw) && usuarioIdRaw > 0
          ? { usuarioId: usuarioIdRaw }
          : {}),
      });
      res.status(200).json(result);
    } catch (error) {
      console.error("Error listando asistencias:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };

  getConfig = async (req: AuthedRequest, res: Response): Promise<void> => {
    if (req.auth?.rol !== RolUsuario.ADMIN) {
      res.status(403).json({ message: "Solo administradores" });
      return;
    }
    try {
      const config = await this.service.getConfig();
      res.status(200).json(config);
    } catch (error) {
      this.handleError(res, error, "Error obteniendo config de asistencia");
    }
  };

  updateConfig = async (req: AuthedRequest, res: Response): Promise<void> => {
    if (req.auth?.rol !== RolUsuario.ADMIN) {
      res.status(403).json({ message: "Solo administradores" });
      return;
    }
    try {
      const config = await this.service.updateConfig(req.body ?? {});
      res.status(200).json(config);
    } catch (error) {
      this.handleError(res, error, "Error actualizando config de asistencia");
    }
  };

  listFestivos = async (req: AuthedRequest, res: Response): Promise<void> => {
    if (req.auth?.rol !== RolUsuario.ADMIN) {
      res.status(403).json({ message: "Solo administradores" });
      return;
    }
    try {
      const desde = typeof req.query.desde === "string" ? req.query.desde : "";
      const hasta = typeof req.query.hasta === "string" ? req.query.hasta : "";
      const items = await this.service.listFestivos({ desde, hasta });
      res.status(200).json(items);
    } catch (error) {
      this.handleError(res, error, "Error listando festivos");
    }
  };

  createFestivo = async (req: AuthedRequest, res: Response): Promise<void> => {
    if (req.auth?.rol !== RolUsuario.ADMIN) {
      res.status(403).json({ message: "Solo administradores" });
      return;
    }
    try {
      const item = await this.service.createFestivo(req.body ?? {});
      res.status(201).json(item);
    } catch (error) {
      this.handleError(res, error, "Error creando festivo");
    }
  };

  removeFestivo = async (req: AuthedRequest, res: Response): Promise<void> => {
    if (req.auth?.rol !== RolUsuario.ADMIN) {
      res.status(403).json({ message: "Solo administradores" });
      return;
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id inválido" });
      return;
    }
    try {
      const ok = await this.service.removeFestivo(id);
      if (!ok) {
        res.status(404).json({ message: "Festivo no encontrado" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      this.handleError(res, error, "Error eliminando festivo");
    }
  };

  entrada = async (req: AuthedRequest, res: Response): Promise<void> => {
    await this.punch(req, res, "entrada", "Error registrando entrada", 201);
  };

  comidaInicio = async (req: AuthedRequest, res: Response): Promise<void> => {
    await this.punch(
      req,
      res,
      "comida_inicio",
      "Error registrando inicio de comida",
      201,
    );
  };

  comidaFin = async (req: AuthedRequest, res: Response): Promise<void> => {
    await this.punch(
      req,
      res,
      "comida_fin",
      "Error registrando fin de comida",
      200,
    );
  };

  salida = async (req: AuthedRequest, res: Response): Promise<void> => {
    await this.punch(req, res, "salida", "Error registrando salida", 200);
  };

  private punch = async (
    req: AuthedRequest,
    res: Response,
    tipo: "entrada" | "comida_inicio" | "comida_fin" | "salida",
    logMessage: string,
    okStatus: number,
  ): Promise<void> => {
    const usuarioId = req.auth?.sub;
    if (!usuarioId) {
      res.status(401).json({ message: "No autorizado" });
      return;
    }
    try {
      const origen =
        req.body?.origen === "web" || req.body?.origen === "mobile"
          ? req.body.origen
          : "mobile";
      const payload = {
        ...(req.body ?? {}),
        origen,
        requireGeo: origen === "mobile",
      };
      const asistencia =
        tipo === "entrada"
          ? await this.service.registrarEntrada(usuarioId, payload)
          : tipo === "comida_inicio"
            ? await this.service.registrarComidaInicio(usuarioId, payload)
            : tipo === "comida_fin"
              ? await this.service.registrarComidaFin(usuarioId, payload)
              : await this.service.registrarSalida(usuarioId, payload);
      res.status(okStatus).json(asistencia);
    } catch (error) {
      this.handleError(res, error, logMessage);
    }
  };

  private handleError(res: Response, error: unknown, logMessage: string): void {
    const err = error as HttpError;
    if (err.status && err.status >= 400 && err.status < 500) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    console.error(`${logMessage}:`, error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

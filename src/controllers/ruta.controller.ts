import type { Response } from "express";
import type { AuthedRequest } from "../middlewares/auth.middleware.js";
import { RutaService } from "../services/ruta.service.js";

type HttpError = Error & { status?: number };

export class RutaController {
  private readonly service = new RutaService();

  list = async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const hoy = req.query.hoy === "1" || req.query.hoy === "true";
      const page = Number(req.query.page);
      const pageSize = Number(req.query.pageSize);
      const fecha = typeof req.query.fecha === "string" ? req.query.fecha : "";

      const result = await this.service.list({
        page: Number.isFinite(page) ? page : 1,
        pageSize: Number.isFinite(pageSize) ? pageSize : 10,
        fecha,
        hoy,
      });
      res.status(200).json(result);
    } catch (error) {
      console.error("Error listando rutas:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };

  dashboard = async (_req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const stats = await this.service.dashboard();
      res.status(200).json(stats);
    } catch (error) {
      console.error("Error dashboard:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };

  getById = async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id inválido" });
      return;
    }

    try {
      const ruta = await this.service.findById(id);
      if (!ruta) {
        res.status(404).json({ message: "Ruta no encontrada" });
        return;
      }
      res.status(200).json(ruta);
    } catch (error) {
      console.error("Error obteniendo ruta:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };

  activa = async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const choferId = req.auth?.sub;
      if (!choferId) {
        res.status(401).json({ message: "No autorizado" });
        return;
      }
      const ruta = await this.service.findActivaByChofer(choferId);
      res.status(200).json(ruta);
    } catch (error) {
      console.error("Error obteniendo ruta activa:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };

  addGps = async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id inválido" });
      return;
    }

    try {
      const point = await this.service.addGpsPoint(
        id,
        req.body ?? {},
        req.auth?.sub,
      );
      res.status(201).json(point);
    } catch (error) {
      this.handleError(res, error, "Error guardando GPS");
    }
  };

  iniciar = async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const body = req.body ?? {};
      const fromBody = Number(body.choferId);
      const choferId =
        Number.isInteger(fromBody) && fromBody > 0 ? fromBody : req.auth?.sub;
      const ruta = await this.service.iniciar({
        ...body,
        choferId,
      });
      res.status(201).json(ruta);
    } catch (error) {
      this.handleError(res, error, "Error iniciando ruta");
    }
  };

  finalizar = async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id inválido" });
      return;
    }

    try {
      const ruta = await this.service.finalizar(id, req.body ?? {});
      if (!ruta) {
        res.status(404).json({ message: "Ruta no encontrada" });
        return;
      }
      res.status(200).json(ruta);
    } catch (error) {
      this.handleError(res, error, "Error finalizando ruta");
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

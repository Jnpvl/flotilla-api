import type { Response } from "express";
import type { AuthedRequest } from "../middlewares/auth.middleware.js";
import { PedidoService } from "../services/pedido.service.js";

type HttpError = Error & { status?: number };

export class PedidoController {
  private readonly service = new PedidoService();

  list = async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const page = Number(req.query.page);
      const pageSize = Number(req.query.pageSize);
      const estatus =
        typeof req.query.estatus === "string" ? req.query.estatus : "";
      const q = typeof req.query.q === "string" ? req.query.q : "";

      const result = await this.service.findAll({
        page: Number.isFinite(page) ? page : 1,
        pageSize: Number.isFinite(pageSize) ? pageSize : 10,
        estatus: estatus as never,
        q,
      });
      res.status(200).json(result);
    } catch (error) {
      console.error("Error listando pedidos:", error);
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
      const pedido = await this.service.findById(id);
      if (!pedido) {
        res.status(404).json({ message: "Pedido no encontrado" });
        return;
      }
      res.status(200).json(pedido);
    } catch (error) {
      console.error("Error obteniendo pedido:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };

  create = async (req: AuthedRequest, res: Response): Promise<void> => {
    const creadoPorId = req.auth?.sub;
    if (!creadoPorId) {
      res.status(401).json({ message: "No autorizado" });
      return;
    }

    try {
      const pedido = await this.service.create({
        lugarEntrega: req.body?.lugarEntrega,
        creadoPorId,
      });
      res.status(201).json(pedido);
    } catch (error) {
      this.handleError(res, error, "Error creando pedido");
    }
  };

  update = async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id inválido" });
      return;
    }

    try {
      const pedido = await this.service.update(id, req.body ?? {});
      if (!pedido) {
        res.status(404).json({ message: "Pedido no encontrado" });
        return;
      }
      res.status(200).json(pedido);
    } catch (error) {
      this.handleError(res, error, "Error actualizando pedido");
    }
  };

  remove = async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id inválido" });
      return;
    }

    try {
      const deleted = await this.service.remove(id);
      if (!deleted) {
        res.status(404).json({ message: "Pedido no encontrado" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error eliminando pedido:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };

  private handleError(res: Response, error: unknown, logMessage: string): void {
    const err = error as HttpError & { driverError?: { message?: string } };
    if (err.status && err.status >= 400 && err.status < 500) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    console.error(`${logMessage}:`, error);
    const detail =
      err.driverError?.message ||
      (typeof err.message === "string" ? err.message : null);
    res.status(500).json({
      message: detail
        ? `Error interno del servidor: ${detail}`
        : "Error interno del servidor",
    });
  }
}

import type { Response } from "express";
import { RolUsuario } from "../constants/rol.enum.js";
import type { AuthedRequest } from "../middlewares/auth.middleware.js";
import { PedidoComercialService } from "../services/pedido-comercial.service.js";

type HttpError = Error & { status?: number };

export class PedidoComercialController {
  private readonly service = new PedidoComercialService();

  list = async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const page = Number(req.query.page);
      const pageSize = Number(req.query.pageSize);
      const estatus =
        typeof req.query.estatus === "string" ? req.query.estatus : "";
      const q = typeof req.query.q === "string" ? req.query.q : "";
      const vendedorIdRaw = Number(req.query.vendedorId);
      const query: {
        page: number;
        pageSize: number;
        estatus: never;
        q: string;
        vendedorId?: number;
        excludeBorrador?: boolean;
      } = {
        page: Number.isFinite(page) ? page : 1,
        pageSize: Number.isFinite(pageSize) ? pageSize : 20,
        estatus: estatus as never,
        q,
        excludeBorrador: req.auth?.rol === RolUsuario.FACTURISTA,
      };
      if (Number.isInteger(vendedorIdRaw) && vendedorIdRaw > 0) {
        query.vendedorId = vendedorIdRaw;
      }
      const result = await this.service.findAll(query);
      res.status(200).json(result);
    } catch (error) {
      console.error("Error listando pedidos comerciales:", error);
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
        res.status(404).json({ message: "Pedido comercial no encontrado" });
        return;
      }
      res.status(200).json(pedido);
    } catch (error) {
      console.error("Error obteniendo pedido comercial:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };

  create = async (req: AuthedRequest, res: Response): Promise<void> => {
    const fromBody = Number(req.body?.vendedorId);
    const vendedorId =
      Number.isInteger(fromBody) && fromBody > 0 ? fromBody : req.auth?.sub;
    if (!vendedorId) {
      res.status(401).json({ message: "No autorizado" });
      return;
    }
    try {
      const pedido = await this.service.create({
        ...(req.body ?? {}),
        vendedorId,
      });
      res.status(201).json(pedido);
    } catch (error) {
      this.handleError(res, error, "Error creando pedido comercial");
    }
  };

  update = async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id inválido" });
      return;
    }
    try {
      const pedido = await this.service.update(id, req.body ?? {}, {
        actorRol: req.auth?.rol,
      });
      if (!pedido) {
        res.status(404).json({ message: "Pedido comercial no encontrado" });
        return;
      }
      res.status(200).json(pedido);
    } catch (error) {
      this.handleError(res, error, "Error actualizando pedido comercial");
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
        res.status(404).json({ message: "Pedido comercial no encontrado" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      this.handleError(res, error, "Error eliminando pedido comercial");
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

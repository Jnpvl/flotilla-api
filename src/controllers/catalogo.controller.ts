import type { Response } from "express";
import { AppDataSource } from "../config/database.js";
import { RolUsuario } from "../constants/rol.enum.js";
import { Usuario } from "../entities/usuario.entity.js";
import type { AuthedRequest } from "../middlewares/auth.middleware.js";
import { CatalogoService } from "../services/catalogo.service.js";

type HttpError = Error & { status?: number };

export class CatalogoController {
  private readonly service = new CatalogoService();
  private readonly usuarioRepo = AppDataSource.getRepository(Usuario);

  searchClientes = async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const q = typeof req.query.q === "string" ? req.query.q : "";
      const limit = Number(req.query.limit);

      let agenteId: number | undefined;
      if (req.auth?.rol === RolUsuario.VENDEDOR) {
        const usuario = await this.usuarioRepo.findOne({
          where: { id: req.auth.sub },
        });
        const linked = usuario?.agenteContpaqId ?? null;
        if (!linked || linked <= 0) {
          res.status(400).json({
            message:
              "Tu usuario vendedor no tiene agente Contpaq vinculado. Pide a un admin que lo configure.",
          });
          return;
        }
        agenteId = linked;
      } else {
        const agenteIdRaw = Number(req.query.agenteId);
        if (Number.isInteger(agenteIdRaw) && agenteIdRaw > 0) {
          agenteId = agenteIdRaw;
        }
      }

      const items = await this.service.searchClientes(
        q,
        Number.isFinite(limit) ? limit : 8,
        agenteId,
      );
      res.status(200).json({ items });
    } catch (error) {
      const err = error as HttpError;
      console.error("Error buscando clientes:", error);
      res.status(err.status ?? 500).json({
        message: err.status === 503 ? err.message : "Error interno del servidor",
      });
    }
  };

  searchProductos = async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const q = typeof req.query.q === "string" ? req.query.q : "";
      const limit = Number(req.query.limit);
      const items = await this.service.searchProductos(
        q,
        Number.isFinite(limit) ? limit : 8,
      );
      res.status(200).json({ items });
    } catch (error) {
      const err = error as HttpError;
      console.error("Error buscando productos:", error);
      res.status(err.status ?? 500).json({
        message: err.status === 503 ? err.message : "Error interno del servidor",
      });
    }
  };

  listAgentes = async (_req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const items = await this.service.listAgentes();
      res.status(200).json({ items });
    } catch (error) {
      const err = error as HttpError;
      console.error("Error listando agentes:", error);
      res.status(err.status ?? 500).json({
        message: err.status === 503 ? err.message : "Error interno del servidor",
      });
    }
  };
}

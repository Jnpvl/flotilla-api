import type { Response } from "express";
import { RolUsuario } from "../constants/rol.enum.js";
import type { AuthedRequest } from "../middlewares/auth.middleware.js";
import { VisitaService } from "../services/visita.service.js";

type HttpError = Error & { status?: number };

export class VisitaController {
  private readonly service = new VisitaService();

  private publicOpts(req: AuthedRequest) {
    return {
      includeCheckInDetail: req.auth?.rol === RolUsuario.ADMIN,
    };
  }

  list = async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const fecha = typeof req.query.fecha === "string" ? req.query.fecha : "";
      const desde = typeof req.query.desde === "string" ? req.query.desde : "";
      const hasta = typeof req.query.hasta === "string" ? req.query.hasta : "";
      const estatus =
        typeof req.query.estatus === "string" ? req.query.estatus : "";
      const vendedorIdRaw = Number(req.query.vendedorId);
      const query: {
        fecha: string;
        desde: string;
        hasta: string;
        estatus: never;
        vendedorId?: number;
      } = {
        fecha,
        desde,
        hasta,
        estatus: estatus as never,
      };
      // Vendedor solo ve las suyas
      if (req.auth?.rol === RolUsuario.VENDEDOR && req.auth.sub) {
        query.vendedorId = req.auth.sub;
      } else if (Number.isInteger(vendedorIdRaw) && vendedorIdRaw > 0) {
        query.vendedorId = vendedorIdRaw;
      }
      const visitas = await this.service.findAll(query, this.publicOpts(req));
      res.status(200).json(visitas);
    } catch (error) {
      console.error("Error listando visitas:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };

  /** Visitas del día para el vendedor autenticado (app). */
  hoy = async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const vendedorId = req.auth?.sub;
      if (!vendedorId) {
        res.status(401).json({ message: "No autorizado" });
        return;
      }
      const fecha =
        typeof req.query.fecha === "string" && req.query.fecha
          ? req.query.fecha
          : getTodayYmd();
      const visitas = await this.service.findAll(
        { fecha, vendedorId },
        this.publicOpts(req),
      );
      res.status(200).json(visitas);
    } catch (error) {
      console.error("Error listando visitas de hoy:", error);
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
      const visita = await this.service.findById(id, this.publicOpts(req));
      if (!visita) {
        res.status(404).json({ message: "Visita no encontrada" });
        return;
      }
      if (
        req.auth?.rol === RolUsuario.VENDEDOR &&
        req.auth.sub !== visita.vendedorId
      ) {
        res.status(403).json({ message: "No autorizado" });
        return;
      }
      res.status(200).json(visita);
    } catch (error) {
      console.error("Error obteniendo visita:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };

  create = async (req: AuthedRequest, res: Response): Promise<void> => {
    const fromBody = Number(req.body?.vendedorId);
    let vendedorId: number | undefined;
    if (req.auth?.rol === RolUsuario.VENDEDOR) {
      vendedorId = req.auth.sub;
    } else {
      vendedorId =
        Number.isInteger(fromBody) && fromBody > 0 ? fromBody : req.auth?.sub;
    }
    if (!vendedorId) {
      res.status(401).json({ message: "No autorizado" });
      return;
    }
    try {
      const visita = await this.service.create(
        { ...(req.body ?? {}), vendedorId },
        this.publicOpts(req),
      );
      res.status(201).json(visita);
    } catch (error) {
      this.handleError(res, error, "Error creando visita");
    }
  };

  update = async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id inválido" });
      return;
    }
    try {
      const visita = await this.service.update(
        id,
        req.body ?? {},
        this.publicOpts(req),
      );
      if (!visita) {
        res.status(404).json({ message: "Visita no encontrada" });
        return;
      }
      res.status(200).json(visita);
    } catch (error) {
      this.handleError(res, error, "Error actualizando visita");
    }
  };

  checkIn = async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id inválido" });
      return;
    }
    try {
      const visita = await this.service.checkIn(
        id,
        req.body ?? {},
        {
          ...(req.auth?.sub != null ? { vendedorId: req.auth.sub } : {}),
          ...(req.auth?.rol ? { actorRol: req.auth.rol } : {}),
        },
        this.publicOpts(req),
      );
      if (!visita) {
        res.status(404).json({ message: "Visita no encontrada" });
        return;
      }
      res.status(200).json(visita);
    } catch (error) {
      this.handleError(res, error, "Error en check-in de visita");
    }
  };

  cancelar = async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id inválido" });
      return;
    }
    try {
      const visita = await this.service.cancelar(
        id,
        req.body ?? {},
        this.publicOpts(req),
      );
      if (!visita) {
        res.status(404).json({ message: "Visita no encontrada" });
        return;
      }
      res.status(200).json(visita);
    } catch (error) {
      this.handleError(res, error, "Error cancelando visita");
    }
  };

  eliminar = async (req: AuthedRequest, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id inválido" });
      return;
    }
    try {
      const deleted = await this.service.eliminar(id, req.body ?? {});
      if (!deleted) {
        res.status(404).json({ message: "Visita no encontrada" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      this.handleError(res, error, "Error eliminando visita");
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

function getTodayYmd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

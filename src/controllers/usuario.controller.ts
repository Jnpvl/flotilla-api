import type { Request, Response } from "express";
import { UsuarioService } from "../services/usuario.service.js";

type HttpError = Error & { status?: number };

export class UsuarioController {
  private readonly service = new UsuarioService();

  list = async (_req: Request, res: Response): Promise<void> => {
    try {
      const usuarios = await this.service.findAll();
      res.status(200).json(usuarios);
    } catch (error) {
      console.error("Error listando usuarios:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id inválido" });
      return;
    }

    try {
      const usuario = await this.service.findById(id);
      if (!usuario) {
        res.status(404).json({ message: "Usuario no encontrado" });
        return;
      }
      res.status(200).json(usuario);
    } catch (error) {
      console.error("Error obteniendo usuario:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const usuario = await this.service.create(req.body ?? {});
      res.status(201).json(usuario);
    } catch (error) {
      this.handleError(res, error, "Error creando usuario");
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id inválido" });
      return;
    }

    try {
      const usuario = await this.service.update(id, req.body ?? {});
      if (!usuario) {
        res.status(404).json({ message: "Usuario no encontrado" });
        return;
      }
      res.status(200).json(usuario);
    } catch (error) {
      this.handleError(res, error, "Error actualizando usuario");
    }
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id inválido" });
      return;
    }

    try {
      const deleted = await this.service.remove(id);
      if (!deleted) {
        res.status(404).json({ message: "Usuario no encontrado" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error eliminando usuario:", error);
      res.status(500).json({ message: "Error interno del servidor" });
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

import type { Response } from "express";
import type { AuthedRequest } from "../middlewares/auth.middleware.js";
import { AuthService } from "../services/auth.service.js";

export class AuthController {
  private readonly authService = new AuthService();

  login = async (req: AuthedRequest, res: Response): Promise<void> => {
    const { username, password } = req.body ?? {};

    if (typeof username !== "string" || typeof password !== "string") {
      res.status(400).json({
        message: "Se requieren username y password como strings",
      });
      return;
    }

    try {
      const result = await this.authService.login({ username, password });

      if (!result) {
        res.status(401).json({ message: "Credenciales inválidas" });
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error("Error en login:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };

  me = async (req: AuthedRequest, res: Response): Promise<void> => {
    const userId = req.auth?.sub;
    if (!userId) {
      res.status(401).json({ message: "No autorizado" });
      return;
    }

    try {
      const user = await this.authService.me(userId);
      if (!user) {
        res.status(401).json({ message: "Sesión inválida" });
        return;
      }
      res.status(200).json(user);
    } catch (error) {
      console.error("Error en /auth/me:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };
}

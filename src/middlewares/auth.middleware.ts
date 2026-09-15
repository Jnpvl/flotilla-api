import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/database.js";
import { env } from "../config/env.js";
import { Usuario } from "../entities/usuario.entity.js";
import type { JwtPayload as AppJwtPayload } from "../interfaces/auth.interface.js";

export type AuthedRequest = Request & {
  auth?: AppJwtPayload;
};

/**
 * Verifica firma JWT y que el usuario siga existiendo en BD
 * con el mismo username (evita sesiones huérfanas tras borrar usuarios/BD).
 */
export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "No autorizado" });
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({ message: "No autorizado" });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded === "string") {
      res.status(401).json({ message: "Token inválido" });
      return;
    }

    const sub =
      typeof decoded.sub === "number" ? decoded.sub : Number(decoded.sub);

    if (!Number.isInteger(sub) || sub <= 0) {
      res.status(401).json({ message: "Token inválido" });
      return;
    }

    const tokenUsername = String(decoded.username ?? "").trim();
    if (!tokenUsername) {
      res.status(401).json({ message: "Token inválido" });
      return;
    }

    const usuario = await AppDataSource.getRepository(Usuario).findOne({
      where: { id: sub },
    });

    if (!usuario || usuario.username !== tokenUsername) {
      res.status(401).json({ message: "Sesión inválida" });
      return;
    }

    // Rol siempre desde BD (cambios de rol aplican de inmediato).
    req.auth = {
      sub: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
    };
    next();
  } catch {
    res.status(401).json({ message: "Token inválido o expirado" });
  }
}

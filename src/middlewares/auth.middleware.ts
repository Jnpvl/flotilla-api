import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { JwtPayload as AppJwtPayload } from "../interfaces/auth.interface.js";

export type AuthedRequest = Request & {
  auth?: AppJwtPayload;
};

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): void {
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
      typeof decoded.sub === "number"
        ? decoded.sub
        : Number(decoded.sub);

    if (!Number.isInteger(sub) || sub <= 0) {
      res.status(401).json({ message: "Token inválido" });
      return;
    }

    req.auth = {
      sub,
      username: String(decoded.username ?? ""),
      rol: decoded.rol as AppJwtPayload["rol"],
    };
    next();
  } catch {
    res.status(401).json({ message: "Token inválido o expirado" });
  }
}
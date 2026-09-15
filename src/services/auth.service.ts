import jwt, { type SignOptions } from "jsonwebtoken";
import { AppDataSource } from "../config/database.js";
import { env } from "../config/env.js";
import { Usuario } from "../entities/usuario.entity.js";
import type {
  JwtPayload,
  LoginDto,
  LoginResponse,
} from "../interfaces/auth.interface.js";
import { verifyPassword } from "../utils/password.js";

export class AuthService {
  private readonly usuarioRepo = AppDataSource.getRepository(Usuario);

  async login(dto: LoginDto): Promise<LoginResponse | null> {
    const username = dto.username.trim();
    const password = dto.password;

    if (!username || !password) {
      return null;
    }

    const usuario = await this.usuarioRepo.findOne({
      where: { username },
    });

    if (!usuario || !(await verifyPassword(password, usuario.password))) {
      return null;
    }

    const payload: JwtPayload = {
      sub: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
    };

    const signOptions: SignOptions = {
      expiresIn: env.jwtExpiresIn as NonNullable<SignOptions["expiresIn"]>,
    };

    const accessToken = jwt.sign(payload, env.jwtSecret, signOptions);

    return {
      accessToken,
      user: this.toPublicUser(usuario),
    };
  }

  async me(userId: number): Promise<LoginResponse["user"] | null> {
    const usuario = await this.usuarioRepo.findOne({ where: { id: userId } });
    if (!usuario) return null;
    return this.toPublicUser(usuario);
  }

  private toPublicUser(usuario: Usuario): LoginResponse["user"] {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      username: usuario.username,
      rol: usuario.rol,
      agenteContpaqId: usuario.agenteContpaqId ?? null,
    };
  }
}

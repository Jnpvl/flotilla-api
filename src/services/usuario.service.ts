import { AppDataSource } from "../config/database.js";
import { RolUsuario } from "../constants/rol.enum.js";
import { Usuario } from "../entities/usuario.entity.js";
import type {
  CreateUsuarioDto,
  UpdateUsuarioDto,
  UsuarioPublic,
} from "../interfaces/usuario.interface.js";
import { getClientLocalWallClock } from "../utils/client-time-context.js";
import {
  dbDateToWallClock,
  wallClockToDbDate,
} from "../utils/local-datetime.js";
import { hashPassword } from "../utils/password.js";

const ROLES = new Set<string>(Object.values(RolUsuario));

export class UsuarioService {
  private readonly repo = AppDataSource.getRepository(Usuario);

  async findAll(): Promise<UsuarioPublic[]> {
    const usuarios = await this.repo.find({
      order: { id: "ASC" },
    });
    return usuarios.map((u) => this.toPublic(u));
  }

  async findById(id: number): Promise<UsuarioPublic | null> {
    const usuario = await this.repo.findOne({ where: { id } });
    return usuario ? this.toPublic(usuario) : null;
  }

  async create(dto: CreateUsuarioDto): Promise<UsuarioPublic> {
    this.assertCreate(dto);

    const existing = await this.repo.findOne({
      where: { username: dto.username.trim() },
    });
    if (existing) {
      throw Object.assign(new Error("El username ya está en uso"), {
        status: 409,
      });
    }

    const now = wallClockToDbDate(getClientLocalWallClock());
    const usuario = this.repo.create({
      nombre: dto.nombre.trim(),
      username: dto.username.trim(),
      password: await hashPassword(dto.password),
      rol: dto.rol,
      createdAt: now,
      updatedAt: now,
    });

    const saved = await this.repo.save(usuario);
    return this.toPublic(saved);
  }

  async update(id: number, dto: UpdateUsuarioDto): Promise<UsuarioPublic | null> {
    const usuario = await this.repo.findOne({ where: { id } });
    if (!usuario) return null;

    if (dto.nombre !== undefined) {
      if (typeof dto.nombre !== "string" || !dto.nombre.trim()) {
        throw Object.assign(new Error("nombre inválido"), { status: 400 });
      }
      usuario.nombre = dto.nombre.trim();
    }

    if (dto.username !== undefined) {
      if (typeof dto.username !== "string" || !dto.username.trim()) {
        throw Object.assign(new Error("username inválido"), { status: 400 });
      }
      const username = dto.username.trim();
      const existing = await this.repo.findOne({ where: { username } });
      if (existing && existing.id !== id) {
        throw Object.assign(new Error("El username ya está en uso"), {
          status: 409,
        });
      }
      usuario.username = username;
    }

    if (dto.password !== undefined && dto.password !== "") {
      if (typeof dto.password !== "string") {
        throw Object.assign(new Error("password inválido"), { status: 400 });
      }
      usuario.password = await hashPassword(dto.password);
    }

    if (dto.rol !== undefined) {
      if (!ROLES.has(dto.rol)) {
        throw Object.assign(new Error("rol inválido"), { status: 400 });
      }
      usuario.rol = dto.rol;
    }

    usuario.updatedAt = wallClockToDbDate(getClientLocalWallClock());
    const saved = await this.repo.save(usuario);
    return this.toPublic(saved);
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  private assertCreate(dto: CreateUsuarioDto): void {
    if (typeof dto.nombre !== "string" || !dto.nombre.trim()) {
      throw Object.assign(new Error("nombre es requerido"), { status: 400 });
    }
    if (typeof dto.username !== "string" || !dto.username.trim()) {
      throw Object.assign(new Error("username es requerido"), { status: 400 });
    }
    if (typeof dto.password !== "string" || !dto.password) {
      throw Object.assign(new Error("password es requerido"), { status: 400 });
    }
    if (!ROLES.has(dto.rol)) {
      throw Object.assign(new Error("rol inválido"), { status: 400 });
    }
  }

  private toPublic(usuario: Usuario): UsuarioPublic {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      username: usuario.username,
      rol: usuario.rol,
      createdAt: dbDateToWallClock(usuario.createdAt),
      updatedAt: dbDateToWallClock(usuario.updatedAt),
    };
  }
}

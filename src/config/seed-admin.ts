import { RolUsuario } from "../constants/rol.enum.js";
import { Usuario } from "../entities/usuario.entity.js";
import {
  hashPassword,
  isPasswordHashed,
} from "../utils/password.js";
import { nowLocalWallClock, wallClockToDbDate } from "../utils/local-datetime.js";
import { AppDataSource } from "./database.js";
import { env } from "./env.js";

export async function seedAdminIfMissing(): Promise<void> {
  const repo = AppDataSource.getRepository(Usuario);
  const { nombre, username, password } = env.seedAdmin;

  const existing = await repo.findOne({ where: { username } });
  if (existing) {
    if (!isPasswordHashed(existing.password)) {
      existing.password = await hashPassword(existing.password);
      existing.updatedAt = wallClockToDbDate(nowLocalWallClock());
      await repo.save(existing);
      console.log(`Contraseña de "${username}" migrada a hash bcrypt.`);
    }
    return;
  }

  const now = wallClockToDbDate(nowLocalWallClock());
  const admin = repo.create({
    nombre,
    username,
    password: await hashPassword(password),
    rol: RolUsuario.ADMIN,
    createdAt: now,
    updatedAt: now,
  });

  await repo.save(admin);
  console.log(`Usuario admin "${username}" creado.`);
}

export async function hashPlaintextPasswords(): Promise<void> {
  const repo = AppDataSource.getRepository(Usuario);
  const usuarios = await repo.find();
  let migrated = 0;

  for (const usuario of usuarios) {
    if (isPasswordHashed(usuario.password)) continue;
    usuario.password = await hashPassword(usuario.password);
    usuario.updatedAt = wallClockToDbDate(nowLocalWallClock());
    await repo.save(usuario);
    migrated += 1;
  }

  if (migrated > 0) {
    console.log(`${migrated} contraseña(s) migrada(s) a bcrypt.`);
  }
}

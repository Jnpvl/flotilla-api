import "reflect-metadata";
import { AppDataSource } from "../src/config/database.js";
import { env } from "../src/config/env.js";
import { Usuario } from "../src/entities/usuario.entity.js";
import { hashPassword, verifyPassword } from "../src/utils/password.js";

async function main(): Promise<void> {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(Usuario);
  const username = env.seedAdmin.username;
  const plain = env.seedAdmin.password;
  const u = await repo.findOne({ where: { username } });
  if (!u) {
    console.log("NO_USER", username);
    await AppDataSource.destroy();
    return;
  }
  const ok = await verifyPassword(plain, u.password);
  console.log(
    JSON.stringify({
      username: u.username,
      rol: u.rol,
      hashPrefix: u.password.slice(0, 12),
      matchesEnv: ok,
    }),
  );
  if (!ok) {
    u.password = await hashPassword(plain);
    await repo.save(u);
    console.log("RESET_OK");
  } else {
    console.log("ALREADY_OK");
  }
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

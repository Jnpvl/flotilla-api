import "reflect-metadata";
import Server from "./models/server.js";
import { initializeDatabases } from "./config/database.js";
import {
  hashPlaintextPasswords,
  seedAdminIfMissing,
} from "./config/seed-admin.js";

async function main() {
  try {
    await initializeDatabases();
    await hashPlaintextPasswords();
    await seedAdminIfMissing();
  } catch (error) {
    console.error("Error conectando a las bases de datos:", error);
    process.exit(1);
  }

  const server = new Server();
  server.start();
}

main();

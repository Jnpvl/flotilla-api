import "reflect-metadata";
import Server from "./models/server.js";
import { initializeDatabases } from "./config/database.js";

async function main() {
  try {
    await initializeDatabases();
  } catch (error) {
    console.error("Error conectando a las bases de datos:", error);
    process.exit(1);
  }

  const server = new Server();
  server.start();
}

main();

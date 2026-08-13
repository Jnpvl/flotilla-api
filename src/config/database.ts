import "reflect-metadata";
import { DataSource } from "typeorm";
import { ENTITIES } from "../entities/index.js";
import { LocalDateTimeSubscriber } from "../subscribers/local-datetime.subscriber.js";
import { env } from "./env.js";

export const AppDataSource = new DataSource({
  type: "mssql",
  host: env.db.host,
  port: env.db.port,
  username: env.db.user,
  password: env.db.password,
  database: env.db.name,
  synchronize: env.db.synchronize,
  entities: ENTITIES,
  subscribers: [LocalDateTimeSubscriber],
  extra: {
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  },
});

export const initializeDatabases = async () => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    console.log("Bases de datos inicializadas correctamente.");
  } catch (error) {
    console.error("Error conectando a las bases de datos:", error);
    throw error;
  }
};

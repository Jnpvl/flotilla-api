import "reflect-metadata";
import { DataSource } from "typeorm";
import { ENTITIES } from "../entities/index.js";
import { LocalDateTimeSubscriber } from "../subscribers/local-datetime.subscriber.js";
import { env } from "./env.js";

const mssqlExtra = {
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

/** BD principal de la app (Flotilla / Ventas). */
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
  extra: mssqlExtra,
});

/**
 * BD externa de catálogo (clientes / productos).
 * Solo lectura; sin entities propias todavía — se consulta con SQL mapeado por env.
 * Se instancia solo cuando hay DB_CATALOG_NAME.
 */
export const CatalogDataSource = env.dbCatalog.name
  ? new DataSource({
      type: "mssql",
      host: env.dbCatalog.host,
      port: env.dbCatalog.port,
      username: env.dbCatalog.user,
      password: env.dbCatalog.password,
      database: env.dbCatalog.name,
      synchronize: false,
      entities: [],
      extra: mssqlExtra,
    })
  : null;

export const initializeDatabases = async () => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    console.log(`BD app conectada: ${env.db.name}`);

    if (!env.dbCatalog.name) {
      if (env.dbCatalog.required) {
        throw new Error("Missing required env var: DB_CATALOG_NAME");
      }
      console.warn(
        "DB_CATALOG_NAME vacío: catálogo de clientes/productos pendiente de configurar.",
      );
      return;
    }

    if (!CatalogDataSource) {
      return;
    }

    try {
      if (!CatalogDataSource.isInitialized) {
        await CatalogDataSource.initialize();
      }
      console.log(`BD catálogo conectada: ${env.dbCatalog.name}`);
    } catch (catalogError) {
      console.error(
        `Error conectando BD catálogo (${env.dbCatalog.name}):`,
        catalogError,
      );
      if (env.dbCatalog.required) {
        throw catalogError;
      }
      console.warn(
        "Continuando sin catálogo (DB_CATALOG_REQUIRED=false). Clientes/productos no estarán disponibles vía API.",
      );
    }
  } catch (error) {
    console.error("Error conectando a las bases de datos:", error);
    throw error;
  }
};

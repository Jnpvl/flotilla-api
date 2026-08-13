import express, { type Application } from "express";
import { env, isCorsOriginAllowed } from "../config/env.js";
import { clientLocalTimeMiddleware } from "../middlewares/client-local-time.middleware.js";
import v1Router from "../routes/index.js";

class Server {
  public app: Application;
  public PORT = env.port;

  constructor() {
    this.app = express();
    this.config();
    this.router();
  }

  config(): void {
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
      if (isCorsOriginAllowed(origin, env.corsOrigins)) {
        res.header("Access-Control-Allow-Origin", origin ?? "*");
        res.header("Vary", "Origin");
      }
      res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Client-Local-Time",
      );
      res.header(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      );
      if (req.method === "OPTIONS") {
        res.sendStatus(204);
        return;
      }
      next();
    });
    this.app.use(clientLocalTimeMiddleware);
  }

  router(): void {
    this.app.use("/api/v1", v1Router);
  }

  start(): void {
    this.app.get("/", (_req, res) => {
      res.json({ status: "OK" });
    });

    this.app.listen(this.PORT, "0.0.0.0", () => {
      console.log(`Server running at http://localhost:${this.PORT}`);
      console.log(`CORS origins: ${env.corsOrigins.join(", ")}`);
    });
  }
}

export default Server;

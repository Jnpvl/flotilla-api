import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import authRouter from "./auth.routes.js";
import catalogoRouter from "./catalogos.routes.js";
import pedidoRouter from "./pedidos.routes.js";
import pedidoComercialRouter from "./pedidos-comerciales.routes.js";
import rutaRouter from "./rutas.routes.js";
import usuarioRouter from "./usuarios.routes.js";
import visitaRouter from "./visitas.routes.js";

const v1Router = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/usuarios", requireAuth, usuarioRouter);
v1Router.use("/catalogos", catalogoRouter);
v1Router.use("/pedidos", pedidoRouter);
v1Router.use("/pedidos-comerciales", pedidoComercialRouter);
v1Router.use("/visitas", visitaRouter);
v1Router.use("/rutas", rutaRouter);

export default v1Router;

import { Router } from "express";
import authRouter from "./auth.routes.js";
import pedidoRouter from "./pedidos.routes.js";
import rutaRouter from "./rutas.routes.js";
import usuarioRouter from "./usuarios.routes.js";

const v1Router = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/usuarios", usuarioRouter);
v1Router.use("/pedidos", pedidoRouter);
v1Router.use("/rutas", rutaRouter);

export default v1Router;

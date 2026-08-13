import { Router } from "express";
import { UsuarioController } from "../controllers/usuario.controller.js";

const usuarioRouter = Router();
const controller = new UsuarioController();

usuarioRouter.get("/", controller.list);
usuarioRouter.get("/:id", controller.getById);
usuarioRouter.post("/", controller.create);
usuarioRouter.put("/:id", controller.update);
usuarioRouter.delete("/:id", controller.remove);

export default usuarioRouter;

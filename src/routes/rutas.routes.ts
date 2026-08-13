import { Router } from "express";
import { RutaController } from "../controllers/ruta.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const rutaRouter = Router();
const controller = new RutaController();

rutaRouter.use(requireAuth);

rutaRouter.get("/dashboard", controller.dashboard);
rutaRouter.get("/activa", controller.activa);
rutaRouter.get("/", controller.list);
rutaRouter.get("/:id", controller.getById);
rutaRouter.post("/iniciar", controller.iniciar);
rutaRouter.post("/:id/finalizar", controller.finalizar);
rutaRouter.post("/:id/gps", controller.addGps);
rutaRouter.post("/:id/gps/batch", controller.addGpsBatch);

export default rutaRouter;

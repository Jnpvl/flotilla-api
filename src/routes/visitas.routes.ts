import { Router } from "express";
import { VisitaController } from "../controllers/visita.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const visitaRouter = Router();
const controller = new VisitaController();

visitaRouter.use(requireAuth);

visitaRouter.get("/hoy", controller.hoy);
visitaRouter.get("/", controller.list);
visitaRouter.get("/:id", controller.getById);
visitaRouter.post("/", controller.create);
visitaRouter.put("/:id", controller.update);
visitaRouter.post("/:id/check-in", controller.checkIn);
visitaRouter.post("/:id/cancelar", controller.cancelar);
visitaRouter.post("/:id/eliminar", controller.eliminar);

export default visitaRouter;

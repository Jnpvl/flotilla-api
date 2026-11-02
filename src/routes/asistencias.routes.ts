import { Router } from "express";
import { AsistenciaController } from "../controllers/asistencia.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const asistenciaRouter = Router();
const controller = new AsistenciaController();

asistenciaRouter.use(requireAuth);

asistenciaRouter.get("/hoy", controller.hoy);
asistenciaRouter.get("/config", controller.getConfig);
asistenciaRouter.put("/config", controller.updateConfig);
asistenciaRouter.get("/festivos", controller.listFestivos);
asistenciaRouter.post("/festivos", controller.createFestivo);
asistenciaRouter.delete("/festivos/:id", controller.removeFestivo);
asistenciaRouter.get("/", controller.list);
asistenciaRouter.post("/entrada", controller.entrada);
asistenciaRouter.post("/comida-inicio", controller.comidaInicio);
asistenciaRouter.post("/comida-fin", controller.comidaFin);
asistenciaRouter.post("/salida", controller.salida);

export default asistenciaRouter;

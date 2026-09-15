import { Router } from "express";
import { PedidoComercialController } from "../controllers/pedido-comercial.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const pedidoComercialRouter = Router();
const controller = new PedidoComercialController();

pedidoComercialRouter.use(requireAuth);

pedidoComercialRouter.get("/", controller.list);
pedidoComercialRouter.get("/:id", controller.getById);
pedidoComercialRouter.post("/", controller.create);
pedidoComercialRouter.put("/:id", controller.update);
pedidoComercialRouter.delete("/:id", controller.remove);

export default pedidoComercialRouter;

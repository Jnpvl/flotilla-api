import { Router } from "express";
import { PedidoController } from "../controllers/pedido.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const pedidoRouter = Router();
const controller = new PedidoController();

pedidoRouter.use(requireAuth);

pedidoRouter.get("/", controller.list);
pedidoRouter.get("/:id", controller.getById);
pedidoRouter.post("/", controller.create);
pedidoRouter.put("/:id", controller.update);
pedidoRouter.delete("/:id", controller.remove);

export default pedidoRouter;

import { Router } from "express";
import { CatalogoController } from "../controllers/catalogo.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const catalogoRouter = Router();
const controller = new CatalogoController();

catalogoRouter.use(requireAuth);

catalogoRouter.get("/clientes", controller.searchClientes);
catalogoRouter.get("/productos", controller.searchProductos);
catalogoRouter.get("/agentes", controller.listAgentes);

export default catalogoRouter;

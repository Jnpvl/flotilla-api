import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const authRouter = Router();
const authController = new AuthController();

authRouter.post("/login", authController.login);
authRouter.get("/me", requireAuth, authController.me);

export default authRouter;

import { Router } from "express";
import { register, login } from "../controllers/authController.js";

const router = Router();

// Tenant middleware BYPASS — bu endpoint'ler API key gerektirmez
router.post("/register", register);
router.post("/login",    login);

export default router;

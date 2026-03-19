import { Router } from "express";
import { getSecurityStatus } from "../controllers/securityController.js";

const router = Router();
router.get("/status", getSecurityStatus);

export default router;

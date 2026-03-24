import { Router } from "express";
import { getTenantConfig, updateTenantConfig, updateTenantIntegrations } from "../controllers/tenantController.js";

const router = Router();

router.get("/config",        getTenantConfig);
router.put("/config",        updateTenantConfig);
router.put("/integrations",  updateTenantIntegrations);

export default router;

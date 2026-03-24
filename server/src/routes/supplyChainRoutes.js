import { Router } from "express";
import { getSupplySummary, getSupplyAlerts, getSupplyDetail, approveOrder } from "../controllers/supplyChainController.js";

const router = Router();

router.get("/summary", getSupplySummary);
router.get("/alerts", getSupplyAlerts);
router.get("/:threadId", getSupplyDetail);
router.post("/approve/:threadId", approveOrder);

export default router;

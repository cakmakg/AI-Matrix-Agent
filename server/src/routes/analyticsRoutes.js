import { Router } from "express";
import {
    getFinanceAnalytics,
    getSupportAnalytics,
    getSocialAnalytics,
    getStrategyAnalytics,
    getSupplyAnalytics,
    getEngineeringAnalytics,
} from "../controllers/analyticsController.js";

const router = Router();

router.get("/finance", getFinanceAnalytics);
router.get("/support", getSupportAnalytics);
router.get("/social", getSocialAnalytics);
router.get("/strategy", getStrategyAnalytics);
router.get("/supply", getSupplyAnalytics);
router.get("/engineering", getEngineeringAnalytics);

export default router;

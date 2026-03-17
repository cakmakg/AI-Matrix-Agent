import { Router } from "express";

import agentRoutes from "./agentRoutes.js";
import artifactRoutes from "./artifactRoutes.js";
import inboxRoutes from "./inboxRoutes.js";
import approvalRoutes from "./approvalRoutes.js";
import missionRoutes from "./missionRoutes.js";
import supportRoutes from "./supportRoutes.js";
import campaignRoutes from "./campaignRoutes.js";
import financeRoutes from "./financeRoutes.js";
import tenantRoutes from "./tenantRoutes.js";
import knowledgeRoutes from "./knowledgeRoutes.js";
import skillRoutes from "./skillRoutes.js";
import socialRoutes from "./socialRoutes.js";
import { classifyEmail } from "../controllers/classifyController.js";
import { webhookAuth } from "../middleware/webhook.js";

const router = Router();

router.use("/", agentRoutes); // Contains /events, /analyze, /rnd
router.use("/artifact", artifactRoutes);
router.use("/inbox", inboxRoutes);
router.use("/approve", approvalRoutes);
router.use("/missions", missionRoutes);
router.use("/support", supportRoutes);
router.use("/campaign", campaignRoutes);
router.use("/finance", financeRoutes);
router.use("/tenant", tenantRoutes);
router.use("/knowledge", knowledgeRoutes);
router.use("/skills", skillRoutes);
router.use("/social", socialRoutes);
router.post("/classify-email", webhookAuth, classifyEmail);

export default router;

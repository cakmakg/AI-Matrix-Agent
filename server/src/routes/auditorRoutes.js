import { Router } from "express";
import { getAuditSummary, getAuditFindings, getAuditDetail, approveInvoice } from "../controllers/auditorController.js";

const router = Router();

router.get("/summary", getAuditSummary);
router.get("/findings", getAuditFindings);
router.get("/:threadId", getAuditDetail);
router.post("/approve/:threadId", approveInvoice);

export default router;

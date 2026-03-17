import { Router } from "express";
import {
    getAccounts,
    connectAccount,
    disconnectAccount,
    syncAccount,
    getAnalytics,
    getPosts,
    createPost,
    cancelPost,
    publishNow,
    getSummary,
} from "../controllers/socialController.js";

const router = Router();

// ── Accounts ──
router.get("/accounts", getAccounts);
router.post("/accounts/connect", connectAccount);
router.delete("/accounts/:id", disconnectAccount);
router.post("/accounts/:id/sync", syncAccount);
router.get("/accounts/:id/analytics", getAnalytics);

// ── Scheduled Posts ──
router.get("/posts", getPosts);
router.post("/posts", createPost);
router.delete("/posts/:id", cancelPost);
router.post("/posts/:id/publish", publishNow);

// ── Summary ──
router.get("/summary", getSummary);

export default router;

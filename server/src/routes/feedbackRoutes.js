import { Router } from "express";
import { submitFeedback, getNegativeFeedbacks } from "../controllers/feedbackController.js";

const router = Router();

router.post("/", submitFeedback);
router.get("/negative", getNegativeFeedbacks);

export default router;

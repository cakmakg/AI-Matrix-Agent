import { Router } from "express";
import { getAllPrompts, updatePrompt, resetPrompt } from "../controllers/promptController.js";

const router = Router();

router.get("/",           getAllPrompts);
router.put("/:agent",     updatePrompt);
router.delete("/:agent",  resetPrompt);

export default router;

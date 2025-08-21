// apps/api/routes/generateRoutes.js
import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireEmailCredit } from "../middleware/credits.js";
import { generateEmails } from "../controllers/generateController.js";
import { maybeConsumeImageCredit } from "../middleware/credits.js";

const router = Router();

// POST /api/generate
router.post("/", requireAuth, maybeConsumeImageCredit, requireEmailCredit, generateEmails);

export default router;

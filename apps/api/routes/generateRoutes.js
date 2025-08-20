// apps/api/routes/generateRoutes.js
import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireEmailCredit } from "../middleware/credits.js";
import { generateEmails } from "../controllers/generateController.js";

const router = Router();

// POST /api/generate
router.post("/", requireAuth, requireEmailCredit, generateEmails);

export default router;

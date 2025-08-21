import { Router } from "express";
import { listMyImagesByDomain } from "../controllers/imagesController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// GET /api/images?domain=example.com
router.get("/images", requireAuth, listMyImagesByDomain);

export default router;

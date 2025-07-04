import express from "express";
import { generateEmails } from "../controllers/generateController.js";

const router = express.Router();

router.post("/", generateEmails);

export default router;

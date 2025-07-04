import express from "express";
import { checkBrand } from "../controllers/brandController.js";

const router = express.Router();

router.post("/check", checkBrand);

export default router;

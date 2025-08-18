import express from "express";
import { scrapeProducts } from "../controllers/productController.js";

const router = express.Router();

router.post("/scrape", scrapeProducts);

export default router;

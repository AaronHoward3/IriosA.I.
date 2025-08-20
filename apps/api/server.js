import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import brandRoutes from "./routes/brandRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import generateRoutes from "./routes/generateRoutes.js";

// ⬇️ new: billing
import billingRoutes from "./routes/billingRoutes.js";
import { stripeWebhook } from "./controllers/billingController.js";

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ ENV check summary
console.log("🔐 API Keys:");
console.log(`- BRANDDEV_API_KEY: ${!!process.env.BRANDDEV_API_KEY ? "✅ yes" : "❌ no"}`);
console.log(`- OPENAI_API_KEY: ${!!process.env.OPENAI_API_KEY ? "✅ yes" : "❌ no"}`);
console.log(`- STRIPE_SECRET_KEY: ${!!process.env.STRIPE_SECRET_KEY ? "✅ yes" : "❌ no"}`);
console.log(`- STRIPE_WEBHOOK_SECRET: ${!!process.env.STRIPE_WEBHOOK_SECRET ? "✅ yes" : "❌ no"}`);

// ⚠️ Webhook must receive the RAW body (before express.json):
app.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  (req, res) => {
    req.rawBody = req.body; // expose the raw bytes to the controller for signature verification
    stripeWebhook(req, res);
  }
);

// ✅ Normal middleware for the rest
app.use(cors());
app.use(express.json());

// ✅ Routes
app.use("/api/brand", brandRoutes);
app.use("/api/products", productRoutes);
app.use("/api/generate", generateRoutes);
app.use("/api", billingRoutes); // ⬅️ new

// ✅ Log available endpoints
console.log("\n📡 Available Routes:");
console.log("- POST /api/brand/check");
console.log("- POST /api/products/scrape");
console.log("- POST /api/generate");
console.log("- POST /api/billing/checkout"); // ⬅️ new
console.log("- POST /api/billing/portal");   // ⬅️ new
console.log("- POST /webhooks/stripe");      // ⬅️ new (raw body)");

// ✅ Server confirmation
app.listen(PORT, () => {
  console.log(`\n🚀 Orchestrator running on http://localhost:${PORT}`);
});

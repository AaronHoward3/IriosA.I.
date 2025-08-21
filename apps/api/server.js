import express from "express";
import cors from "cors";
import creditsRoutes from "./routes/creditsRoutes.js";
import imagesRoutes from "./routes/imagesRoutes.js";
import dotenv from "dotenv";
dotenv.config();

// ---- Derive a valid CLIENT_URL (must include scheme for Stripe) ----
const DEFAULT_CLIENT_URL = "http://localhost:5173";
let clientUrl = (process.env.CLIENT_URL || "").trim();
if (!clientUrl) {
  console.warn(`[API] CLIENT_URL not set. Defaulting to ${DEFAULT_CLIENT_URL}`);
  clientUrl = DEFAULT_CLIENT_URL;
}
// If the user put "localhost:5173" or "myapp.com", add scheme:
if (!/^https?:\/\//i.test(clientUrl)) {
  console.warn(`[API] CLIENT_URL missing scheme. Prefixing with http:// -> ${clientUrl}`);
  clientUrl = `http://${clientUrl}`;
}
// Persist the normalized value so controllers (billing) use a valid URL:
process.env.CLIENT_URL = clientUrl;

import brandRoutes from "./routes/brandRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import generateRoutes from "./routes/generateRoutes.js";

// billing
import billingRoutes from "./routes/billingRoutes.js";
import { stripeWebhook } from "./controllers/billingController.js";

const app = express();
const PORT = process.env.PORT || 3001;

// ---- Env summary ----
console.log("🔐 API Keys / Config:");
console.log(`- BRANDDEV_API_KEY: ${process.env.BRANDDEV_API_KEY ? "✅ yes" : "❌ no"}`);
console.log(`- OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? "✅ yes" : "❌ no"}`);
console.log(`- STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? "✅ yes" : "❌ no"}`);
console.log(`- STRIPE_WEBHOOK_SECRET: ${process.env.STRIPE_WEBHOOK_SECRET ? "✅ yes" : "❌ no"}`);
console.log(`- CLIENT_URL: ${process.env.CLIENT_URL}`);

// ---- Stripe webhook must receive the RAW body (before express.json) ----
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), (req, res) => {
  // Keep the raw Buffer for signature verification in controller
  req.rawBody = req.body;
  stripeWebhook(req, res);
});

// ---- Normal middleware for the rest ----
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// ---- Routes ----
app.use("/api/brand", brandRoutes);
app.use("/api/products", productRoutes);
app.use("/api/generate", generateRoutes);
app.use("/api", billingRoutes);
app.use("/api", creditsRoutes);
app.use("/api", imagesRoutes);

// ---- Route list ----
console.log("\n📡 Available Routes:");
console.log("- POST /api/brand/check");
console.log("- POST /api/products/scrape");
console.log("- POST /api/generate");
console.log("- POST /api/billing/checkout");
console.log("- POST /api/billing/portal");
console.log("- POST /webhooks/stripe (raw body)");

// ---- Start server ----
app.listen(PORT, () => {
  console.log(`\n🚀 Orchestrator running on http://localhost:${PORT}`);
  console.log(`🌐 Allowing frontend origin: ${process.env.CLIENT_URL}`);
});

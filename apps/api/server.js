import express from "express";
import cors from "cors";
import brandRoutes from "./routes/brandRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import generateRoutes from "./routes/generateRoutes.js";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ ENV check summary
console.log("🔐 API Keys:");
console.log(`- BRANDDEV_API_KEY: ${!!process.env.BRANDDEV_API_KEY ? "✅ yes" : "❌ no"}`);
console.log(`- OPENAI_API_KEY: ${!!process.env.OPENAI_API_KEY ? "✅ yes" : "❌ no"}`);

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Routes
app.use("/api/brand", brandRoutes);
app.use("/api/products", productRoutes);
app.use("/api/generate", generateRoutes);

// ✅ Log available endpoints
console.log("\n📡 Available Routes:");
console.log("- POST /api/brand/check");
console.log("- POST /api/products/scrape");
console.log("- POST /api/generate");

// ✅ Server confirmation
app.listen(PORT, () => {
  console.log(`\n🚀 Orchestrator running on http://localhost:${PORT}`);
});

import { scrapeProductsFromDomain } from "../utils/productScraper.js";

export async function scrapeProducts(req, res) {
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({ error: "Domain is required" });
  }

  try {
    const products = await scrapeProductsFromDomain(domain);
    res.json({ products });
  } catch (err) {
    console.error("Product scrape error:", err.message);
    res.status(500).json({ error: "Failed to scrape products" });
  }
}

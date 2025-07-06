import { normalizeBrandDevToPumaStyle } from "../utils/normalizeBrand.js";
import { scrapeProductsFromDomain } from "../utils/productScraper.js";
import { getStoredBrand, storeBrand } from "../utils/dataStore.js";
import fetch from "node-fetch";

export async function checkBrand(req, res) {
  const { domain } = req.body;

if (!domain) {
  return res.status(400).json({ error: "Domain required" });
}

const normalizedDomain = domain
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

try {
  const existing = await getStoredBrand(normalizedDomain);
  if (existing) {
    console.log(`Returning stored brand for ${normalizedDomain} from disk.`);
    return res.json(existing.brand);
  }

  const response = await fetch(`https://api.brand.dev/v1/brand/retrieve?domain=${normalizedDomain}`, {
    headers: {
      Authorization: `Bearer ${process.env.BRANDDEV_API_KEY}`
    }
  });

  if (!response.ok) {
    console.log("Brand.dev status code:", response.status);
    return res.status(500).json({ error: "brand.dev lookup failed" });
  }

  const brandDevData = await response.json();
  const normalized = normalizeBrandDevToPumaStyle(brandDevData);

  await storeBrand(normalizedDomain, null, normalized);

  console.log(`Stored brand info for ${normalizedDomain}.`);

  res.json(normalized);

} catch (err) {
  console.error("Brand check error:", err.message);
  res.status(500).json({ error: "Failed to check brand" });
}
}
console.log("Brand.dev key being used:", process.env.BRANDDEV_API_KEY);


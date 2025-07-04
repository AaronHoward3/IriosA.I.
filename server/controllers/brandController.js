import { normalizeBrandDevToPumaStyle } from "../utils/normalizeBrand.js";
import { scrapeProductsFromDomain } from "../utils/productScraper.js";
import { getStoredBrand, storeBrand } from "../utils/dataStore.js";
import fetch from "node-fetch";

export async function checkBrand(req, res) {
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({ error: "Domain required" });
  }

  try {
    // check local storage by domain
    const existing = await getStoredBrand(domain);
    if (existing) {
      console.log(`Returning stored brand for ${domain} from disk.`);
      return res.json(existing.brand);
    }

    // if not stored, pull from brand.dev
    const response = await fetch(`https://api.brand.dev/v1/brand/retrieve?domain=${domain}`, {
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

    // store the normalized brand JSON under domain only
    await storeBrand(domain, null, normalized);

    console.log(`Stored brand info for ${domain}.`);

    res.json(normalized);

  } catch (err) {
    console.error("Brand check error:", err.message);
    res.status(500).json({ error: "Failed to check brand" });
  }
}

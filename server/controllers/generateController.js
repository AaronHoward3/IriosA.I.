import { getStoredBrand } from "../utils/dataStore.js";
import fetch from "node-fetch";

export async function generateEmails(req, res) {
  const {
    domain,
    emailType,
    userContext,
    tone,
    customHeroImage,
    products
  } = req.body;

  if (!domain) {
    return res.status(400).json({ error: "Domain is required" });
  }

  try {
    // get stored brand
    const existing = await getStoredBrand(domain);
    if (!existing) {
      return res.status(404).json({ error: "Brand info not found" });
    }

    // the stored brand JSON is already in generator shape:
    const brandJson = structuredClone(existing.brand);

    // inject user options
    brandJson.emailType = emailType || "";
    brandJson.userContext = userContext || "";
    brandJson.tone = tone || "";
    brandJson.brandData.customHeroImage = customHeroImage || false;

    // inject products:
    // only if the user chose to keep them
    if (products && products.length > 0) {
      brandJson.brandData.products = products;
    } else {
      brandJson.brandData.products = [];
    }

    // debug what we're sending
    console.log("---- FINAL JSON TO GENERATOR ----");
    console.log(JSON.stringify(brandJson, null, 2));

    // forward to generator
    const generatorResponse = await fetch(process.env.GENERATOR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(brandJson)
    });

    if (!generatorResponse.ok) {
      console.log("Generator server error code:", generatorResponse.status);
      return res.status(500).json({ error: "Email generator failed" });
    }

    const generatedEmails = await generatorResponse.json();
    res.json(generatedEmails);

  } catch (err) {
    console.error("Generate error:", err.message);
    res.status(500).json({ error: "Failed to generate emails" });
  }
}

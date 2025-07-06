import { getStoredBrand } from "../utils/dataStore.js";
import fetch from "node-fetch";
import mjml2html from "mjml";

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
    // look up stored brand JSON
    const existing = await getStoredBrand(domain);
    if (!existing) {
      return res.status(404).json({ error: "Brand info not found" });
    }

    // clone the brand baseline
    const brandJson = structuredClone(existing.brand);

    // inject user inputs
    brandJson.emailType = emailType || "";
    brandJson.userContext = userContext || "";
    brandJson.tone = tone || "";
    brandJson.brandData.customHeroImage = customHeroImage ?? true;
    brandJson.brandData.products = products ?? [];

    // log the final JSON we send
    console.log("---- FINAL JSON TO GENERATOR ----");
    console.log(JSON.stringify(brandJson, null, 2));

    // forward to the generator server
    const generatorResponse = await fetch(process.env.GENERATOR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(brandJson),
    });

    if (!generatorResponse.ok) {
      console.log("Generator server error code:", generatorResponse.status);
      return res
        .status(500)
        .json({ error: "Email generator failed", status: generatorResponse.status });
    }

    const generated = await generatorResponse.json();

    // convert each MJML to HTML for preview
    const htmlEmails = generated.emails.map((email) => {
      const html = mjml2html(email.content);
      return {
        ...email,
        html: html.html
      };
    });

    res.json({
      success: true,
      totalTokens: generated.totalTokens,
      emails: htmlEmails
    });

  } catch (err) {
    console.error("Generate error:", err.message);
    res.status(500).json({ error: "Failed to generate emails" });
  }
}

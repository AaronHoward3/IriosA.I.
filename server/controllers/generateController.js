// server/controllers/generateController.js

import { getStoredBrand } from "../utils/dataStore.js";
import fetch from "node-fetch";
import mjml2html from "mjml";

export async function generateEmails(req, res) {
  const {
    domain,
    emailType,
    userContext,
    imageContext,
    tone,
    customHeroImage,
    designAesthetic,
    products,
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
    brandJson.imageContext = imageContext || "";
    brandJson.tone = tone || "";
    brandJson.designAesthetic = designAesthetic || "";
    brandJson.brandData = brandJson.brandData || {};
    brandJson.brandData.customHeroImage = customHeroImage ?? true;
    brandJson.brandData.products = products ?? [];

    // forward to the generator server
    const generatorResponse = await fetch(process.env.GENERATOR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(brandJson),
    });

    if (!generatorResponse.ok) {
      console.log("Generator server error code:", generatorResponse.status);
      return res.status(500).json({
        error: "Email generator failed",
        status: generatorResponse.status,
      });
    }

    const generated = await generatorResponse.json();
    // Expecting something like:
    // {
    //   subjectLine: "Score Big This 4th of July with 50% Off!",
    //   emails: [{ index, subject?, content (MJML) }]
    // }

    // Convert each MJML to HTML for preview and keep original fields (subject, index, content)
    const htmlEmails = (generated.emails || []).map((email) => {
      const compiled = mjml2html(email.content || "");
      return {
        ...email,                  // 👈 keep subject/index/content coming from generator
        html: compiled.html || "", // compiled HTML for preview
      };
    });

    // 🚀 IMPORTANT: include the subjectLine from the generator
    res.json({
      success: true,
      subjectLine:
        generated.subjectLine ||
        generated.subject ||           // tolerate different naming
        (htmlEmails[0]?.subject ?? ""),// last resort: first email subject
      totalTokens: generated.totalTokens,
      emails: htmlEmails,
    });
  } catch (err) {
    console.error("Generate error:", err.message);
    res.status(500).json({ error: "Failed to generate emails" });
  }
}

import { getStoredBrand } from "../utils/dataStore.js";
import mjml2html from "mjml";
import path from "node:path";
import fs from "node:fs/promises";

function normalizeDomain(input) {
  return (input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

const COLOR_KEYS = [
  "primary_color",
  "link_color",
  "header_color",
  "body_color",
  "text_color",
  "button_color",
  "button_text_color",
  "button_border_color",
];

function pickColors(obj = {}) {
  const out = {};
  for (const k of COLOR_KEYS) {
    if (obj[k]) out[k] = obj[k];
  }
  return out;
}

function resolveEffectiveColors(brandJson) {
  const bd = brandJson?.brandData || {};
  const top = pickColors(brandJson);
  const under = pickColors(bd);
  const resolved = {};
  for (const k of COLOR_KEYS) {
    resolved[k] = top[k] ?? under[k] ?? null;
  }
  return { top, under, resolved };
}

export async function generateEmails(req, res) {
  const startTime = Date.now();
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
    const normalizedDomain = normalizeDomain(domain);
    const existing = await getStoredBrand(normalizedDomain);
    if (!existing?.brand) {
      return res.status(404).json({ error: "Brand info not found for domain", domain: normalizedDomain });
    }

    const brandJson = structuredClone(existing.brand);
    brandJson.emailType = emailType || "";
    brandJson.userContext = userContext || "";
    brandJson.imageContext = imageContext || "";
    brandJson.tone = tone || "";
    brandJson.designAesthetic = designAesthetic || "";
    brandJson.brandData = brandJson.brandData || {};
    brandJson.brandData.customHeroImage = customHeroImage ?? true;
    brandJson.brandData.products = Array.isArray(products)
      ? products
      : (brandJson.brandData.products || []);

    for (const key of COLOR_KEYS) {
      if (brandJson.brandData[key]) {
        brandJson[key] = brandJson.brandData[key];
      }
    }

    brandJson.theme = {
      ...(brandJson.theme || {}),
      primaryColor: brandJson.primary_color,
      linkColor: brandJson.link_color,
    };
    brandJson.styles = {
      ...(brandJson.styles || {}),
      primary_color: brandJson.primary_color,
      link_color: brandJson.link_color,
    };

    const { top, under, resolved } = resolveEffectiveColors(brandJson);
    console.log("[generateController] colors -> brandData:", under);
    console.log("[generateController] colors -> top-level:", top);
    console.log("[generateController] colors -> resolved:", resolved);

    brandJson.debug = {
      ...(brandJson.debug || {}),
      effectiveColors: resolved,
      designAesthetic: brandJson.designAesthetic,
      emailType: brandJson.emailType,
    };

    if (process.env.LOG_GENERATOR_PAYLOAD === "1") {
      try {
        const outPath = path.join(process.cwd(), "__debug_last_generator_payload.json");
        await fs.writeFile(outPath, JSON.stringify(brandJson, null, 2), "utf8");
        console.log(`[generateController] wrote payload to ${outPath}`);
      } catch (e) {
        console.warn("[generateController] failed to write payload:", e.message);
      }
    }

    console.log("[generateController] Forwarding to Generator V2...");
    const genStart = Date.now();
    const generatorResponse = await fetch(process.env.GENERATOR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(brandJson),
    });
    console.log(`[generateController] Generator responded in ${Date.now() - genStart} ms`);

    if (!generatorResponse.ok) {
      console.log("Generator server error code:", generatorResponse.status);
      return res.status(500).json({ error: "Email generator failed", status: generatorResponse.status });
    }

    const generated = await generatorResponse.json();

    const htmlEmails = (generated.emails || []).map((email) => {
      const compiled = mjml2html(email.content || "");
      let html = compiled.html || "";
      if (process.env.DEBUG_COLORS === "1") {
        const comment = `<!-- DEBUG_COLORS primary=${resolved.primary_color} link=${resolved.link_color} designAesthetic=${brandJson.designAesthetic} -->`;
        html = comment + "\n" + html;
      }
      return { ...email, html };
    });

    console.log(`[generateController] Total request time: ${Date.now() - startTime} ms`);
    return res.json({
      success: true,
      subjectLine: generated.subjectLine || generated.subject || (htmlEmails[0]?.subject ?? ""),
      totalTokens: generated.totalTokens,
      emails: htmlEmails,
      debug: { colorsSent: resolved },
    });
  } catch (err) {
    console.error("Generate error:", err);
    return res.status(500).json({ error: "Failed to generate emails" });
  }
}

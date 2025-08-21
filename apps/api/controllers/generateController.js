import { getStoredBrand } from "../utils/dataStore.js";
import mjml2html from "mjml";
import path from "node:path";
import fs from "node:fs/promises";
import { storeUserImageFromUrl, storeUserImageFromDataUrl } from "./imagesController.js";

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
  for (const k of COLOR_KEYS) if (obj[k]) out[k] = obj[k];
  return out;
}

function resolveEffectiveColors(brandJson) {
  const bd = brandJson?.brandData || {};
  const top = pickColors(brandJson);
  const under = pickColors(bd);
  const resolved = {};
  for (const k of COLOR_KEYS) resolved[k] = top[k] ?? under[k] ?? null;
  return { top, under, resolved };
}

// Pull a likely hero image URL from several places (MJML and compiled HTML)
function extractHeroUrl({ generated, headerHero, mjml, html }) {
  const candidates = [];

  // 1) Direct signals
  if (typeof generated?.heroImageUrlUsed === "string") candidates.push(generated.heroImageUrlUsed);
  if (typeof headerHero === "string") candidates.push(headerHero);

  // 2) MJML-side clues (before compile)
  if (typeof mjml === "string" && mjml) {
    // <mj-section background-url="..."> / <mj-hero background-url="...">
    const bgAttr = mjml.match(/background-url=["']([^"']+)["']/i);
    if (bgAttr?.[1]) candidates.push(bgAttr[1]);

    // Legacy MJML background="https://..."
    const bgAttr2 = mjml.match(/\bbackground=["'](https?:\/\/[^"']+)["']/i);
    if (bgAttr2?.[1]) candidates.push(bgAttr2[1]);

    // Inline CSS url(...)
    const cssUrl = mjml.match(/url\((['"]?)(https?:\/\/[^'")]+)\1\)/i);
    if (cssUrl?.[2]) candidates.push(cssUrl[2]);

    // Any <img src="..."> in MJML
    const imgMj = mjml.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMj?.[1]) candidates.push(imgMj[1]);

    // Data attributes sometimes used by templates
    const dataBg = mjml.match(/\bdata-(?:bg|background|background-image)=["'](https?:\/\/[^"']+)["']/i);
    if (dataBg?.[1]) candidates.push(dataBg[1]);
  }

  // 3) Compiled HTML-side clues (after mjml2html)
  if (typeof html === "string" && html) {
    // First <img src="...">
    const imgHtml = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgHtml?.[1]) candidates.push(imgHtml[1]);

    // CSS background-image: url(...)
    const cssHtml = html.match(/background(?:-image)?:\s*url\((['"]?)(https?:\/\/[^'")]+)\1\)/i);
    if (cssHtml?.[2]) candidates.push(cssHtml[2]);

    // HTML attribute background="https://..."
    const htmlBgAttr = html.match(/\bbackground=["'](https?:\/\/[^"']+)["']/i);
    if (htmlBgAttr?.[1]) candidates.push(htmlBgAttr[1]);

    // Outlook VML: <v:fill src="https://...">
    const vmlFill = html.match(/<v:fill[^>]+src=["'](https?:\/\/[^"']+)["']/i);
    if (vmlFill?.[1]) candidates.push(vmlFill[1]);

    // srcset (take the first URL)
    const srcset = html.match(/\bsrcset=["']([^"']+)["']/i);
    if (srcset?.[1]) {
      const first = srcset[1].split(",")[0]?.trim().split(" ")[0];
      if (first) candidates.push(first);
    }
  }

  // Filter placeholders / invalids / duplicates
  const seen = new Set();
  for (const u of candidates) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    if (/CUSTOMHEROIMAGE\.COM|SAVEDHEROIMAGE\.COM/i.test(u)) continue;
    if (!/^https?:\/\//i.test(u) && !String(u).startsWith("data:")) continue;
    return u;
  }
  return null;
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
    savedHeroImageUrl, // pass-through for reusing a saved image
    savedHeroImageId,  // reserved for future id->url resolution
  } = req.body || {};

  if (!domain) return res.status(400).json({ error: "Domain is required" });

  try {
    const normalizedDomain = normalizeDomain(domain);
    const existing = await getStoredBrand(normalizedDomain);
    if (!existing?.brand) {
      return res.status(404).json({ error: "Brand info not found for domain", domain: normalizedDomain });
    }

    // Build payload for generator
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

    // Forward saved image to generator -> it will inject and skip generating
    if (typeof savedHeroImageUrl === "string" && /^https?:\/\//i.test(savedHeroImageUrl.trim())) {
      brandJson.savedHeroImageUrl = savedHeroImageUrl.trim();
      // When reusing, we don't need a new custom hero
      brandJson.brandData.customHeroImage = false;
    }

    // propagate colors to top-level for back-compat
    for (const key of COLOR_KEYS) if (brandJson.brandData[key]) brandJson[key] = brandJson.brandData[key];

    const { top, under, resolved } = resolveEffectiveColors(brandJson);
    brandJson.theme = { ...(brandJson.theme || {}), primaryColor: brandJson.primary_color, linkColor: brandJson.link_color };
    brandJson.styles = { ...(brandJson.styles || {}), primary_color: brandJson.primary_color, link_color: brandJson.link_color };
    brandJson.debug = { ...(brandJson.debug || {}), effectiveColors: resolved, designAesthetic: brandJson.designAesthetic, emailType: brandJson.emailType };

    if (process.env.LOG_GENERATOR_PAYLOAD === "1") {
      try {
        const outPath = path.join(process.cwd(), "__debug_last_generator_payload.json");
        await fs.writeFile(outPath, JSON.stringify(brandJson, null, 2), "utf8");
        console.log(`[generateController] wrote payload to ${outPath}`);
      } catch (e) {
        console.warn("[generateController] failed to write payload:", e.message);
      }
    }

    // ---- Call Generator ----
    console.log("[generateController] Forwarding to Generator...");
    const genStart = Date.now();
    const generatorResponse = await fetch(process.env.GENERATOR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(brandJson),
    });
    console.log(`[generateController] Generator responded in ${Date.now() - genStart} ms`);

    if (!generatorResponse.ok) {
      console.log("Generator server error code:", generatorResponse.status);
      return res.status(500).json({ error: "Email generator failed", status: generatorResponse.status });
    }

    const headerHero = generatorResponse.headers.get("x-hero-image-url-used") || null;
    const generated = await generatorResponse.json();

    // Compile MJML -> HTML
    const htmlEmails = (generated.emails || []).map((email) => {
      const compiled = mjml2html(email.content || "");
      let html = compiled.html || "";
      if (process.env.DEBUG_COLORS === "1") {
        const cmt = `<!-- DEBUG_COLORS primary=${resolved.primary_color} link=${resolved.link_color} designAesthetic=${brandJson.designAesthetic} -->`;
        html = cmt + "\n" + html;
      }
      return { ...email, html };
    });

    // ===== Persist the image actually used =====
    let savedHero = null;
    try {
      const uid = req.user?.id; // requireAuth sets this
      const mjml = htmlEmails?.[0]?.content || generated?.emails?.[0]?.content || "";
      const html = htmlEmails?.[0]?.html || "";
      const urlToStore = extractHeroUrl({ generated, headerHero, mjml, html });

      console.log("[generateController] hero capture:", {
        hasUser: !!uid,
        domain: normalizedDomain,
        headerHero,
        hadExplicit: !!generated?.heroImageUrlUsed,
        foundFrom: urlToStore ? "extracted" : "none",
        urlPreview: urlToStore ? String(urlToStore).slice(0, 80) : null,
      });

      if (uid && normalizedDomain && urlToStore) {
        if (urlToStore.startsWith("data:")) {
          savedHero = await storeUserImageFromDataUrl({ userId: uid, domain: normalizedDomain, dataUrl: urlToStore });
        } else if (/^https?:\/\//i.test(urlToStore)) {
          savedHero = await storeUserImageFromUrl({ userId: uid, domain: normalizedDomain, url: urlToStore });
        }
      }
    } catch (e) {
      console.warn("Hero image save skipped:", e?.message || e);
    }
    // ==========================================

    console.log(`[generateController] Total request time: ${Date.now() - startTime} ms`);
    return res.json({
      success: true,
      subjectLine: generated.subjectLine || generated.subject || (htmlEmails[0]?.subject ?? ""),
      totalTokens: generated.totalTokens,
      emails: htmlEmails,
      savedHeroImage: savedHero ? { id: savedHero.id, url: savedHero.public_url } : null,
      heroImageUrlUsed: generated?.heroImageUrlUsed || headerHero || null,
      usedImageSource: generated?.heroImageUrlUsed ? (savedHeroImageUrl ? "saved" : "generated") : null,
      debug: { colorsSent: resolved },
    });
  } catch (err) {
    console.error("Generate error:", err);
    return res.status(500).json({ error: "Failed to generate emails" });
  }
}

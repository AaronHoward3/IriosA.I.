import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapeProductsFromDomain(domain) {
  try {
    const scrapingbeeApiKey = process.env.SCRAPINGBEE_API_KEY;
    const url = `https://${domain}`;

    console.log("Scraping from:", url);

    const response = await axios.get(
      `https://app.scrapingbee.com/api/v1/`,
      {
        params: {
          api_key: scrapingbeeApiKey,
          url: url,
          render_js: false
        },
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      }
    );

    const html = response.data;
    const $ = cheerio.load(html);

    let products = [];

    // Platform detection
    const generatorMeta = $('meta[name="generator"]').attr("content") || "";
    const isShopify = generatorMeta.toLowerCase().includes("shopify");
    const isWoo = generatorMeta.toLowerCase().includes("woocommerce");

    console.log(`Detected platform: ${isShopify ? "Shopify" : isWoo ? "WooCommerce" : "Unknown"}`);

    if (isShopify) {
      // Shopify products are usually under /products/ links
      $('a[href*="/products/"]').each((i, el) => {
        if (products.length >= 3) return;
        const link = $(el).attr("href");
        const name = $(el).find("img").attr("alt") || $(el).text().trim();
        const image = $(el).find("img").attr("src");

        console.log("Shopify candidate:", { name, link, image });

        if (link && image && name && name.length > 2) {
          products.push({
            name,
            url: link.startsWith("http") ? link : `https://${domain}${link}`,
            image_url: image.startsWith("http") ? image : `https:${image}`,
            description: ""
          });
        }
      });
    } else if (isWoo) {
      // WooCommerce usually has product classes
      $(".product a").each((i, el) => {
        if (products.length >= 3) return;
        const link = $(el).attr("href");
        const name = $(el).find("h2").text().trim() || $(el).text().trim();
        const image = $(el).find("img").attr("src");

        console.log("Woo candidate:", { name, link, image });

        if (link && image && name && name.length > 2) {
          products.push({
            name,
            url: link.startsWith("http") ? link : `https://${domain}${link}`,
            image_url: image.startsWith("http") ? image : `https:${image}`,
            description: ""
          });
        }
      });
    }

    if (products.length === 0) {
      // fallback to best-effort generic
      $("a:has(img)").each((i, el) => {
        if (products.length >= 3) return;
        const link = $(el).attr("href");
        const name = $(el).find("img").attr("alt") || $(el).text().trim();
        const image = $(el).find("img").attr("src");

        console.log("Generic fallback candidate:", { name, link, image });

        if (link && image && name && name.length > 2) {
          products.push({
            name,
            url: link.startsWith("http") ? link : `https://${domain}${link}`,
            image_url: image.startsWith("http") ? image : `https:${image}`,
            description: ""
          });
        }
      });
    }

    console.log("Final products:", products);
    return products;

  } catch (err) {
    console.error("Scraper error:", err.message);
    return [];
  }
}

// apps/api/scripts/import-brands.mjs
import 'dotenv/config';
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running import.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DATA_FILE = path.join(__dirname, "../data/brands.json");

async function run() {
  let data = {};
  try {
    data = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
  } catch (e) {
    console.error("No brands.json found or unreadable at:", DATA_FILE);
    process.exit(0);
  }

  const domains = Object.keys(data);
  if (domains.length === 0) {
    console.log("No brands to import.");
    return;
  }

  console.log(`Importing ${domains.length} domains to Supabase brand_cache...`);

  for (const domain of domains) {
    const entry = data[domain];
    const brand = entry?.brand || null;
    if (!brand) continue;

    const primary_color =
      brand?.primary_color ??
      brand?.brandData?.primary_color ??
      null;

    const link_color =
      brand?.link_color ??
      brand?.brandData?.link_color ??
      null;

    const store_id = brand?.brandData?.store_id ?? null;

    const row = {
      domain: String(domain).trim().toLowerCase(),
      normalized: brand,
      primary_color,
      link_color,
      store_id,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("brand_cache").upsert(row);
    if (error) {
      console.error("Upsert error for", domain, error.message);
    } else {
      console.log("Imported", domain);
    }
  }

  console.log("Done.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

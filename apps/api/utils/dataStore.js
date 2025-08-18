import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "../data/brands.json");

export async function getStoredBrand(domain) {
  try {
    const data = JSON.parse(await readFile(DATA_FILE, "utf8"));
    return data[domain] || null;
  } catch (e) {
    return null; // no file yet
  }
}

export async function storeBrand(domain, userId, brandJson) {
  let data = {};
  try {
    data = JSON.parse(await readFile(DATA_FILE, "utf8"));
  } catch (e) {
    // no file, ok to start fresh
  }

  data[domain] = {
    userId,
    brand: brandJson,
    updatedAt: new Date().toISOString()
  };

  await writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

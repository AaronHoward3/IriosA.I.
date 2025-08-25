// apps/generator/src/services/imageUploadService.js
// Supabase-only uploader for hero images.
// Usage (unchanged):
//   import { uploadImage } from "./imageUploadService.js";
//   const url = await uploadImage(imageBuffer, `hero-${Date.now()}.png`, storeSlug);

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const BUCKET = process.env.SUPABASE_IMAGES_BUCKET || "hero_images";
const DEFAULT_SIGN_SECONDS = 60 * 60 * 24 * 365; // 1 year

function getSupabase() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL; // tolerate alt naming in local envs
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY; // accept either name

  if (!url || !key) {
    throw new Error(
      "[GEN] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Set these on the generator service (or in apps/generator/.env for dev)."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
    global: { headers: { "x-application-name": "irios-generator" } },
  });
}

function randomHex(n = 8) {
  return crypto.randomBytes(n).toString("hex");
}

function sanitizeSegment(s = "brand") {
  return String(s).trim().toLowerCase().replace(/[^a-z0-9-_]/gi, "-").slice(0, 64) || "brand";
}

function inferContentType(filename = "image.png") {
  const f = filename.toLowerCase();
  if (f.endsWith(".png")) return "image/png";
  if (f.endsWith(".jpg") || f.endsWith(".jpeg")) return "image/jpeg";
  if (f.endsWith(".webp")) return "image/webp";
  return "image/png";
}

/**
 * Upload an image to Supabase Storage and return a URL suitable for MJML.
 * - If the bucket is public (recommended), returns a public URL.
 * - If private, returns a long-lived signed URL (default 1 year).
 *
 * @param {Buffer|Uint8Array} imageBuffer
 * @param {string} filename e.g. "hero-123.png"
 * @param {string} storeSlug brand/store slug used for namespacing
 * @param {object} opts
 * @param {boolean} [opts.makePublic=true] prefer public URL if bucket is public
 * @param {number}  [opts.signSeconds=31536000] signed URL expiry (seconds)
 * @param {string}  [opts.contentType] override MIME type
 * @returns {Promise<string>} URL (public or signed)
 */
export async function uploadImage(imageBuffer, filename = `hero-${Date.now()}.png`, storeSlug, opts = {}) {
  const supabase = getSupabase();

  const brand = sanitizeSegment(storeSlug);
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  // Namespace under "gen/" to avoid collisions with existing frontend uploads
  const key = `gen/${brand}/${today}/${randomHex()}/${filename}`;

  const contentType = opts.contentType || inferContentType(filename);
  const makePublic = opts.makePublic ?? true;
  const signSeconds = opts.signSeconds ?? DEFAULT_SIGN_SECONDS;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(key, imageBuffer, {
      contentType,
      upsert: true,
      cacheControl: "31536000",
    });

  if (upErr) {
    throw new Error(`[GEN] Supabase upload failed: ${upErr.message}`);
  }

  // If the bucket is public, prefer a public URL
  const pub = supabase.storage.from(BUCKET).getPublicUrl(key);
  const publicUrl = pub?.data?.publicUrl;

  if (publicUrl && makePublic) {
    return publicUrl;
  }

  // Otherwise generate a long-lived signed URL for private buckets
  const signed = await supabase.storage.from(BUCKET).createSignedUrl(key, signSeconds);
  if (signed.error) {
    throw new Error(`[GEN] Supabase signed URL failed: ${signed.error.message}`);
  }
  return signed.data?.signedUrl;
}

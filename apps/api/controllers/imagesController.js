// apps/api/controllers/imagesController.js
import { supabase } from "../utils/supabaseClient.js";

// normalize domain like your other code
function normDomain(d) {
  return String(d || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

export async function listMyImagesByDomain(req, res) {
  const uid = req.user?.id;
  if (!uid) return res.status(401).json({ error: "Unauthorized" });
  const domain = normDomain(req.query.domain || req.params.domain);
  if (!domain) return res.status(400).json({ error: "domain required" });

  const { data, error } = await supabase
    .from("user_images")
    .select("id, public_url, path, created_at, width, height")
    .eq("user_id", uid)
    .eq("domain", domain)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ images: data || [] });
}

// Helpers used by the generator controller
export async function storeUserImageFromUrl({ userId, domain, url, suggestedExt = "png" }) {
  const d = normDomain(domain);
  const fileName = `${Date.now()}.${suggestedExt}`;
  const objectPath = `${userId}/${d}/${fileName}`;

  // fetch the bytes
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed fetching image: ${resp.status}`);
  const arrayBuf = await resp.arrayBuffer();
  const contentType = resp.headers.get("content-type") || "image/png";

  const { error: upErr } = await supabase.storage
    .from("hero-images")
    .upload(objectPath, Buffer.from(arrayBuf), { contentType, upsert: false });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from("hero-images").getPublicUrl(objectPath);
  const public_url = pub?.publicUrl;

  const { data, error } = await supabase
    .from("user_images")
    .insert({ user_id: userId, domain: d, path: objectPath, public_url })
    .select()
    .single();

  if (error) throw error;
  return data; // { id, ... }
}

export async function storeUserImageFromDataUrl({ userId, domain, dataUrl }) {
  // data:image/png;base64,XXXX
  const match = /^data:(.+?);base64,(.*)$/.exec(dataUrl || "");
  if (!match) throw new Error("Invalid data URL");
  const contentType = match[1] || "image/png";
  const ext = contentType.split("/")[1] || "png";
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");

  const d = normDomain(domain);
  const fileName = `${Date.now()}.${ext}`;
  const objectPath = `${userId}/${d}/${fileName}`;

  const { error: upErr } = await supabase.storage
    .from("hero-images")
    .upload(objectPath, buffer, { contentType, upsert: false });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from("hero-images").getPublicUrl(objectPath);
  const public_url = pub?.publicUrl;

  const { data, error } = await supabase
    .from("user_images")
    .insert({ user_id: userId, domain: d, path: objectPath, public_url })
    .select()
    .single();

  if (error) throw error;
  return data;
}

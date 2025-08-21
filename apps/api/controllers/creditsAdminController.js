// apps/api/controllers/creditsAdminController.js
import { supabase } from "../utils/supabaseClient.js";

const FIELDS = ["emails_remaining", "images_remaining", "revisions_remaining", "brand_limit"];

export async function patchCredits(req, res) {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const body = req.body || {};
  const set = body.set || {};
  const add = body.add || {};

  // Load current row (may be null if not created yet)
  const { data: current } = await supabase
    .from("credits")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const updates = {};
  // Exact set
  for (const f of FIELDS) if (set[f] != null) updates[f] = Number(set[f]);

  // Increment
  if (Object.keys(add).length) {
    const base = current || { emails_remaining: 0, images_remaining: 0, revisions_remaining: 0, brand_limit: 0 };
    for (const f of FIELDS) {
      if (add[f] != null) {
        const val = Number(add[f]);
        updates[f] = (updates[f] ?? Number(base[f] ?? 0)) + val;
      }
    }
  }

  if (!Object.keys(updates).length) return res.status(400).json({ error: "Nothing to change" });

  const row = { user_id: userId, ...updates };
  const { data, error } = await supabase
    .from("credits")
    .upsert(row, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true, balance: data });
}

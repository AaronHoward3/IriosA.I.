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
  const { data: current, error: readErr } = await supabase
    .from("credit_balances")
    .select("emails_remaining,images_remaining,revisions_remaining,brand_limit")
    .eq("user_id", userId)
    .maybeSingle();

  if (readErr) return res.status(500).json({ error: readErr.message });

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

  // Coerce & guard
  for (const k of Object.keys(updates)) {
    const v = Math.floor(Number(updates[k] ?? 0));
    updates[k] = v < 0 ? 0 : v;
  }

  if (!Object.keys(updates).length) return res.status(400).json({ error: "Nothing to change" });

  const row = { user_id: userId, ...updates, updated_at: new Date().toISOString() };

  const { data, error: upErr } = await supabase
    .from("credit_balances")
    .upsert(row, { onConflict: "user_id" })
    .select()
    .maybeSingle();

  if (upErr) return res.status(500).json({ error: upErr.message });
  return res.json({ ok: true, balance: data });
}

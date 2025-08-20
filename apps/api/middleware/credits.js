// apps/api/middleware/credits.js
import { supabase } from "../utils/supabaseClient.js";

export async function requireEmailCredit(req, res, next) {
  try {
    const uid = req.user?.id;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const { data: ok, error } = await supabase.rpc("consume_credits_admin", {
      uid,
      p_emails: 1,
      p_images: 0,
      p_revisions: 0,
      p_reason: "email_generate",
    });

    if (error) return res.status(500).json({ error: error.message });
    if (!ok)   return res.status(402).json({ error: "Not enough email credits" });

    return next();
  } catch (e) {
    return res.status(500).json({ error: e.message || "Credit check failed" });
  }
}

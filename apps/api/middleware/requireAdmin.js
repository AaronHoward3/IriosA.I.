// apps/api/middleware/requireAdmin.js
export function requireAdmin(req, res, next) {
  const key = req.header("x-admin-key");
  if (key && process.env.ADMIN_KEY && key === process.env.ADMIN_KEY) return next();
  return res.status(403).json({ error: "Admin only" });
}

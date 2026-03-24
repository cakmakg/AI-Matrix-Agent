/**
 * 🛡️ MOAT Katman 3c: Admin Authorization Middleware
 * Sadece isAdmin === true olan Client'lar /api/admin/* rotalarına erişebilir.
 */
export function requireAdmin(req, res, next) {
    if (!req.tenant?.client?.isAdmin) {
        console.warn(
            `🚫 Admin erişim reddedildi: ${req.clientId} — ${req.method} ${req.path}`
        );
        return res.status(403).json({ error: "ADMIN_REQUIRED" });
    }
    next();
}

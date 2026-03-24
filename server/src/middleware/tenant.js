import { Client } from "../models/Client.js";
import { TenantConfig } from "../models/TenantConfig.js";

// 🛡️ MOAT Katman 3b: API key'den tanınmayan karakterleri temizle
function sanitizeApiKey(raw) {
    if (!raw || typeof raw !== "string") return null;
    // Sadece alfanumerik, tire, alt çizgi, nokta — max 128 char
    const clean = raw.replace(/[^a-zA-Z0-9\-_.]/g, "").slice(0, 128);
    return clean.length > 0 ? clean : null;
}

// Her request'te tenant (müşteri) context'ini yükler
export async function tenantMiddleware(req, res, next) {
    try {
        // ID'yi alıyoruz — sadece x-api-key header'ından (body/query üzerinden kabul etme)
        const rawKey = req.headers["x-api-key"] || "default";
        const requestApiKey = sanitizeApiKey(rawKey) || "default";

        // 🛡️ MOAT: Bilinmeyen key → auto-create YOK, sadece "default" tenant geçer
        let client = await Client.findOne({
            $or: [{ apiKey: requestApiKey }, { slug: requestApiKey }]
        });

        if (!client) {
            if (requestApiKey !== "default") {
                // Bilinmeyen API key → yetkisiz erişim reddi
                console.warn(`🚫 Bilinmeyen API Key reddedildi: '${requestApiKey}' — ${req.method} ${req.path}`);
                return res.status(401).json({ error: "Geçersiz API anahtarı." });
            }
            // "default" tenant: yalnızca geliştirme ortamında izin ver
            if (process.env.NODE_ENV === "production") {
                console.warn(`🚫 Production ortamında 'default' tenant reddedildi — ${req.method} ${req.path}`);
                return res.status(401).json({ error: "API anahtarı gerekli." });
            }
            // Development: default tenant'ı bul veya oluştur
            client = await Client.findOne({ slug: "default" });
            if (!client) {
                client = await Client.create({ name: "Default Dev Tenant", slug: "default", apiKey: "default", sector: "general" });
                console.warn("⚠️ Development: default tenant oluşturuldu.");
            }
        }

        // 🛡️ MOAT: Askıya alınmış tenant → erişim engelle
        if (client.status === "suspended") {
            console.warn(`🚫 Askıya alınmış tenant reddedildi: ${client.slug} — ${req.method} ${req.path}`);
            return res.status(403).json({
                error: "TENANT_SUSPENDED",
                reason: client.suspendReason || "Hesabınız askıya alınmıştır.",
                suspendedAt: client.suspendedAt,
            });
        }

        // Müşteri bulundu, konfigürasyonunu (TenantConfig) al
        let config = await TenantConfig.findOne({ clientId: client._id });

        if (!config) {
            config = await TenantConfig.create({
                clientId: client._id,
                agentPersona: "Sen yardımcı, profesyonel bir şirket asistanısın. Müşteriye en doğru bilgiyi vermeye odaklan.",
                tone: "Kibar, profesyonel, güven verici",
                enabledSkills: []
            });
        }

        // Context injection
        req.tenant = { client, config };

        // RAG Service vs için kolay bulunabilirlik
        req.clientId = client.slug; // veya client._id kullanabiliriz ama RAG slug veya default ile çalışıyor

        next();
    } catch (err) {
        console.error("❌ tenantMiddleware Hatası:", err.message);
        res.status(500).json({ error: "Tenant processing failed." });
    }
}

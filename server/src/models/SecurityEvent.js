import mongoose from "mongoose";

/**
 * 🛡️ MOAT Güvenlik Olay Kaydı
 * GuardrailNode, ActionWorker ve Rate Limiter tarafından yazılır.
 * Frontend Security paneli bu koleksiyonu okur.
 */
const SecurityEventSchema = new mongoose.Schema({
    eventType: {
        type: String,
        required: true,
        enum: [
            "THREAT_BLOCKED",      // Guardrail: yüksek tehdit, workflow durduruldu
            "THREAT_SANITIZED",    // Guardrail: orta tehdit, sanitize edildi devam etti
            "ACTION_REJECTED",     // ActionWorker: whitelist dışı payload reddedildi
            "RATE_LIMIT_HIT",      // Rate limiter tetiklendi
            "INVALID_API_KEY",     // Tenant middleware: geçersiz API key
        ],
        index: true,
    },

    severity: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        default: "MEDIUM",
        index: true,
    },

    clientId:   { type: String, default: "default", index: true },
    threadId:   { type: String, default: "" },
    agentId:    { type: String, default: "" },       // hangi ajan tetikledi
    sourceIp:   { type: String, default: "" },       // rate limit / auth için
    endpoint:   { type: String, default: "" },       // hangi endpoint

    threatScore: { type: Number, default: 0 },       // 0-10 guardrail skoru
    details:     { type: String, default: "" },      // insan okunabilir açıklama
    rawInput:    { type: String, default: "" },      // ilk 200 char (log için)

    createdAt: { type: Date, default: Date.now, index: true },
}, { timestamps: false });

// Son 1000 olay tutulsun (TTL index: 7 gün)
SecurityEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const SecurityEvent = mongoose.model("SecurityEvent", SecurityEventSchema);

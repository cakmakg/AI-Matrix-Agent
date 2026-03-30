/**
 * 🛡️ MOAT LAYER 3: Rate Limiting & Hız Simetrisi
 *
 * Endpoint riskine göre katmanlı limitler:
 *
 *  globalLimiter    — Tüm /api/* için genel koruma (IP bazlı)
 *  workflowLimiter  — /api/analyze, /api/rnd  (pahalı LLM çağrıları)
 *  approveLimiter   — /api/approve            (HITL manipülasyon koruması)
 *  socialLimiter    — /api/social/*           (sosyal medya API rate abuse)
 *  knowledgeLimiter — /api/knowledge/*        (RAG embedding pahalı)
 *
 * Key stratejisi:
 *  - Tenant API key varsa → tenant başına limit (clientId bazlı)
 *  - Yoksa → IP bazlı limit
 *
 * Tüm aşımlar konsola ve response'a loglanır.
 */

import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { bannedIPCache } from "../services/bannedIPCacheService.js";

// ─── Key Üretici ────────────────────────────────────────────────────────────
// Önce tenant (API key) bazlı, yoksa IPv6-safe IP bazlı
function tenantOrIpKey(req) {
    const apiKey = req.headers["x-api-key"] || req.body?.clientId || req.query?.clientId;
    if (apiKey && apiKey !== "default") return `tenant:${apiKey}`;
    return `ip:${ipKeyGenerator(req)}`;
}

// ─── Standart Handler ────────────────────────────────────────────────────────
function limitReachedHandler(limitName) {
    return (req, res) => {
        const key = tenantOrIpKey(req);
        console.warn(`🚫 RATE LIMIT aşıldı [${limitName}] — Key: ${key} — ${req.method} ${req.path}`);
        res.status(429).json({
            error: "Çok fazla istek. Lütfen bekleyin.",
            retryAfter: res.getHeader("Retry-After"),
            limitName,
        });
    };
}

// ─── 🛡️ Banned IP Middleware ────────────────────────────────────────────────
// In-memory Set kontrolü — O(1), her istekte rate limiter'dan ÖNCE çalışır
export function bannedIPMiddleware(req, res, next) {
    const clientIP = ipKeyGenerator(req);
    if (bannedIPCache.has(clientIP)) {
        console.warn(`🚫 BANNED IP bloklandı: ${clientIP} — ${req.method} ${req.path}`);
        return res.status(403).json({ error: "Erişim engellendi." });
    }
    next();
}

// ─── 1. Global Limiter (tüm /api/*) ─────────────────────────────────────────
// 1 dakikada 120 istek — DDoS temel koruması
export const globalLimiter = rateLimit({
    windowMs: 60 * 1000,          // 1 dakika
    max: 120,
    keyGenerator: tenantOrIpKey,
    standardHeaders: true,
    legacyHeaders: false,
    handler: limitReachedHandler("global"),
});

// ─── 2. Workflow Limiter (/api/analyze, /api/rnd) ───────────────────────────
// AWS Bedrock çağrıları pahalı — dakikada 10, saatte 100
export const workflowLimiter = rateLimit({
    windowMs: 60 * 1000,          // 1 dakika
    max: 10,
    keyGenerator: tenantOrIpKey,
    standardHeaders: true,
    legacyHeaders: false,
    handler: limitReachedHandler("workflow"),
    message: { error: "Dakikada en fazla 10 workflow başlatılabilir." },
});

// ─── 3. Approve Limiter (/api/approve) ──────────────────────────────────────
// HITL manipülasyon saldırısına karşı — dakikada 20
export const approveLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    keyGenerator: tenantOrIpKey,
    standardHeaders: true,
    legacyHeaders: false,
    handler: limitReachedHandler("approve"),
});

// ─── 4. Social Media Limiter (/api/social/*) ────────────────────────────────
// Platform API rate abuse'a karşı — dakikada 30
export const socialLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    keyGenerator: tenantOrIpKey,
    standardHeaders: true,
    legacyHeaders: false,
    handler: limitReachedHandler("social"),
});

// ─── 5. Knowledge / RAG Limiter (/api/knowledge/*) ──────────────────────────
// Embedding çağrıları (Gemini) — dakikada 20
export const knowledgeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    keyGenerator: tenantOrIpKey,
    standardHeaders: true,
    legacyHeaders: false,
    handler: limitReachedHandler("knowledge"),
});

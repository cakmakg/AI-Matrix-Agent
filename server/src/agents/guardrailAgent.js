import { SecurityEvent } from "../models/SecurityEvent.js";

/**
 * 🛡️ MOAT LAYER 1: Input Guardrail Node
 *
 * Tüm LangGraph workflow'larından ÖNCE çalışır.
 * Saf regex + kural tabanlı — LLM kullanmaz (meta-injection riskini ortadan kaldırır).
 *
 * Görevleri:
 *  1. state.task içindeki prompt injection girişimlerini tespit et
 *  2. Tehdit skorunu hesapla (0-10)
 *  3. Orta tehdit (5-7): sanitize et, devam et
 *  4. Yüksek tehdit (8+): workflow'u durdur, logla
 *  5. Temiz metin için uzunluk + format doğrulaması yap
 */

// ─── Sabitler ──────────────────────────────────────────────────────────────
const MAX_TASK_LENGTH  = 3000;   // karakter
const MAX_WORD_COUNT   = 500;    // kelime

// ─── Tespit Desenleri ───────────────────────────────────────────────────────

/** Yüksek tehdit (her eşleşme +3 puan) */
const HIGH_RISK_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|context|rules?)/gi,
    /forget\s+(everything|all|the\s+above|previous)/gi,
    /\bSYSTEM\s*:\s*\w+/g,
    /<\s*\/?\s*system\s*>/gi,
    /\[END_(?:TASK|INPUT|PROMPT|CONTEXT)\]/gi,
    /\[ADMIN\s+OVERRIDE\]/gi,
    /override\s+(?:your\s+)?(?:instructions?|directives?|rules?|constraints?)/gi,
    /jailbreak/gi,
    /\bDAN\s+mode\b/gi,
    /disregard\s+(?:your|all)\s+/gi,
];

/** Orta tehdit (her eşleşme +2 puan) */
const MEDIUM_RISK_PATTERNS = [
    /you\s+are\s+now\s+(?:a|an)\s+/gi,
    /pretend\s+(?:you\s+are|to\s+be)\s+/gi,
    /act\s+as\s+(?:if\s+you\s+are|a|an)\s+/gi,
    /roleplay\s+as\s+/gi,
    /new\s+persona\s*:/gi,
    /\bdo\s+not\s+follow\s+/gi,
    /\byour\s+true\s+(?:self|purpose|instructions?)\b/gi,
    /hypothetically\s+speaking.{0,30}(?:ignore|bypass|override)/gi,
];

/** Yapısal enjeksiyon belirtileri (her eşleşme +2 puan) */
const STRUCTURAL_PATTERNS = [
    /---+\s*\n\s*(?:SYSTEM|ADMIN|ROOT)\s*:/gis,          // separator + ayrıcalıklı prefix
    /<\s*(?:instructions?|prompt|context|assistant)\s*>/gi,
    /\[\s*(?:INST|SYS|SYSTEM|CONTEXT)\s*\]/gi,
    /#{1,6}\s+(?:SYSTEM|ADMIN|INSTRUCTIONS?)\s*\n/gi,    // markdown başlık olarak enjeksiyon
];

/** Ham/tehlikeli içerik göstergeler (her eşleşme +1 puan) */
const LOW_RISK_INDICATORS = [
    /\bmalware\b/gi,
    /\bransomware\b/gi,
    /\bexploit\b/gi,
    /\bpassword\s*(?:dump|hash|crack)\b/gi,
    /\bSQL\s+injection\b/gi,
    /\bXSS\b/gi,
    /\bshell\s+code\b/gi,
];

// ─── Yardımcı Fonksiyonlar ──────────────────────────────────────────────────

function escapeForLog(text) {
    return text.replace(/[\r\n]+/g, " ↵ ").slice(0, 200);
}

/**
 * Bir metin parçasını tarar, tehdit skorunu döndürür ve eşleşmeleri raporlar.
 */
function scanText(text) {
    if (!text || typeof text !== "string") return { score: 0, matches: [] };

    let score = 0;
    const matches = [];

    for (const pattern of HIGH_RISK_PATTERNS) {
        const found = text.match(pattern);
        if (found) {
            score += 3 * found.length;
            matches.push({ level: "HIGH", pattern: pattern.toString(), found });
        }
    }

    for (const pattern of MEDIUM_RISK_PATTERNS) {
        const found = text.match(pattern);
        if (found) {
            score += 2 * found.length;
            matches.push({ level: "MEDIUM", pattern: pattern.toString(), found });
        }
    }

    for (const pattern of STRUCTURAL_PATTERNS) {
        const found = text.match(pattern);
        if (found) {
            score += 2 * found.length;
            matches.push({ level: "STRUCTURAL", pattern: pattern.toString(), found });
        }
    }

    for (const pattern of LOW_RISK_INDICATORS) {
        const found = text.match(pattern);
        if (found) {
            score += 1 * found.length;
            matches.push({ level: "LOW", pattern: pattern.toString(), found });
        }
    }

    return { score: Math.min(score, 10), matches };
}

/**
 * Metinden injection kelimelerini maskeler, orijinal anlam korunur.
 */
function sanitizeText(text) {
    if (!text || typeof text !== "string") return text;

    let clean = text;

    // Yüksek tehdit: tamamen maskele
    for (const pattern of HIGH_RISK_PATTERNS) {
        clean = clean.replace(pattern, "[GÜVENLIK_FİLTRESİ]");
    }

    // Orta tehdit: maskele
    for (const pattern of MEDIUM_RISK_PATTERNS) {
        clean = clean.replace(pattern, "[FİLTRELENDİ]");
    }

    // Yapısal: maskele
    for (const pattern of STRUCTURAL_PATTERNS) {
        clean = clean.replace(pattern, "[YAPI_FİLTRESİ]");
    }

    // Uzunluk kısıtı
    if (clean.length > MAX_TASK_LENGTH) {
        clean = clean.slice(0, MAX_TASK_LENGTH) + "\n[...kırpıldı: güvenlik uzunluk sınırı]";
    }

    return clean;
}

// ─── Ana LangGraph Node ─────────────────────────────────────────────────────

export async function guardrailNode(state, config) {
    console.log("🛡️  GuardRail (MOAT Katman 1) devreye girdi...");

    // 0. ⚡ KILL-SWITCH: Tenant throttle edilmişse grafı burada kes — TEK bir LLM çağrısı bile yapma.
    //    Flag, admin tarafından TenantConfig.configObject.throttled'a yazılır (manuel throttle veya
    //    otomatik bütçe-trip). Guardrail her graph workflow'unun ilk node'u olduğu için burada
    //    kesmek hem hot-lead hem revizyon akışlarını maliyet patlamasına karşı korur.
    if (config?.configurable?.tenantConfig?.configObject?.throttled === true) {
        console.error("   🔴 TENANT THROTTLED: Workflow engellendi — hiçbir LLM çağrısı yapılmadı.");
        return {
            task: "[ENGELLENDI: Tenant geçici olarak kısıtlandı (throttled)]",
            nextAgent: "END",
            blockedReason: "TENANT_THROTTLED",
            threatScore: 0,
        };
    }

    const taskText     = state.task     || "";
    const feedbackText = state.humanFeedback || "";

    // 1. Uzunluk kontrolü
    if (taskText.length > MAX_TASK_LENGTH) {
        console.warn(`   ⚠️  UZUNLUK AŞIMI: task = ${taskText.length} karakter (limit: ${MAX_TASK_LENGTH})`);
    }

    const wordCount = taskText.trim().split(/\s+/).length;
    if (wordCount > MAX_WORD_COUNT) {
        console.warn(`   ⚠️  KELİME SAYISI AŞIMI: ${wordCount} kelime (limit: ${MAX_WORD_COUNT})`);
    }

    // 2. Tarama
    const taskScan     = scanText(taskText);
    const feedbackScan = scanText(feedbackText);
    const totalScore   = Math.min(taskScan.score + feedbackScan.score, 10);

    const allMatches = [...taskScan.matches, ...feedbackScan.matches];

    if (allMatches.length > 0) {
        console.warn(`   🚨 GÜVENLIK UYARISI — Tehdit Skoru: ${totalScore}/10`);
        allMatches.forEach(m => {
            console.warn(`      [${m.level}] ${m.pattern}`);
        });
    }

    // 3. Karar: BLOKLA (8+) → workflow'u kes + logla
    if (totalScore >= 8) {
        console.error(`   🔴 YÜKSEK TEHDİT (${totalScore}/10): Workflow ENGELLENDI.`);
        console.error(`   -> Şüpheli task: "${escapeForLog(taskText)}"`);

        const reason = `Prompt injection girişimi tespit edildi. Tehdit skoru: ${totalScore}/10. Eşleşmeler: ${allMatches.map(m => m.level).join(", ")}`;
        SecurityEvent.create({
            eventType:   "THREAT_BLOCKED",
            severity:    "CRITICAL",
            threadId:    state.threadId || "",
            agentId:     "guardrail",
            threatScore: totalScore,
            details:     reason,
            rawInput:    escapeForLog(taskText),
        }).catch(() => {});

        return {
            task: "[ENGELLENDI: Güvenlik ihlali tespit edildi]",
            nextAgent: "END",
            blockedReason: reason,
            threatScore: totalScore,
        };
    }

    // 4. Karar: SANITIZE ET (3-7) → temizle, devam et + logla
    if (totalScore >= 3) {
        const cleanTask     = sanitizeText(taskText);
        const cleanFeedback = sanitizeText(feedbackText);

        console.warn(`   🟡 ORTA TEHDİT (${totalScore}/10): Girdi sanitize edildi, devam ediliyor.`);
        console.warn(`   -> Orijinal: "${escapeForLog(taskText)}"`);
        console.warn(`   -> Temizlendi: "${escapeForLog(cleanTask)}"`);

        SecurityEvent.create({
            eventType:   "THREAT_SANITIZED",
            severity:    totalScore >= 6 ? "HIGH" : "MEDIUM",
            threadId:    state.threadId || "",
            agentId:     "guardrail",
            threatScore: totalScore,
            details:     `Girdi sanitize edildi. Eşleşmeler: ${allMatches.map(m => m.level).join(", ")}`,
            rawInput:    escapeForLog(taskText),
        }).catch(() => {});

        return {
            task: cleanTask,
            humanFeedback: cleanFeedback || state.humanFeedback,
            threatScore: totalScore,
            blockedReason: ``,
        };
    }

    // 5. Temiz: devam et
    console.log(`   ✅ Temiz giriş — Tehdit Skoru: ${totalScore}/10. Orchestrator'a yönlendiriliyor.`);
    return {
        threatScore: totalScore,
        blockedReason: "",
    };
}

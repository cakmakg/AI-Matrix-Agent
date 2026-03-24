import { app } from "../workflows/graph.js";
import { Report } from "../models/Report.js";
import { runPublishWorkflow, runRevisionWorkflow } from "../workflows/runner.js";

// 🛡️ MOAT: Feedback içindeki injection girişimlerini temizle
const MAX_FEEDBACK_LENGTH = 5000;

const FEEDBACK_INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|context|rules?)/gi,
    /forget\s+(everything|all|the\s+above|previous)/gi,
    /\bSYSTEM\s*:\s*\w+/g,
    /<\s*\/?\s*system\s*>/gi,
    /\[END_(?:TASK|INPUT|PROMPT|CONTEXT)\]/gi,
    /override\s+(?:your\s+)?(?:instructions?|directives?|rules?)/gi,
];

function sanitizeFeedback(text) {
    if (!text || typeof text !== "string") return text;
    let clean = text.slice(0, MAX_FEEDBACK_LENGTH);
    for (const pattern of FEEDBACK_INJECTION_PATTERNS) {
        clean = clean.replace(pattern, "[FİLTRELENDİ]");
    }
    return clean;
}

export const handleApproval = async (req, res) => {
    try {
        const { threadId, isApproved, category } = req.body;
        // 🛡️ MOAT: Feedback'i sanitize et ve uzunluk sınırla
        const feedback = sanitizeFeedback(req.body.feedback);

        if (!threadId) return res.status(400).json({ error: "Lütfen threadId belirtin." });

        if (category !== "SUPPORT_BUG" && category !== "SUPPORT_PRICING") {
            const clientId = req.clientId || "default";
            const exists = await Report.exists({ threadId, clientId });
            if (!exists) return res.status(403).json({ error: "Report not found for this thread." });
        }

        if (category === "SUPPORT_BUG" || category === "SUPPORT_PRICING") {
            if (isApproved) {
                console.log(`\n📧 [E-POSTA GÖNDERİLİYOR] → Konu: Destek Talebi Hk.`);
                console.log(`📝 İçerik: ${feedback || "Ajanın hazırladığı taslak başarıyla gönderildi."}`);
                return res.json({ success: true, status: "EMAIL_SENT", message: "Destek cevabı gönderildi!" });
            }
            return res.json({ success: true, status: "REJECTED", message: "Taslak reddedildi." });
        }

        const config = { configurable: { thread_id: threadId } };

        await app.updateState(config, {
            humanApproval: isApproved,
            humanFeedback: feedback || (isApproved ? "Onaylandı." : "Yeniden yaz.")
        });

        if (isApproved) {
            runPublishWorkflow(threadId, feedback).catch(err =>
                console.error("❌ Publish background error:", err.message)
            );
            return res.json({ success: true, status: "PUBLISHED" });
        } else {
            await Report.findOneAndUpdate(
                { threadId },
                { status: "REJECTED", humanFeedback: feedback || "" }
            );
            runRevisionWorkflow(threadId, req.tenant?.config).catch(err =>
                console.error("❌ Revision background error:", err.message)
            );
            return res.json({ success: true, status: "REVISED" });
        }
    } catch (error) {
        console.error("❌ /api/approve hatası:", error.message);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

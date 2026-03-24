import { v4 as uuidv4 } from "uuid";
import { processIncomingMessage } from "../agents/customerBotAgent.js";
import { runHotLeadWorkflow } from "../workflows/runner.js";
import { SupportTicket } from "../models/SupportTicket.js";
import { appendHotLead } from "../services/googleSheetsService.js";

// ── n8n kategori → iç aksiyon mapping ──
const N8N_CATEGORY_MAP = {
    ACIL_DESTEK:         "SUPPORT_BUG",
    SIKAYET_IADE:        "SUPPORT_BUG",
    FIYAT_SORUSTURMASI:  "SUPPORT_PRICING",
    TEKLIF_TALEBI:       "HOT_LEAD",
    IHTIYAC_ANALIZI:     "HOT_LEAD",
    GENEL_BILGI:         "OTHER",
};

const PRIORITY_MAP = {
    ACIL_DESTEK:         "critical",
    SIKAYET_IADE:        "high",
    FIYAT_SORUSTURMASI:  "medium",
    TEKLIF_TALEBI:       "high",
    IHTIYAC_ANALIZI:     "medium",
    GENEL_BILGI:         "low",
};

export const handleInbox = async (req, res) => {
    try {
        // ── Payload: n8n zengin format VEYA eski { message, source } ──
        const {
            message, source,
            category: n8nCategory,
            platform_id, platform = "gmail",
            author = "", author_email = "",
            subject = "", content,
            ai_summary = "",
            priority: incomingPriority,
        } = req.body;

        const messageText = (content || message || "").trim();
        if (!messageText) return res.status(400).json({ error: "İçerik boş. 'content' veya 'message' alanı gerekli." });

        // ── Operator UI → doğrudan HOT_LEAD ──
        if (source === "operator") {
            console.log(`\n🎯 OPERATOR KOMUTU (UI): "${messageText.substring(0, 80)}"`);
            const threadId = uuidv4();
            const clientId = req.clientId || "default";
            const clientPlan = req.tenant?.client?.plan || "free";
            runHotLeadWorkflow(threadId, messageText, req.tenant?.config, clientId, clientPlan).catch((err) =>
                console.error("❌ HOT_LEAD workflow başlatma hatası:", err.message)
            );
            appendHotLead({
                source: "operator",
                from: "UI Operator",
                subject: messageText.slice(0, 120),
                summary: "",
                threadId,
            }).catch(() => {});
            return res.json({ success: true, status: "PROCESSING", threadId });
        }

        // ── Idempotency: aynı platform_id iki kez işlenmesin ──
        if (platform_id) {
            const duplicate = await SupportTicket.findOne({ platform_id }).lean();
            if (duplicate) {
                console.log(`⚠️ DUPLICATE: platform_id=${platform_id} zaten işlendi — atlandı.`);
                return res.json({ status: "DUPLICATE", message: "Bu mesaj zaten işlendi." });
            }
        }

        // ── n8n önceden sınıflandırdıysa → customerBotAgent'i atla ──
        if (n8nCategory && N8N_CATEGORY_MAP[n8nCategory]) {
            const internalCategory = N8N_CATEGORY_MAP[n8nCategory];
            const ticketPriority = incomingPriority || PRIORITY_MAP[n8nCategory] || "medium";

            console.log(`\n📡 n8n WEBHOOK [${platform}/${n8nCategory}→${internalCategory}]: "${messageText.substring(0, 80)}"`);

            if (internalCategory === "OTHER") {
                console.log(`   ℹ️ GENEL_BILGI — otomatik işlem yok.`);
                return res.json({ status: "NOTED", message: "Genel bilgi sorusu kaydedildi." });
            }

            if (internalCategory === "SUPPORT_BUG" || internalCategory === "SUPPORT_PRICING") {
                const ticket = await SupportTicket.create({
                    platform_id:    platform_id || uuidv4(),
                    platform,
                    author,
                    n8nCategory,
                    aiSummary:      ai_summary,
                    priority:       ticketPriority,
                    emailMessageId: platform === "gmail" ? platform_id : undefined,
                    gmailThreadId:  platform === "gmail" ? (req.body.gmailThreadId || platform_id || "") : "",
                    clientId:       req.clientId || "default",
                    from:           author_email || author || "unknown",
                    subject:        subject || "(no subject)",
                    body:           messageText,
                    category:       internalCategory,
                    draftResponse:  "",
                    status:         "AWAITING_APPROVAL",
                });
                console.log(`   🎫 Ticket oluşturuldu [${ticketPriority}]: ${ticket._id}`);
                return res.json({
                    success: true,
                    status: "AWAITING_HUMAN_APPROVAL_SUPPORT",
                    ticketId: ticket._id,
                    category: internalCategory,
                    n8nCategory,
                    priority: ticketPriority,
                });
            }

            if (internalCategory === "HOT_LEAD") {
                const threadId = uuidv4();
                const task = `HOT_LEAD [${platform}${author ? ` / ${author}` : ""}]: ${messageText}`;
                const clientPlanN8n = req.tenant?.client?.plan || "free";
                runHotLeadWorkflow(threadId, task, req.tenant?.config, req.clientId || "default", clientPlanN8n).catch((err) =>
                    console.error("❌ n8n HOT_LEAD workflow hatası:", err.message)
                );
                appendHotLead({
                    source: platform || "n8n",
                    from: author_email || author || "unknown",
                    subject: subject || messageText.slice(0, 120),
                    summary: ai_summary || "",
                    threadId,
                }).catch(() => {});
                console.log(`   🔥 HOT_LEAD workflow → threadId: ${threadId}`);
                return res.json({ success: true, status: "PROCESSING", threadId });
            }
        }

        // ── Legacy path: n8n kategorisi yoksa customerBotAgent ile sınıflandır ──
        console.log(`\n📧 DIŞ WEBHOOK: "${messageText.substring(0, 80)}"`);
        const leadAnalysis = await processIncomingMessage(messageText, req.clientId, req.tenant?.config);

        if (leadAnalysis.category === "SPAM" || leadAnalysis.category === "OTHER") {
            return res.json({ status: "IGNORED", message: "Mesaj filtrelendi (SPAM/OTHER)." });
        }

        if (leadAnalysis.category === "SUPPORT_PRICING" || leadAnalysis.category === "SUPPORT_BUG") {
            const ticket = await SupportTicket.create({
                platform_id:    platform_id || uuidv4(),
                platform,
                emailMessageId: platform === "gmail" ? platform_id : undefined,
                gmailThreadId:  req.body.gmailThreadId || "",
                clientId:       req.clientId || "default",
                from:           author_email || author || "unknown",
                subject:        subject || "(no subject)",
                body:           messageText,
                category:       leadAnalysis.category,
                draftResponse:  leadAnalysis.draftResponse || "",
                ragSources:     leadAnalysis.ragSources || [],
                status:         "AWAITING_APPROVAL",
            });
            console.log(`🛑 SUPPORT ticket → HITL (ticketId: ${ticket._id})`);
            return res.json({
                success: true,
                status: "AWAITING_HUMAN_APPROVAL_SUPPORT",
                ticketId: ticket._id,
                category: leadAnalysis.category,
                pendingContent: leadAnalysis.draftResponse,
            });
        }

        if (leadAnalysis.category === "HOT_LEAD") {
            const threadId = uuidv4();
            const clientPlanLegacy = req.tenant?.client?.plan || "free";
            runHotLeadWorkflow(threadId, leadAnalysis.orchestratorTask, req.tenant?.config, req.clientId || "default", clientPlanLegacy).catch((err) =>
                console.error("❌ HOT_LEAD workflow başlatma hatası:", err.message)
            );
            appendHotLead({
                source: platform || "webhook",
                from: author_email || author || "unknown",
                subject: subject || messageText.slice(0, 120),
                summary: leadAnalysis.analysis || "",
                threadId,
            }).catch(() => {});
            return res.json({ success: true, status: "PROCESSING", threadId });
        }

    } catch (error) {
        console.error("❌ /api/inbox hatası:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

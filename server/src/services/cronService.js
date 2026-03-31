import cron from "node-cron";
import { v4 as uuidv4 } from "uuid";
import { fetchUnreadEmails, markAsRead } from "../services/gmailService.js";
import { processIncomingMessage } from "../agents/customerBotAgent.js";
import { SupportTicket } from "../models/SupportTicket.js";
import { TenantConfig } from "../models/TenantConfig.js";
import { Client } from "../models/Client.js";
import { ScheduledPost } from "../models/ScheduledPost.js";
import { publishScheduledPost } from "../services/socialMediaService.js";
import { runHotLeadWorkflow } from "../workflows/runner.js";
import { appendHotLead } from "../services/googleSheetsService.js";
import { runDailySocialScheduler } from "../agents/socialContentAgent.js";

async function pollGmailInbox() {
    if (!process.env.GOOGLE_REFRESH_TOKEN) return;

    console.log("\n📬 [GMAIL POLLER] Merkezi gelen kutusu kontrol ediliyor...");
    try {
        const emails = await fetchUnreadEmails();
        if (emails.length === 0) {
            console.log("   ✅ Yeni mail yok.");
            return;
        }
        console.log(`   📩 ${emails.length} yeni mail bulundu.`);

        for (const email of emails) {
            const existing = await SupportTicket.findOne({ emailMessageId: email.messageId });
            if (existing) {
                await markAsRead(email.messageId);
                continue;
            }

            const tagMatch = email.body.match(/\[CLIENT:([^\]]+)\]/i) || email.subject.match(/\[CLIENT:([^\]]+)\]/i);
            const clientSlug = tagMatch ? tagMatch[1].trim() : (process.env.DEFAULT_CLIENT_ID || "default");

            let tenantConfig = null;
            try {
                const client = await Client.findOne({ $or: [{ slug: clientSlug }, { apiKey: clientSlug }] }).lean();
                if (client) {
                    tenantConfig = await TenantConfig.findOne({ clientId: client._id }).lean();
                }
                if (!tenantConfig) {
                    const defaultClient = await Client.findOne({ slug: "default" }).lean();
                    if (defaultClient) {
                        tenantConfig = await TenantConfig.findOne({ clientId: defaultClient._id }).lean();
                    }
                }
            } catch (lookupErr) {
                console.warn(`   ⚠️ [GMAIL] TenantConfig lookup başarısız — devam ediliyor:`, lookupErr.message);
            }
            const clientId = clientSlug;

            const fullMessage = `Konu: ${email.subject}\nGonderen: ${email.from}\n\n${email.body}`;
            const analysis = await processIncomingMessage(fullMessage, clientId, tenantConfig);

            console.log(`   🔍 ${email.from} → kategori: ${analysis.category} | tenant: ${clientId}`);

            if (analysis.category === "SPAM" || analysis.category === "OTHER") {
                await markAsRead(email.messageId);
                console.log(`   🗑️  SPAM/OTHER — atlandi.`);
                continue;
            }

            if (analysis.category === "SUPPORT_PRICING" || analysis.category === "SUPPORT_BUG") {
                await SupportTicket.create({
                    emailMessageId: email.messageId,
                    gmailThreadId: email.gmailThreadId,
                    clientId: clientId,
                    from: email.from,
                    subject: email.subject,
                    body: email.body,
                    category: analysis.category,
                    draftResponse: analysis.draftResponse || "",
                    ragSources: analysis.ragSources || [],
                    status: "AWAITING_APPROVAL",
                });
                await markAsRead(email.messageId);
                console.log(`   🎫 Ticket olusturuldu — ${email.from} (${analysis.category}) tenant: ${clientId}`);
                continue;
            }

            if (analysis.category === "HOT_LEAD") {
                const threadId = uuidv4();
                const clientPlanForLead = "pro"; // Gmail leads always get at minimum pro-level workflow
                runHotLeadWorkflow(threadId, analysis.orchestratorTask, tenantConfig, clientId, clientPlanForLead).catch(err =>
                    console.error("Gmail HOT_LEAD hatasi:", err.message)
                );
                appendHotLead({
                    source: "gmail",
                    from: email.from,
                    subject: email.subject,
                    summary: analysis.analysis || "",
                    threadId,
                }).catch(() => {});
                await markAsRead(email.messageId);
                console.log(`   🚀 HOT_LEAD workflow baslatildi — threadId: ${threadId} tenant: ${clientId}`);
            }
        }
    } catch (err) {
        console.error("❌ Gmail poller hatasi:", err.message);
    }
}

export const startCronJobs = () => {
    // Autonome Social-Media-Inhaltserstellung — stündlich, nur Mandanten deren postHour übereinstimmt
    // ENV-Fallback für Einzelmandanten-Setups enthalten (Rückwärtskompatibilität in socialContentAgent.js)
    cron.schedule("0 * * * *", () => {
        runDailySocialScheduler().catch((err) =>
            console.error("❌ Social-Scheduler Fehler:", err.message)
        );
    });

    cron.schedule("0 8 * * *", () => {
        const threadId = "RND-" + Date.now();
        console.log(`\n⏰ [AR-GE ALARMI ÇALDI] Teknoloji Radarı uyandı! threadId: ${threadId}`);
        console.log("🕵️‍♂️ İnternetteki en yeni yapay zeka gelişmeleri taranıyor...\n");

        const rndTask = "INNOVATION_RADAR: Recherchiere die allerneuesten Updates von Anthropic (Claude) und OpenAI für Entwickler von heute. Erstelle basierend auf diesen neuen Technologien einen Master Blueprint (.md), der erklärt, wie wir diese neuen KI-Features in unsere bestehende Architektur integrieren können.";

        runHotLeadWorkflow(threadId, rndTask, null, "default", "enterprise").catch((err) =>
            console.error("❌ R&D Cron Hatası:", err.message)
        );
    });

    cron.schedule("*/5 * * * *", () => {
        pollGmailInbox();
    });

    // Social Media: publish due scheduled posts every minute
    cron.schedule("* * * * *", async () => {
        try {
            const duePosts = await ScheduledPost.find({
                status: "PENDING",
                scheduledAt: { $lte: new Date() },
            }).limit(10);

            for (const post of duePosts) {
                console.log(`📱 [SOCIAL CRON] Zamanlanmış post yayınlanıyor: ${post._id} → [${post.platforms.join(", ")}]`);
                try {
                    const results = await publishScheduledPost(post);
                    const hasError = Object.values(results).some((r) => !r.success);
                    post.status = hasError ? "FAILED" : "PUBLISHED";
                    post.publishedAt = new Date();
                    post.results = results;
                    if (hasError) {
                        post.errorMessage = Object.entries(results)
                            .filter(([, v]) => !v.success)
                            .map(([k, v]) => `${k}: ${v.error}`)
                            .join("; ");
                    }
                    await post.save();
                    console.log(`   ✅ Post ${post.status}: ${post._id}`);
                } catch (err) {
                    post.status = "FAILED";
                    post.errorMessage = err.message;
                    await post.save();
                    console.error(`   ❌ Post yayın hatası: ${err.message}`);
                }
            }
        } catch (err) {
            console.error("❌ [SOCIAL CRON] Scheduler hatası:", err.message);
        }
    });

    console.log("⏰ Cron jobs initialized.");
};

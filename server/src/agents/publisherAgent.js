// ── Publisher Agent (Dağıtım Koordinatörü — Ajan 9) ──
//
// 🛡️ MOAT Katman 4: Ajan İzolasyonu
// Bu ajan n8n/Telegram/Discord API'sine DOĞRUDAN erişemez.
// Tek yetkisi: ActionQueue'ya yazma.
// Gerçek yürütme → actionWorkerService.js (LLM-sız, whitelist doğrulayıcı)
//
// SaaS Adım 3: clientId kuyruğa eklenir.
// actionWorkerService yürütme sırasında TenantConfig.integrations'dan
// per-tenant webhook URL'lerini okur; yoksa global env'e düşer.

import { enqueueAction } from "../services/actionWorkerService.js";

// Twitter thread içeriğini ≤280 char tweet dizisine böler.
// Writer "---" ayırıcı kullanıyor; socialMediaService "\n---\n" bekliyor.
function parseTweets(content) {
    // Önce writer'ın "---" ayırıcısına göre böl
    const byDash = content.split(/\n?---\n?/).map(p => p.trim()).filter(Boolean);
    if (byDash.length > 1) {
        return byDash.map(t => t.slice(0, 280)).slice(0, 10);
    }
    // Ayırıcı yoksa çift satır sonuna göre böl ve uzun parçaları kes
    const parts = content.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
    const tweets = [];
    for (const part of parts) {
        if (part.length <= 280) {
            tweets.push(part);
        } else {
            let remaining = part;
            while (remaining.length > 0 && tweets.length < 10) {
                const spaceIdx = remaining.lastIndexOf(" ", 280);
                const cut = (spaceIdx > 200) ? spaceIdx : 280;
                tweets.push(remaining.slice(0, cut).trim());
                remaining = remaining.slice(cut).trim();
            }
        }
        if (tweets.length >= 10) break;
    }
    return tweets.length ? tweets : [(content || "").slice(0, 280)];
}

export async function publisherNode(state, config) {
    console.log("🚀 Dağıtım Koordinatörü (Ajan 9): Eylemler kuyruğa ekleniyor...");

    const threadId = state.threadId || "unknown";
    const clientId = config?.configurable?.clientId || "default";

    const PLATFORM_PREFIXES = [
        { prefix: /^TWITTER:/i,        platform: "twitter" },
        { prefix: /^LINKEDIN:/i,        platform: "linkedin" },
        { prefix: /^INSTAGRAM:/i,       platform: "instagram" },
        { prefix: /^YOUTUBE:/i,         platform: "youtube" },
        { prefix: /^TIKTOK:/i,          platform: "tiktok" },
        { prefix: /^EMAIL_CAMPAIGN:/i,  platform: "email" },
        { prefix: /^COLD_OUTREACH:/i,   platform: "email" },
    ];
    const taskText = state.task || "";
    const detectedPlatform = PLATFORM_PREFIXES.find(p => p.prefix.test(taskText))?.platform || null;

    // 1. Twitter/LinkedIn: bağlı hesap varsa direkt API kullan (thread desteği).
    //    Bağlı hesap bulunursa n8nPlatform=null yapılır → n8n bu platforma göndermez (çift paylaşım önlenir).
    //    Bağlı hesap yoksa n8nPlatform olduğu gibi kalır → n8n üzerinden gönderilir.
    const isTwitter  = /^TWITTER:\s*/i.test(taskText);
    const isLinkedIn = /^LINKEDIN:\s*/i.test(taskText);
    let n8nPlatform = detectedPlatform;

    if (isTwitter || isLinkedIn) {
        const platform = isTwitter ? "twitter" : "linkedin";
        try {
            const { SocialAccount } = await import("../models/SocialAccount.js");
            const account = await SocialAccount.findOne({ clientId, platform, isConnected: true }).lean();
            if (account) {
                n8nPlatform = null; // n8n bu platformu atlar
                if (isTwitter) {
                    const tweets = parseTweets(state.finalContent || "");
                    await enqueueAction({
                        threadId, clientId,
                        agentId:    "publisher",
                        actionType: "TWITTER",
                        payload:    { tweets, accountId: account._id.toString() },
                    });
                    console.log(`   -> Twitter direkt eylemi kuyruğa eklendi (${tweets.length} tweet, thread destekli).`);
                } else {
                    await enqueueAction({
                        threadId, clientId,
                        agentId:    "publisher",
                        actionType: "LINKEDIN",
                        payload:    { content: (state.finalContent || "").slice(0, 3000), accountId: account._id.toString() },
                    });
                    console.log("   -> LinkedIn direkt eylemi kuyruğa eklendi.");
                }
            } else {
                console.warn(`   ⚠️ Bağlı ${platform} hesabı bulunamadı — n8n üzerinden gönderilecek.`);
            }
        } catch (err) {
            console.warn(`   ⚠️ Sosyal medya hesabı sorgulanamadı: ${err.message}`);
        }
    }

    // 2. n8n webhook — Instagram/Email/TikTok gibi platformlar + genel bildirim.
    //    Twitter/LinkedIn için bağlı hesap varsa n8nPlatform=null → n8n routing yapmaz.
    await enqueueAction({
        threadId,
        clientId,
        agentId:    "publisher",
        actionType: "WEBHOOK_N8N",
        payload: {
            threadId,
            task:          taskText,
            content:       state.finalContent  || "",
            humanFeedback: state.humanFeedback || "Onaylandı ✓",
            fileSaved:     state.fileSaved      || false,
            platform:      n8nPlatform,
        },
    });
    console.log("   -> n8n eylemi kuyruğa eklendi.");

    // 3. Telegram bildirimi
    const preview = (state.finalContent || "").slice(0, 300);
    await enqueueAction({
        threadId,
        clientId,
        agentId:    "publisher",
        actionType: "TELEGRAM",
        payload: {
            message: `✅ *Yeni Rapor Yayınlandı*\n\n*Görev:* ${taskText.slice(0, 100)}\n\n${preview}...`,
        },
    });
    console.log("   -> Telegram eylemi kuyruğa eklendi.");

    // 4. Discord bildirimi
    await enqueueAction({
        threadId,
        clientId,
        agentId:    "publisher",
        actionType: "DISCORD",
        payload: {
            content: `✅ **Rapor Yayınlandı** | Görev: ${taskText.slice(0, 100)}`,
        },
    });
    console.log("   -> Discord eylemi kuyruğa eklendi.");

    console.log("✅ Publisher: Tüm eylemler ActionQueue'ya teslim edildi. Worker arka planda işleyecek.");
    return { isPublished: true };
}

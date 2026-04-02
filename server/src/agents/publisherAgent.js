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

// Twitter thread içeriğini ≤280 char tweet dizisine böler
function parseTweets(content) {
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
    // SaaS: clientId LangGraph configurable'dan okunur (CLAUDE.md gereği config 2. param)
    const clientId = config?.configurable?.clientId || "default";

    // Platform tespiti — n8n bu alanı kullanarak kendi flow'unu yönlendirir
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

    // 1. n8n webhook eylemi — per-tenant veya global env
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
            platform:      detectedPlatform,   // n8n routing için
        },
    });
    console.log("   -> n8n eylemi kuyruğa eklendi.");

    // 2. Telegram bildirimi — per-tenant veya global env
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

    // 3. Discord bildirimi — per-tenant veya global env
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

    // 4. Twitter veya LinkedIn direkt post (bağlı hesap varsa actionWorkerService üzerinden)
    const isTwitter  = /^TWITTER:\s*/i.test(state.task || "");
    const isLinkedIn = /^LINKEDIN:\s*/i.test(state.task || "");

    if (isTwitter || isLinkedIn) {
        const platform = isTwitter ? "twitter" : "linkedin";
        try {
            const { SocialAccount } = await import("../models/SocialAccount.js");
            const account = await SocialAccount.findOne({ clientId, platform, isConnected: true }).lean();
            if (account) {
                if (isTwitter) {
                    const tweets = parseTweets(state.finalContent || "");
                    await enqueueAction({
                        threadId, clientId,
                        agentId:    "publisher",
                        actionType: "TWITTER",
                        payload:    { tweets, accountId: account._id.toString() },
                    });
                    console.log(`   -> Twitter eylemi kuyruğa eklendi (${tweets.length} tweet).`);
                } else {
                    await enqueueAction({
                        threadId, clientId,
                        agentId:    "publisher",
                        actionType: "LINKEDIN",
                        payload:    { content: (state.finalContent || "").slice(0, 3000), accountId: account._id.toString() },
                    });
                    console.log("   -> LinkedIn eylemi kuyruğa eklendi.");
                }
            } else {
                console.warn(`   ⚠️ Bağlı ${platform} hesabı bulunamadı (clientId: ${clientId}) — atlanıyor.`);
            }
        } catch (err) {
            console.warn(`   ⚠️ Sosyal medya eylemi eklenemedi: ${err.message}`);
        }
    }

    console.log("✅ Publisher: Tüm eylemler ActionQueue'ya teslim edildi. Worker arka planda işleyecek.");
    return { isPublished: true };
}

/**
 * 🛡️ MOAT LAYER 4: Action Worker — Ajan İzolasyonu
 *
 * Bu servis tamamen LLM BARINDIRMAZ. Aptal ama güvenlidir.
 *
 * SaaS Adım 3: Executor'lar action.clientId üzerinden TenantConfig.integrations
 * tablosunu okur ve per-tenant webhook URL'lerini kullanır.
 * Tenant'a özel URL yoksa global env vars'a düşer (backward compat).
 */

import { ActionQueue } from "../models/ActionQueue.js";
import { SecurityEvent } from "../models/SecurityEvent.js";

// ─── İzin Verilen Action Şemaları (Whitelist) ────────────────────────────────

const PAYLOAD_VALIDATORS = {
    WEBHOOK_N8N: (p) => {
        if (typeof p.content   !== "string") return "content string olmalı";
        if (typeof p.threadId  !== "string") return "threadId string olmalı";
        if (typeof p.task      !== "string") return "task string olmalı";
        if (p.content.length   > 50_000)     return "content 50k char sınırını aşıyor";
        if (p.task.length      > 3_000)      return "task 3k char sınırını aşıyor";
        return null;
    },

    TELEGRAM: (p) => {
        if (typeof p.message !== "string") return "message string olmalı";
        if (p.message.length  > 4096)      return "Telegram mesajı 4096 char sınırını aşıyor";
        return null;
    },

    DISCORD: (p) => {
        if (typeof p.content !== "string") return "content string olmalı";
        if (p.content.length  > 2000)      return "Discord mesajı 2000 char sınırını aşıyor";
        return null;
    },

    TWITTER: (p) => {
        if (!Array.isArray(p.tweets))       return "tweets dizisi olmalı";
        if (p.tweets.length > 10)           return "Tweet dizisi maksimum 10 olabilir";
        for (const t of p.tweets) {
            if (typeof t !== "string")      return "Her tweet string olmalı";
            if (t.length > 280)             return `Tweet 280 char sınırını aşıyor: '${t.slice(0, 30)}...'`;
        }
        if (typeof p.accountId !== "string") return "accountId string olmalı";
        return null;
    },

    LINKEDIN: (p) => {
        if (typeof p.content   !== "string") return "content string olmalı";
        if (typeof p.accountId !== "string") return "accountId string olmalı";
        if (p.content.length    > 3000)      return "LinkedIn içeriği 3000 char sınırını aşıyor";
        return null;
    },

    INSTAGRAM: (p) => {
        if (typeof p.caption   !== "string") return "caption string olmalı";
        if (typeof p.accountId !== "string") return "accountId string olmalı";
        if (p.caption.length    > 2200)      return "Instagram başlığı 2200 char sınırını aşıyor";
        return null;
    },

    FACEBOOK: (p) => {
        if (typeof p.content   !== "string") return "content string olmalı";
        if (typeof p.accountId !== "string") return "accountId string olmalı";
        if (p.content.length    > 63206)     return "Facebook içeriği sınırını aşıyor";
        return null;
    },

    GOOGLE_ADS: (p) => {
        if (typeof p.headline    !== "string") return "headline string olmalı";
        if (typeof p.description !== "string") return "description string olmalı";
        if (typeof p.finalUrl    !== "string") return "finalUrl string olmalı";
        if (typeof p.accountId   !== "string") return "accountId string olmalı";
        if (p.headline.length    > 30)         return "Google Ads headline 30 char sınırını aşıyor";
        if (p.description.length > 90)         return "Google Ads description 90 char sınırını aşıyor";
        if (!/^https?:\/\//i.test(p.finalUrl)) return "finalUrl geçerli bir URL olmalı";
        return null;
    },
};

// ─── Per-tenant integration config yardımcısı ────────────────────────────────
// clientId (slug) ile TenantConfig.integrations'ı lazy yükler.

async function getTenantIntegrations(clientId) {
    if (!clientId || clientId === "default") return null;
    try {
        const { Client }       = await import("../models/Client.js");
        const { TenantConfig } = await import("../models/TenantConfig.js");
        const client = await Client.findOne({ slug: clientId }).lean();
        if (!client) return null;
        const config = await TenantConfig.findOne({ clientId: client._id }).lean();
        return config?.integrations || null;
    } catch {
        return null;
    }
}

// ─── Executor'lar ─────────────────────────────────────────────────────────────

async function executeWebhookN8n(payload, action) {
    const integrations = await getTenantIntegrations(action.clientId);

    // Per-tenant URL öncelikli, yoksa global env
    const webhookUrl = integrations?.n8nWebhookUrl || process.env.N8N_PUBLISH_WEBHOOK;
    if (!webhookUrl) {
        console.warn(`   ⚠️ n8n webhook URL bulunamadı (clientId: ${action.clientId}) — atlanıyor`);
        return "n8n webhook URL tanımsız — atlandı";
    }

    const secret = integrations?.n8nWebhookSecret || process.env.N8N_WEBHOOK_SECRET || "";

    const res = await fetch(webhookUrl, {
        method:  "POST",
        headers: {
            "Content-Type":     "application/json",
            "X-Webhook-Secret": secret,
            "X-Source":         "ai-orchestra-worker",
            "X-Thread-Id":      action.threadId,
            "X-Client-Id":      action.clientId || "default",
        },
        body: JSON.stringify({ type: "publish", clientId: action.clientId, ...payload }),
        signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`n8n HTTP ${res.status}: ${await res.text()}`);
    return "n8n webhook tetiklendi";
}

async function executeTelegram(payload, action) {
    const integrations = await getTenantIntegrations(action.clientId);

    const botToken = integrations?.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = integrations?.telegramChatId   || process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) {
        console.warn(`   ⚠️ Telegram config bulunamadı (clientId: ${action.clientId}) — atlanıyor`);
        return "Telegram config tanımsız — atlandı";
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: payload.message, parse_mode: "Markdown" }),
        signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Telegram HTTP ${res.status}`);
    return "Telegram mesajı gönderildi";
}

async function executeDiscord(payload, action) {
    const integrations = await getTenantIntegrations(action.clientId);

    const webhookUrl = integrations?.discordWebhookUrl || process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        console.warn(`   ⚠️ Discord webhook URL bulunamadı (clientId: ${action.clientId}) — atlanıyor`);
        return "Discord webhook URL tanımsız — atlandı";
    }

    const res = await fetch(webhookUrl, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: payload.content }),
        signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Discord HTTP ${res.status}`);
    return "Discord mesajı gönderildi";
}

// Twitter / LinkedIn / Instagram / Facebook / Google Ads executor'ları
async function executeSocialPlatform(actionType, payload) {
    const { SocialAccount } = await import("../models/SocialAccount.js");
    const account = await SocialAccount.findById(payload.accountId).lean();
    if (!account) throw new Error(`SocialAccount bulunamadı: ${payload.accountId}`);

    const { postToTwitter, postToLinkedIn, postToInstagram, postToFacebook, createGoogleAd } =
        await import("./socialMediaService.js");

    switch (actionType) {
        case "TWITTER":   return JSON.stringify(await postToTwitter(payload.tweets.join("\n---\n"), account));
        case "LINKEDIN":  return JSON.stringify(await postToLinkedIn(payload.content, account));
        case "INSTAGRAM": return JSON.stringify(await postToInstagram(payload.caption, payload.imageUrl || null, account));
        case "FACEBOOK":  return JSON.stringify(await postToFacebook(payload.content, account));
        case "GOOGLE_ADS":return JSON.stringify(await createGoogleAd(payload, account));
        default:          throw new Error(`Bilinmeyen platform: ${actionType}`);
    }
}

// ─── Ana İşleme Döngüsü ─────────────────────────────────────────────────────

async function processNextAction() {
    const action = await ActionQueue.findOneAndUpdate(
        { status: "PENDING" },
        { $set: { status: "PROCESSING", processedAt: new Date() }, $inc: { attempts: 1 } },
        { sort: { createdAt: 1 }, returnDocument: "after" }
    );

    if (!action) return;

    console.log(`⚙️  ActionWorker: [${action.actionType}] işleniyor — threadId: ${action.threadId}, clientId: ${action.clientId || "default"}`);

    // 1. Whitelist doğrulama
    const validator = PAYLOAD_VALIDATORS[action.actionType];
    if (!validator) {
        const msg = `Bilinmeyen actionType: ${action.actionType}`;
        await ActionQueue.findByIdAndUpdate(action._id, { status: "REJECTED", errorMessage: msg });
        SecurityEvent.create({ eventType: "ACTION_REJECTED", severity: "HIGH", threadId: action.threadId, agentId: action.agentId, details: msg }).catch(() => {});
        console.error(`🔴 ActionWorker REJECTED: ${msg}`);
        return;
    }

    const validationError = validator(action.payload);
    if (validationError) {
        const msg = `Şema hatası [${action.actionType}]: ${validationError}`;
        await ActionQueue.findByIdAndUpdate(action._id, { status: "REJECTED", errorMessage: msg });
        SecurityEvent.create({ eventType: "ACTION_REJECTED", severity: "HIGH", threadId: action.threadId, agentId: action.agentId, details: msg }).catch(() => {});
        console.error(`🔴 ActionWorker REJECTED: ${msg}`);
        return;
    }

    // 2. Yürütme
    try {
        let result;
        switch (action.actionType) {
            case "WEBHOOK_N8N": result = await executeWebhookN8n(action.payload, action); break;
            case "TELEGRAM":    result = await executeTelegram(action.payload, action);   break;
            case "DISCORD":     result = await executeDiscord(action.payload, action);    break;
            default:            result = await executeSocialPlatform(action.actionType, action.payload);
        }

        await ActionQueue.findByIdAndUpdate(action._id, { status: "SUCCESS", result });
        console.log(`✅ ActionWorker SUCCESS [${action.actionType}] — ${result}`);

    } catch (err) {
        const newStatus = action.attempts >= 3 ? "FAILED" : "PENDING";
        await ActionQueue.findByIdAndUpdate(action._id, {
            status:       newStatus,
            errorMessage: err.message,
        });
        console.error(`❌ ActionWorker ERROR [${action.actionType}] (deneme ${action.attempts}/3): ${err.message}`);
    }
}

// ─── Başlatıcı ───────────────────────────────────────────────────────────────

let workerInterval = null;

export function startActionWorker() {
    if (workerInterval) return;
    console.log("⚙️  ActionWorker başlatıldı — 5 saniyede bir kuyruk kontrol ediliyor.");
    workerInterval = setInterval(async () => {
        try {
            await processNextAction();
        } catch (err) {
            console.error("❌ ActionWorker döngü hatası:", err.message);
        }
    }, 5_000);
}

export function stopActionWorker() {
    if (workerInterval) {
        clearInterval(workerInterval);
        workerInterval = null;
        console.log("⏹️  ActionWorker durduruldu.");
    }
}

/**
 * Ajan tarafından kullanılan tek yazma noktası.
 * SaaS Adım 3: clientId parametresi eklendi — ActionQueue kaydına yazılır.
 */
export async function enqueueAction({ threadId, clientId = "default", agentId, actionType, payload }) {
    const allowed = Object.keys(PAYLOAD_VALIDATORS);
    if (!allowed.includes(actionType)) {
        throw new Error(`İzin verilmeyen actionType: '${actionType}'. İzinliler: ${allowed.join(", ")}`);
    }
    const item = await ActionQueue.create({ threadId, clientId, agentId, actionType, payload });
    console.log(`📥 ActionQueue: [${actionType}] kuyruğa eklendi — id: ${item._id}, client: ${clientId}`);
    return item._id;
}

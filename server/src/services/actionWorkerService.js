/**
 * 🛡️ MOAT LAYER 4: Action Worker — Ajan İzolasyonu
 *
 * Bu servis tamamen LLM BARINDIRMAZ. Aptal ama güvenlidir.
 *
 * İş akışı:
 *  1. Her 5 saniyede ActionQueue'yu yoklar (status: PENDING)
 *  2. Her action'ı WHITELIST schema'ya göre doğrular
 *  3. Geçerliyse → çalıştırır ve SUCCESS/FAILED günceller
 *  4. Geçersizse → REJECTED olarak işaretler, loglar, dokunmaz
 *
 * Prensip: Ajan "Yayınla" kararı verir. Worker "Ne yayınlanabileceğine" karar verir.
 */

import { ActionQueue } from "../models/ActionQueue.js";
import { SecurityEvent } from "../models/SecurityEvent.js";

// ─── İzin Verilen Action Şemaları (Whitelist) ────────────────────────────────
// Worker yalnızca bu şemaya uyan payload'ları işler.
// Fazladan alan? → REJECTED. Eksik alan? → REJECTED. Tip yanlış? → REJECTED.

const PAYLOAD_VALIDATORS = {
    WEBHOOK_N8N: (p) => {
        if (typeof p.content   !== "string") return "content string olmalı";
        if (typeof p.threadId  !== "string") return "threadId string olmalı";
        if (typeof p.task      !== "string") return "task string olmalı";
        if (p.content.length   > 50_000)     return "content 50k char sınırını aşıyor";
        if (p.task.length      > 3_000)      return "task 3k char sınırını aşıyor";
        return null; // geçerli
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

// ─── Executor'lar (Doğrulanan payload'ı yürüten fonksiyonlar) ───────────────

async function executeWebhookN8n(payload, action) {
    const webhookUrl = process.env.N8N_PUBLISH_WEBHOOK;
    if (!webhookUrl) throw new Error("N8N_PUBLISH_WEBHOOK env tanımsız");

    const res = await fetch(webhookUrl, {
        method:  "POST",
        headers: {
            "Content-Type":     "application/json",
            "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET || "",
            "X-Source":         "ai-orchestra-worker",
            "X-Thread-Id":      action.threadId,
        },
        body: JSON.stringify({ type: "publish", ...payload }),
        signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`n8n HTTP ${res.status}: ${await res.text()}`);
    return "n8n webhook tetiklendi";
}

async function executeTelegram(payload) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) throw new Error("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID env tanımsız");

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: payload.message, parse_mode: "Markdown" }),
        signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Telegram HTTP ${res.status}`);
    return "Telegram mesajı gönderildi";
}

async function executeDiscord(payload) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) throw new Error("DISCORD_WEBHOOK_URL env tanımsız");

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
// SocialAccount token'larını DB'den okuyarak socialMediaService'i çağırır
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
    // Atomik: PENDING → PROCESSING (race condition'a karşı findOneAndUpdate)
    const action = await ActionQueue.findOneAndUpdate(
        { status: "PENDING" },
        { $set: { status: "PROCESSING", processedAt: new Date() }, $inc: { attempts: 1 } },
        { sort: { createdAt: 1 }, new: true }
    );

    if (!action) return; // Kuyruk boş

    console.log(`⚙️  ActionWorker: [${action.actionType}] işleniyor — threadId: ${action.threadId}`);

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
            case "WEBHOOK_N8N": result = await executeWebhookN8n(action.payload, action);  break;
            case "TELEGRAM":    result = await executeTelegram(action.payload);            break;
            case "DISCORD":     result = await executeDiscord(action.payload);             break;
            default:            result = await executeSocialPlatform(action.actionType, action.payload);
        }

        await ActionQueue.findByIdAndUpdate(action._id, { status: "SUCCESS", result });
        console.log(`✅ ActionWorker SUCCESS [${action.actionType}] — ${result}`);

    } catch (err) {
        // Maksimum 3 deneme sonrası FAILED
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
 * Ajan bu fonksiyonu çağırır — doğrudan hiçbir API'ye erişemez.
 */
export async function enqueueAction({ threadId, agentId, actionType, payload }) {
    const allowed = Object.keys(PAYLOAD_VALIDATORS);
    if (!allowed.includes(actionType)) {
        throw new Error(`İzin verilmeyen actionType: '${actionType}'. İzinliler: ${allowed.join(", ")}`);
    }
    const item = await ActionQueue.create({ threadId, agentId, actionType, payload });
    console.log(`📥 ActionQueue: [${actionType}] kuyruğa eklendi — id: ${item._id}`);
    return item._id;
}

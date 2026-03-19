// ── Publisher Agent (Dağıtım Koordinatörü — Ajan 9) ──
//
// 🛡️ MOAT Katman 4: Ajan İzolasyonu
// Bu ajan n8n/Telegram/Discord API'sine DOĞRUDAN erişemez.
// Tek yetkisi: ActionQueue'ya yazma.
// Gerçek yürütme → actionWorkerService.js (LLM-sız, whitelist doğrulayıcı)

import { enqueueAction } from "../services/actionWorkerService.js";

export async function publisherNode(state) {
    console.log("🚀 Dağıtım Koordinatörü (Ajan 9): Eylemler kuyruğa ekleniyor...");

    const threadId = state.threadId || "unknown";

    // 1. n8n webhook eylemi
    if (process.env.N8N_PUBLISH_WEBHOOK) {
        await enqueueAction({
            threadId,
            agentId:    "publisher",
            actionType: "WEBHOOK_N8N",
            payload: {
                threadId,
                task:          state.task          || "",
                content:       state.finalContent  || "",
                humanFeedback: state.humanFeedback || "Onaylandı ✓",
                fileSaved:     state.fileSaved      || false,
            },
        });
        console.log("   -> n8n eylemi kuyruğa eklendi.");
    } else {
        console.warn("   ⚠️ N8N_PUBLISH_WEBHOOK env eksik — n8n eylemi atlandı.");
    }

    // 2. Telegram bildirimi
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
        const preview = (state.finalContent || "").slice(0, 300);
        await enqueueAction({
            threadId,
            agentId:    "publisher",
            actionType: "TELEGRAM",
            payload: {
                message: `✅ *Yeni Rapor Yayınlandı*\n\n*Görev:* ${(state.task || "").slice(0, 100)}\n\n${preview}...`,
            },
        });
        console.log("   -> Telegram eylemi kuyruğa eklendi.");
    }

    // 3. Discord bildirimi
    if (process.env.DISCORD_WEBHOOK_URL) {
        await enqueueAction({
            threadId,
            agentId:    "publisher",
            actionType: "DISCORD",
            payload: {
                content: `✅ **Rapor Yayınlandı** | Görev: ${(state.task || "").slice(0, 100)}`,
            },
        });
        console.log("   -> Discord eylemi kuyruğa eklendi.");
    }

    console.log("✅ Publisher: Tüm eylemler ActionQueue'ya teslim edildi. Worker arka planda işleyecek.");
    return { isPublished: true };
}

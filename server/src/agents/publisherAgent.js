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

export async function publisherNode(state, config) {
    console.log("🚀 Dağıtım Koordinatörü (Ajan 9): Eylemler kuyruğa ekleniyor...");

    const threadId = state.threadId || "unknown";
    // SaaS: clientId LangGraph configurable'dan okunur (CLAUDE.md gereği config 2. param)
    const clientId = config?.configurable?.clientId || "default";

    // 1. n8n webhook eylemi — per-tenant veya global env
    await enqueueAction({
        threadId,
        clientId,
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

    // 2. Telegram bildirimi — per-tenant veya global env
    const preview = (state.finalContent || "").slice(0, 300);
    await enqueueAction({
        threadId,
        clientId,
        agentId:    "publisher",
        actionType: "TELEGRAM",
        payload: {
            message: `✅ *Yeni Rapor Yayınlandı*\n\n*Görev:* ${(state.task || "").slice(0, 100)}\n\n${preview}...`,
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
            content: `✅ **Rapor Yayınlandı** | Görev: ${(state.task || "").slice(0, 100)}`,
        },
    });
    console.log("   -> Discord eylemi kuyruğa eklendi.");

    console.log("✅ Publisher: Tüm eylemler ActionQueue'ya teslim edildi. Worker arka planda işleyecek.");
    return { isPublished: true };
}

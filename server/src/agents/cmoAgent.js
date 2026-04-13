// ── CMO Agent (Pazarlama Direktörü — Ajan 10) ──
// Bir blueprint/rapor yayinlandiginda tetiklenir.
// Uretir: LinkedIn post, Twitter/X thread, Google/Meta reklam kopisi
// Cikti: CampaignDraft olarak MongoDB'ye kaydedilir, HITL onayina sunulur.

import { ChatAnthropic } from "@langchain/anthropic";
import { trackLLMCost } from "../services/costTracker.js";

const llm = new ChatAnthropic({
    model: "claude-sonnet-4-6",
    apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Rapor iceriginden kampanya taslagini uretir.
 * @param {string} reportContent  - Yayinlanan raporun tam MarkDown icerigi
 * @param {string} task           - Orijinal gorev/baslik
 * @returns {string} Markdown formatinda kampanya taslagı
 */
export async function generateCampaign(reportContent, task, threadId = "SYSTEM", clientId = "default") {
    console.log("📣 CMO (Ajan 10): Yeni blueprint alindi. Pazarlama kampanyasi hazirlaniyor...");

    const prompt = `You are the CMO (Chief Marketing Officer) of AI Orchestra — a cutting-edge AI consulting firm in Germany.
You have just received a newly published technical blueprint/report from our R&D team.

Your mission: Transform this report into a high-impact marketing campaign package in Markdown format.

Report Title / Task:
---
${task?.slice(0, 300) || "Innovation Blueprint"}
---

Report Content (first 2000 chars):
---
${reportContent?.slice(0, 2000) || ""}
---

Generate the following campaign package:

## 1. LINKEDIN POST
Write a professional B2B LinkedIn post (150–200 words).
- Target: CTOs, Software Architects, Digital Transformation Leaders
- Tone: Authoritative, forward-looking, visionary
- Include 3–5 relevant emojis
- End with a strong call-to-action (e.g., "DM us to learn more")

## 2. TWITTER/X THREAD
Write a 3-tweet thread. Each tweet max 280 characters.
- Tweet 1: Attention-grabbing hook
- Tweet 2: Core value / key insight
- Tweet 3: Call-to-action + relevant hashtags (#AI #AIOrchestra #LangGraph)

## 3. GOOGLE/META AD COPY
- **Headline** (max 30 chars): [compelling headline]
- **Description** (max 90 chars): [benefit-focused description]
- **Primary Text** (Facebook/Instagram, max 125 chars): [engaging text]
- **Target Audience**: [specific demographic, e.g., "Software managers in DACH region, 30-50, tech industry"]
- **Placement**: LinkedIn Sponsored + Meta (Instagram/Facebook)
- **Suggested Daily Budget**: $20

## 4. CAMPAIGN SUMMARY
2-3 sentences explaining what this campaign promotes and the core value proposition.

Output ONLY the Markdown. No preamble, no explanations outside the structure.`;

    const response = await llm.invoke(prompt);
    const campaignContent = typeof response.content === "string"
        ? response.content
        : response.content?.[0]?.text || String(response.content);

    // 💰 CFO: CMO maliyetini kaydet
    trackLLMCost(
        response.usage_metadata?.input_tokens || 0,
        response.usage_metadata?.output_tokens || 0,
        "CMO", threadId, clientId
    ).catch(() => { });

    console.log(`✅ CMO: Kampanya taslagı hazır (${campaignContent.length} chars)`);
    return campaignContent;
}

/**
 * Onaylanan kampanyayi kanallara dagitir (Faz 2).
 * @param {object} campaign - CampaignDraft belgesi
 */
export async function publishCampaign(campaign) {
    console.log("🚀 CMO: Kampanya kanallara gönderiliyor...");

    const results = await Promise.allSettled([
        postCampaignToTelegram(campaign),
        postCampaignToDiscord(campaign),
    ]);

    results.forEach((r, i) => {
        if (r.status === "rejected") {
            const ch = ["Telegram", "Discord"][i];
            console.error(`❌ CMO ${ch} hatasi:`, r.reason?.message || r.reason);
        }
    });

    const anySuccess = results.some(r => r.status === "fulfilled");
    console.log(anySuccess ? "✅ CMO: Kampanya dagitildi." : "⚠️ CMO: Tüm kanallar basarisiz.");
    return anySuccess;
}

async function postCampaignToTelegram(campaign) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || token.includes("BURAYA") || !chatId) return;

    // LinkedIn post bolumunu cikart
    const linkedInMatch = campaign.campaignContent?.match(/## 1\. LINKEDIN POST\s*([\s\S]*?)(?=## 2\.)/i);
    const linkedInPost = linkedInMatch ? linkedInMatch[1].trim() : campaign.campaignContent?.slice(0, 500);

    const text = `📣 *YENİ PAZARLAMA KAMPANYASI ONAYLANDI\\!*\n\n🎯 *Proje:* ${(campaign.reportTitle || "Blueprint").replace(/[_*[\]()~>#+=|{}.!-]/g, "\\$&")}\n\n*LinkedIn Post:*\n${(linkedInPost || "").slice(0, 600).replace(/[_*[\]()~>#+=|{}.!-]/g, "\\$&")}\n\n_Tam kampanya detaylari Cyber\\-Nexus arayüzündedir\\._`;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "MarkdownV2" }),
    });

    if (res.ok) console.log("✅ CMO → Telegram: Kampanya mesaji gönderildi.");
    else console.error("❌ CMO → Telegram hatasi:", await res.text());
}

async function postCampaignToDiscord(campaign) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl || webhookUrl.includes("BURAYA")) return;

    const preview = (campaign.campaignContent || "").slice(0, 2000);

    const embed = {
        title: `📣 Yeni Kampanya: ${campaign.reportTitle || "AI Blueprint"}`,
        description: preview + (preview.length >= 2000 ? "\n\n*[...devamı Cyber-Nexus'ta]*" : ""),
        color: 0xff6b35, // Turuncu — pazarlama rengi
        fields: [
            { name: "📊 Durum", value: "✅ HITL Onaylı — Dagitildi", inline: true },
            { name: "🎯 Hedef", value: "LinkedIn + Meta + Twitter/X", inline: true },
            { name: "💰 Bütçe", value: "$20/gün", inline: true },
        ],
        footer: { text: "AI Orchestra CMO · Ajan 10 · Growth Engine" },
        timestamp: new Date().toISOString(),
    };

    const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
    });

    if (res.ok) console.log("✅ CMO → Discord: Kampanya embed gönderildi.");
    else console.error("❌ CMO → Discord hatasi:", await res.text());
}

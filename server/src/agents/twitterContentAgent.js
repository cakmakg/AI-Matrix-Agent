/**
 * Twitter Content Agent
 *
 * Standalone agent (no LangGraph) for automated tweet generation.
 *
 * Kişilik ve ton tamamen .env üzerinden ayarlanır:
 *   TWITTER_PERSONA     → Kim olduğun, bakış açın
 *   TWITTER_VOICE       → Ses tonu ve yazı stili
 *   TWITTER_LANG        → Dil tercihi (tr / de / en / mixed)
 *   TWITTER_HASHTAGS    → Tweet başına max hashtag (varsayılan: 1)
 *   TWITTER_AUTO_TOPICS → Virgülle ayrılmış konu listesi
 *   TWITTER_POST_HOUR   → Günlük üretim saati (varsayılan: 7)
 *   TWITTER_TWEETS_PER_TOPIC → Konu başına tweet sayısı (varsayılan: 3)
 */

import { ChatBedrockConverse } from "@langchain/aws";
import { ScheduledPost } from "../models/ScheduledPost.js";

const llm = new ChatBedrockConverse({
    model: "eu.anthropic.claude-sonnet-4-5-20250929-v1:0",
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Gün içinde tweet'lerin yayınlanacağı saatler
const POSTING_HOURS = [9, 12, 15, 18, 21];

// ─── Tavily Arama ────────────────────────────────────────────────────────────

async function searchTavily(query) {
    if (!process.env.TAVILY_API_KEY) return "";

    try {
        const res = await fetch("https://api.tavily.com/search", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                api_key:      process.env.TAVILY_API_KEY,
                query:        query + " 2025 2026",
                search_depth: "basic",
                max_results:  5,
            }),
            signal: AbortSignal.timeout(15_000),
        });

        if (!res.ok) return "";
        const data = await res.json();

        return (data.results ?? [])
            .map((r) => `• ${r.title}: ${(r.content ?? "").slice(0, 250)}`)
            .join("\n");
    } catch {
        return "";
    }
}

// ─── Tweet Üretici ───────────────────────────────────────────────────────────

/**
 * Bir konu için tweet'ler üret ve ScheduledPost olarak kaydet.
 * @param {string} topic   - Konu (örn: "AI agents 2026")
 * @param {number} count   - Üretilecek tweet sayısı (varsayılan: 3)
 */
export async function generateAndScheduleTweets(topic, count = 3) {
    console.log(`🐦 [TwitterAgent] Konu: "${topic}" — ${count} tweet üretiliyor...`);

    // .env'den kişilik ayarlarını oku
    const persona   = process.env.TWITTER_PERSONA   || "Teknoloji ve AI konularına meraklı, girişimci ruhlu biri";
    const voice     = process.env.TWITTER_VOICE     || "samimi, düşündürücü, zaman zaman provokatif, kişisel deneyimlerden bahseden, bağ kuran";
    const lang      = process.env.TWITTER_LANG      || "tr";
    const maxTags   = parseInt(process.env.TWITTER_HASHTAGS ?? "1", 10);

    const langGuide = {
        tr:    "Türkçe yaz. Doğal ve akıcı Türkçe kullan, resmi değil.",
        de:    "Auf Deutsch schreiben. Natürliches, umgangssprachliches Deutsch, nicht formal.",
        en:    "Write in English. Natural, conversational English, not formal.",
        mixed: "Mix Turkish and English naturally — like how tech-savvy people in Turkey actually write.",
    }[lang] || "Türkçe yaz.";

    // 1. Güncel içerik ara (arka plan bağlamı için)
    const searchData = await searchTavily(topic);

    // 2. Prompt — haber değil, insan sesi
    const prompt = `Sen ${persona} birisin.
Ses tonun: ${voice}.
${langGuide}

Konu: "${topic}"

${searchData
    ? `Bu konuyla ilgili internette bulduğum bazı güncel bilgiler var — ama bunları haber gibi aktarma, sadece arka plan bağlamı olarak kullan:\n${searchData}\n`
    : ""}

Şimdi bu konuyla ilgili ${count} tweet yaz.

NASIL YAZACAKSIN:
- Sanki gerçekten bu konuyu düşünen, deneyim yaşayan bir insan gibi yaz
- Kendi görüşünü, bakış açını ortaya koy — sadece bilgi aktarma
- Soru sor, tartışma başlat, insanları düşündür
- Kişisel gözlem ve deneyimlerden yola çık ("Bugün fark ettim ki...", "Kimse söylemiyor ama...", "X yıldır bu alanda çalışıyorum ve...")
- Bazen meydan oku, bazen itiraf et, bazen şaşırt
- Emoji: sadece gerçekten uygun düşüyorsa, 1-2 tane max
- Hashtag: en fazla ${maxTags} tane, sadece gerçekten gerekiyorsa
- Haber ajansı gibi YAZMA. "Yapay zeka sektöründe önemli gelişmeler..." gibi başlama
- Tweet başına MAX 260 karakter

KAÇINACAKLARIN:
- "Bu tweet'te...", "Bugün X hakkında paylaşmak istiyorum" gibi meta açıklamalar
- Klişe motivasyon sözleri
- Haber bülteni dili
- Her tweette aynı yapı/kalıp

FORMAT:
Her tweet arasına sadece "---" koy.
Başka hiçbir şey yazma — sadece tweetlerin kendisi.`;

    const response = await llm.invoke(prompt);
    const rawContent = typeof response.content === "string"
        ? response.content
        : String(response.content);

    // 3. Tweet'leri ayrıştır ve doğrula
    const tweets = rawContent
        .split("---")
        .map((t) => t.trim())
        .filter((t) => t.length > 10 && t.length <= 280);

    if (tweets.length === 0) {
        console.warn(`⚠️ [TwitterAgent] "${topic}" için tweet üretilemedi.`);
        return [];
    }

    // 4. Planla — bugün için mevcut saatler + yetmezse yarın
    const now     = new Date();
    const nowHour = now.getHours();
    const today   = new Date(now);

    const futureToday = POSTING_HOURS.filter((h) => h > nowHour);
    const allSlots    = [
        ...futureToday.map((h) => ({ day: 0, hour: h })),
        ...POSTING_HOURS.map((h) => ({ day: 1, hour: h })),
    ].slice(0, tweets.length);

    const createdIds = [];

    for (let i = 0; i < tweets.length; i++) {
        const slot = allSlots[i] ?? { day: 1, hour: POSTING_HOURS[i % POSTING_HOURS.length] };

        const scheduledAt = new Date(today);
        scheduledAt.setDate(scheduledAt.getDate() + slot.day);
        scheduledAt.setHours(slot.hour, 0, 0, 0);

        const post = await ScheduledPost.create({
            platforms:   ["twitter"],
            content:     tweets[i],
            scheduledAt,
            title:       `[Auto-X] ${topic.slice(0, 50)}`,
            status:      "PENDING",
        });

        createdIds.push(post._id.toString());
        console.log(`   📅 Tweet ${i + 1}/${tweets.length} → ${scheduledAt.toLocaleString("tr-TR")}: "${tweets[i].slice(0, 60)}..."`);
    }

    console.log(`✅ [TwitterAgent] "${topic}": ${createdIds.length} tweet planlandı.`);
    return createdIds;
}

// ─── Günlük Toplu Çalışma ────────────────────────────────────────────────────

export async function runDailyTwitterScheduler() {
    const rawTopics = process.env.TWITTER_AUTO_TOPICS ?? "";
    const topics    = rawTopics
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

    if (topics.length === 0) {
        console.log("ℹ️ [TwitterAgent] TWITTER_AUTO_TOPICS tanımlı değil — otomatik tweet atlandı.");
        return;
    }

    const tweetsPerTopic = parseInt(process.env.TWITTER_TWEETS_PER_TOPIC ?? "3", 10);

    console.log(`\n🐦 [TWITTER DAILY SCHEDULER] ${topics.length} konu, konu başına ${tweetsPerTopic} tweet...`);

    for (const topic of topics) {
        try {
            await generateAndScheduleTweets(topic, tweetsPerTopic);
        } catch (err) {
            console.error(`❌ [TwitterAgent] "${topic}" hatası: ${err.message}`);
        }
    }

    console.log("✅ [TWITTER DAILY SCHEDULER] Tamamlandı.");
}

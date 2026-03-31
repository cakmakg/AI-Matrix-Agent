/**
 * Social Content Agent — Multi-Mandant, branchenagnostischer autonomer Inhaltsgenerator.
 *
 * Jeder Mandant verwaltet seine Konfiguration über TenantConfig.socialAuto:
 *   topics[]     → Zu welchen Themen Inhalte erstellt werden sollen (branchenspezifisch)
 *   platforms[]  → Welche Plattformen (twitter, linkedin, instagram)
 *   persona      → Wer du bist, deine Perspektive (Markenstimme)
 *   voice        → Schreibstil und Ton
 *   lang         → Sprache (de / en / tr / mixed)
 *   postHour     → Tägliche Auslöseuhrzeit
 *   postsPerTopic→ Anzahl Beiträge pro Thema
 *   requireHITL  → true: AWAITING_APPROVAL (Mensch prüft), false: PENDING (Automatische Veröffentlichung)
 *
 * Branchenbeispiele:
 *   Immobilienmakler → topics: ["Hypothekenzinsen Deutschland", "Berliner Mietmarkt 2026"]
 *   Rechtsanwalt     → topics: ["Mietrechtsänderungen", "Arbeitsrecht aktuell"]
 *   Steuerberater    → topics: ["Steuererklärung Fristen", "Umsatzsteuer-Updates"]
 *   E-Commerce       → topics: ["Conversion-Optimierung", "Warenkorbabbrüche reduzieren"]
 */

import { ChatBedrockConverse } from "@langchain/aws";
import { ScheduledPost } from "../models/ScheduledPost.js";
import { TenantConfig } from "../models/TenantConfig.js";
import { Client } from "../models/Client.js";

// ─── Telegram-Benachrichtigung ────────────────────────────────────────────────

/**
 * Sendet eine Telegram-Benachrichtigung, wenn neue AWAITING_APPROVAL-Posts erstellt wurden.
 * Nutzt zunächst den mandantenspezifischen Token/ChatId (integrations),
 * fällt dann auf die globalen ENV-Variablen zurück.
 *
 * @param {object} tenantIntegrations - TenantConfig.integrations (kann null sein)
 * @param {string} clientSlug         - Mandanten-Slug für die Nachricht
 * @param {string} topic              - Inhaltsthema
 * @param {string} platform           - Zielplattform
 * @param {number} count              - Anzahl erstellter Beiträge
 */
async function sendHITLNotification(tenantIntegrations, clientSlug, topic, platform, count) {
    const token  = tenantIntegrations?.telegramBotToken  || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = tenantIntegrations?.telegramChatId    || process.env.TELEGRAM_CHAT_ID;

    if (!token || token.includes("BURAYA") || !chatId) return;

    const text = `🤖 *Autopilot: Neue Beiträge zur Freigabe*\n\n`
        + `👤 Mandant: \`${clientSlug}\`\n`
        + `📱 Plattform: ${platform.toUpperCase()}\n`
        + `📌 Thema: ${topic.slice(0, 80)}\n`
        + `📝 Anzahl: ${count} Beitrag(e)\n\n`
        + `_Bitte prüfen und freigeben im Social\\-Media\\-Panel\\._`;

    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: "MarkdownV2" }),
            signal: AbortSignal.timeout(10_000),
        });
        console.log(`   📨 [Telegram] HITL-Benachrichtigung gesendet → ${clientSlug}/${platform}`);
    } catch (err) {
        console.warn(`   ⚠️ [Telegram] Benachrichtigung fehlgeschlagen: ${err.message}`);
    }
}

const llm = new ChatBedrockConverse({
    model: "eu.anthropic.claude-sonnet-4-5-20250929-v1:0",
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Standard-Veröffentlichungszeiten innerhalb eines Tages (für ScheduledPost.scheduledAt)
const POSTING_HOURS = [9, 12, 15, 18, 21];

// ─── Tavily-Suche ─────────────────────────────────────────────────────────────

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
            .map(r => `• ${r.title}: ${(r.content ?? "").slice(0, 250)}`)
            .join("\n");
    } catch {
        return "";
    }
}

// ─── Plattform-Prompt-Vorlage ─────────────────────────────────────────────────

function buildPrompt(topic, platform, cfg, searchData) {
    const persona  = cfg.persona     || "Ein erfahrener Fachexperte mit fundiertem Branchenwissen";
    const voice    = cfg.voice       || "authentisch, nachdenklich, aus persönlicher Erfahrung schreibend";
    const lang     = cfg.lang        || "de";
    const maxTags  = cfg.maxHashtags ?? 1;
    const count    = cfg.postsPerTopic ?? 3;

    const langGuide = {
        de:    "Schreibe auf Deutsch. Natürliches, umgangssprachliches Deutsch, nicht formal.",
        en:    "Write in English. Natural, conversational tone, not formal.",
        tr:    "Türkçe yaz. Doğal ve akıcı Türkçe kullan, resmi değil.",
        mixed: "Mische Deutsch und Englisch auf natürliche Weise.",
    }[lang] || "Schreibe auf Deutsch. Natürliches Deutsch.";

    const ctx = searchData
        ? `Aktuelle Hintergrundinformationen (nicht wie eine Nachrichtenmeldung wiedergeben, nur als Kontext nutzen):\n${searchData}\n\n`
        : "";

    if (platform === "twitter") {
        return `Du bist ${persona}. Dein Ton: ${voice}. ${langGuide}

Thema: "${topic}"
${ctx}
Schreibe ${count} Tweets.

REGELN:
- Schreibe wie ein Mensch, der dieses Thema wirklich erlebt
- Zeige persönliche Beobachtungen und Meinungen — nicht nur Fakten weitergeben
- MAX 260 Zeichen pro Tweet
- Emoji: nur wenn passend, max 1–2 | Hashtag: maximal ${maxTags}
- KEIN Nachrichtenagentur-Stil
- Trenne jeden Tweet nur mit "---", schreibe sonst nichts`;
    }

    if (platform === "linkedin") {
        return `Du bist ${persona}. Dein Ton: ${voice}. ${langGuide}

Thema: "${topic}"
${ctx}
Schreibe ${count} LinkedIn-Posts.

REGELN:
- Hook-Satz: Der erste Satz muss den Leser stoppen
- Länge: 150–250 Wörter
- Aufbau: Hook → Kontext/Beobachtung → Mehrwert/Empfehlung → Abschluss
- Professionell aber authentisch — kein Newsletter-Stil, menschliche Stimme
- Hashtag: maximal ${maxTags}, ans Ende setzen
- Trenne jeden Post nur mit "---", schreibe sonst nichts`;
    }

    if (platform === "instagram") {
        return `Du bist ${persona}. Dein Ton: ${voice}. ${langGuide}

Thema: "${topic}"
${ctx}
Schreibe ${count} Instagram-Captions.

REGELN:
- Kurz und aufmerksamkeitsstark — die ersten 2 Sätze müssen zum Weiterlesen animieren
- Evoziere eine visuelle Szene oder ein Gefühl
- Emojis sind erlaubt, wirke natürlich
- Hashtag: ${maxTags} Stück, ans Ende setzen
- Trenne jede Caption nur mit "---"`;
    }

    // Generischer Fallback (für zukünftige Plattformen)
    return `Du bist ${persona}. ${langGuide}
Thema: "${topic}"
${ctx}
Schreibe ${count} kurze, wirkungsvolle Beiträge für ${platform}. Trenne jeden Beitrag mit "---".`;
}

// ─── Inhaltsgenerator und Planer ──────────────────────────────────────────────

/**
 * Erstellt Inhalte zu einem bestimmten Thema und einer Plattform und speichert sie als ScheduledPost.
 *
 * @param {string} topic              - Inhaltsthema (branchenspezifisch, freier Text)
 * @param {string} platform           - "twitter" | "linkedin" | "instagram"
 * @param {object} socialAutoCfg      - TenantConfig.socialAuto-Objekt
 * @param {string} clientId           - Mandanten-Slug
 * @param {object} [integrations]     - TenantConfig.integrations (optional, für HITL-Benachrichtigung)
 * @returns {string[]}                - Erstellte ScheduledPost-IDs
 */
export async function generateAndScheduleContent(topic, platform, socialAutoCfg, clientId, integrations = null) {
    const requireHITL = socialAutoCfg.requireHITL ?? true;

    console.log(`📱 [SocialAgent] "${topic}" → ${platform} | Mandant: ${clientId} | HITL: ${requireHITL}`);

    const searchData = await searchTavily(topic);
    const prompt     = buildPrompt(topic, platform, socialAutoCfg, searchData);

    const response = await llm.invoke(prompt);
    const raw      = typeof response.content === "string" ? response.content : String(response.content);

    const maxLen = platform === "twitter" ? 280 : 5000;
    const posts  = raw
        .split("---")
        .map(p => p.trim())
        .filter(p => p.length > 10 && p.length <= maxLen);

    if (posts.length === 0) {
        console.warn(`⚠️ [SocialAgent] Kein Inhalt für "${topic}" generiert.`);
        return [];
    }

    // Veröffentlichungszeiten berechnen
    const now         = new Date();
    const futureToday = POSTING_HOURS.filter(h => h > now.getHours());
    const allSlots    = [
        ...futureToday.map(h => ({ day: 0, hour: h })),
        ...POSTING_HOURS.map(h => ({ day: 1, hour: h })),
    ].slice(0, posts.length);

    const status     = requireHITL ? "AWAITING_APPROVAL" : "PENDING";
    const createdIds = [];

    for (let i = 0; i < posts.length; i++) {
        const slot        = allSlots[i] ?? { day: 1, hour: POSTING_HOURS[i % POSTING_HOURS.length] };
        const scheduledAt = new Date(now);
        scheduledAt.setDate(scheduledAt.getDate() + slot.day);
        scheduledAt.setHours(slot.hour, 0, 0, 0);

        const post = await ScheduledPost.create({
            platforms:   [platform],
            content:     posts[i],
            scheduledAt,
            status,
            clientId,
            title: `[Auto-${platform.toUpperCase()}] ${topic.slice(0, 50)}`,
        });

        createdIds.push(post._id.toString());
        console.log(`   📅 [${status}] Beitrag ${i + 1}/${posts.length} → ${scheduledAt.toLocaleString("de-DE")}: "${posts[i].slice(0, 60)}..."`);
    }

    console.log(`✅ [SocialAgent] "${topic}": ${createdIds.length} Beiträge erstellt (${status}).`);

    // Telegram-Benachrichtigung nur bei HITL-Pflicht (requireHITL=true)
    if (requireHITL && createdIds.length > 0) {
        await sendHITLNotification(integrations, clientId, topic, platform, createdIds.length);
    }

    return createdIds;
}

// ─── Täglicher Mandanten-Loop-Scheduler ───────────────────────────────────────

/**
 * Wird stündlich von cronService aufgerufen.
 * Verarbeitet alle Mandanten, deren postHour mit der aktuellen Stunde übereinstimmt.
 * Kein Mandant aktiv → Fallback auf ENV-Variablen (Rückwärtskompatibilität).
 */
export async function runDailySocialScheduler() {
    const currentHour = new Date().getHours();
    console.log(`\n📱 [SOCIAL SCHEDULER] ${currentHour}:00 Uhr — aktive Mandanten werden geprüft...`);

    const activeCfgs = await TenantConfig.find({
        "socialAuto.isActive":  true,
        "socialAuto.postHour":  currentHour,
        "socialAuto.topics.0":  { $exists: true }, // mindestens 1 Thema vorhanden
    }).lean();

    if (activeCfgs.length === 0) {
        // ENV-Fallback — Rückwärtskompatibilität für Einzelmandanten-Setups
        const envHour   = parseInt(process.env.TWITTER_POST_HOUR ?? "7", 10);
        const rawTopics = process.env.TWITTER_AUTO_TOPICS ?? "";
        if (currentHour === envHour && rawTopics) {
            console.log("   ℹ️  Keine Mandanten-Konfiguration — ENV-Fallback wird ausgeführt.");
            const topics = rawTopics.split(",").map(t => t.trim()).filter(Boolean);
            const envCfg = {
                persona:       process.env.TWITTER_PERSONA  || "",
                voice:         process.env.TWITTER_VOICE    || "",
                lang:          process.env.TWITTER_LANG     || "de",
                maxHashtags:   parseInt(process.env.TWITTER_HASHTAGS         ?? "1", 10),
                postsPerTopic: parseInt(process.env.TWITTER_TWEETS_PER_TOPIC ?? "3", 10),
                requireHITL:   false,
            };
            for (const topic of topics) {
                await generateAndScheduleContent(topic, "twitter", envCfg, "default")
                    .catch(err => console.error(`❌ [SocialAgent] ENV-Thema "${topic}": ${err.message}`));
            }
        } else {
            console.log("   ℹ️  Keine aktiven Mandanten für diese Stunde.");
        }
        return;
    }

    console.log(`   → ${activeCfgs.length} aktive Mandanten gefunden.`);

    for (const cfg of activeCfgs) {
        try {
            const client = await Client.findById(cfg.clientId).lean();
            if (!client) {
                console.warn(`   ⚠️ Client-Eintrag für clientId ${cfg.clientId} nicht gefunden — wird übersprungen.`);
                continue;
            }

            const { socialAuto } = cfg;
            const platforms      = socialAuto.platforms?.length ? socialAuto.platforms : ["twitter"];

            console.log(`\n   🏢 [${client.slug}] ${socialAuto.topics.length} Themen × ${platforms.join("+")} Plattform(en)`);

            for (const topic of socialAuto.topics) {
                for (const platform of platforms) {
                    await generateAndScheduleContent(topic, platform, socialAuto, client.slug, cfg.integrations ?? null)
                        .catch(err => console.error(`❌ [SocialAgent] ${client.slug}/${platform}/"${topic}": ${err.message}`));
                }
            }
        } catch (err) {
            console.error(`❌ [SocialAgent] Allgemeiner Fehler für Mandant ${cfg.clientId}: ${err.message}`);
        }
    }

    console.log("✅ [SOCIAL SCHEDULER] Abgeschlossen.");
}

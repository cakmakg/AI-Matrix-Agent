import { ChatBedrockConverse } from "@langchain/aws";
import { trackLLMCost } from "../services/costTracker.js";
import Feedback from "../models/Feedback.js";
import { getPrompt } from "../services/promptRepository.js";

async function getRecentNegativeFeedbacks(clientId, limit = 3) {
    try {
        return await Feedback.find({ clientId, vote: "down" })
            .sort({ createdAt: -1 })
            .limit(limit)
            .select("reason");
    } catch {
        return [];
    }
}

// Ajan 3'ün Beyni (Kalite için Sonnet kullanıyoruz)
const llm = new ChatBedrockConverse({
    model: "eu.anthropic.claude-sonnet-4-5-20250929-v1:0",
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

export async function writerNode(state, config) {
    const tenantConfig = config?.configurable?.tenantConfig;
    const clientIdForPrompt = config?.configurable?.tenantConfig?.clientId || "default";
    const writerPromptOverride = await getPrompt("WRITER", clientIdForPrompt);
    const persona = writerPromptOverride || tenantConfig?.agentPersona || "Sie sind ein erfahrener Senior IT Consultant und Pre-Sales Architect in Deutschland.";
    const tone = tenantConfig?.tone || "professionelles B2B Business-Deutsch";

    let prompt = "";

    // 📚 Feedback Loop: son negatif geri bildirimleri öğrenme kuralı olarak enjekte et
    const clientId = config?.configurable?.tenantConfig?.clientId || "default";
    const negativeFeedbacks = await getRecentNegativeFeedbacks(clientId);
    let learningPrefix = "";
    if (negativeFeedbacks.length > 0) {
        const rules = negativeFeedbacks.map((f, i) => `${i + 1}. "${f.reason}"`).join("\n");
        learningPrefix = `⚠️ KRITISCHE LERNREGEL — Benutzer hat frühere Fehler korrigiert:\n${rules}\n\nBitte beachte diese Regeln unbedingt.\n\n---\n\n`;
    }

    // 🎯 Hangi geri bildirimi kullanacağız? Yargıcınki mi, Eleştirmeninki mi?
    const activeFeedback = state.humanFeedback || state.criticFeedback;
    const feedbackSource = state.humanFeedback ? "MENSCHLICHER RICHTER (Yargıç)" : "QUALITÄTSPRÜFER (Eleştirmen)";

    // 📣 Social Media modu tespiti
    const taskLower = (state.task || "").toLowerCase();
    const isSocialMediaTask = taskLower.includes("twitter") || taskLower.includes("linkedin");
    const isTwitterOnly = taskLower.includes("twitter") && !taskLower.includes("linkedin");
    const isLinkedInOnly = taskLower.includes("linkedin") && !taskLower.includes("twitter");

    // EĞER BİR FIRÇA (GERİ BİLDİRİM) GELDİYSE:
    if (activeFeedback) {
        console.log(`✍️ İçerik Üretici (Ajan 3): ${feedbackSource} tarafından red yedik! Metin geri bildirime göre düzeltiliyor...`);

        if (isSocialMediaTask) {
            prompt = `Du bist ein viraler Social-Media-Experte und CMO.
            Dein vorheriger Social-Media-Entwurf wurde vom ${feedbackSource} abgelehnt.

            Feedback (zwingend umsetzen):
            ---
            ${activeFeedback}
            ---

            Dein vorheriger Entwurf:
            ---
            ${state.finalContent}
            ---

            Überarbeite den Content basierend auf dem Feedback.
            Behalte das Format (Twitter-Thread und/oder LinkedIn-Post mit Markdown) bei.
            Gib NUR den finalen, korrigierten Content aus. Keine Erklärungen.`;
        } else {
            prompt = `${persona}
            Ihr vorheriger Entwurf wurde vom ${feedbackSource} abgelehnt.

            Hier ist das Feedback (Was Sie zwingend korrigieren müssen):
            ---
            ${activeFeedback}
            ---

            Hier ist Ihr vorheriger Entwurf, der korrigiert werden muss:
            ---
            ${state.finalContent}
            ---

            Bitte überarbeiten und korrigieren Sie den Text basierend auf dem Feedback.

            Regeln:
            1. Setzen Sie das Feedback EXAKT um.
            2. Verwenden Sie ein ${tone} (außer das Feedback verlangt etwas anderes).
            3. Behalten Sie die strukturierte Form bei.
            4. Nutzen Sie Markdown-Formatierungen.
            5. Geben Sie NUR den endgültigen, korrigierten Bericht aus. Keine Erklärungen.`;
        }
    }
    // 📣 SOCIAL MEDIA MODU (TWITTER / LINKEDIN):
    else if (isSocialMediaTask) {
        const platform = isTwitterOnly ? "Twitter/X" : isLinkedInOnly ? "LinkedIn" : "Twitter/X und LinkedIn";
        console.log(`✍️ İçerik Üretici (Ajan 3) devrede. ${platform} için viral Social Media içeriği oluşturuluyor...`);

        prompt = `Du bist ein viraler Social-Media-Experte, Growth Hacker und CMO mit 10 Jahren Erfahrung.
        Du erhältst aktuelle Recherche-Daten zu einem Thema. Deine Aufgabe ist es, daraus mitreißenden ${platform}-Content zu erstellen.

        Thema/Aufgabe: "${state.task}"

        Recherche-Daten:
        ---
        ${state.scrapedData || "Keine Recherche-Daten verfügbar. Nutze dein Wissen zum Thema."}
        ---

        ${isTwitterOnly ? `
        Erstelle einen fesselnden Twitter/X-Thread:
        REGELN:
        1. Genau 5-7 Tweets im Thread.
        2. Tweet 1 (Hook): Maximal 280 Zeichen. Muss sofort Aufmerksamkeit erregen – eine provokante Frage, schockierende Zahl oder steile These.
        3. Tweet 2-6 (Body): Jeweils max. 280 Zeichen. Jeder Tweet = ein klarer Gedanke/Fakt. Nummerierung: "2/7", "3/7" etc.
        4. Letzter Tweet (CTA): Abschluss mit einer Frage an die Community oder einem klaren Call-to-Action.
        5. Nutze 2-3 relevante Hashtags nur im letzten Tweet.
        6. Nutze passende Emojis sparsam (1-2 pro Tweet).
        7. Keine Floskeln. Sei direkt, wertsteigernd, meinungsstark.
        8. Format: Jeden Tweet mit "---" trennen.
        ` : isLinkedInOnly ? `
        Erstelle einen hochwertigen LinkedIn-Post:
        REGELN:
        1. Hook (erste Zeile): Maximal 2 Sätze, muss zum "mehr lesen" verführen.
        2. Hauptteil: 150-250 Wörter. Strukturiert mit Leerzeilen. Nutze Bullet-Points (•) für Key Insights.
        3. Schluss: 1-2 Sätze mit einer Reflexionsfrage oder Meinungsaufforderung.
        4. Hashtags: 5-8 relevante Hashtags am Ende.
        5. Ton: Professionell aber menschlich. Thought Leadership. Keine Werbung.
        6. Nutze passende Emojis für visuelle Struktur (maximal 5).
        ` : `
        Erstelle BEIDE: Einen Twitter/X-Thread UND einen LinkedIn-Post.

        ## 🐦 TWITTER/X THREAD:
        - 5-7 Tweets, jeweils max. 280 Zeichen
        - Tweet 1: starker Hook (Frage/Zahl/These)
        - Tweets 2-6: je ein klarer Gedanke, nummeriert "2/7" etc.
        - Letzter Tweet: CTA + 2-3 Hashtags
        - Emojis sparsam (1-2 pro Tweet)
        - Tweets mit "---" trennen

        ## 💼 LINKEDIN POST:
        - Hook: max. 2 Sätze
        - Hauptteil: 150-250 Wörter mit Bullet-Points (•)
        - Schluss: Reflexionsfrage
        - 5-8 Hashtags
        - Professioneller Ton, Thought Leadership
        `}

        Gib NUR den fertigen Content aus. Keine Einleitungen oder Erklärungen.
        Verwende Markdown-Formatierung für Überschriften.`;
    }
    else {
        console.log("✍️ İçerik Üretici (Ajan 3) devrede. Rapor ilk kez B2B IT formatında Almanca metne dökülüyor...");

        const innovatorSection = state.innovatorInsight
            ? `\n\n        Außerdem hat unser "Visionary Agent" folgende provokante Alternative entwickelt.
        Du MUSST diese als eigenen Abschnitt mit der Überschrift "## Visionäre Alternative" in den Bericht integrieren.
        Stelle sie als mutige Gegenperspektive dar, die der Entscheider kennen sollte, bevor er sich festlegt.
        Verwende ausschließlich Deutsch und keine Emojis in Überschriften.

        Visionäre Alternative:
        ${state.innovatorInsight}`
            : "";

        prompt = `${persona}
        Unten finden Sie einen strategischen Bericht, der von unserem Datenanalysten erstellt wurde.
        Ihre Aufgabe ist es, diesen Bericht umfassend und hochwertig zu formatieren.

        Regeln:
        1. Verwenden Sie ein ${tone}.
        2. Strukturieren Sie den Bericht logisch und professionell mit Abschnitten wie:
           - **Management Summary** (Kurze Zusammenfassung des Wertversprechens)
           - **IST-Analyse** (Aktuelle Situation & Herausforderungen des Kunden)
           - **SOLL-Konzept** (Zielzustand & technologischer Lösungsansatz)
           - **Architektur & Roadmap** (Schritte zur technischen Umsetzung)
           - **Business Value / ROI** (Warum sich diese Investition lohnt)
           - **Visionäre Alternative** (Falls vorhanden — die mutige Gegenperspektive des Visionary Agents)
        3. Nutzen Sie Markdown-Formatierungen (Überschriften # und ##, Aufzählungen, fette Texte), um das Lesen zu erleichtern.
        4. Fügen Sie eine formelle Begrüßung (z.B. "Sehr geehrte Damen und Herren,") und eine professionelle Verabschiedung (z.B. "Mit freundlichen Grüßen,") hinzu.
        5. Geben Sie NUR den endgültigen Bericht aus. Keine einleitenden Sätze oder Erklärungen.
        6. WICHTIG — Berechnen Sie am Ende einen KI-Konfidenzwert (0-100) nach dieser Logik:
           - Basis: 50 Punkte
           - Recherche-Daten vorhanden und umfangreich (>500 Zeichen): +20
           - Klare strategische Empfehlungen mit konkreten Maßnahmen: +15
           - Keine wesentlichen Datenlücken oder Unsicherheiten im Analysebericht: +15
           Geben Sie diesen Wert in der ALLERLETZTEN Zeile aus, exakt so (keine Erklärung, nur diese Zeile):
           CONFIDENCE_SCORE:XX

        Hier ist der Analysebericht:
        ${state.analysisReport}${innovatorSection}`;
    }

    // 📚 Öğrenme kurallarını prompt başına ekle
    if (learningPrefix) prompt = learningPrefix + prompt;

    // AWS Bedrock'a metni yazdırıyoruz
    const response = await llm.invoke(prompt);

    // 💰 CFO: Writer maliyetini kaydet
    trackLLMCost(
        response.usage_metadata?.input_tokens || 0,
        response.usage_metadata?.output_tokens || 0,
        "WRITER", state.threadId || "SYSTEM", config?.configurable?.tenantConfig?.clientId || "default"
    ).catch(() => { });

    // 🎯 Güven Skoru: CONFIDENCE_SCORE:XX satırını response'dan çıkar ve temizle
    const rawContent = String(response.content);
    const scoreMatch = rawContent.match(/CONFIDENCE_SCORE:(\d{1,3})/);
    const confidenceScore = scoreMatch
        ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10)))
        : 75;
    const finalContent = rawContent.replace(/\n?CONFIDENCE_SCORE:\d{1,3}\s*$/m, "").trimEnd();

    const logMsg = isSocialMediaTask ? "Social Media Content hazır!" : "Deutscher IT-Pitch ist fertig! (Almanca IT Teklifi hazır!)";
    console.log(`✅ İçerik Üretici: ${logMsg} | Güven Skoru: ${confidenceScore}/100`);

    return {
        finalContent,
        confidenceScore,
        criticFeedback: null,
        humanFeedback: null,
        isApproved: false,
        fileSaved: false,
        humanApproval: null,
        revisionCount: activeFeedback ? 1 : 0
    };
}
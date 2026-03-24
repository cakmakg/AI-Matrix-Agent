import SystemPrompt from "../models/SystemPrompt.js";

// ── Default prompts (editable instruction block, WITHOUT data interpolation) ──
export const DEFAULT_PROMPTS = {
    ANALYZER:
        "Du bist ein erfahrener Senior-Strategie-Analyst.\n" +
        "Unten stehen Rohdaten, die aus dem Internet gesammelt wurden. " +
        "Lies sie und erstelle daraus einen kurzen, strategischen 3-Punkte-Aktionsplan für das Management.\n" +
        "Antworte ausschliesslich auf Deutsch.",

    CRITIC:
        "Sie sind ein strenger und detailorientierter Quality Assurance Manager (Qualitätsprüfer) " +
        "für ein deutsches Technologieunternehmen.\n" +
        "Ihre Aufgabe ist es, den von unserem Copywriter erstellten strategischen Bericht zu prüfen, " +
        "bevor er an die Geschäftsführung gesendet wird.\n\n" +
        "Prüfen Sie den folgenden Text nach diesen strikten Kriterien:\n" +
        "1. Ist die Sprache ein makelloses, professionelles Business-Deutsch " +
        "(formelle Anrede \"Sie\", korrekte Grammatik und Rechtschreibung)?\n" +
        "2. Wurde das Markdown-Format (.md) korrekt verwendet (Überschriften, Listen, fette Texte)?\n" +
        "3. Gibt es eine formelle Begrüßung (z.B. \"Sehr geehrte Geschäftsführung\") " +
        "und eine professionelle Verabschiedung?\n" +
        "4. Ist der Tonfall sachlich, strategisch und für Top-Manager angemessen?\n\n" +
        "Wenn ALLE Kriterien perfekt erfüllt sind, geben Sie isApproved: true zurück.\n" +
        "Wenn AUCH NUR EIN Kriterium nicht erfüllt ist, geben Sie isApproved: false zurück UND " +
        "schreiben Sie in 'criticFeedback' exakt, was der Copywriter korrigieren muss (auf Deutsch). Seien Sie kritisch!",

    WRITER:
        "Sie sind ein erfahrener Senior IT Consultant und Pre-Sales Architect in Deutschland.",
};

// ── In-memory cache: `${clientId}:${agentName}` → { text, expiresAt } ──
const cache = new Map();
const TTL = 60_000; // 60 seconds

export async function getPrompt(agentName, clientId = "default") {
    const key = `${clientId}:${agentName}`;
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) return cached.text;

    try {
        const doc = await SystemPrompt.findOne({ agentName, clientId });
        const text = doc?.promptText || null;
        if (text) cache.set(key, { text, expiresAt: now + TTL });
        return text; // null → caller uses its own default
    } catch {
        return null;
    }
}

export async function savePrompt(agentName, promptText, clientId = "default") {
    cache.delete(`${clientId}:${agentName}`);
    await SystemPrompt.findOneAndUpdate(
        { agentName, clientId },
        { promptText },
        { upsert: true, new: true }
    );
}

export async function deletePrompt(agentName, clientId = "default") {
    cache.delete(`${clientId}:${agentName}`);
    await SystemPrompt.deleteOne({ agentName, clientId });
}

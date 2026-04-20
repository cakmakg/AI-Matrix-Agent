import { ChatAnthropic } from "@langchain/anthropic";
import { trackLLMCost } from "../services/costTracker.js";
import { SupplyChainEvent } from "../models/SupplyChainEvent.js";
import { searchKnowledge } from "../services/ragService.js";

const llm = new ChatAnthropic({
    model: "claude-sonnet-4-6",
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const SUPPLY_CHAIN_SYSTEM_PROMPT = `Sie sind ein präziser KI-Lieferkettenplaner (Agent 14 — Der Planer).
Ihre Aufgabe ist es, Lagerbestände zu analysieren, kritische Engpässe vorherzusagen und Bestellempfehlungen zu erstellen.

IHRE FÄHIGKEITEN:
1. Bestandsanalyse: Bewerten Sie aktuelle Lagermengen im Verhältnis zu Sicherheitsbestand und Verbrauchsrate.
2. Auslaufprognose: Berechnen Sie, in wie vielen Tagen der Bestand erschöpft sein wird.
3. Bestellempfehlung: Empfehlen Sie die optimale Bestellmenge basierend auf Lieferzeit und Verbrauch.
4. E-Mail-Entwurf: Erstellen Sie eine professionelle Bestellanfrage an den Lieferanten.

DRINGLICHKEITSSTUFEN:
- KRITISCH: Bestand reicht < 3 Tage
- HOCH: Bestand reicht 3-7 Tage
- MITTEL: Bestand reicht 7-14 Tage
- NIEDRIG: Bestand reicht > 14 Tage

AUSGABEFORMAT (immer Markdown):
## Lagerbestandsanalyse — [Produktname / SKU]

### Bestandsstatus
- **Aktueller Bestand:** [Menge] Einheiten
- **Nachbestellpunkt:** [Menge] Einheiten
- **Verbrauchsrate:** [Einheiten/Tag]
- **Voraussichtlicher Lagerausfall:** [X] Tage
- **Dringlichkeitsstufe:** 🔴 KRITISCH / 🟠 HOCH / 🟡 MITTEL / 🟢 NIEDRIG

### Analyse
[Detaillierte Bestandsanalyse und Begründung]

### Empfohlene Bestellmenge
**[Menge] Einheiten** — [Begründung]

### Bestellanfrage-Entwurf
[Professionelle E-Mail an den Lieferanten auf Türkisch oder Deutsch je nach Kontext]`;

export async function supplyChainNode(state, config) {
    console.log("📦 Tedarik Zinciri Planlayıcısı (Ajan 14) devrede. Stok analiz ediliyor...");

    const clientId = config?.configurable?.tenantConfig?.clientId || "default";
    const taskText = state.task || "";

    // RAG: Tedarikçi bilgileri ve geçmiş sipariş verileri
    let ragContext = "";
    try {
        const skuMatch = taskText.match(/sku[:\s]+([^\n,\s]+)/i) ||
                         taskText.match(/urun[:\s]+([^\n,]+)/i) ||
                         taskText.match(/produkt[:\s]+([^\n,]+)/i);
        if (skuMatch) {
            const searchTerm = skuMatch[1].trim();
            const ragResult = await searchKnowledge(clientId, `${searchTerm} Lieferant Lieferzeit Bestellmenge`);
            if (ragResult && ragResult.context) {
                ragContext = ragResult.context;
                console.log(`   -> RAG: "${searchTerm}" için ${ragResult.sources?.length ?? 0} tedarikçi kaydı bulundu.`);
            }
        }
    } catch (err) {
        console.warn("   -> RAG arama başarısız (devam ediliyor):", err.message);
    }

    const prompt = `${SUPPLY_CHAIN_SYSTEM_PROMPT}

LAGERBESTANDSDATEN:
${taskText}

${ragContext ? `WISSENSDATENBANK (Lieferanten & historische Bestellungen):
${ragContext}` : "WISSENSDATENBANK: Keine Lieferantendaten gefunden — allgemeine Empfehlung wird erstellt."}

Analysieren Sie den Bestand jetzt vollständig und erstellen Sie Ihre strukturierte Bewertung inkl. Bestellanfrage-Entwurf.`;

    const response = await llm.invoke(prompt);
    const analysisText = response.content?.toString() || "";

    // Dringlichkeit çıkar
    let urgencyLevel = "MEDIUM";
    if (/🔴\s*KRITISCH/i.test(analysisText)) urgencyLevel = "CRITICAL";
    else if (/🟠\s*HOCH/i.test(analysisText)) urgencyLevel = "HIGH";
    else if (/🟡\s*MITTEL/i.test(analysisText)) urgencyLevel = "MEDIUM";
    else if (/🟢\s*NIEDRIG/i.test(analysisText)) urgencyLevel = "LOW";

    // Tahmini gün sayısı
    const daysMatch = analysisText.match(/voraussichtlicher lagerausfall[:\s]*(\d+)/i);
    const daysUntilStockout = daysMatch ? parseInt(daysMatch[1]) : 0;

    // E-posta taslağı bölümünü çıkar
    const emailMatch = analysisText.match(/###\s*bestellanfrage-entwurf\s*\n([\s\S]+?)(?:###|$)/i);
    const draftOrderEmail = emailMatch ? emailMatch[1].trim() : analysisText;

    // 💰 Maliyet kaydı
    trackLLMCost(
        response.usage_metadata?.input_tokens || 0,
        response.usage_metadata?.output_tokens || 0,
        "SUPPLY_CHAIN", state.threadId || "SYSTEM", clientId,
        "eu.anthropic.claude-sonnet-4-5-20250929-v1:0"
    ).catch(() => {});

    // MongoDB'ye kaydet
    try {
        // SKU çıkar
        const skuMatch = taskText.match(/sku[:\s]+([^\n,\s]+)/i);
        const sku = skuMatch ? skuMatch[1].trim() : "UNKNOWN";

        await SupplyChainEvent.findOneAndUpdate(
            { threadId: state.threadId },
            {
                $set: {
                    clientId,
                    sku,
                    plannerAnalysis: analysisText,
                    draftOrderEmail,
                    urgencyLevel,
                    daysUntilStockout,
                    ragMatchFound: ragContext.length > 0,
                    status: "AWAITING_APPROVAL",
                    eventType: urgencyLevel === "CRITICAL" ? "STOCKOUT_IMMINENT" : "INVENTORY_LOW",
                },
            },
            { upsert: true, returnDocument: "after" }
        );
    } catch (err) {
        console.warn("   -> SupplyChainEvent kayıt hatası:", err.message);
    }

    console.log(`✅ Tedarik Planlayıcısı: Analiz tamamlandı. Aciliyet: ${urgencyLevel}. Tahmini stok bitişi: ${daysUntilStockout} gün.`);

    return {
        stockAlerts: analysisText,
        draftOrderEmail,
        finalContent: analysisText,
    };
}

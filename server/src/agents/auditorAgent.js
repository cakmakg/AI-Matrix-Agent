import { ChatAnthropic } from "@langchain/anthropic";
import { trackLLMCost } from "../services/costTracker.js";
import { InvoiceAudit } from "../models/InvoiceAudit.js";
import { searchKnowledge } from "../services/ragService.js";

const llm = new ChatAnthropic({
    model: "claude-sonnet-4-6",
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const AUDITOR_SYSTEM_PROMPT = `Sie sind ein präziser KI-Buchprüfer (Agent 13 — Der Prüfer).
Ihre Aufgabe ist es, eingehende Rechnungen zu analysieren, Anomalien zu erkennen und Empfehlungen zu geben.

IHRE FÄHIGKEITEN:
1. Preisabgleich: Vergleichen Sie den Rechnungsbetrag mit dem vereinbarten Preis aus der Wissensdatenbank.
2. Anomalie-Erkennung: Erkennen Sie Doppelrechnungen, verdächtige Lieferanten, überhöhte Beträge.
3. Steuer-Compliance: Prüfen Sie, ob Steuersätze korrekt angewendet wurden.
4. Empfehlung: Geben Sie eine klare Empfehlung: GENEHMIGEN / ABLEHNEN / ESKALIEREN.

AUSGABEFORMAT (immer Markdown):
## Rechnungsprüfung — [Lieferantenname]

### Zusammenfassung
- **Rechnungsbetrag:** [Betrag] [Währung]
- **Vereinbarter Preis (aus RAG):** [Betrag oder "Nicht gefunden"]
- **Abweichung:** [Prozent oder "Keine"]
- **Anomalie erkannt:** ✅ JA / ❌ NEIN

### Befunde
[Detaillierte Analyse]

### Empfehlung
**[GENEHMIGEN / ABLEHNEN / ESKALIEREN]** — [Begründung in 1-2 Sätzen]

### Konfidenz-Score
[0-100]%`;

export async function auditorNode(state, config) {
    console.log("🧾 Denetçi (Ajan 13) devrede. Fatura analiz ediliyor...");

    const clientId = config?.configurable?.tenantConfig?.clientId || "default";

    // Görev metninden fatura bilgilerini çıkar
    const taskText = state.task || "";

    // RAG: Tedarikçiyle anlaşılan fiyatı bilgi tabanından ara
    let ragContext = "";
    try {
        const vendorMatch = taskText.match(/vendor[:\s]+([^\n,]+)/i) ||
                            taskText.match(/tedarikçi[:\s]+([^\n,]+)/i) ||
                            taskText.match(/lieferant[:\s]+([^\n,]+)/i);
        if (vendorMatch) {
            const vendorName = vendorMatch[1].trim();
            const ragResult = await searchKnowledge(clientId, `${vendorName} vereinbarter Preis Vertrag`);
            if (ragResult && ragResult.context) {
                ragContext = ragResult.context;
                console.log(`   -> RAG: ${vendorName} için ${ragResult.sources?.length ?? 0} kayıt bulundu.`);
            }
        }
    } catch (err) {
        console.warn("   -> RAG arama başarısız (devam ediliyor):", err.message);
    }

    const prompt = `${AUDITOR_SYSTEM_PROMPT}

RECHNUNGSDATEN:
${taskText}

${ragContext ? `WISSENSDATENBANK (vereinbarte Preise & Verträge):
${ragContext}` : "WISSENSDATENBANK: Keine übereinstimmenden Einträge gefunden."}

Analysieren Sie die Rechnung jetzt vollständig und geben Sie Ihre strukturierte Bewertung aus.`;

    const response = await llm.invoke(prompt);

    // Anomali tespiti — basit heuristik
    const analysisText = response.content?.toString() || "";
    const anomalyDetected =
        /anomalie erkannt[:\s]*✅/i.test(analysisText) ||
        /JA/i.test(analysisText.match(/anomalie erkannt[:\s]*(.*)/i)?.[1] || "");

    // Güven skoru çıkar
    const scoreMatch = analysisText.match(/(\d{1,3})\s*%/g);
    const confidenceScore = scoreMatch ? parseInt(scoreMatch[scoreMatch.length - 1]) : 75;

    // 💰 Maliyet kaydı
    trackLLMCost(
        response.usage_metadata?.input_tokens || 0,
        response.usage_metadata?.output_tokens || 0,
        "AUDITOR", state.threadId || "SYSTEM", clientId,
        "eu.anthropic.claude-sonnet-4-5-20250929-v1:0"
    ).catch(() => {});

    // MongoDB'ye kaydet
    try {
        await InvoiceAudit.findOneAndUpdate(
            { threadId: state.threadId },
            {
                $set: {
                    clientId,
                    auditAnalysis: analysisText,
                    anomalyDetected,
                    confidenceScore,
                    rawInvoiceText: taskText,
                    ragMatchFound: ragContext.length > 0,
                    ragMatchDetails: ragContext.slice(0, 500),
                    status: "AWAITING_APPROVAL",
                },
            },
            { upsert: true, new: true }
        );
    } catch (err) {
        console.warn("   -> InvoiceAudit kayıt hatası:", err.message);
    }

    console.log(`✅ Denetçi: Analiz tamamlandı. Anomali: ${anomalyDetected ? "⚠️ TESPİT EDİLDİ" : "✅ YOK"}. Güven: ${confidenceScore}%`);

    return {
        invoiceAnalysis: analysisText,
        anomalyDetected,
        confidenceScore,
        finalContent: analysisText,
    };
}

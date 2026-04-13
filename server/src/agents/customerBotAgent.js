import { ChatAnthropic } from "@langchain/anthropic";
import { z } from "zod";
import { searchKnowledge } from "../services/ragService.js";

// Ajan 6: Triyaj ve Destek Yöneticisi
const llm = new ChatAnthropic({
    model: "claude-sonnet-4-6",
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const leadSchema = z.object({
    category: z.enum(["SPAM", "HOT_LEAD", "SUPPORT_PRICING", "SUPPORT_BUG", "OTHER"])
        .describe("Gelen mesajın kategorisi."),
    isHotLead: z.boolean()
        .describe("Sadece HOT_LEAD kategorisi için true olmalıdır."),
    analysis: z.string()
        .describe("Müşterinin niyetinin Almanca kısa bir analizi."),
    orchestratorTask: z.string()
        .describe("Eğer HOT_LEAD ise, Orkestra Şefine verilecek görev. Değilse boş bırak."),
    draftResponse: z.string()
        .describe("Eğer SUPPORT_PRICING oder SUPPORT_BUG ise, müşteriye gönderilecek Almanca taslak cevap. Değilse boş bırak.")
});

const llmWithStructuredOutput = llm.withStructuredOutput(leadSchema, {
    name: "analyze_incoming_message",
});

export async function processIncomingMessage(customerMessage, clientId, tenantConfig = null) {
    const tenantId = clientId || process.env.DEFAULT_CLIENT_ID || "default";
    console.log(`🕵️ Destek Yöneticisi (Ajan 6) — clientId: ${tenantId}`);

    // 🎯 RAG: MongoDB Vektör Araması (dinamik, müşteriye özel)
    let knowledgeBase = "";
    let ragSources = [];
    try {
        const ragResult = await searchKnowledge(tenantId, customerMessage);
        knowledgeBase = ragResult.context;
        ragSources = ragResult.sources;
        if (knowledgeBase) {
            console.log(`📚 RAG: ${ragSources.length} kaynak bulundu (en iyi: ${ragSources[0]?.score}%)`);
        } else {
            console.log("⚠️ RAG: Bu clientId için bilgi tabanı boş — genel bilgiyle devam ediliyor.");
        }
    } catch (err) {
        console.warn("⚠️ RAG araması başarısız, genel bilgiyle devam ediliyor:", err.message);
    }

    const agentPersona = tenantConfig?.agentPersona || "Sie sind der Triage & Support Manager (Ajan 6) für ein deutsches IT- und KI-Beratungsunternehmen.";
    const companyContext = tenantConfig?.companyContext ? `Unternehmenskontext:\n${tenantConfig.companyContext}\n\n` : "";
    const supportInstructions = tenantConfig?.supportInstructions ? `Support-Anweisungen:\n${tenantConfig.supportInstructions}\n\n` : "";

    const prompt = `${agentPersona}
    
    ${companyContext}
    WICHTIGE UNTERNEHMENSREGELN UND WISSEN (KNOWLEDGE BASE):
    --------------------------------------------------
    ${knowledgeBase}
    --------------------------------------------------
    
    Deine Aufgabe: Beantworte die E-Mail des Kunden AUSSCHLIESSLICH basierend auf den obigen Informationen. 
    Wenn die Antwort nicht in den Informationen steht, erfinde nichts (keine Halluzinationen!), sondern sage höflich, dass du das an einen Spezialisten weiterleitest.
    
    ${supportInstructions}
    Ihre Aufgabe ist es, diese Nachricht in EINE der folgenden Kategorien einzuordnen:
    1. SPAM: Offensichtliche Werbung oder irrelevanter Inhalt.
    2. HOT_LEAD: Ein potenzieller Neukunde, der ein Projekt, eine Dienstleistung oder Beratung sucht.
    3. SUPPORT_PRICING: Ein bestehender oder potenzieller Kunde, der nach Preisen, Rabatten oder Rechnungen fragt.
    4. SUPPORT_BUG: Ein Kunde, der ein technisches Problem, einen Fehler oder einen Bug meldet.
    5. OTHER: Alles andere.

    HANDLUNGSANWEISUNGEN NACH KATEGORIE:
    - Wenn HOT_LEAD: Generieren Sie in 'orchestratorTask' einen Befehl für den Orchestrator (Ajan 7).
    - Wenn SUPPORT_PRICING: Nutzen Sie ZWINGEND die Informationen aus der Knowledge Base oben. Berechnen Sie Preise und Rabatte korrekt. Generieren Sie in 'draftResponse' eine höfliche, professionelle E-Mail-Antwort auf Deutsch, in der Sie die konkreten Preise und Konditionen nennen.
    - Wenn SUPPORT_BUG: Generieren Sie in 'draftResponse' eine einfühlsame Antwort auf Deutsch, dass das Problem an das Entwickler-Team weitergeleitet wurde.
    - Bei SPAM oder OTHER: Lassen Sie 'orchestratorTask' und 'draftResponse' leer.

    Hier ist die eingehende Nachricht:
    ---
    ${customerMessage}
    ---
    `;

    const response = await llmWithStructuredOutput.invoke(prompt);

    console.log(`   -> Kategori: ${response.category}`);
    console.log(`   -> Analiz: ${response.analysis}`);

    if (response.category === "HOT_LEAD") {
        console.log(`🔥 SICAK MÜŞTERİ! Şef'e Görev Çıkarılıyor: ${response.orchestratorTask}`);
    } else if (response.category === "SUPPORT_PRICING" || response.category === "SUPPORT_BUG") {
        console.log(`🛠️ DESTEK TALEBİ (${response.category})! Müşteriye Taslak Cevap Hazırlandı.`);
        console.log(`   -> Taslak Cevap: \n${response.draftResponse}`);
    } else {
        console.log("🛑 Mesaj pas geçildi (SPAM/OTHER). Orkestra yorulmayacak.");
    }

    return { ...response, ragSources };
}
import { ChatAnthropic } from "@langchain/anthropic";
import { trackLLMCost } from "../services/costTracker.js";
import { getPrompt, DEFAULT_PROMPTS } from "../services/promptRepository.js";
import { searchKnowledge } from "../services/ragService.js";

// Ajan 2'nin Beyni (Yine Claude veya ileride değiştirebileceğimiz bir model)
const llm = new ChatAnthropic({
    model: "claude-sonnet-4-6",
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function analyzerNode(state, config) {
    console.log("🧠 Analiz Motoru (Ajan 2) devrede. Gelen veri işleniyor...");

    const clientId = config?.configurable?.tenantConfig?.clientId || "default";
    const customPrompt = await getPrompt("ANALYZER", clientId);

    let finalData = state.scrapedData || "";

    // 🔍 RAG INJECTION: Scraper atlanmışsa veya veri yoksa RAG'dan sor
    if (!state.scrapedData && state.task) {
        console.log("🔍 Analyzer: Scraped data eksik. RAG Bilgi Tabanı taranıyor...");
        const cleanTask = state.task.replace(/^(BUSINESS_STRESS_TEST|IS_MODELI_TEST|PIVOT_ADVISOR|TREND_RADAR):\s*/i, "").trim();
        const ragResult = await searchKnowledge(clientId, cleanTask);

        if (ragResult && ragResult.context) {
            finalData = ragResult.context;
            console.log(`✅ Analyzer: '${cleanTask}' için ${ragResult.sources?.length ?? 0} RAG dokümanı enjekte edildi.`);
        } else {
            finalData = "Keine Daten gefunden. Bitte basieren Sie Ihre Analyse auf der Aufgabenstellung.";
            console.log(`⚠️ Analyzer: RAG'da '${cleanTask}' bulunamadı. Genel LLM bilgisi kullanılacak.`);
        }
    }

    // Analiz için Prompt (Sistem Yönergesi)
    const systemInstruction = customPrompt || DEFAULT_PROMPTS.ANALYZER;
    const prompt = `${systemInstruction}

    Rohdaten / Kontext:
    ${finalData}
    `;

    // Bedrock'a bağlanıp analizi istiyoruz
    const response = await llm.invoke(prompt);

    // 💰 CFO: Analyzer maliyetini kaydet
    trackLLMCost(
        response.usage_metadata?.input_tokens || 0,
        response.usage_metadata?.output_tokens || 0,
        "ANALYZER", state.threadId || "SYSTEM", clientId,
        "eu.anthropic.claude-sonnet-4-5-20250929-v1:0"
    ).catch(() => { });

    console.log("✅ Analiz Motoru: Rapor hazırlandı!");

    // Çıkan sonucu sistem hafızasındaki (State) 'analysisReport' değişkenine kaydediyoruz
    return { analysisReport: response.content };
}
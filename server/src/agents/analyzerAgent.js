import { ChatBedrockConverse } from "@langchain/aws";
import { trackLLMCost } from "../services/costTracker.js";
import { getPrompt, DEFAULT_PROMPTS } from "../services/promptRepository.js";

// Ajan 2'nin Beyni (Yine Claude veya ileride değiştirebileceğimiz bir model)
const llm = new ChatBedrockConverse({
    model: "eu.anthropic.claude-sonnet-4-5-20250929-v1:0",
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

export async function analyzerNode(state, config) {
    console.log("🧠 Analiz Motoru (Ajan 2) devrede. Gelen veri işleniyor...");

    const clientId = config?.configurable?.tenantConfig?.clientId || "default";
    const customPrompt = await getPrompt("ANALYZER", clientId);

    // Analiz için Prompt (Sistem Yönergesi)
    const systemInstruction = customPrompt || DEFAULT_PROMPTS.ANALYZER;
    const prompt = `${systemInstruction}

    Rohdaten:
    ${state.scrapedData}
    `;

    // Bedrock'a bağlanıp analizi istiyoruz
    const response = await llm.invoke(prompt);

    // 💰 CFO: Analyzer maliyetini kaydet
    trackLLMCost(
        response.usage_metadata?.input_tokens || 0,
        response.usage_metadata?.output_tokens || 0,
        "ANALYZER", state.threadId || "SYSTEM", "default",
        "eu.anthropic.claude-sonnet-4-5-20250929-v1:0"
    ).catch(() => { });

    console.log("✅ Analiz Motoru: Rapor hazırlandı!");

    // Çıkan sonucu sistem hafızasındaki (State) 'analysisReport' değişkenine kaydediyoruz
    return { analysisReport: response.content };
}
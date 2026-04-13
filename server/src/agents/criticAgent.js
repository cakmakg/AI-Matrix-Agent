import { ChatAnthropic } from "@langchain/anthropic";
import { z } from "zod";
import { trackLLMCostFromStrings } from "../services/costTracker.js";
import { getPrompt, DEFAULT_PROMPTS } from "../services/promptRepository.js";

// Eleştirmen Ajan (Ajan 5) için daha zeki bir model kullanıyoruz (Sonnet veya Opus mantıklı olur)
const llm = new ChatAnthropic({
    model: "claude-sonnet-4-6",
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Eleştirmenin döneceği Zod Şeması (Sadece Evet/Hayır ve Gerekçe)
const criticSchema = z.object({
    isApproved: z.boolean().describe("Metin yayınlanmaya uygun mu? Kusursuzsa true, hatası varsa false."),
    criticFeedback: z.string().describe("Eğer onaylanmadıysa (false), yazarın tam olarak neyi düzeltmesi gerektiği. Onaylandıysa boş bırakılabilir.")
});

const llmWithStructuredOutput = llm.withStructuredOutput(criticSchema, {
    name: "evaluate_content",
});

export async function criticNode(state, config) {
    console.log("🧐 Eleştirmen Ajan (Ajan 5) devrede. Metin denetleniyor...");

    // Acımasız Alman Kalite Kontrolcü Promptu
    const clientIdC = config?.configurable?.tenantConfig?.clientId || "default";
    const customPrompt = await getPrompt("CRITIC", clientIdC);
    const systemInstruction = customPrompt || DEFAULT_PROMPTS.CRITIC;
    const prompt = `${systemInstruction}

    Hier ist der zu prüfende Text:
    ---
    ${state.finalContent}
    ---
    `;

    const response = await llmWithStructuredOutput.invoke(prompt);

    // 💰 CFO: QA maliyeti kaydediliyor
    trackLLMCostFromStrings(prompt, JSON.stringify(response), "CRITIC", state.threadId || "SYSTEM", config?.configurable?.tenantConfig?.clientId || "default").catch(() => { });

    if (response.isApproved) {
        console.log("✅ Eleştirmen: Metin KUSURSUZ! Onay verildi.");
    } else {
        console.log(`❌ Eleştirmen: Metin REDDEDİLDİ! Hata bulundu.`);
        console.log(`   -> Geri Bildirim: ${response.criticFeedback}`);
    }

    // Sistemin hafızasını Eleştirmenin kararıyla güncelliyoruz
    return {
        isApproved: response.isApproved,
        criticFeedback: response.criticFeedback
    };
}
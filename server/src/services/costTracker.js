import Transaction from "../models/Transaction.js";
import { costEventBus } from "./costEventBus.js";

// AWS Bedrock fiyatları — 1 Milyon token başına USD
const MODEL_PRICING = {
    "eu.anthropic.claude-sonnet-4-5-20250929-v1:0": { input: 3.00, output: 15.00 },
    "eu.anthropic.claude-haiku-3-5-20251001-v1:0": { input: 0.80, output: 4.00 },
};
const DEFAULT_PRICING = MODEL_PRICING["eu.anthropic.claude-sonnet-4-5-20250929-v1:0"];

/**
 * Gerçek token sayılarıyla maliyet kaydeder.
 * llm.invoke() sonuçlarında response.usage_metadata kullanılabildiğinde çağır.
 */
export async function trackLLMCost(inputTokens, outputTokens, agentName, threadId = "SYSTEM", clientId = "default", modelName = "eu.anthropic.claude-sonnet-4-5-20250929-v1:0") {
    try {
        const pricing = MODEL_PRICING[modelName] ?? DEFAULT_PRICING;
        const cost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
        if (cost === 0) return;

        await Transaction.create({
            type: "EXPENSE",
            category: "LLM_COST",
            clientId,
            agentName,
            threadId,
            amount: cost,
            metadata: {
                model: modelName,
                inputTokens,
                outputTokens,
                description: `${agentName}: ${inputTokens} in + ${outputTokens} out tokens`,
            },
        });

        console.log(`💰 CFO: ${agentName} — $${cost.toFixed(6)} (${inputTokens} in + ${outputTokens} out)`);

        // 🛰️ Admin God Mode: Gerçek zamanlı maliyet yayını
        costEventBus.emit("cost", {
            type: "cost_tick",
            clientId,
            agentName,
            threadId,
            cost,
            inputTokens,
            outputTokens,
            model: modelName,
            timestamp: Date.now(),
        });
    } catch (err) {
        console.error("⚠️ Maliyet kaydı hatası:", err.message);
    }
}

/**
 * withStructuredOutput gibi token bilgisi dönmeyen çağrılar için tahmini maliyet kaydeder.
 * 1 token ≈ 4 karakter tahmine dayanır.
 */
export async function trackLLMCostFromStrings(inputText, outputText, agentName, threadId = "SYSTEM", clientId = "default", modelName = "eu.anthropic.claude-sonnet-4-5-20250929-v1:0") {
    const inputTokens = Math.ceil((inputText || "").length / 4);
    const outputTokens = Math.ceil((outputText || "").length / 4);
    return trackLLMCost(inputTokens, outputTokens, agentName, threadId, clientId, modelName);
}

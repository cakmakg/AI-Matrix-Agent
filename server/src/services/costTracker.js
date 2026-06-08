import Transaction from "../models/Transaction.js";
import { costEventBus } from "./costEventBus.js";
import { TenantConfig } from "../models/TenantConfig.js";
import { Client } from "../models/Client.js";
import { getPlanRules } from "../config/plans.js";

// ─── 💸 Otomatik Bütçe-Trip (maliyet patlaması koruması) ────────────────────────
// Aylık per-tenant LLM gideri plan budgetUsd tavanını aşınca tenant'ı otomatik
// throttle eder → guardrail kill-switch bir sonraki workflow'u keser.
// In-memory akümülatör; restart'ta DB'den (bu ayki Transaction toplamı) yeniden seed edilir.
const monthlySpend = new Map(); // cid → { monthKey, usd, plan, tripped }

function currentMonthKey(d = new Date()) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function seedMonthlySpend(cid, monthKey) {
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    const agg = await Transaction.aggregate([
        { $match: { clientId: cid, category: "LLM_COST", createdAt: { $gte: start } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    // trackLLMCost'a geçen clientId = Client._id (tenantConfig.clientId). Planı ondan çöz.
    const client = await Client.findById(cid).catch(() => null);
    return { monthKey, usd: agg?.[0]?.total || 0, plan: client?.plan || "free", tripped: false };
}

/**
 * Bir LLM gideri eklendikten sonra tenant'ın aylık bütçesini kontrol eder;
 * tavan aşıldıysa configObject.throttled = true yazar (otomatik kill-switch tetiği).
 */
export async function checkBudgetAndMaybeThrottle(clientId, addedUsd) {
    const cid = String(clientId || "");
    if (!cid || cid === "default" || !addedUsd) return;

    const mk = currentMonthKey();
    let entry = monthlySpend.get(cid);
    if (!entry || entry.monthKey !== mk) {
        entry = await seedMonthlySpend(cid, mk);
        monthlySpend.set(cid, entry);
    }
    entry.usd += addedUsd;

    const budget = getPlanRules(entry.plan)?.budgetUsd;
    if (!budget || budget <= 0) return;              // bütçe tanımsız/0 → otomatik trip yok
    if (entry.tripped || entry.usd < budget) return; // zaten tripped veya tavan altında

    entry.tripped = true;
    await TenantConfig.findOneAndUpdate(
        { clientId: cid },
        { $set: { "configObject.throttled": true, "configObject.throttleReason": "BUDGET_EXCEEDED", "configObject.throttledAt": new Date() } },
        { upsert: true }
    );
    console.error(`💸 BÜTÇE-TRIP: tenant ${cid} aylık $${budget} LLM bütçesini aştı ($${entry.usd.toFixed(2)}) → otomatik throttled.`);
    costEventBus.emit("cost", {
        type: "budget_tripped",
        clientId: cid,
        budgetUsd: budget,
        spentUsd: entry.usd,
        timestamp: Date.now(),
    });
}

// Anthropic direct API fiyatları — 1 Milyon token başına USD
const MODEL_PRICING = {
    "claude-sonnet-4-6":           { input: 3.00,  output: 15.00 },
    "claude-opus-4-7":             { input: 15.00, output: 75.00 },
    "claude-haiku-4-5-20251001":   { input: 0.80,  output: 4.00  },
    // Eski Bedrock model ID'leri — geriye dönük uyumluluk
    "eu.anthropic.claude-sonnet-4-5-20250929-v1:0": { input: 3.00, output: 15.00 },
    "eu.anthropic.claude-haiku-3-5-20251001-v1:0":  { input: 0.80, output: 4.00  },
};
const DEFAULT_PRICING = MODEL_PRICING["claude-sonnet-4-6"];

/**
 * Gerçek token sayılarıyla maliyet kaydeder.
 * llm.invoke() sonuçlarında response.usage_metadata kullanılabildiğinde çağır.
 */
export async function trackLLMCost(inputTokens, outputTokens, agentName, threadId = "SYSTEM", clientId = "default", modelName = "claude-sonnet-4-6") {
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

        // 💸 Aylık bütçe tavanı aşıldıysa otomatik throttle (fire-and-forget — akışı bloklamaz).
        checkBudgetAndMaybeThrottle(clientId, cost).catch(() => {});
    } catch (err) {
        console.error("⚠️ Maliyet kaydı hatası:", err.message);
    }
}

/**
 * withStructuredOutput gibi token bilgisi dönmeyen çağrılar için tahmini maliyet kaydeder.
 * 1 token ≈ 4 karakter tahmine dayanır.
 */
export async function trackLLMCostFromStrings(inputText, outputText, agentName, threadId = "SYSTEM", clientId = "default", modelName = "claude-sonnet-4-6") {
    const inputTokens = Math.ceil((inputText || "").length / 4);
    const outputTokens = Math.ceil((outputText || "").length / 4);
    return trackLLMCost(inputTokens, outputTokens, agentName, threadId, clientId, modelName);
}

/**
 * Ajan 11 — "The Visionary" (Yaratıcı / Şeytanın Avukatı)
 *
 * Görev: Analyzer'ın "mantıklı" 3 aksiyonunu okur ve herkesin gözden
 * kaçırdığı, riskli ama 10x getirili 4. çılgın yolu üretir.
 * Aykırı düşünce, Writer'ın raporuna "Vizyoner Alternatif" bölümü olarak eklenir.
 *
 * Akış: analyzer → innovator → writer
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { trackLLMCost } from "../services/costTracker.js";
import { searchKnowledge } from "../services/ragService.js";

const llm = new ChatAnthropic({
    model: "claude-sonnet-4-6",
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function innovatorNode(state, config) {
    console.log("💡 Vizyoner (Ajan 11) sahneye çıkıyor — kuralları yıkıyor...");

    const clientId = config?.configurable?.tenantConfig?.clientId || "default";

    let analysisContext = state.analysisReport || "";

    // 🔍 RAG INJECTION: analysisReport boşsa RAG'dan bağlam çek
    if (!state.analysisReport && state.task) {
        console.log("🔍 Innovator: Analiz raporu yok. RAG Bilgi Tabanı taranıyor...");
        const cleanTask = state.task.replace(/^(BUSINESS_STRESS_TEST|IS_MODELI_TEST|PIVOT_ADVISOR|TREND_RADAR|INNOVATION_RADAR):\s*/i, "").trim();
        const ragResult = await searchKnowledge(clientId, cleanTask);

        if (ragResult && ragResult.context) {
            analysisContext = ragResult.context;
            console.log(`✅ Innovator: '${cleanTask}' için ${ragResult.sources?.length ?? 0} RAG dokümanı enjekte edildi.`);
        } else {
            analysisContext = "Keine Analyse-Daten verfügbar. Entwickle eine radikale Alternative basierend auf der Aufgabenstellung.";
            console.log(`⚠️ Innovator: RAG'da '${cleanTask}' bulunamadı. Görev açıklamasıyla devam ediliyor.`);
        }
    }

    const prompt = `Du bist "The Visionary" — ein Devil's Advocate, Querdenker und Entdecker verborgener Chancen.

Deine Aufgabe: Lies die 3 sicheren, "vernünftigen" Aktionen der Standard-Analyse unten. LEHNE SIE AB.
Entwickle dann den 4. Weg — den, den ein gewöhnlicher Berater niemals vorschlagen würde.

REGELN:
1. Wiederhole nicht die Wege des Analysten. Bezeichne sie als "vorhersehbar" und geh weiter.
2. Identifiziere die ECHTE verborgene Chance oder das übersehene Risiko im Kontext.
3. Denk umgekehrt: "Alle machen A. Was passiert, wenn wir stattdessen Z machen?"
4. Sei konkret — kein vages "disruptives Denken", sondern 1 mutiger, umsetzbarer Schritt.
5. Maximal 4 Absätze. Scharf, prägnant, pointiert.
6. Beende mit einer einzigen "10x-Wette": Warum ist dieser unkonventionelle Weg wertvoller als die anderen?
7. Antworte ausschliesslich auf Deutsch.

Aufgabenkontext:
${state.task}

Die 3 Wege des Standard-Analysten:
${analysisContext}`;

    const response = await llm.invoke(prompt);

    trackLLMCost(
        response.usage_metadata?.input_tokens || 0,
        response.usage_metadata?.output_tokens || 0,
        "INNOVATOR", state.threadId || "SYSTEM", clientId,
        "eu.anthropic.claude-sonnet-4-5-20250929-v1:0"
    ).catch(() => {});

    console.log("🔥 Vizyoner: Aykırı alternatif üretildi — Writer bekliyor.");

    return { innovatorInsight: response.content };
}

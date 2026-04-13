import { ChatAnthropic } from "@langchain/anthropic";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { trackLLMCostFromStrings } from "../services/costTracker.js";

// Ajan 8: Baş Yazılım Mimarı (CTO / Tech Lead)
const llm = new ChatAnthropic({
    model: "claude-sonnet-4-6",
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// 🎯 LLM'in üreteceği "Blueprint" Şeması
const blueprintSchema = z.object({
    projectName: z.string().describe("Projenin kısa, dosya ismine uygun adı (z.B. ecommerce_dashboard)"),
    blueprintContent: z.string().describe("Claude Code veya Antigravity gibi AI araçlarının okuyup uygulayacağı Markdown formatında detaylı Master Prompt ve Mimari Plan."),
    explanation: z.string().describe("Seçilen teknoloji yığını (Tech Stack) ve mimari kararların kısa Almanca özeti.")
});

const llmWithStructuredOutput = llm.withStructuredOutput(blueprintSchema, { name: "generate_project_blueprint" });

export async function architectNode(state, config) {
    console.log("👨‍🏫 Baş Mimar (Ajan 8 - CTO) masaya oturdu. Proje mimarisi çiziliyor...");

    const prompt = `Sie sind der Chief Technology Officer (CTO) und Senior Software Architect (Ajan 8) für ein Elite-Entwicklungsteam.
    Ihre Aufgabe ist es NICHT, den Code selbst zu schreiben. Ihre Aufgabe ist es, einen brillanten "Project Blueprint" (Master-Prompt) für autonome KI-Programmierwerkzeuge (wie Claude Code, Cursor oder Antigravity) zu erstellen.
    
    Kundenanforderung: ${state.task}
    
    Generieren Sie in 'blueprintContent' ein umfassendes Markdown-Dokument (.md), das folgende Struktur für die ausführenden KI-Agenten enthält:
    
    1. **System Prompt & AI Persona:** Definieren Sie genau, in welche Rolle das KI-Tool schlüpfen soll (z.B. "Act as a Senior Next.js Developer...") und wie es an die Problemlösung herangehen soll.
    2. **Project Overview & Core Logic:** Was wird gebaut? Was ist das tiefe geschäftliche Ziel hinter der Anwendung?
    3. **Tech Stack & Required AI Skills:** - Welche Frameworks (z.B. Next.js, Tailwind, TypeScript) werden verwendet?
       - Welche "Skills" oder Werkzeuge muss die KI nutzen? (z.B. "Nutze Terminal-Befehle für npm installs", "Führe Linter nach jedem Speichern aus", "Nutze File-Search zum Überprüfen von Abhängigkeiten").
    4. **Folder Structure:** Eine visuelle Baumstruktur der gewünschten Architektur.
    5. **Execution Workflow (Step-by-Step):** Präzise Anweisungen, in welcher Reihenfolge die KI die Dateien und Komponenten erstellen soll (z.B. 1. Setup, 2. API Routes, 3. UI Components).
    6. **Strict Coding & Audit Guidelines:** Regeln zu Security, Error Handling, Clean Code und Performance. Wie soll die KI ihren eigenen Code überprüfen (Self-Correction)?
    
    Schreiben Sie den 'blueprintContent' so präzise und instruktiv wie möglich, als würden Sie Befehle an ein KI-Coding-Tool geben. (Sprache des Blueprints: Englisch für maximale Kompatibilität mit Coding-Tools).`;

    const response = await llmWithStructuredOutput.invoke(prompt);

    // 💰 CFO: CTO maliyeti kaydediliyor
    trackLLMCostFromStrings(prompt, JSON.stringify(response), "ARCHITECT", state.threadId || "SYSTEM", config?.configurable?.tenantConfig?.clientId || "default").catch(() => { });

    console.log(`   -> Mimari Karar: ${response.explanation}`);
    console.log(`   -> Proje Adı: ${response.projectName}`);

    // Dosyayı diske kaydet
    console.log("   -> ⚙️ Blueprint dosyası (Master Prompt) bilgisayara yazılıyor...");
    let isSuccess = false;
    let savedPath = "";

    try {
        const outputDir = path.join(process.cwd(), "output");
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Dosya adını güvenli hale getir ve .md uzantısı ekle
        const safeFileName = response.projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase() + "_blueprint.md";
        savedPath = path.join(outputDir, safeFileName);

        fs.writeFileSync(savedPath, response.blueprintContent, "utf-8");

        console.log(`✅ OTONOM MİMARİ BAŞARILI: ${safeFileName} diske yazıldı!`);
        isSuccess = true;
    } catch (error) {
        console.error("❌ Blueprint dosyası oluşturulurken hata:", error.message);
    }

    return {
        // Tam blueprint içeriğini state'e al — hem SSE hem MongoDB için
        finalContent: isSuccess
            ? `# 🏗️ Architektur-Blueprint: ${response.projectName}\n\n> **Architektur-Entscheidung:** ${response.explanation}\n\n---\n\n${response.blueprintContent}`
            : `# ❌ Blueprint Fehler\n\n${response.explanation || "Fehler beim Erstellen des Blueprints."}`,
        fileSaved: isSuccess
    };
}
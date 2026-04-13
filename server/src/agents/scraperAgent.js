import { ChatAnthropic } from "@langchain/anthropic";
import { z } from "zod";

// ─── MOAT Katman 1b: Web İçeriği Sanitizasyonu ───────────────────────────────
const MAX_CONTENT_PER_SOURCE = 2000;   // karakter
const MAX_TOTAL_SCRAPED      = 8000;   // karakter

// Web kaynaklarından gelen içerikteki injection girişimlerini temizler
function sanitizeWebContent(text) {
    if (!text || typeof text !== "string") return "";

    return text
        // HTML tag ve script temizleme
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]{0,500}>/g, " ")
        // Prompt injection desenleri
        .replace(/ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?)/gi, "[FİLTRELENDİ]")
        .replace(/\bSYSTEM\s*:\s*/g, "[FİLTRELENDİ]: ")
        .replace(/<\s*\/?\s*system\s*>/gi, "")
        .replace(/\[END_(?:TASK|INPUT|PROMPT|CONTEXT)\]/gi, "")
        .replace(/forget\s+(everything|all|the\s+above)/gi, "[FİLTRELENDİ]")
        .replace(/override\s+(?:your\s+)?(?:instructions?|directives?)/gi, "[FİLTRELENDİ]")
        // Whitespace normalleştirme
        .replace(/\s{3,}/g, "  ")
        .trim()
        // Kaynak başına uzunluk sınırı
        .slice(0, MAX_CONTENT_PER_SOURCE);
}

// Ajan 1: Otonom Araştırmacı (Bağımsız Native Fetch Mimarisi)
const llm = new ChatAnthropic({
    model: "claude-sonnet-4-6",
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// 🎯 LLM'den en iyi arama kelimesini üretmesini istiyoruz
const searchSchema = z.object({
    searchQuery: z.string().describe("Die beste Suchanfrage (auf Englisch oder Deutsch) für eine Suchmaschine, um die Aufgabe des Benutzers optimal zu erfüllen. Sei spezifisch!"),
    reasoning: z.string().describe("Eine kurze Erklärung, warum genau dieser Suchbegriff gewählt wurde.")
});

const llmWithStructuredOutput = llm.withStructuredOutput(searchSchema, { name: "generate_search_query" });

// ─── Direct URL Scraper ───────────────────────────────────────────────────
async function scrapeDirectUrls(task) {
    if (!task) return "";
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const urls = task.match(urlRegex);
    if (!urls || urls.length === 0) return "";
    
    let result = "";
    for (const url of urls.slice(0, 3)) { // Max 3 URL'yi tara
        console.log(`   -> ✨ Doğrudan URL taranıyor: ${url}`);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`HTTP Hata: ${response.status}`);
            const html = await response.text();
            
            const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            const content = bodyMatch ? bodyMatch[1] : html;
            
            const cleanContent = sanitizeWebContent(content);
            result += `\n[URL İçeriği: ${url}]\n${cleanContent}\n`;
        } catch (err) {
            console.warn(`   ⚠️ Doğrudan taranırken hata (${url}): ${err.message}`);
        }
    }
    return result;
}

export async function scraperNode(state) {
    console.log("🔍 Araştırmacı Ajan (Ajan 1) internete bağlanıyor...");

    // Adım 1: Görevi anlayıp en iyi arama sorgusunu (Query) oluştur
    const prompt = `Sie sind ein hochprofessioneller IT-Researcher (Ajan 1) für ein Beratungsunternehmen.
    Der Orchestrator hat Ihnen eine Aufgabe zugewiesen.
    
    Aufgabe: ${state.task}
    
    Analysieren Sie die Aufgabe und generieren Sie die perfekte Suchanfrage (searchQuery), um die aktuellsten und relevantesten Informationen aus dem Internet (Stand heute) zu finden.`;

    const queryResponse = await llmWithStructuredOutput.invoke(prompt);
    console.log(`   -> Strateji: ${queryResponse.reasoning}`);
    console.log(`   -> İnternette Aranan Kelime: "${queryResponse.searchQuery}"`);

    // Yeni Adım: Doğrudan URL var mı diye kontrol et ve içeriğini çek
    let searchResults = await scrapeDirectUrls(state.task);
    
    // Eğer doğrudan bir URL bulunduysa ve çok uzunsa arama yapmaya gerek kalmayabilir ancak yine de Tavily ile de zenginleştirebiliriz.
    // Biz her ihtimale karşı arama sonuçlarını birleştiriyoruz.

    // Adım 2: Native Fetch ile doğrudan Tavily API'sine bağlan! (Paketsiz, sorunsuz)
    console.log("   -> Tavily AI API'sine doğrudan istek atılıyor...");
    
    try {
        const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                api_key: process.env.TAVILY_API_KEY,
                query: queryResponse.searchQuery,
                search_depth: "basic",
                include_answer: true,
                max_results: 3
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP Hata Kodu: ${response.status}`);
        }

        const data = await response.json();
        
        // 🛡️ MOAT: Web içeriğini sanitize ederek formatlıyoruz
        const cleanAnswer = sanitizeWebContent(data.answer || "");
        if (cleanAnswer) {
            searchResults += `\n\nTavily AI Yapay Zeka Özeti:\n${cleanAnswer}\n\nDetaylı Kaynaklar:\n`;
        } else {
            searchResults += `\n\nTavily Arama Sonuçları:\n`;
        }
        data.results.forEach((res, index) => {
            const cleanContent = sanitizeWebContent(res.content || "");
            // URL'yi de doğrula (sadece http/https)
            const safeUrl = /^https?:\/\//i.test(res.url) ? res.url : "[geçersiz-url]";
            searchResults += `\n[${index + 1}] Kaynak: ${safeUrl}\nİçerik: ${cleanContent}\n`;
        });

        // Toplam uzunluk sınırı
        if (searchResults.length > MAX_TOTAL_SCRAPED) {
            searchResults = searchResults.slice(0, MAX_TOTAL_SCRAPED) + "\n[...kırpıldı]";
            console.warn("   ⚠️  Scraper: İçerik toplam sınırı aşıldı, kırpıldı.");
        }

        console.log("✅ Web taraması tamamlandı! Canlı veriler başarıyla çekildi.");
    } catch (error) {
        console.error("❌ Arama sırasında hata oluştu:", error.message);
        searchResults = "Fehler bei der Websuche. Bitte basierend auf internem Wissen fortfahren.";
    }

    // Adım 3: Gerçek internet verilerini hafızaya kaydet
    return {
        scrapedData: searchResults
    };
}
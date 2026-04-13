// ── Ajan 12 — Satış Temsilcisi / The Closer (Sales Rep) ──
//
// Görev: Sıcak müşteri (HOT_LEAD) takibini devralmak, itirazları çürütmek,
// BANT analizi yapmak ve satışı kapatmak.
//
// Tetiklenme koşulları (Orchestrator tarafından yönlendirilir):
//   - Task metni HOT_LEAD_FOLLOWUP içeriyorsa  (müşteri 3+ gün sessiz)
//   - Task metni SALES_NEGOTIATION içeriyorsa   (müşteri fiyat itirazı gönderdi)
//
// Güvenlik:
//   - negotiationRound >= 3 → orchestrator hard stop uygular (bu ajan çalışmaz)
//   - Enterprise plan geretirir (plans.js)
//   - Satış mesajı göndermeden önce HITL (human_approval) kapısından geçer

import { ChatAnthropic } from "@langchain/anthropic";
import { trackLLMCost } from "../services/costTracker.js";

const llm = new ChatAnthropic({
    model: "claude-sonnet-4-6",
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// İzin verilen maksimum indirim (RAG'dan şirket kuralı gelmezse bu default)
const MAX_DISCOUNT_PCT = 15;

// Tur bazlı strateji: ilk turda değer odaklı, ikincide indirim, üçüncüde son teklif
const NEGOTIATION_STRATEGY = {
    0: "value",   // Ürünün ROI'sini ve zaman tasarrufunu vurgula, fiyat konuşma
    1: "discount", // İlk indirim teklifini sun (MAX_DISCOUNT_PCT/2)
    2: "final",    // Son ve geri alınamaz teklif — Stripe linki ekle
};

export async function salesRepNode(state, config) {
    const tenantConfig = config?.configurable?.tenantConfig;
    const clientId     = config?.configurable?.clientId || "default";
    const round        = state.negotiationRound ?? 0;
    const strategy     = NEGOTIATION_STRATEGY[round] ?? "final";

    console.log(`💼 Satış Temsilcisi (Ajan 12) devreye girdi. Tur: ${round}, Strateji: ${strategy.toUpperCase()}`);

    // ── Şirket bağlamı (TenantConfig'den) ──
    const companyContext  = tenantConfig?.companyContext  || "AI Orchestra — Otonom Çok Ajanlı İş Zekası Sistemi";
    const supportInstr    = tenantConfig?.supportInstructions || "";

    // ── Tur bazlı taktik prompt ──
    let tacticInstruction = "";
    let offerDiscount     = state.discountOffered;
    let stripeLink        = state.stripePaymentLink || "";

    if (strategy === "value") {
        tacticInstruction = `
Bu ilk temasdır. ASLA fiyat indirimi teklif etme.
Bunun yerine somut değer argümanları kullan:
- "Bu sistem bir çalışanın aylık maliyetinden daha ucuz, ama 7/24 çalışır."
- "Ortalama müşterilerimiz ilk ayda 40+ saat operasyonel süre tasarrufu sağlıyor."
- Müşterinin söylediği spesifik sorunla doğrudan ilişkilendir.
Son paragrafta 1 adet açık uçlu soru sor (BANT analizi için: bütçe, karar yetkisi, ihtiyaç, zaman çizelgesi).`;
    } else if (strategy === "discount") {
        offerDiscount = Math.floor(MAX_DISCOUNT_PCT / 2); // %7-8
        tacticInstruction = `
Müşteri fiyat itirazını tekrarladı. Küçük ama anlamlı bir jest yap.
"%${offerDiscount} özel indirim" teklifini sun, ancak bunu şirket kurallarına bağla:
"Bu indirim yalnızca bu ay geçerlidir" veya "Yıllık ön ödemede geçerlidir."
İndirimi küçümseme — bunu bir iyilik değil, kurumsal bir karar gibi sun.`;
    } else {
        // final tur: maksimum indirim + Stripe linki placeholder
        offerDiscount = MAX_DISCOUNT_PCT;
        // Gerçek Stripe entegrasyonu eklendiğinde bu satır generateStripeLink() çağırır.
        // Şimdilik placeholder — actionWorkerService üzerinden tetiklenecek.
        stripeLink = `[STRIPE_LINK_PLACEHOLDER:${clientId}:${offerDiscount}]`;
        tacticInstruction = `
Bu son ve geri alınamaz teklifimizdir.
"%${offerDiscount} indirimli, yıllık ön ödeme" seçeneğini öner.
Mesajın sonuna güvenli ödeme linkini ekle: ${stripeLink}
"Bu teklif 48 saat geçerlidir" gibi bir aciliyet (urgency) ifadesi kullan.
Eğer müşteri hâlâ reddederse, nazikçe kapıyı aralık bırak: "Gelecekte hazır olduğunuzda buradayız."`;
    }

    // ── BANT Analizi ──
    const bantPrompt = `
Müşterinin mesajını okuyarak kısa bir BANT skoru üret (her madde: YÜKSEK / ORTA / DÜŞÜK / BELİRSİZ):
B (Budget / Bütçe): Müşterinin ödeme gücü var mı?
A (Authority / Yetki): Mesajı yazan karar verici mi?
N (Need / İhtiyaç): Ürüne gerçek bir ihtiyacı var mı?
T (Timeline / Zaman): Ne zaman satın almak istiyor?
Format: "B:YÜKSEK | A:BELİRSİZ | N:YÜKSEK | T:ORTA"`;

    // ── Ana Satış Mesajı ──
    const systemPrompt = `
Sen AI Orchestra'nın kıdemli Satış Temsilcisin (Ajan 12 — The Closer).

Şirket: ${companyContext}
${supportInstr ? `Ek Talimatlar: ${supportInstr}` : ""}

TEMEL KURALLAR:
1. Asla çaresiz veya umutsuz görünme — sen değeri satan tarafsın.
2. Kısa ve güçlü yaz. Maksimum 3 paragraf.
3. Rakiplerle asla karşılaştırma yapma.
4. Müşterinin adını biliyorsan kullan.
5. Kapanış cümlesi her zaman bir sonraki adımı netleştirsin.

MEVCUT DURUM:
- Müzakere Turu: ${round + 1}
- Şimdiye Kadar Teklif Edilen İndirim: %${state.discountOffered}
- Müşteri Durumu: ${state.leadStatus}

GÜNCEL TAKTİK:
${tacticInstruction}`;

    const messages = [
        { role: "system", content: systemPrompt },
        {
            role: "user",
            content: `Müşteri Mesajı / Durum:\n${state.task}\n\nGeçmiş İletişim / Bağlam:\n${state.scrapedData || "İlk temas"}\n\n---\nÖnce BANT analizi yap (tek satır), ardından satış mesajını yaz.\n${bantPrompt}`,
        },
    ];

    const response = await llm.invoke(messages);
    const rawOutput = typeof response.content === "string" ? response.content : JSON.stringify(response.content);

    // BANT satırını ayır
    const bantMatch = rawOutput.match(/B:[A-ZÇĞİÖŞÜ]+\s*\|\s*A:[A-ZÇĞİÖŞÜ]+\s*\|\s*N:[A-ZÇĞİÖŞÜ]+\s*\|\s*T:[A-ZÇĞİÖŞÜ]+/i);
    const bantLine  = bantMatch ? bantMatch[0] : "";
    // BANT satırını çıktıdan temizle — müşteriye gitmesin
    const salesMessage = rawOutput.replace(bantLine, "").trim();

    trackLLMCost(response.usage_metadata?.input_tokens || 0, response.usage_metadata?.output_tokens || 0, "SALES_REP", state.threadId || "SYSTEM", clientId, "eu.anthropic.claude-sonnet-4-5-20250929-v1:0").catch(() => {});

    console.log(`   -> 💼 Satış Mesajı üretildi (${salesMessage.length} karakter). BANT: ${bantLine}`);

    return {
        finalContent:      salesMessage,
        bantAnalysis:      bantLine,
        negotiationRound:  1,          // reducer x+y → her çağrıda +1
        discountOffered:   offerDiscount,
        stripePaymentLink: stripeLink,
        leadStatus:        strategy === "final" ? "NEGOTIATING" : "NEGOTIATING",
        nextAgent:         "human_approval",  // Satış mesajı ASLA otomatik gitmez
    };
}

/**
 * SaaS Plan Sınırları — Hangi plan hangi ajanları çalıştırabilir?
 * Client.plan alanındaki değerler: "free" | "pro" | "enterprise" | "holding"
 *
 * free       → AI Destek Masası    ($99/ay)    — yalnızca gelen kutusu
 * pro        → AI Pazarlama Ekibi  ($299/ay)   — Scraper + Writer + Critic + CMO
 * enterprise → Enterprise Brain    ($999/ay)   — Tüm ajanlar serbest
 * holding    → AI Holding Brain    ($3.000+/ay) — Tüm departmanlar + sınırsız revizyon + öncelikli destek
 */

export const PLAN_LIMITS = {
    free: {
        label: "AI Destek Masası",
        allowedAgents: ["fileSaver", "human_approval", "publisher"],
        maxRevisions: 1,
    },
    pro: {
        label: "AI Pazarlama Ekibi",
        allowedAgents: ["scraper", "writer", "critic", "fileSaver", "human_approval", "publisher"],
        maxRevisions: 3,
    },
    enterprise: {
        label: "Enterprise Brain",
        allowedAgents: [
            "scraper", "analyzer", "innovator", "writer", "critic",
            "architect", "fileSaver", "human_approval", "publisher", "salesRep",
            "auditor", "supplyChain"
        ],
        maxRevisions: 5,
    },
    holding: {
        label: "AI Holding Brain",
        // Tüm 14 ajan açık + sınırsız revizyon. Holding paketine özel.
        allowedAgents: [
            "scraper", "analyzer", "innovator", "writer", "critic",
            "architect", "fileSaver", "human_approval", "publisher", "salesRep",
            "auditor", "supplyChain"
        ],
        maxRevisions: 999,
    },
};

/**
 * Verilen plan için PLAN_LIMITS kaydını döner.
 * Bilinmeyen plan gelirse güvenli default olarak "free" kurallarını uygular.
 */
export function getPlanRules(plan) {
    return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

// ─────────────────────────────────────────────────────────────
// SaaS ÜRÜN TANIMLAMALARI
// Her ürün: hangi taskType'ları tetikleyebilir, hangi plan gerekli,
// UI'da hangi input tipi gösterilmeli.
//
// inputType:
//   "text"  → standart textarea (genel görev açıklaması)
//   "file"  → PDF/Word yükleme kutusu (RFP dosyası)
//   "url"   → URL input alanı (hedef şirket sitesi)
// ─────────────────────────────────────────────────────────────
export const PRODUCT_CONFIGS = {
    support_desk: {
        label: "AI Support Desk",
        description: "Müşteri destek biletlerini RAG ile otomatik yanıtlar. Satış potansiyeli varsa Closer devreye girer.",
        requiredPlan: "free",
        allowedTaskTypes: ["SUPPORT_PRICING", "SUPPORT_BUG", "HOT_LEAD_FOLLOWUP"],
        inputType: "text",
        inputPlaceholder: "Müşteri sorusunu veya görevi girin...",
        inputLabel: "Destek Görevi",
    },
    rfp_responder: {
        label: "RFP & Tender Responder",
        description: "Yüklenen ihale dosyalarını RAG bilgi tabanıyla eşleştirerek saniyeler içinde yanıtlar.",
        requiredPlan: "pro",
        allowedTaskTypes: ["RFP_RESPONSE", "TENDER_RESPONSE"],
        inputType: "file",
        inputPlaceholder: "İhale dosyasını sürükleyin veya tıklayın (PDF/Word)",
        inputLabel: "İhale Dosyası",
    },
    competitor_radar: {
        label: "Competitor Intelligence Radar",
        description: "Rakiplerin sitelerini ve haberlerini günlük tarar; stratejik aksiyon raporu üretir.",
        requiredPlan: "pro",
        allowedTaskTypes: ["INNOVATION_RADAR"],
        inputType: "text",
        inputPlaceholder: "Rakip araştırması veya sektör analizi isteği girin...",
        inputLabel: "Araştırma Hedefi",
    },
    b2b_outreach: {
        label: "B2B Cold Outreach",
        description: "Hedef şirketin sitesini analiz edip kişiye özel soğuk satış e-postası yazar.",
        requiredPlan: "pro",
        allowedTaskTypes: ["COLD_OUTREACH"],
        inputType: "url",
        inputPlaceholder: "Hedef şirketin web sitesini girin (örn: stripe.com)",
        inputLabel: "Hedef Şirket URL",
    },
    cto_service: {
        label: "CTO-as-a-Service",
        description: "Proje isteklerini alır; tech stack, klasör yapısı ve kodlama kuralları içeren Blueprint üretir.",
        requiredPlan: "pro",
        allowedTaskTypes: ["Blueprint", "Software", "Code", "App", "Dashboard"],
        inputType: "text",
        inputPlaceholder: "Proje gereksinimlerini yazın (örn: Next.js ile pazar yeri uygulaması)...",
        inputLabel: "Proje Tanımı",
    },
    social_engine: {
        label: "Thought Leadership Engine",
        description: "Güncel haberleri araştırır; Twitter thread, LinkedIn post ve viral içerik üretir.",
        requiredPlan: "pro",
        allowedTaskTypes: ["TWITTER", "LINKEDIN"],
        inputType: "text",
        inputPlaceholder: "İçerik konusu veya hedef platform yazın (örn: TWITTER: AI trendleri)...",
        inputLabel: "İçerik Görevi",
    },
    finance_audit: {
        label: "Finance & Invoice Auditor",
        description: "PDF faturaları RAG ile eşleştirir; anomali tespiti yapar ve muhasebe onayı bekler.",
        requiredPlan: "enterprise",
        allowedTaskTypes: ["INVOICE_PROCESSING", "FATURA_DENETIM", "AUDIT_INVOICE"],
        inputType: "text",
        inputPlaceholder: "Fatura denetim görevi veya INVOICE_PROCESSING etiketiyle görev girin...",
        inputLabel: "Fatura Görevi",
    },
    supply_chain: {
        label: "Supply Chain Planner",
        description: "Kritik stok seviyelerini izler; tedarikçiye sipariş e-postası hazırlar ve HITL onayı bekler.",
        requiredPlan: "enterprise",
        allowedTaskTypes: ["STOCK_CHECK", "SUPPLY_ALERT", "INVENTORY_LOW"],
        inputType: "text",
        inputPlaceholder: "Stok kontrolü veya STOCK_CHECK etiketiyle görev girin...",
        inputLabel: "Stok Görevi",
    },
    business_stress_test: {
        label: "Business Model Stress Test",
        description: "Pitch deck'i yükle — Analyzer mantık hatalarını bulur, Innovator pivot önerir, Writer final raporu yazar.",
        requiredPlan: "pro",
        allowedTaskTypes: ["BUSINESS_STRESS_TEST"],
        inputType: "file",
        inputPlaceholder: "İş Planınızı (Pitch Deck) Yükleyin (PDF/Word)",
        inputLabel: "Pitch Deck",
    },
    trend_radar: {
        label: "Trend-to-Product Engine",
        description: "Sektör adı gir — Reddit/Twitter/TechCrunch'ı tarar, meta-trend çıkarır, 3 yeni ürün konsepti tasarlar.",
        requiredPlan: "pro",
        allowedTaskTypes: ["TREND_RADAR"],
        inputType: "text",
        inputPlaceholder: "Sektör adı girin (örn: Giyilebilir Teknoloji, Vegan Gıda)...",
        inputLabel: "Sektör / Trend Hedefi",
    },
    general: {
        label: "AI Orchestra (Tam Erişim)",
        description: "Tüm 14 ajan açık. Serbest görev girişi — orchestrator en uygun rotayı belirler.",
        requiredPlan: "enterprise",
        allowedTaskTypes: ["*"],
        inputType: "text",
        inputPlaceholder: "Herhangi bir görev girin...",
        inputLabel: "Görev",
    },
    holding: {
        label: "AI Holding Brain",
        description: "Tüm 6 departman tek çatı altında. Finans, Tedarik, Pazarlama, Satış, Destek ve Ar-Ge aynı anda çalışır.",
        requiredPlan: "holding",
        allowedTaskTypes: ["*"],
        inputType: "text",
        inputPlaceholder: "Herhangi bir departman görevi girin — tüm 14 ajan hazır...",
        inputLabel: "Holding Görevi",
    },
};

/**
 * Verilen ürün için PRODUCT_CONFIGS kaydını döner.
 * Bilinmeyen ürün gelirse "general" döner.
 */
export function getProductConfig(product) {
    return PRODUCT_CONFIGS[product] ?? PRODUCT_CONFIGS.general;
}

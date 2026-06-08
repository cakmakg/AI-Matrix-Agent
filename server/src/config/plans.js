/**
 * SaaS Plan Sınırları — Hangi plan hangi ajanları çalıştırabilir?
 * Client.plan alanındaki değerler: "free" | "pro" | "enterprise" | "holding"
 *
 * free       → AI Destek Masası    ($99/ay)    — yalnızca gelen kutusu
 * pro        → Growth & Revenue    ($499/ay)   — Scraper + Analyzer + Innovator + Writer + Critic + CMO
 * enterprise → Enterprise Brain    ($999/ay)   — Tüm ajanlar serbest
 * holding    → AI Holding Brain    ($3.000+/ay) — Tüm departmanlar + sınırsız revizyon + öncelikli destek
 */

// budgetUsd: Aylık LLM-MALİYET tavanı (USD). Aşılınca tenant otomatik throttle edilir
// (maliyet patlaması koruması — kullanıcı kotası değil, runaway-koruma tavanıdır; tunable).
// 0 = otomatik trip kapalı (sınırsız).
export const PLAN_LIMITS = {
    free: {
        label: "AI Destek Masası",
        allowedAgents: ["fileSaver", "human_approval", "publisher"],
        maxRevisions: 1,
        budgetUsd: 5,
    },
    pro: {
        label: "Growth & Revenue",
        allowedAgents: ["scraper", "analyzer", "innovator", "writer", "critic", "fileSaver", "human_approval", "publisher"],
        maxRevisions: 3,
        budgetUsd: 30,
    },
    enterprise: {
        label: "Enterprise Brain",
        allowedAgents: [
            "scraper", "analyzer", "innovator", "writer", "critic",
            "architect", "fileSaver", "human_approval", "publisher", "salesRep",
            "auditor", "supplyChain"
        ],
        maxRevisions: 5,
        budgetUsd: 100,
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
        budgetUsd: 0,   // god mode — otomatik trip yok
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
    // ──────────────────────────────────────────────────────────
    // MEGA-DEPARTMAN 1: Customer Experience (CX)
    // Eski: support_desk
    // ──────────────────────────────────────────────────────────
    cx: {
        label: "Customer Experience",
        description: "Müşteriyi elde tutar: Gelen tüm müşteri sorularını, destek taleplerini ve şikayetleri RAG hafızasıyla otonom yanıtlar.",
        requiredPlan: "free",
        allowedTaskTypes: ["SUPPORT_PRICING", "SUPPORT_BUG", "HOT_LEAD_FOLLOWUP"],
        inputType: "text",
        inputPlaceholder: "Müşteri sorusunu veya görevi girin...",
        inputLabel: "Destek Görevi",
    },

    // ──────────────────────────────────────────────────────────
    // MEGA-DEPARTMAN 2: Growth & Revenue
    // Eski: b2b_outreach + social_engine + rfp_responder
    // ──────────────────────────────────────────────────────────
    growth: {
        label: "Growth & Revenue",
        description: "Kasaya para sokar: Sosyal medyadan müşteri çeker (Inbound), B2B URL tarayarak soğuk mail atar (Outbound) ve gelen ihaleleri (RFP) anında yanıtlar.",
        requiredPlan: "pro",
        allowedTaskTypes: ["COLD_OUTREACH", "TWITTER", "LINKEDIN", "RFP_RESPONSE", "TENDER_RESPONSE"],
        subTabs: [
            {
                key: "social",
                label: "Sosyal Medya",
                icon: "📣",
                inputType: "text",
                inputPlaceholder: "İçerik konusu veya hedef platform yazın (örn: TWITTER: AI trendleri)...",
                inputLabel: "İçerik Görevi",
                taskPrefix: "",
            },
            {
                key: "outreach",
                label: "Soğuk Satış",
                icon: "🎯",
                inputType: "url",
                inputPlaceholder: "Hedef şirketin web sitesini girin (örn: stripe.com)",
                inputLabel: "Hedef Şirket URL",
                taskPrefix: "COLD_OUTREACH: ",
            },
            {
                key: "rfp",
                label: "İhale Yanıtla",
                icon: "📋",
                inputType: "file",
                inputPlaceholder: "İhale dosyasını sürükleyin veya tıklayın (PDF/Word)",
                inputLabel: "İhale Dosyası",
                taskPrefix: "RFP_RESPONSE: ",
            },
        ],
    },

    // ──────────────────────────────────────────────────────────
    // MEGA-DEPARTMAN 3: Strategy & Innovation
    // Eski: competitor_radar + trend_radar + business_stress_test
    // ──────────────────────────────────────────────────────────
    strategy: {
        label: "Strategy & Innovation",
        description: "Şirketin geleceğini çizer: Rakipleri izler, yeni pazar trendlerini avlar ve iş planlarını acımasızca test edip pivot fikirleri sunar.",
        requiredPlan: "pro",
        allowedTaskTypes: ["INNOVATION_RADAR", "TREND_RADAR", "BUSINESS_STRESS_TEST"],
        subTabs: [
            {
                key: "competitor",
                label: "Rakip Radar",
                icon: "🔍",
                inputType: "text",
                inputPlaceholder: "Rakip araştırması veya sektör analizi isteği girin...",
                inputLabel: "Araştırma Hedefi",
                taskPrefix: "INNOVATION_RADAR: ",
            },
            {
                key: "trend",
                label: "Trend Radar",
                icon: "📡",
                inputType: "text",
                inputPlaceholder: "Sektör adı girin (örn: Giyilebilir Teknoloji, Vegan Gıda)...",
                inputLabel: "Sektör / Trend Hedefi",
                taskPrefix: "TREND_RADAR: ",
            },
            {
                key: "stress",
                label: "Stres Testi",
                icon: "🧪",
                inputType: "file",
                inputPlaceholder: "İş Planınızı (Pitch Deck) Yükleyin (PDF/Word)",
                inputLabel: "Pitch Deck",
                taskPrefix: "BUSINESS_STRESS_TEST: ",
            },
        ],
    },

    // ──────────────────────────────────────────────────────────
    // MEGA-DEPARTMAN 4: Finance & Operations (Back-Office)
    // Eski: finance_audit + supply_chain
    // ──────────────────────────────────────────────────────────
    backoffice: {
        label: "Finance & Operations",
        description: "Şirketin para ve mal kaybetmesini önler: Faturalardaki kaçakları/anomalileri yakalar, stokları izleyip zamanında sipariş geçer.",
        requiredPlan: "enterprise",
        allowedTaskTypes: ["INVOICE_PROCESSING", "FATURA_DENETIM", "AUDIT_INVOICE", "STOCK_CHECK", "SUPPLY_ALERT", "INVENTORY_LOW"],
        subTabs: [
            {
                key: "audit",
                label: "Fatura Denetim",
                icon: "🧾",
                inputType: "text",
                inputPlaceholder: "Fatura denetim görevi veya INVOICE_PROCESSING etiketiyle görev girin...",
                inputLabel: "Fatura Görevi",
                taskPrefix: "INVOICE_PROCESSING: ",
            },
            {
                key: "supply",
                label: "Tedarik Zinciri",
                icon: "📦",
                inputType: "text",
                inputPlaceholder: "Stok kontrolü veya STOCK_CHECK etiketiyle görev girin...",
                inputLabel: "Stok Görevi",
                taskPrefix: "STOCK_CHECK: ",
            },
        ],
    },

    // ──────────────────────────────────────────────────────────
    // MEGA-DEPARTMAN 5: Engineering & IT
    // Eski: cto_service
    // ──────────────────────────────────────────────────────────
    engineering: {
        label: "Engineering & IT",
        description: "Teknoloji inşa eder: Yazılım ekipleri için teknik mimari (Blueprint), API dokümantasyonu ve veritabanı şemaları tasarlar.",
        requiredPlan: "pro",
        allowedTaskTypes: ["Blueprint", "Software", "Code", "App", "Dashboard"],
        inputType: "text",
        inputPlaceholder: "Proje gereksinimlerini yazın (örn: Next.js ile pazar yeri uygulaması)...",
        inputLabel: "Proje Tanımı",
    },

    // ──────────────────────────────────────────────────────────
    // MEGA-DEPARTMAN 6: The Holding (Otonom Merkez)
    // Eski: general + holding
    // ──────────────────────────────────────────────────────────
    holding: {
        label: "The Holding",
        description: "Tanrı Modu: Tüm departmanların sınırları kalkar. Orkestratör serbestçe tüm ajanları kullanır, departmanlar arası veri akışı başlar.",
        requiredPlan: "holding",
        allowedTaskTypes: ["*"],
        inputType: "text",
        inputPlaceholder: "Herhangi bir departman görevi girin — tüm 14 ajan hazır...",
        inputLabel: "Holding Görevi",
    },
};

/**
 * Verilen ürün için PRODUCT_CONFIGS kaydını döner.
 * Bilinmeyen ürün gelirse "cx" (Customer Experience) döner.
 */
export function getProductConfig(product) {
    return PRODUCT_CONFIGS[product] ?? PRODUCT_CONFIGS.cx;
}

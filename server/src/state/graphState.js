import { Annotation } from "@langchain/langgraph";

export const StateAnnotation = Annotation.Root({
    task: Annotation({ reducer: (x, y) => y ?? x, default: () => "" }),
    nextAgent: Annotation({ reducer: (x, y) => y ?? x, default: () => "orchestrator" }),
    
    // Veriler (null yerine boş string ile başlatıyoruz)
    scrapedData: Annotation({ reducer: (x, y) => y !== "" ? y : x, default: () => "" }),
    analysisReport: Annotation({ reducer: (x, y) => y !== "" ? y : x, default: () => "" }),
    innovatorInsight: Annotation({ reducer: (x, y) => y !== "" ? y : x, default: () => "" }),
    finalContent: Annotation({ reducer: (x, y) => y !== "" ? y : x, default: () => "" }),
    
    // Döngü ve Güvenlik
    criticFeedback: Annotation({ reducer: (x, y) => y ?? x, default: () => "" }),
    isApproved: Annotation({ reducer: (x, y) => y ?? x, default: () => false }),
    revisionCount: Annotation({ reducer: (x, y) => y !== undefined ? x + y : x, default: () => 0 }),
    
    // Yargıç ve Dosya
    fileSaved: Annotation({ reducer: (x, y) => y ?? x, default: () => false }),
    humanApproval: Annotation({ reducer: (x, y) => y !== undefined ? y : x, default: () => null }),
    humanFeedback: Annotation({ reducer: (x, y) => y ?? x, default: () => "" }),
    isPublished: Annotation({ reducer: (x, y) => y ?? x, default: () => false }),

    // 🛡️ MOAT Güvenlik Alanları
    threatScore: Annotation({ reducer: (x, y) => y !== undefined ? y : x, default: () => 0 }),
    blockedReason: Annotation({ reducer: (x, y) => y !== undefined ? y : x, default: () => "" }),

    // 🎯 AI Güven Skoru (0-100) — Writer tarafından hesaplanır
    confidenceScore: Annotation({ reducer: (x, y) => y !== undefined ? y : x, default: () => 0 }),

    // 🧾 Ajan 13 — Denetçi (Auditor) — Fatura & Anomali Tespiti
    // invoiceAnalysis: Ajan 13'ün fatura denetim raporu
    invoiceAnalysis: Annotation({ reducer: (x, y) => y !== "" ? y : x, default: () => "" }),
    // anomalyDetected: Faturada anomali tespit edildi mi?
    anomalyDetected: Annotation({ reducer: (x, y) => y ?? x, default: () => false }),

    // 📦 Ajan 14 — Tedarik Zinciri Planlayıcısı (Supply Chain Planner)
    // stockAlerts: Kritik stok uyarıları listesi (JSON string)
    stockAlerts: Annotation({ reducer: (x, y) => y !== "" ? y : x, default: () => "" }),
    // draftOrderEmail: Tedarikçiye gönderilecek sipariş e-postası taslağı
    draftOrderEmail: Annotation({ reducer: (x, y) => y !== "" ? y : x, default: () => "" }),

    // 💼 Ajan 12 — Satış Hafızası (Sales Rep)
    // leadStatus: müzakere aşamasını izler (sonsuz döngü kırıcı)
    leadStatus: Annotation({ reducer: (x, y) => y ?? x, default: () => "NEW" }),
    // negotiationRound: kaç kez pazarlık yapıldı? maks. 3 → hard stop
    negotiationRound: Annotation({ reducer: (x, y) => y !== undefined ? x + y : x, default: () => 0 }),
    // discountOffered: şu ana kadar teklif edilen indirim yüzdesi
    discountOffered: Annotation({ reducer: (x, y) => y !== undefined ? y : x, default: () => 0 }),
    // stripePaymentLink: ajan tarafından üretilen Stripe ödeme linki
    stripePaymentLink: Annotation({ reducer: (x, y) => y ?? x, default: () => "" }),
    // bantAnalysis: Budget | Authority | Need | Timeline özet skoru
    bantAnalysis: Annotation({ reducer: (x, y) => y !== "" ? y : x, default: () => "" }),
});
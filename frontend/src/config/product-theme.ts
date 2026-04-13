/**
 * Product Mode Configuration
 * ─────────────────────────────────────────────────
 * Tek layout + ürüne göre "mod" konfigürasyonu.
 * Her mega-departman: kendi renk accent'i, ikonografi,
 * slogan, açık/kilitli ajan listesi.
 *
 * AgentTopology, Sidebar, EmptyState, ReportViewer
 * ve job-queue bu config'e referans verir.
 */

import type { SaaSProduct, AgentId } from "@/store/types";

export interface ProductTheme {
    /** Ana accent rengi (hex) */
    accent: string;
    /** Açık arka planda okunabilir pastel ton */
    accentLight: string;
    /** Açık arka planda metin rengi */
    accentText: string;
    /** İkincil accent (genelde daha koyu veya farklı ton) */
    accentSecondary: string;
    /** Departman ikonu */
    icon: string;
    /** Kısa slogan (sidebar altında gösterilir) */
    slogan: string;
    /** Boş durum (EmptyState) mesajı */
    emptyTitle: string;
    emptyDescription: string;
    /** Bu ürün için aktif olan (kilitSİZ) ajan listesi */
    activeAgents: AgentId[];
    /** HITL paneli için preset reject seçenekleri */
    rejectPresets: { label: string; feedback: string }[];
    /** Yargıç kürsüsü (HITL) onaylama butonu metni */
    hitlApproveLabel: string;
}

export const PRODUCT_THEMES: Record<SaaSProduct, ProductTheme> = {
    cx: {
        accent: "#0EA5E9",
        accentLight: "#E0F2FE",
        accentText: "#0369A1",
        accentSecondary: "#0284C7",
        icon: "🎧",
        slogan: "Müşteri Deneyimi",
        emptyTitle: "Destek Merkezi Hazır",
        emptyDescription: "Bir ticket seçin veya yeni destek görevi gönderin",
        activeAgents: ["ceo", "writer", "hitl", "publisher", "customerBot"],
        rejectPresets: [
            { label: "Daha Empatik", feedback: "Bitte formuliere die Antwort empathischer und verständnisvoller. Zeige, dass wir das Problem ernst nehmen." },
            { label: "Daha Teknik", feedback: "Bitte erkläre die technischen Schritte detaillierter und Schritt für Schritt." },
        ],
        hitlApproveLabel: "Yanıtı Gönder & Ticket'ı Kapat",
    },
    growth: {
        accent: "#10B981",
        accentLight: "#D1FAE5",
        accentText: "#065F46",
        accentSecondary: "#059669",
        icon: "🚀",
        slogan: "Büyüme & Gelir",
        emptyTitle: "Büyüme Motoru Hazır",
        emptyDescription: "Sosyal medya içeriği oluştur, soğuk satış başlat veya ihaleye yanıt ver",
        activeAgents: ["ceo", "scraper", "analyst", "innovator", "writer", "qa", "hitl", "publisher", "cmo"],
        rejectPresets: [
            { label: "Daha Agresif Sat", feedback: "Nutze einen aggressiveren Verkaufston. Erzeuge Dringlichkeit und fokussiere auf den Nutzen." },
            { label: "Daha Danışman Tonu", feedback: "Reduziere den Verkaufsdruck. Nutze einen beratenden, vertrauensbildenden Ton." },
            { label: "Yeni Yaklaşım", feedback: "Schreibe den Text mit einem völlig neuen Wertversprechen komplett neu." },
        ],
        hitlApproveLabel: "Kampanyayı Başlat & Yayınla",
    },
    strategy: {
        accent: "#8B5CF6",
        accentLight: "#EDE9FE",
        accentText: "#5B21B6",
        accentSecondary: "#7C3AED",
        icon: "⚔️",
        slogan: "Strateji & İnovasyon",
        emptyTitle: "Savaş Odası Hazır",
        emptyDescription: "Rakip radar, trend taraması veya stres testi başlatın",
        activeAgents: ["ceo", "scraper", "analyst", "innovator", "writer", "qa", "hitl", "publisher"],
        rejectPresets: [
            { label: "Daha Agresif Strateji", feedback: "Schlage extrem risikoreiche, aber margenstarke Strategien vor. Sei mutiger." },
            { label: "Daha Muhafazakar", feedback: "Minimiere das Risiko. Schlage sicherere, etablierte Strategien vor." },
            { label: "SWOT Derinleştir", feedback: "Vertiefe die SWOT-Analyse massiv. Erweitere den Chancen/Risiken-Teil und füge einen Konkurrenzvergleich hinzu." },
        ],
        hitlApproveLabel: "Stratejiyi Onayla & Yayınla",
    },
    backoffice: {
        accent: "#F59E0B",
        accentLight: "#FEF3C7",
        accentText: "#92400E",
        accentSecondary: "#D97706",
        icon: "🏦",
        slogan: "Finans & Operasyon",
        emptyTitle: "Operasyon Merkezi Hazır",
        emptyDescription: "Fatura denetimi başlatın veya stok zincirini kontrol edin",
        activeAgents: ["ceo", "analyst", "writer", "hitl", "publisher", "cfo", "auditor", "supplyChain"],
        rejectPresets: [
            { label: "Daha Detaylı Analiz", feedback: "Führe eine tiefere Analyse durch. Erkläre jede Anomalie im Detail und dokumentiere jeden Fall." },
            { label: "Executive Özet", feedback: "Zu lang. Kürze es knallhart auf ein Executive Summary. Liste nur die extrem kritischen Findings." },
        ],
        hitlApproveLabel: "Faturayı Kaydet / Siparişi Tetikle",
    },
    engineering: {
        accent: "#06B6D4",
        accentLight: "#CFFAFE",
        accentText: "#155E75",
        accentSecondary: "#0891B2",
        icon: "👨‍💻",
        slogan: "Mühendislik & BT",
        emptyTitle: "Mühendislik Laboratuvarı Hazır",
        emptyDescription: "Proje gereksinimlerini girin — Mimar Ajan blueprint oluşturur",
        activeAgents: ["ceo", "cto", "writer", "hitl", "publisher"],
        rejectPresets: [
            { label: "Daha Detaylı Mimari", feedback: "Erweitere das Architektur-Design erheblich. Füge genaue API-Spezifikationen und DB-Schemas hinzu." },
            { label: "Daha Sade Çözüm", feedback: "Das ist Over-Engineering. Schlage eine simpel gebaute, pragmatische MVP-Architektur vor." },
        ],
        hitlApproveLabel: "Blueprint'i Derle & GitHub'a Yolla",
    },
    holding: {
        accent: "#6366F1",
        accentLight: "#EEF2FF",
        accentText: "#3730A3",
        accentSecondary: "#4F46E5",
        icon: "👑",
        slogan: "Holding / God Mode",
        emptyTitle: "Holding Merkezi Hazır",
        emptyDescription: "Tüm departmanlara erişim aktif — istediğiniz komutu gönderin",
        activeAgents: ["ceo", "cto", "scraper", "analyst", "innovator", "writer", "qa", "hitl", "publisher", "radar", "cmo", "cfo", "auditor", "supplyChain", "salesRep", "customerBot"],
        rejectPresets: [
            { label: "Daha Baskın", feedback: "Wir müssen den Markt beherrschen. Schlage kompromisslose Strategien zur Marktführerschaft vor." },
            { label: "Güvenlik Odaklı", feedback: "Risiko minimieren und Cashflow sichern. Konzentriere dich auf Bestandskunden." },
            { label: "Daha Derin", feedback: "Diese Zahlen sind oberflächlich. Tauche viel tiefer in die Rohdaten ein." },
            { label: "Daha Kısa", feedback: "Keine Romane. Wir brauchen nur strategische Bulletpoints für das Vorstandstreffen." },
        ],
        hitlApproveLabel: "Global Komutu Çalıştır",
    },
};

/** Verilen ürün için tema döndürür. Bilinmeyen ürün → cx. */
export function getProductTheme(product: SaaSProduct | null): ProductTheme {
    return PRODUCT_THEMES[product ?? "cx"] ?? PRODUCT_THEMES.cx;
}

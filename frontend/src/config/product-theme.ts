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
        slogan: "Customer Experience",
        emptyTitle: "Support-Zentrum bereit",
        emptyDescription: "Wählen Sie ein Ticket oder senden Sie eine neue Support-Aufgabe",
        activeAgents: ["ceo", "writer", "hitl", "publisher", "customerBot"],
        rejectPresets: [
            { label: "Empathischer", feedback: "Bitte formuliere die Antwort empathischer und verständnisvoller. Zeige, dass wir das Problem ernst nehmen." },
            { label: "Technischer", feedback: "Bitte erkläre die technischen Schritte detaillierter und Schritt für Schritt." },
        ],
        hitlApproveLabel: "Antwort senden & Ticket schließen",
    },
    growth: {
        accent: "#10B981",
        accentLight: "#D1FAE5",
        accentText: "#065F46",
        accentSecondary: "#059669",
        icon: "🚀",
        slogan: "Wachstum & Umsatz",
        emptyTitle: "Wachstumsmotor bereit",
        emptyDescription: "Social-Media-Content erstellen, Cold Outreach starten oder RFP beantworten",
        activeAgents: ["ceo", "scraper", "analyst", "innovator", "writer", "qa", "hitl", "publisher", "cmo"],
        rejectPresets: [
            { label: "Aggressiver verkaufen", feedback: "Nutze einen aggressiveren Verkaufston. Erzeuge Dringlichkeit und fokussiere auf den Nutzen." },
            { label: "Beraterton", feedback: "Reduziere den Verkaufsdruck. Nutze einen beratenden, vertrauensbildenden Ton." },
            { label: "Neuer Ansatz", feedback: "Schreibe den Text mit einem völlig neuen Wertversprechen komplett neu." },
        ],
        hitlApproveLabel: "Kampagne starten & veröffentlichen",
    },
    strategy: {
        accent: "#8B5CF6",
        accentLight: "#EDE9FE",
        accentText: "#5B21B6",
        accentSecondary: "#7C3AED",
        icon: "⚔️",
        slogan: "Strategie & Innovation",
        emptyTitle: "War Room bereit",
        emptyDescription: "Wettbewerbs-Radar, Trend-Scan oder Stresstest starten",
        activeAgents: ["ceo", "scraper", "analyst", "innovator", "writer", "qa", "hitl", "publisher"],
        rejectPresets: [
            { label: "Aggressivere Strategie", feedback: "Schlage extrem risikoreiche, aber margenstarke Strategien vor. Sei mutiger." },
            { label: "Konservativer", feedback: "Minimiere das Risiko. Schlage sicherere, etablierte Strategien vor." },
            { label: "SWOT vertiefen", feedback: "Vertiefe die SWOT-Analyse massiv. Erweitere den Chancen/Risiken-Teil und füge einen Konkurrenzvergleich hinzu." },
        ],
        hitlApproveLabel: "Strategie genehmigen & veröffentlichen",
    },
    backoffice: {
        accent: "#F59E0B",
        accentLight: "#FEF3C7",
        accentText: "#92400E",
        accentSecondary: "#D97706",
        icon: "🏦",
        slogan: "Finanzen & Operations",
        emptyTitle: "Operations-Zentrum bereit",
        emptyDescription: "Rechnungsaudit starten oder Lieferkette prüfen",
        activeAgents: ["ceo", "analyst", "writer", "hitl", "publisher", "cfo", "auditor", "supplyChain"],
        rejectPresets: [
            { label: "Detailliertere Analyse", feedback: "Führe eine tiefere Analyse durch. Erkläre jede Anomalie im Detail und dokumentiere jeden Fall." },
            { label: "Executive Summary", feedback: "Zu lang. Kürze es knallhart auf ein Executive Summary. Liste nur die extrem kritischen Findings." },
        ],
        hitlApproveLabel: "Rechnung speichern / Bestellung auslösen",
    },
    engineering: {
        accent: "#06B6D4",
        accentLight: "#CFFAFE",
        accentText: "#155E75",
        accentSecondary: "#0891B2",
        icon: "👨‍💻",
        slogan: "Engineering & IT",
        emptyTitle: "Engineering-Lab bereit",
        emptyDescription: "Projektanforderungen eingeben — der Architect-Agent erstellt das Blueprint",
        activeAgents: ["ceo", "cto", "writer", "hitl", "publisher"],
        rejectPresets: [
            { label: "Detailliertere Architektur", feedback: "Erweitere das Architektur-Design erheblich. Füge genaue API-Spezifikationen und DB-Schemas hinzu." },
            { label: "Schlankere Lösung", feedback: "Das ist Over-Engineering. Schlage eine simpel gebaute, pragmatische MVP-Architektur vor." },
        ],
        hitlApproveLabel: "Blueprint kompilieren & an GitHub senden",
    },
    holding: {
        accent: "#6366F1",
        accentLight: "#EEF2FF",
        accentText: "#3730A3",
        accentSecondary: "#4F46E5",
        icon: "👑",
        slogan: "Holding / God Mode",
        emptyTitle: "Holding-Zentrale bereit",
        emptyDescription: "Zugriff auf alle Abteilungen aktiv — beliebige Befehle senden",
        activeAgents: ["ceo", "cto", "scraper", "analyst", "innovator", "writer", "qa", "hitl", "publisher", "radar", "cmo", "cfo", "auditor", "supplyChain", "salesRep", "customerBot"],
        rejectPresets: [
            { label: "Dominanter", feedback: "Wir müssen den Markt beherrschen. Schlage kompromisslose Strategien zur Marktführerschaft vor." },
            { label: "Sicherheitsorientiert", feedback: "Risiko minimieren und Cashflow sichern. Konzentriere dich auf Bestandskunden." },
            { label: "Tiefer", feedback: "Diese Zahlen sind oberflächlich. Tauche viel tiefer in die Rohdaten ein." },
            { label: "Kürzer", feedback: "Keine Romane. Wir brauchen nur strategische Bulletpoints für das Vorstandstreffen." },
        ],
        hitlApproveLabel: "Globalen Befehl ausführen",
    },
};

/** Verilen ürün için tema döndürür. Bilinmeyen ürün → cx. */
export function getProductTheme(product: SaaSProduct | null): ProductTheme {
    return PRODUCT_THEMES[product ?? "cx"] ?? PRODUCT_THEMES.cx;
}

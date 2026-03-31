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
        accent: "#00f0ff",
        accentSecondary: "#0088aa",
        icon: "🎧",
        slogan: "Customer Intelligence",
        emptyTitle: "Support-Zentrum Bereit",
        emptyDescription: "Wählen Sie ein Ticket im Panel oder senden Sie eine neue Support-Aufgabe",
        activeAgents: ["ceo", "writer", "hitl", "publisher"],
        rejectPresets: [
            { label: "Empathischer", feedback: "Bitte formuliere die Antwort empathischer und verständnisvoller. Zeige, dass wir das Problem ernst nehmen." },
            { label: "Mehr technische Details", feedback: "Bitte erkläre die technischen Schritte detaillierter und Schritt für Schritt." },
        ],
        hitlApproveLabel: "🟦 ANTWORT SENDEN & TICKET SCHLIESSEN",
    },
    growth: {
        accent: "#39ff14",
        accentSecondary: "#00cc44",
        icon: "🚀",
        slogan: "Revenue Engine",
        emptyTitle: "Wachstumsmotor Bereit",
        emptyDescription: "Social Media Content erstellen, Cold-Outreach starten oder RFPs beantworten",
        activeAgents: ["ceo", "scraper", "writer", "qa", "hitl", "publisher", "cmo"],
        rejectPresets: [
            { label: "Aggressiver verkaufen", feedback: "Nutze einen aggressiveren Verkaufston. Erzeuge Dringlichkeit und fokussiere auf den Nutzen." },
            { label: "Sanfterer Ton", feedback: "Reduziere den Verkaufsdruck. Nutze einen beratenden, vertrauensbildenden Ton." },
            { label: "Neuer Ansatz", feedback: "Schreibe den Text mit einem völlig neuen Wertversprechen komplett neu." },
        ],
        hitlApproveLabel: "🟩 KAMPAGNE STARTEN & VERKAUF ABSCHLIESSEN",
    },
    strategy: {
        accent: "#bf5fff",
        accentSecondary: "#8800cc",
        icon: "⚔️",
        slogan: "War Room",
        emptyTitle: "War Room Bereit",
        emptyDescription: "Konkurrenzradar aktivieren, Branchen-Trends scannen oder Business Plan einem Stresstest unterziehen",
        activeAgents: ["ceo", "scraper", "analyst", "innovator", "writer", "qa", "hitl", "publisher"],
        rejectPresets: [
            { label: "Aggressivere Strategie", feedback: "Schlage extrem risikoreiche, aber margenstarke Strategien vor. Sei mutiger." },
            { label: "Konservativer", feedback: "Minimiere das Risiko. Schlage sicherere, etablierte Strategien vor." },
            { label: "SWOT vertiefen", feedback: "Vertiefe die SWOT-Analyse massiv. Erweitere den Chancen/Risiken-Teil und füge einen Konkurrenzvergleich hinzu." },
        ],
        hitlApproveLabel: "🛡️ STRATEGIE GENEHMIGEN & BERICHT VERÖFFENTLICHEN",
    },
    backoffice: {
        accent: "#ffb000",
        accentSecondary: "#cc8800",
        icon: "🏦",
        slogan: "Finance & Ops",
        emptyTitle: "Operations-Zentrum Bereit",
        emptyDescription: "Rechnungsaudit starten oder Supply-Chain-Bestände prüfen",
        activeAgents: ["ceo", "analyst", "writer", "hitl", "publisher", "cfo"],
        rejectPresets: [
            { label: "Detailliertere Analyse", feedback: "Führe eine tiefere Analyse durch. Erkläre jede Anomalie im Detail und dokumentiere jeden Fall." },
            { label: "Executive Summary", feedback: "Zu lang. Kürze es knallhart auf ein Executive Summary. Liste nur die extrem kritischen Findings." },
        ],
        hitlApproveLabel: "🟧 RECHNUNG VERBUCHEN / BESTELLUNG AUSLÖSEN",
    },
    engineering: {
        accent: "#10b981",
        accentSecondary: "#059669",
        icon: "👨‍💻",
        slogan: "Tech Architect",
        emptyTitle: "Engineering-Lab Bereit",
        emptyDescription: "Projektanforderungen als Code-Snippet eingeben — CTO-Agent generiert den Blueprint",
        activeAgents: ["ceo", "cto", "writer", "hitl", "publisher"],
        rejectPresets: [
            { label: "Detailliertere Architektur", feedback: "Erweitere das Architektur-Design erheblich. Füge genaue API-Spezifikationen und DB-Schemas hinzu." },
            { label: "Einfachere Lösung", feedback: "Das ist Over-Engineering. Schlage eine simpel gebaute, pragmatische MVP-Architektur vor." },
        ],
        hitlApproveLabel: "🟩 BLUEPRINT KOMPILIEREN & ZU GITHUB PUSHEN",
    },
    holding: {
        accent: "#d400ff",
        accentSecondary: "#8800aa",
        icon: "👑",
        slogan: "God Mode",
        emptyTitle: "Holding-Zentrale Bereit",
        emptyDescription: "God Mode aktiv — Senden Sie einen beliebigen Befehl, alle 14 Agenten stehen bereit",
        activeAgents: ["ceo", "cto", "scraper", "analyst", "innovator", "writer", "qa", "hitl", "publisher", "radar", "cmo", "cfo"],
        rejectPresets: [
            { label: "Aggressivere Dominanz", feedback: "Wir müssen den Markt beherrschen. Schlage kompromisslose Strategien zur Marktführerschaft vor." },
            { label: "Sicherheitsorientiert", feedback: "Risiko minimieren und Cashflow sichern. Konzentriere dich auf Bestandskunden." },
            { label: "Tiefer bohren", feedback: "Diese Zahlen sind oberflächlich. Tauche viel tiefer in die Rohdaten ein." },
            { label: "Kürzer fassen", feedback: "Keine Romane. Wir brauchen nur strategische Bulletpoints für das Vorstandstreffen." },
        ],
        hitlApproveLabel: "🟪 GLOBALEN BEFEHL AUSFÜHREN",
    },
};

/** Verilen ürün için tema döndürür. Bilinmeyen ürün → cx. */
export function getProductTheme(product: SaaSProduct | null): ProductTheme {
    return PRODUCT_THEMES[product ?? "cx"] ?? PRODUCT_THEMES.cx;
}

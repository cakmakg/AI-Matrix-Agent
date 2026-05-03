"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAgentStore } from "@/store/agent-store";
import type { SaaSProduct } from "@/store/types";
import { getProductTheme } from "@/config/product-theme";
import { ChatMessageBubble } from "@/components/chat/chat-message";
import {
    Send, Link, Upload, Zap, Download, RefreshCw,
    Inbox, Info,
} from "lucide-react";
import { TaskBoard } from "@/components/mission-control/task-board";
import { AnalyticsHub } from "@/components/analytics/analytics-hub";
import { BerichteView } from "@/components/reports/berichte-view";
import { KnowledgeView } from "@/components/knowledge/knowledge-view";
import { SkillsView } from "@/components/skills/skills-view";
import { SocialView } from "@/components/social/social-view";
import { SecurityView } from "@/components/security/security-view";
import { SettingsView } from "@/components/settings/settings-view";
import { CfoDashboard } from "@/components/finance/cfo-dashboard";

/* ══════════════════════════════════════════════════════════════
   PRODUCT INPUT CONFIG
   Her departman / sub-tab için tam konfigürasyon.
   taskPrefix → orchestrator'daki FREN kurallarıyla birebir eşleşmeli.
   Kaynak: AGENTS.md § Routing Tracks + server/README.md § FREN System
══════════════════════════════════════════════════════════════ */

export type InputType = "text" | "url" | "file";

export interface SubTab {
    key:         string;
    label:       string;
    icon:        string;
    inputType:   InputType;
    placeholder: string;
    taskPrefix:  string;
    /** Hangi ajan akışı tetiklenir — sağ panelde pipeline gösterimi için */
    track:       TrackId;
    /** Kısa açıklama — input alanının altında görünür */
    hint?:       string;
}

export interface ProductInputConfig {
    label:      string;
    inputType:  InputType;
    placeholder: string;
    taskPrefix:  string;
    track:       TrackId;
    hint?:       string;
    subTabs?:    SubTab[];
}

/**
 * FREN Track ID'leri — orchestrator.js'deki routing ile birebir eşleşir.
 * Kaynak: AGENTS.md § Routing Tracks
 */
export type TrackId =
    | "cx"           // customerBot → RAG → writer → HITL
    | "social"       // TWITTER/LINKEDIN: scraper → writer ↔ critic → fileSaver
    | "outreach"     // COLD_OUTREACH: scraper → writer ↔ critic → fileSaver
    | "rfp"          // RFP_RESPONSE: writer ↔ critic → fileSaver (Scraper YOK — RAG)
    | "innovation"   // INNOVATION_RADAR: scraper → architect → fileSaver
    | "trend"        // TREND_RADAR: scraper → analyzer → innovator → writer ↔ critic → fileSaver
    | "stress"       // BUSINESS_STRESS_TEST: analyzer → innovator → writer ↔ critic (Scraper YOK)
    | "finance"      // INVOICE_PROCESSING: auditor → fileSaver → HITL
    | "supply"       // STOCK_CHECK: supplyChain → fileSaver → HITL
    | "engineering"  // architect → fileSaved → HITL (Writer/Critic/Analyst YOK)
    | "research"     // Default full loop: scraper → analyzer → innovator → writer ↔ critic
    | "holding";     // Tüm ajanlar

export const PRODUCT_INPUT: Record<SaaSProduct, ProductInputConfig> = {
    /* ── CX & Support ──────────────────────────────────────────── */
    cx: {
        label:       "Customer Experience",
        inputType:   "text",
        placeholder: "Kundennachricht einfügen — Agent erzeugt Antwort aus RAG-Wissensdatenbank",
        taskPrefix:  "",
        track:       "cx",
        hint:        "💡 Eingehende n8n-Pipeline-Nachrichten werden automatisch verarbeitet. Hier können Sie manuell testen.",
    },

    /* ── Wachstum & Umsatz ─────────────────────────────────────── */
    growth: {
        label:      "Wachstum & Umsatz",
        inputType:  "text",
        placeholder: "",
        taskPrefix:  "",
        track:       "social",
        subTabs: [
            {
                key:         "twitter",
                label:       "Twitter/X",
                icon:        "🐦",
                inputType:   "text",
                placeholder: "Thread-Thema — Agent recherchiert im Web und erzeugt 5-7 Tweets",
                taskPrefix:  "TWITTER: ",
                track:       "social",
                hint:        "Ausgabe: jeder Tweet max. 280 Zeichen, im Thread-Format mit --- getrennt",
            },
            {
                key:         "linkedin",
                label:       "LinkedIn",
                icon:        "💼",
                inputType:   "text",
                placeholder: "Post-Thema — Agent erzeugt Hook + 200-Wörter-Body + Hashtags",
                taskPrefix:  "LINKEDIN: ",
                track:       "social",
                hint:        "Ausgabe: B2B-Zielgruppe, professioneller Inhalt für CTO/Founder",
            },
            {
                key:         "outreach",
                label:       "Cold Outreach",
                icon:        "🎯",
                inputType:   "url",
                placeholder: "https://ziel-firma.de — Agent analysiert die Website und schreibt personalisiertes Outreach",
                taskPrefix:  "COLD_OUTREACH: ",
                track:       "outreach",
                hint:        "Pipeline: Web-Recherche → Content-Writer → QA → Genehmigung",
            },
            {
                key:         "rfp",
                label:       "RFP-Antwort",
                icon:        "📋",
                inputType:   "file",
                placeholder: "Ausschreibungsdokument hochladen (.pdf, .docx) — Antwort aus RAG-Wissensdatenbank",
                taskPrefix:  "RFP_RESPONSE: ",
                track:       "rfp",
                hint:        "⚡ Kein Scraper — die Qualität Ihrer RAG-Wissensdatenbank bestimmt das Ergebnis",
            },
        ],
    },

    /* ── Strategie & Innovation ────────────────────────────────── */
    strategy: {
        label:      "Strategie & Innovation",
        inputType:  "text",
        placeholder: "",
        taskPrefix:  "",
        track:       "innovation",
        subTabs: [
            {
                key:         "competitor",
                label:       "Wettbewerbs-Radar",
                icon:        "⚔️",
                inputType:   "url",
                placeholder: "https://wettbewerber.com — Agent scannt die Site und erstellt Architektur-Blueprint",
                taskPrefix:  "INNOVATION_RADAR: ",
                track:       "innovation",
                hint:        "⚡ Writer & QA NICHT verwendet — Architect erstellt direkt das Blueprint",
            },
            {
                key:         "trend",
                label:       "Trend-Radar",
                icon:        "🌊",
                inputType:   "text",
                placeholder: "Welche Branche soll gescannt werden? — Bsp.: Wearable Health Tech 2026",
                taskPrefix:  "TREND_RADAR: ",
                track:       "trend",
                hint:        "Pipeline: Web-Recherche → Meta-Trend → Innovator → 3 neue Produktkonzepte",
            },
            {
                key:         "stress",
                label:       "Stresstest",
                icon:        "💥",
                inputType:   "file",
                placeholder: "Businessplan oder Pitch Deck hochladen (.pdf, .docx)",
                taskPrefix:  "BUSINESS_STRESS_TEST: ",
                track:       "stress",
                hint:        "⚡ Keine Web-Recherche — Analyzer prüft direkt das Dokument",
            },
        ],
    },

    /* ── Finanzen & Operations ─────────────────────────────────── */
    backoffice: {
        label:      "Finanzen & Operations",
        inputType:  "text",
        placeholder: "",
        taskPrefix:  "",
        track:       "finance",
        subTabs: [
            {
                key:         "audit",
                label:       "Rechnungsaudit",
                icon:        "🧾",
                inputType:   "text",
                placeholder: "Audit-Anweisung — Bsp.: Q1-Rechnungen auf Anomalien und Steuerrisiken prüfen",
                taskPrefix:  "INVOICE_PROCESSING: ",
                track:       "finance",
                hint:        "Pipeline: Auditor → Speicher → Wartet auf Genehmigung (Analyzer/Writer nicht aktiv)",
            },
            {
                key:         "supply",
                label:       "Lieferkette",
                icon:        "📦",
                inputType:   "text",
                placeholder: "Lagerstatus-Anweisung — Bsp.: Mindestbestandswarnung für kritische Teile",
                taskPrefix:  "STOCK_CHECK: ",
                track:       "supply",
                hint:        "Pipeline: SupplyChain → Speicher → Genehmigung (optionale automatische Lieferanten-E-Mail)",
            },
        ],
    },

    /* ── Engineering & IT ──────────────────────────────────────── */
    engineering: {
        label:      "Engineering & IT",
        inputType:  "text",
        placeholder: "Projektanforderungen eingeben — Bsp.: Architektur für Next.js + MongoDB B2B-SaaS entwerfen",
        taskPrefix:  "",
        track:       "engineering",
        hint:        "⚡ Writer/QA NICHT verwendet — Architect erzeugt direkt das Master-Blueprint",
    },

    /* ── The Holding ───────────────────────────────────────────── */
    holding: {
        label:      "Holding / God Mode",
        inputType:  "text",
        placeholder: "Befehle an alle Abteilungen senden — 16 Agenten verfügbar",
        taskPrefix:  "",
        track:       "holding",
        hint:        "Alle FREN-Tracks aktiv. Mit Prefix können Sie direkt routen.",
    },
};

/* ══════════════════════════════════════════════════════════════
   PHASE BADGE CONFIG
══════════════════════════════════════════════════════════════ */
const PHASE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
    IDLE:              { label: "Bereit",                    bg: "#F9FAFB", text: "#6B7280", border: "#E5E7EB" },
    DISPATCHING:       { label: "Wird gesendet...",          bg: "#EEF2FF", text: "#6366F1", border: "#C7D2FE" },
    RUNNING:           { label: "⚡ Aktiv",                  bg: "#D1FAE5", text: "#059669", border: "#6EE7B7" },
    AWAITING_APPROVAL: { label: "⏳ Wartet auf Genehmigung", bg: "#FEF3C7", text: "#D97706", border: "#FCD34D" },
    PUBLISHING:        { label: "Wird veröffentlicht...",    bg: "#DBEAFE", text: "#2563EB", border: "#93C5FD" },
    DELIVERED:         { label: "✓ Abgeschlossen",           bg: "#D1FAE5", text: "#059669", border: "#6EE7B7" },
    REVISING:          { label: "↩ Wird überarbeitet",       bg: "#FEE2E2", text: "#DC2626", border: "#FCA5A5" },
};

/* ══════════════════════════════════════════════════════════════
   CENTER PANEL COMPONENT
══════════════════════════════════════════════════════════════ */
type FilterTab = "all" | "hitl" | "support" | "campaign";

export function CenterPanel() {
    const {
        activeView, setActiveView,
        clientProduct, workflowPhase, threadId,
        chatMessages, sendMission, forceRdScan, pullLatestArtifact,
        fetchMissions, fetchSupportTickets, fetchCampaignDrafts,
        setActiveTrack,
    } = useAgentStore();

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const safeProduct   = mounted ? (clientProduct ?? "cx") : "cx";
    const theme         = getProductTheme(safeProduct as SaaSProduct);
    const cfg           = PRODUCT_INPUT[safeProduct as SaaSProduct] ?? PRODUCT_INPUT.cx;

    const [activeSubTabIdx, setActiveSubTabIdx] = useState(0);
    const [input,           setInput]           = useState("");
    const [sending,         setSending]         = useState(false);
    const [loading,         setLoading]         = useState(false);
    const [activeTaskTab,   setActiveTaskTab]   = useState<FilterTab>("all");
    const [dragOver,        setDragOver]        = useState(false);
    const fileRef   = useRef<HTMLInputElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Reset sub-tab when product changes
    useEffect(() => {
        setActiveSubTabIdx(0);
        // Update store track to product default
        const firstTrack = cfg.subTabs?.[0]?.track ?? cfg.track;
        setActiveTrack(firstTrack);
    }, [safeProduct]); // eslint-disable-line react-hooks/exhaustive-deps

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    // Initial data load
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([fetchMissions(), fetchSupportTickets(), fetchCampaignDrafts()]);
            setLoading(false);
        };
        load();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const activeSub   = cfg.subTabs?.[activeSubTabIdx];
    const inputType   = activeSub?.inputType   ?? cfg.inputType;
    const placeholder = activeSub?.placeholder ?? cfg.placeholder;
    const taskPrefix  = activeSub?.taskPrefix  ?? cfg.taskPrefix;
    const activeHint  = activeSub?.hint        ?? cfg.hint;

    const phase       = PHASE_CONFIG[workflowPhase] ?? PHASE_CONFIG.IDLE;
    const isChatView  = activeView === "chat";
    const isCtrlView  = activeView === "control";
    const isWorkView  = isChatView || isCtrlView;

    /** Header-Titel & Slogan je nach Active View */
    const VIEW_HEADERS: Partial<Record<typeof activeView, { title: string; subtitle: string; icon: string }>> = {
        analytics:  { title: "Analytics & Diagramme",      subtitle: "Cross-Departmental Visualisierungen", icon: "📊" },
        berichte:   { title: "Berichte-Archiv",            subtitle: "Volltext-Suche · Filter · Export",    icon: "📁" },
        cfo:        { title: "CFO-Konsole",                subtitle: "Finanzen & Token-Kosten",             icon: "💰" },
        knowledge:  { title: "Wissensdatenbank (RAG)",     subtitle: "PDF · URL · Vektorsuche",             icon: "📚" },
        skills:     { title: "Skill-Marktplatz",           subtitle: "Plugins & Tools für Agenten",         icon: "🧩" },
        social:     { title: "Social Media",               subtitle: "Geplante Posts & Kanäle",             icon: "📱" },
        security:   { title: "Sicherheit (MOAT)",          subtitle: "Bedrohungserkennung & Audit",         icon: "🛡️" },
        settings:   { title: "Einstellungen",              subtitle: "Persona · Prompts · Konfiguration",   icon: "⚙️" },
    };
    const viewHeader  = VIEW_HEADERS[activeView];

    const handleSend = async () => {
        if (!input.trim() || sending) return;
        setSending(true);
        await sendMission(taskPrefix + input.trim());
        setInput("");
        setSending(false);
    };

    const handleFile = (file: File) => {
        const prefix = activeSub?.taskPrefix ?? cfg.taskPrefix ?? "";
        const name   = file.name.replace(/\.[^.]+$/, "");
        sendMission(`${prefix}${name} — ${file.name}`);
    };

    const handleRefresh = async () => {
        setLoading(true);
        await Promise.all([fetchMissions(), fetchSupportTickets(), fetchCampaignDrafts()]);
        setLoading(false);
    };

    return (
        <main
            className="flex-1 min-w-0 flex flex-col overflow-hidden"
            style={{ background: "#F5F7FA", borderLeft: "1px solid #E5E7EB", borderRight: "1px solid #E5E7EB" }}
        >
            {/* ── Header ── */}
            <header
                className="flex items-center justify-between px-5 py-3 shrink-0"
                style={{ background: "#FFFFFF", borderBottom: "1px solid #E5E7EB" }}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                        style={{ background: viewHeader ? "#F3F4F6" : theme.accentLight }}
                    >
                        {viewHeader?.icon ?? theme.icon}
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-[14px] font-bold text-gray-900 leading-tight truncate">
                            {viewHeader?.title ?? cfg.label}
                        </h1>
                        <p className="text-[11px] text-gray-400">
                            {viewHeader?.subtitle ?? theme.slogan}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Phase badge — nur in Workflow-Views */}
                    {isWorkView && (
                        <span
                            className="text-[11px] font-semibold px-3 py-1 rounded-full border"
                            style={{ background: phase.bg, color: phase.text, borderColor: phase.border }}
                        >
                            {phase.label}
                        </span>
                    )}
                    {/* View switcher — nur in Workflow-Views (Chat / Aufgaben) */}
                    {isWorkView && (
                        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                            <button
                                onClick={() => setActiveView("chat")}
                                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                                    isChatView ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                }`}
                            >
                                💬 Chat
                            </button>
                            <button
                                onClick={() => setActiveView("control")}
                                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                                    isCtrlView ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                }`}
                            >
                                📋 Aufgaben
                                {loading && <RefreshCw size={9} className="inline ml-1 animate-spin" />}
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* ── Sub-tabs (chat view only) ── */}
            {isChatView && cfg.subTabs && cfg.subTabs.length > 0 && (
                <div
                    className="flex gap-1.5 px-4 py-2.5 overflow-x-auto scrollbar-hide shrink-0"
                    style={{ background: "#FFFFFF", borderBottom: "1px solid #F3F4F6" }}
                >
                    {cfg.subTabs.map((tab, i) => (
                        <button
                            key={tab.key}
                            onClick={() => {
                                setActiveSubTabIdx(i);
                                setInput("");
                                setActiveTrack(tab.track);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all border ${
                                i === activeSubTabIdx
                                    ? "border-transparent text-white shadow-sm"
                                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
                            }`}
                            style={i === activeSubTabIdx ? { background: theme.accent } : {}}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* ── CHAT VIEW ── */}
            {isChatView && (
                <>
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-styled">
                        <AnimatePresence initial={false}>
                            {chatMessages.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center h-full gap-4 text-center py-16"
                                >
                                    <div
                                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                                        style={{ background: theme.accentLight }}
                                    >
                                        {theme.icon}
                                    </div>
                                    <div>
                                        <p className="text-[15px] font-semibold text-gray-700 mb-1">{theme.emptyTitle}</p>
                                        <p className="text-[13px] text-gray-400 max-w-sm leading-relaxed">{theme.emptyDescription}</p>
                                    </div>
                                    {/* Active track hint */}
                                    {activeHint && (
                                        <div className="flex items-start gap-2 max-w-sm text-left mt-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
                                            <Info size={13} className="text-blue-400 shrink-0 mt-0.5" />
                                            <p className="text-[12px] text-blue-600 leading-relaxed">{activeHint}</p>
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                chatMessages.map((msg) => (
                                    <ChatMessageBubble key={msg.id} message={msg} />
                                ))
                            )}
                        </AnimatePresence>

                        {/* HITL Nudge */}
                        {workflowPhase === "AWAITING_APPROVAL" && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex justify-center mb-4"
                            >
                                <button
                                    onClick={() => setActiveView("control")}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-semibold border transition-all hover:shadow-md"
                                    style={{ background: "#FEF3C7", borderColor: "#FCD34D", color: "#92400E" }}
                                >
                                    <Inbox size={13} />
                                    Aufgabe prüfen und genehmigen →
                                </button>
                            </motion.div>
                        )}

                        {/* Thread ID info */}
                        {threadId && workflowPhase !== "IDLE" && (
                            <div className="flex justify-center mb-2">
                                <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-2.5 py-1 rounded-full">
                                    Thread: {threadId.slice(0, 12)}... · {PHASE_CONFIG[workflowPhase]?.label}
                                </span>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* ── Input Area ── */}
                    <div
                        className="px-4 py-4 shrink-0"
                        style={{ background: "#FFFFFF", borderTop: "1px solid #E5E7EB" }}
                    >
                        {/* FILE drop zone */}
                        {inputType === "file" && (
                            <div
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={e => {
                                    e.preventDefault(); setDragOver(false);
                                    const file = e.dataTransfer.files[0];
                                    if (file) handleFile(file);
                                }}
                                onClick={() => fileRef.current?.click()}
                                className={`flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-all mb-3 ${
                                    dragOver
                                        ? "border-indigo-400 bg-indigo-50"
                                        : "border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50"
                                }`}
                            >
                                <Upload size={20} className="text-gray-400" />
                                <p className="text-sm text-gray-500 text-center leading-relaxed">{placeholder}</p>
                                <p className="text-[11px] text-gray-400 font-mono">.pdf · .docx · .doc</p>
                            </div>
                        )}

                        {/* URL input */}
                        {inputType === "url" && (
                            <div className="relative mb-3">
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                                    <Link size={14} className="text-gray-400" />
                                </div>
                                <input
                                    type="url"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSend(); } }}
                                    placeholder={placeholder}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-12 py-3 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || sending}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all disabled:opacity-40"
                                    style={{ background: theme.accent, color: "white" }}
                                >
                                    <Send size={12} className={sending ? "animate-pulse" : ""} />
                                </button>
                            </div>
                        )}

                        {/* TEXT textarea */}
                        {inputType === "text" && (
                            <div className="relative mb-3">
                                <textarea
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                                    }}
                                    placeholder={placeholder || "Aufgabe eingeben und Enter drücken..."}
                                    rows={3}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none transition-all leading-relaxed"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || sending}
                                    className="absolute bottom-3 right-3 p-2 rounded-lg transition-all disabled:opacity-40"
                                    style={{
                                        background: input.trim() ? theme.accent : "#E5E7EB",
                                        color:      input.trim() ? "white"       : "#9CA3AF",
                                    }}
                                >
                                    <Send size={13} className={sending ? "animate-pulse" : ""} />
                                </button>
                            </div>
                        )}

                        {/* Hint band */}
                        {activeHint && (
                            <div className="flex items-start gap-2 mb-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                                <Info size={11} className="text-blue-400 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-blue-500 leading-relaxed">{activeHint}</p>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={forceRdScan}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all"
                            >
                                <Zap size={12} />
                                R&D-Radar
                            </button>
                            <button
                                onClick={pullLatestArtifact}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all"
                            >
                                <Download size={12} />
                                Letzter Bericht
                            </button>
                        </div>

                        <input
                            ref={fileRef}
                            type="file"
                            accept=".pdf,.docx,.doc"
                            className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                        />
                    </div>
                </>
            )}

            {/* ── CONTROL / GÖREV VIEW ── */}
            {isCtrlView && (
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div
                        className="flex items-center justify-between px-5 py-2.5 shrink-0"
                        style={{ background: "#FFFFFF", borderBottom: "1px solid #F3F4F6" }}
                    >
                        <p className="text-[12px] font-semibold text-gray-700">Offene Aufgaben & Archiv</p>
                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50"
                        >
                            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                            Aktualisieren
                        </button>
                    </div>
                    <TaskBoard activeTab={activeTaskTab} onTabChange={setActiveTaskTab} />
                </div>
            )}

            {/* ── ANALYTICS HUB VIEW ── */}
            {activeView === "analytics" && <AnalyticsHub />}

            {/* ── BERICHTE-ARCHIV VIEW ── */}
            {activeView === "berichte" && <BerichteView />}

            {/* ── FAZ 5: WEITERE VIEWS ── */}
            {activeView === "cfo"      && <div className="flex-1 overflow-y-auto scrollbar-styled"><CfoDashboard /></div>}
            {activeView === "knowledge" && <div className="flex-1 overflow-y-auto scrollbar-styled"><KnowledgeView /></div>}
            {activeView === "skills"   && <div className="flex-1 overflow-y-auto scrollbar-styled"><SkillsView /></div>}
            {activeView === "social"   && <div className="flex-1 overflow-y-auto scrollbar-styled"><SocialView /></div>}
            {activeView === "security" && <div className="flex-1 overflow-y-auto scrollbar-styled"><SecurityView /></div>}
            {activeView === "settings" && <div className="flex-1 overflow-y-auto scrollbar-styled"><SettingsView /></div>}
            {(activeView === "auditor" || activeView === "supply") && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center space-y-2">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl mx-auto">
                            {activeView === "auditor" ? "🔍" : "📦"}
                        </div>
                        <p className="font-mono text-[13px] text-white/40">Diese Konsole erscheint in Kürze</p>
                        <p className="font-mono text-[10px] text-white/25">Nutzbar über Analytics &gt; Rechnungs-Audit / Lager</p>
                    </div>
                </div>
            )}
        </main>
    );
}

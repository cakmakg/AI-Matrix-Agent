"use client";

import React from "react";
import { useAgentStore } from "@/store/agent-store";
import type { AgentId, SaaSProduct } from "@/store/types";
import { CheckCircle2, Loader2, AlertCircle, Clock, Info } from "lucide-react";
import type { TrackId } from "@/components/layout/center-panel";
import { PRODUCT_INPUT } from "@/components/layout/center-panel";

/* ══════════════════════════════════════════════════════════════
   TRACK → PIPELINE STEPS
   Definiert die Pipeline-Schritte für jede FREN-Routing-Track.
   Quelle: AGENTS.md § Routing Tracks + server/README.md § FREN System
══════════════════════════════════════════════════════════════ */

interface PipelineStep {
    id:       string;
    label:    string;
    agentId?: AgentId;
    isGate?:  boolean;
}

const TRACK_PIPELINE: Record<TrackId, PipelineStep[]> = {
    /* CX: customerBot → RAG → writer → HITL → publisher */
    cx: [
        { id: "guardrail",   label: "Sicherheits-Schutzschild",  agentId: "ceo" },
        { id: "customerBot", label: "Kunden-Bot",                agentId: "customerBot" },
        { id: "rag",         label: "RAG-Wissensdatenbank",      agentId: "ceo" },
        { id: "writer",      label: "Antwort-Autor",             agentId: "writer" },
        { id: "hitl",        label: "Menschliche Genehmigung",   agentId: "hitl", isGate: true },
        { id: "publisher",   label: "Publisher",                 agentId: "publisher" },
    ],

    /* SOCIAL: scraper → writer ↔ critic → fileSaver → HITL → publisher */
    social: [
        { id: "guardrail", label: "Sicherheits-Schutzschild",  agentId: "ceo" },
        { id: "ceo",       label: "Orchestrator",              agentId: "ceo" },
        { id: "scraper",   label: "Web-Recherche",             agentId: "scraper" },
        { id: "writer",    label: "Content-Autor",             agentId: "writer" },
        { id: "qa",        label: "Qualitäts-QA",              agentId: "qa" },
        { id: "hitl",      label: "Menschliche Genehmigung",   agentId: "hitl", isGate: true },
        { id: "publisher", label: "Publisher",                 agentId: "publisher" },
    ],

    /* OUTREACH: COLD_OUTREACH — scraper → writer ↔ critic → fileSaver → HITL */
    outreach: [
        { id: "guardrail", label: "Sicherheits-Schutzschild",  agentId: "ceo" },
        { id: "ceo",       label: "Orchestrator",              agentId: "ceo" },
        { id: "scraper",   label: "Firmen-Recherche",          agentId: "scraper" },
        { id: "writer",    label: "Outreach-Autor",            agentId: "writer" },
        { id: "qa",        label: "Qualitäts-QA",              agentId: "qa" },
        { id: "hitl",      label: "Menschliche Genehmigung",   agentId: "hitl", isGate: true },
        { id: "publisher", label: "Publisher",                 agentId: "publisher" },
    ],

    /* RFP: RFP_RESPONSE — Kein Scraper — RAG → writer ↔ critic → fileSaver */
    rfp: [
        { id: "guardrail", label: "Sicherheits-Schutzschild",  agentId: "ceo" },
        { id: "ceo",       label: "Orchestrator",              agentId: "ceo" },
        { id: "rag",       label: "RAG-Wissensdatenbank",      agentId: "ceo" },
        { id: "writer",    label: "RFP-Autor",                 agentId: "writer" },
        { id: "qa",        label: "Qualitäts-QA",              agentId: "qa" },
        { id: "hitl",      label: "Menschliche Genehmigung",   agentId: "hitl", isGate: true },
        { id: "publisher", label: "Publisher",                 agentId: "publisher" },
    ],

    /* INNOVATION: INNOVATION_RADAR — scraper → architect → fileSaved (Kein Writer/Critic!) */
    innovation: [
        { id: "guardrail", label: "Sicherheits-Schutzschild",  agentId: "ceo" },
        { id: "ceo",       label: "Orchestrator",              agentId: "ceo" },
        { id: "scraper",   label: "Web-Recherche",             agentId: "scraper" },
        { id: "architect", label: "Architekt (Blueprint)",     agentId: "cto" },
        { id: "fileSaver", label: "Speicherung",               agentId: "ceo" },
        { id: "hitl",      label: "Menschliche Genehmigung",   agentId: "hitl", isGate: true },
        { id: "publisher", label: "Publisher",                 agentId: "publisher" },
    ],

    /* TREND: TREND_RADAR — vollständige Research-Schleife */
    trend: [
        { id: "guardrail", label: "Sicherheits-Schutzschild",  agentId: "ceo" },
        { id: "ceo",       label: "Orchestrator",              agentId: "ceo" },
        { id: "scraper",   label: "Branchen-Scan",             agentId: "scraper" },
        { id: "analyst",   label: "Meta-Trend-Analyse",        agentId: "analyst" },
        { id: "innovator", label: "3 Produktkonzepte",         agentId: "innovator" },
        { id: "writer",    label: "Trend-Bericht",             agentId: "writer" },
        { id: "qa",        label: "Qualitäts-QA",              agentId: "qa" },
        { id: "hitl",      label: "Menschliche Genehmigung",   agentId: "hitl", isGate: true },
        { id: "publisher", label: "Publisher",                 agentId: "publisher" },
    ],

    /* STRESS: BUSINESS_STRESS_TEST — Kein Scraper — analyzer → innovator → writer ↔ critic */
    stress: [
        { id: "guardrail", label: "Sicherheits-Schutzschild",  agentId: "ceo" },
        { id: "ceo",       label: "Orchestrator",              agentId: "ceo" },
        { id: "analyst",   label: "Pitch-Deck-Analyse",        agentId: "analyst" },
        { id: "innovator", label: "Pivot-Empfehlung",          agentId: "innovator" },
        { id: "writer",    label: "Stresstest-Bericht",        agentId: "writer" },
        { id: "qa",        label: "Qualitäts-QA",              agentId: "qa" },
        { id: "hitl",      label: "Menschliche Genehmigung",   agentId: "hitl", isGate: true },
        { id: "publisher", label: "Publisher",                 agentId: "publisher" },
    ],

    /* FINANCE: INVOICE_PROCESSING — auditor → fileSaver → HITL */
    finance: [
        { id: "guardrail", label: "Sicherheits-Schutzschild",  agentId: "ceo" },
        { id: "ceo",       label: "Orchestrator",              agentId: "ceo" },
        { id: "auditor",   label: "Auditor-Agent",             agentId: "auditor" },
        { id: "fileSaver", label: "Speicherung",               agentId: "ceo" },
        { id: "hitl",      label: "Menschliche Genehmigung",   agentId: "hitl", isGate: true },
        { id: "publisher", label: "Publisher",                 agentId: "publisher" },
    ],

    /* SUPPLY: STOCK_CHECK — supplyChain → fileSaver → HITL */
    supply: [
        { id: "guardrail",   label: "Sicherheits-Schutzschild", agentId: "ceo" },
        { id: "ceo",         label: "Orchestrator",             agentId: "ceo" },
        { id: "supplyChain", label: "Lieferketten-Agent",       agentId: "supplyChain" },
        { id: "fileSaver",   label: "Speicherung",              agentId: "ceo" },
        { id: "hitl",        label: "Menschliche Genehmigung",  agentId: "hitl", isGate: true },
        { id: "publisher",   label: "Publisher",                agentId: "publisher" },
    ],

    /* ENGINEERING: architect → fileSaved → HITL (Kein Writer/Critic/Analyst!) */
    engineering: [
        { id: "guardrail", label: "Sicherheits-Schutzschild",  agentId: "ceo" },
        { id: "ceo",       label: "Orchestrator",              agentId: "ceo" },
        { id: "architect", label: "Architekt (CTO)",           agentId: "cto" },
        { id: "fileSaver", label: "Blueprint gespeichert",     agentId: "ceo" },
        { id: "hitl",      label: "Menschliche Genehmigung",   agentId: "hitl", isGate: true },
        { id: "publisher", label: "Publisher / GitHub Push",   agentId: "publisher" },
    ],

    /* RESEARCH: default full loop */
    research: [
        { id: "guardrail", label: "Sicherheits-Schutzschild",  agentId: "ceo" },
        { id: "ceo",       label: "Orchestrator",              agentId: "ceo" },
        { id: "scraper",   label: "Web-Recherche",             agentId: "scraper" },
        { id: "analyst",   label: "Strategische Analyse",      agentId: "analyst" },
        { id: "innovator", label: "Innovator (4. Weg)",        agentId: "innovator" },
        { id: "writer",    label: "B2B-Bericht-Autor",         agentId: "writer" },
        { id: "qa",        label: "Qualitäts-QA",              agentId: "qa" },
        { id: "hitl",      label: "Menschliche Genehmigung",   agentId: "hitl", isGate: true },
        { id: "publisher", label: "Publisher",                 agentId: "publisher" },
    ],

    /* HOLDING: alle Agenten */
    holding: [
        { id: "guardrail", label: "Sicherheits-Schutzschild",  agentId: "ceo" },
        { id: "ceo",       label: "Orchestrator",              agentId: "ceo" },
        { id: "scraper",   label: "Web-Recherche",             agentId: "scraper" },
        { id: "analyst",   label: "Analyst",                   agentId: "analyst" },
        { id: "innovator", label: "Innovator",                 agentId: "innovator" },
        { id: "writer",    label: "Content-Autor",             agentId: "writer" },
        { id: "qa",        label: "Qualitäts-QA / Critic",     agentId: "qa" },
        { id: "hitl",      label: "Menschliche Genehmigung",   agentId: "hitl", isGate: true },
        { id: "publisher", label: "Publisher",                 agentId: "publisher" },
    ],
};

/* ── Track-Beschriftungen ─────────────────────────────────────── */
const TRACK_META: Record<TrackId, { label: string; color: string; bg: string }> = {
    cx:          { label: "Kunden-Support",        color: "#0369A1", bg: "#E0F2FE" },
    social:      { label: "Social Media",          color: "#15803D", bg: "#D1FAE5" },
    outreach:    { label: "Cold Outreach",         color: "#15803D", bg: "#D1FAE5" },
    rfp:         { label: "RFP-Antwort (RAG)",     color: "#92400E", bg: "#FEF3C7" },
    innovation:  { label: "Innovations-Radar",     color: "#5B21B6", bg: "#EDE9FE" },
    trend:       { label: "Trend-Radar",           color: "#155E75", bg: "#CFFAFE" },
    stress:      { label: "Stresstest",            color: "#9D174D", bg: "#FCE7F3" },
    finance:     { label: "Rechnungs-Audit",       color: "#92400E", bg: "#FEF3C7" },
    supply:      { label: "Lieferkette",           color: "#92400E", bg: "#FEF3C7" },
    engineering: { label: "Architekt-Blueprint",   color: "#155E75", bg: "#CFFAFE" },
    research:    { label: "Recherche-Schleife",    color: "#1D4ED8", bg: "#DBEAFE" },
    holding:     { label: "Holding / God Mode",    color: "#3730A3", bg: "#EEF2FF" },
};

/* ══════════════════════════════════════════════════════════════
   ACTIVE AGENTS — Department level (shown as chips)
   Kaynak: AGENTS.md § SaaS Ürünleri → 6 Mega-Departman
══════════════════════════════════════════════════════════════ */
interface AgentChipDef {
    id:    AgentId;
    label: string;
    /** Aktiv für diesen Track? */
    activeInTracks: TrackId[];
}

const ALL_AGENT_CHIPS: AgentChipDef[] = [
    { id: "ceo",         label: "Orchestrator",          activeInTracks: ["cx","social","outreach","rfp","innovation","trend","stress","finance","supply","engineering","research","holding"] },
    { id: "cto",         label: "Architekt (CTO)",       activeInTracks: ["engineering","innovation","holding"] },
    { id: "scraper",     label: "Web-Recherche",         activeInTracks: ["social","outreach","innovation","trend","research","holding"] },
    { id: "analyst",     label: "Analyst",               activeInTracks: ["trend","stress","research","holding"] },
    { id: "innovator",   label: "Innovator",             activeInTracks: ["trend","stress","research","holding"] },
    { id: "writer",      label: "Content-Autor",         activeInTracks: ["cx","social","outreach","rfp","trend","stress","research","holding"] },
    { id: "qa",          label: "Qualitäts-QA",          activeInTracks: ["social","outreach","rfp","trend","stress","research","holding"] },
    { id: "auditor",     label: "Auditor",               activeInTracks: ["finance","holding"] },
    { id: "supplyChain", label: "Lieferkette",           activeInTracks: ["supply","holding"] },
    { id: "salesRep",    label: "Vertriebsmitarbeiter",  activeInTracks: ["holding"] },
    { id: "customerBot", label: "Kunden-Bot",            activeInTracks: ["cx","holding"] },
    { id: "hitl",        label: "Menschl. Genehmigung",  activeInTracks: ["cx","social","outreach","rfp","innovation","trend","stress","finance","supply","engineering","research","holding"] },
    { id: "publisher",   label: "Publisher",             activeInTracks: ["cx","social","outreach","rfp","innovation","trend","stress","finance","supply","engineering","research","holding"] },
    { id: "cmo",         label: "CMO",                   activeInTracks: ["social","outreach","holding"] },
    { id: "cfo",         label: "CFO",                   activeInTracks: ["finance","supply","holding"] },
];

/* ══════════════════════════════════════════════════════════════
   WORKFLOW PIPELINE SECTION
══════════════════════════════════════════════════════════════ */
function WorkflowPipelineSection({ track }: { track: TrackId }) {
    const agents        = useAgentStore((s) => s.agents);
    const workflowPhase = useAgentStore((s) => s.workflowPhase);
    const threadId      = useAgentStore((s) => s.threadId);
    const isIdle        = workflowPhase === "IDLE" || workflowPhase === "DELIVERED";
    const steps         = TRACK_PIPELINE[track] ?? TRACK_PIPELINE.research;
    const meta          = TRACK_META[track];

    return (
        <div>
            {/* Track badge */}
            <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Workflow</p>
                <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: meta.bg, color: meta.color }}
                >
                    {meta.label}
                </span>
            </div>

            {/* Thread ID */}
            {!isIdle && threadId && (
                <div className="mb-2.5 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    <span className="text-[10px] text-gray-400 font-mono">
                        Thread #{threadId.slice(0, 8)}
                    </span>
                </div>
            )}

            {isIdle ? (
                <div className="flex items-center gap-2 py-3 px-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                    <span className="text-[12px] text-gray-400">System bereit — wartet auf Aufgabe</span>
                </div>
            ) : (
                <div className="space-y-0.5">
                    {steps.map((step, i) => {
                        const agentStatus = step.agentId ? agents[step.agentId]?.status : "IDLE";
                        const isActive    = agentStatus === "ACTIVE" || agentStatus === "THINKING";
                        const isDone      = agentStatus === "SUCCESS";
                        const isError     = agentStatus === "ERROR";
                        const isGate      = step.isGate;

                        return (
                            <div key={`${step.id}-${i}`} className="flex items-center gap-2.5">
                                {/* Status column */}
                                <div className="flex flex-col items-center shrink-0 w-4">
                                    {isActive ? (
                                        <div
                                            className="w-3 h-3 rounded-full flex items-center justify-center"
                                            style={{ background: isGate ? "#FEF3C7" : "#EEF2FF" }}
                                        >
                                            <Loader2
                                                size={9}
                                                className="animate-spin"
                                                style={{ color: isGate ? "#D97706" : "#6366F1" }}
                                            />
                                        </div>
                                    ) : isDone ? (
                                        <CheckCircle2 size={12} className="text-green-500" />
                                    ) : isError ? (
                                        <AlertCircle size={12} className="text-red-400" />
                                    ) : (
                                        <div
                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                            style={{ background: isGate ? "#FDE68A" : "#E5E7EB" }}
                                        />
                                    )}
                                    {i < steps.length - 1 && (
                                        <div
                                            className="w-px mt-0.5"
                                            style={{
                                                height:     "14px",
                                                background: isDone ? "#6EE7B7" : "#E5E7EB",
                                            }}
                                        />
                                    )}
                                </div>

                                {/* Label */}
                                <span
                                    className="text-[11px] py-1 leading-none flex-1"
                                    style={{
                                        color:      isActive  ? "#111827" :
                                                    isDone    ? "#9CA3AF" :
                                                    isError   ? "#EF4444" :
                                                    isGate    ? "#D97706" :
                                                    "#D1D5DB",
                                        fontWeight: isActive ? 600 : 400,
                                    }}
                                >
                                    {step.label}
                                </span>

                                {/* Status chip */}
                                {isActive && (
                                    <span
                                        className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
                                        style={isGate
                                            ? { background: "#FEF3C7", color: "#D97706" }
                                            : { background: "#EEF2FF", color: "#6366F1" }
                                        }
                                    >
                                        {agentStatus === "THINKING" ? "denkt nach" : isGate ? "wartet" : "aktiv"}
                                    </span>
                                )}
                                {isDone && <span className="text-[10px] text-gray-300 shrink-0">✓</span>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════
   AGENT CHIPS — Track'e Göre Aktif/Pasif
══════════════════════════════════════════════════════════════ */
function AgentChipsSection({ track }: { track: TrackId }) {
    const agents      = useAgentStore((s) => s.agents);
    const activeCount = Object.values(agents).filter(
        a => a.status === "ACTIVE" || a.status === "THINKING"
    ).length;

    const activeChips  = ALL_AGENT_CHIPS.filter(c => c.activeInTracks.includes(track));
    const inactiveChips = ALL_AGENT_CHIPS.filter(c => !c.activeInTracks.includes(track));

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Agenten</p>
                <span className={`text-[11px] font-semibold ${activeCount > 0 ? "text-indigo-600" : "text-gray-400"}`}>
                    {activeCount > 0 ? `${activeCount} aktiv` : "Bereit"}
                </span>
            </div>

            {/* Active in this track */}
            <div className="mb-2">
                <p className="text-[10px] text-gray-400 font-medium mb-1.5 pl-0.5">Aktiv in diesem Track</p>
                <div className="flex flex-wrap gap-1.5">
                    {activeChips.map(({ id, label }) => {
                        const agent     = agents[id];
                        const isRunning = agent?.status === "ACTIVE" || agent?.status === "THINKING";
                        const isDone    = agent?.status === "SUCCESS";
                        const isError   = agent?.status === "ERROR";

                        return (
                            <div
                                key={id}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-all"
                                style={{
                                    background:  isRunning ? "#EEF2FF" : isDone ? "#F0FDF4" : isError ? "#FFF1F2" : "#F9FAFB",
                                    borderColor: isRunning ? "#C7D2FE" : isDone ? "#BBF7D0" : isError ? "#FECDD3" : "#E5E7EB",
                                    color:       isRunning ? "#4338CA" : isDone ? "#047857" : isError ? "#B91C1C" : "#6B7280",
                                }}
                            >
                                <div
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${isRunning ? "animate-pulse" : ""}`}
                                    style={{
                                        background: isRunning ? "#6366F1" : isDone ? "#10B981" : isError ? "#EF4444" : "#D1D5DB",
                                    }}
                                />
                                {label}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* NOT active in this track */}
            {inactiveChips.length > 0 && (
                <div>
                    <p className="text-[10px] text-gray-300 font-medium mb-1.5 pl-0.5">Nicht aktiv in diesem Track</p>
                    <div className="flex flex-wrap gap-1.5">
                        {inactiveChips.map(({ id, label }) => (
                            <div
                                key={id}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border"
                                style={{ background: "#FAFAFA", borderColor: "#F3F4F6", color: "#D1D5DB" }}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-200 shrink-0" />
                                {label}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════
   EVENT LOG SECTION
══════════════════════════════════════════════════════════════ */
const LOG_LEVEL_STYLE: Record<string, { bg: string; text: string }> = {
    SUCCESS:  { bg: "#D1FAE5", text: "#047857" },
    ERROR:    { bg: "#FEE2E2", text: "#B91C1C" },
    CRITICAL: { bg: "#FEE2E2", text: "#B91C1C" },
    WARN:     { bg: "#FEF3C7", text: "#92400E" },
    INFO:     { bg: "#DBEAFE", text: "#1D4ED8" },
};

function EventLogSection() {
    const logs      = useAgentStore((s) => s.logs);
    const displayed = [...logs].reverse().slice(0, 8);

    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Letzte Aktivitäten</p>
            </div>

            {displayed.length === 0 ? (
                <p className="text-[11px] text-gray-400 text-center py-4">Noch keine Aktivität</p>
            ) : (
                <div className="space-y-1.5">
                    {displayed.map((log) => {
                        const style = LOG_LEVEL_STYLE[log.level] ?? LOG_LEVEL_STYLE.INFO;
                        return (
                            <div key={log.id} className="flex items-start gap-2">
                                <span
                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                                    style={{ background: style.bg, color: style.text }}
                                >
                                    {log.agent.slice(0, 3).toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                    <p className="text-[11px] text-gray-600 leading-snug">{log.message}</p>
                                    <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                        <Clock size={8} />
                                        {log.timestamp.slice(0, 8)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════
   MAIN RIGHT PANEL
══════════════════════════════════════════════════════════════ */
export function RightPanel() {
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => { setMounted(true); }, []);

    const clientProduct = useAgentStore((s) => s.clientProduct);
    const activeView    = useAgentStore((s) => s.activeView);
    const storeTrack    = useAgentStore((s) => s.activeTrack);

    // Fallback: eğer store henüz günclenmediyse product default'una bak
    const safeProduct   = mounted ? (clientProduct ?? "cx") : "cx";
    const productCfg    = PRODUCT_INPUT[safeProduct as SaaSProduct] ?? PRODUCT_INPUT.cx;
    const defaultTrack  = productCfg.subTabs?.[0]?.track ?? productCfg.track;
    const activeTrack: TrackId = (storeTrack as TrackId) ?? defaultTrack;

    return (
        <aside
            className="w-[300px] shrink-0 flex flex-col h-screen overflow-hidden"
            style={{ background: "#FFFFFF", borderLeft: "1px solid #E5E7EB" }}
        >
            {/* Header */}
            <div className="px-4 py-3.5 shrink-0" style={{ borderBottom: "1px solid #E5E7EB" }}>
                <h2 className="text-[13px] font-bold text-gray-900">Systemstatus</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">Echtzeit Agenten-Tracking</p>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-styled">

                {/* A — Workflow Pipeline (track'e özel) */}
                <div className="p-3 rounded-xl border" style={{ background: "#FAFAFA", borderColor: "#F3F4F6" }}>
                    <WorkflowPipelineSection track={activeTrack} />
                </div>

                {/* B — Agent Chips (track'e özel aktif/pasif) */}
                <div className="p-3 rounded-xl border" style={{ background: "#FAFAFA", borderColor: "#F3F4F6" }}>
                    <AgentChipsSection track={activeTrack} />
                </div>

                {/* C — Event Log */}
                <div className="p-3 rounded-xl border" style={{ background: "#FAFAFA", borderColor: "#F3F4F6" }}>
                    <EventLogSection />
                </div>

                {/* D — Track info panel */}
                {activeView === "chat" && (
                    <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                        <Info size={12} className="text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-blue-600 leading-relaxed">
                            Aktiver Track:{" "}
                            <strong>{TRACK_META[activeTrack]?.label}</strong>
                            {" "}— Agenten und Pipeline-Schritte ändern sich je nach Abteilung und gewähltem Prozess.
                        </p>
                    </div>
                )}
            </div>
        </aside>
    );
}

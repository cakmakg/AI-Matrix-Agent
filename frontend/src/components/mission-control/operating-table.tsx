"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronDown, ChevronRight, CheckCircle2, XCircle,
    Loader2, Eye, Edit3, FileText, Mail, AlertTriangle,
    Database, Clock, Activity, X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAgentStore } from "@/store/agent-store";
import type { SupportTicketSummary } from "@/store/agent-store";
import { CmoStudio } from "./cmo-studio";
import { getProductTheme } from "@/config/product-theme";

/* ══════════════════════════════════════════════════════════════
   ACCORDION SECTION
═══════════════════════════════════════════════════════════════ */
function AccordionSection({ title, icon, defaultOpen = false, children, accent = "white" }: {
    title: string; icon: React.ReactNode; defaultOpen?: boolean;
    children: React.ReactNode; accent?: string;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-white/6 rounded-lg overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-white/2 hover:bg-white/4 transition-colors text-left"
            >
                <span style={{ color: accent === "white" ? "rgba(255,255,255,0.4)" : accent }}>{icon}</span>
                <span className="font-mono text-[9px] font-semibold uppercase tracking-widest flex-1"
                    style={{ color: accent === "white" ? "rgba(255,255,255,0.5)" : `${accent}bb` }}>
                    {title}
                </span>
                {open
                    ? <ChevronDown size={10} className="text-white/25" />
                    : <ChevronRight size={10} className="text-white/25" />
                }
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 py-3 border-t border-white/5">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════
   REPORT PANEL (HITL)
═══════════════════════════════════════════════════════════════ */
function ReportPanel({ threadId }: { threadId: string }) {
    const {
        pendingContent, threadId: storeThreadId,
        missionMessage, workflowPhase,
        approveMission, rejectMission, setDrawerItem,
        apiKey, editedContent, setEditedContent, clientProduct,
    } = useAgentStore();

    const rejectPresets = getProductTheme(clientProduct).rejectPresets;

    const [viewMode, setViewMode] = useState<"preview" | "edit">("preview");
    const [feedback, setFeedback] = useState("");
    const [rejectMode, setRejectMode] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [fetchedContent, setFetchedContent] = useState<string | null>(null);

    // Sync store threadId
    useEffect(() => {
        if (threadId && threadId !== storeThreadId) {
            useAgentStore.setState({ threadId, workflowPhase: "AWAITING_APPROVAL", missionCategory: "HOT_LEAD" });
        }
    }, [threadId, storeThreadId]);

    // Fetch content if missing
    useEffect(() => {
        if (pendingContent?.trim()) { setFetchedContent(null); return; }
        setFetching(true);
        const headers: Record<string, string> = {};
        if (apiKey) headers["x-api-key"] = apiKey;
        fetch(`/api/artifact/${threadId}`, { headers })
            .then(r => r.json())
            .then(data => {
                const text = (data.content || "").trim();
                setFetchedContent(text || "*(Inhalt nicht gefunden)*");
                if (text) useAgentStore.setState({ pendingContent: text, workflowPhase: "AWAITING_APPROVAL" });
            })
            .catch(() => setFetchedContent("*(Inhalt konnte nicht geladen werden)*"))
            .finally(() => setFetching(false));
    }, [threadId, pendingContent, apiKey]);

    const rawContent = (pendingContent || "").trim() || fetchedContent || "";

    // Sync editedContent on first load
    useEffect(() => {
        if (rawContent && !editedContent) setEditedContent(rawContent);
    }, [rawContent, editedContent, setEditedContent]);

    const displayContent = editedContent ?? rawContent;

    const isPublishing = workflowPhase === "PUBLISHING" || workflowPhase === "DELIVERED";

    const handleApprove = async () => {
        setSubmitting(true);
        await approveMission(feedback || undefined);
        setSubmitting(false);
        setEditedContent(null);
        setDrawerItem(null);
    };

    const handleReject = async () => {
        if (!feedback.trim()) return;
        setSubmitting(true);
        await rejectMission(feedback);
        setSubmitting(false);
        setRejectMode(false);
        setFeedback("");
        setEditedContent(null);
        setDrawerItem(null);
    };

    // Workflow step trace
    const steps = ["CEO", "SCR", "ANL", "VZN", "WRT", "QA", "SAVED", "HITL"];

    return (
        <div className="flex flex-col h-full">
            {/* Top bar */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-white/6 shrink-0">
                <FileText size={13} className="text-[#ff2d55]/70 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="font-mono text-[7px] text-[#ff2d55]/50 uppercase tracking-widest mb-0.5">HITL — Genehmigungstor</p>
                    <p className="font-mono text-[10px] text-white/65 truncate">
                        {missionMessage?.slice(0, 80) ?? `Thread: ${threadId.slice(0, 20)}...`}
                    </p>
                </div>
                <span className="font-mono text-[7px] text-[#ffb000]/60 bg-[#ffb000]/8 border border-[#ffb000]/20 px-2 py-1 rounded-full uppercase tracking-widest animate-pulse">
                    Genehmigung ausstehend
                </span>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-hide">

                {/* A: Mission Brief */}
                <AccordionSection title="Aufgabenübersicht" icon={<Activity size={10} />} defaultOpen={false}>
                    {missionMessage && (
                        <div className="space-y-2">
                            <p className="font-mono text-[8px] text-white/30 uppercase tracking-wider">Ursprüngliche Aufgabe</p>
                            <p className="font-mono text-[10px] text-white/65 leading-relaxed bg-white/3 rounded-lg px-3 py-2.5 border border-white/6">
                                {missionMessage}
                            </p>
                        </div>
                    )}
                    <div className="mt-3">
                        <p className="font-mono text-[8px] text-white/30 uppercase tracking-wider mb-2">Workflow</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {steps.map((s, i) => (
                                <React.Fragment key={s}>
                                    <span className={`font-mono text-[7px] px-2 py-1 rounded border
                                        ${s === "HITL"
                                            ? "text-[#ff2d55] border-[#ff2d55]/40 bg-[#ff2d55]/8 animate-pulse"
                                            : "text-[#39ff14]/70 border-[#39ff14]/20 bg-[#39ff14]/5"
                                        }`}>{s}</span>
                                    {i < steps.length - 1 && <ChevronRight size={8} className="text-white/15" />}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </AccordionSection>

                {/* B: Content Editor */}
                <div className="rounded-xl border border-white/8 overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/2 border-b border-white/6">
                        <span className="font-mono text-[8px] text-white/35 uppercase tracking-widest flex-1">Inhalt</span>
                        <div className="flex gap-1 bg-white/5 rounded-md p-0.5">
                            {(["preview", "edit"] as const).map(m => (
                                <button
                                    key={m}
                                    onClick={() => setViewMode(m)}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded font-mono text-[7px] uppercase tracking-wider transition-all
                                        ${viewMode === m ? "bg-white/12 text-white/80" : "text-white/30 hover:text-white/55"}`}
                                >
                                    {m === "preview" ? <Eye size={8} /> : <Edit3 size={8} />}
                                    {m === "preview" ? "Vorschau" : "Bearbeiten"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content area */}
                    <div className="min-h-[300px] max-h-[420px] overflow-y-auto scrollbar-hide">
                        {fetching ? (
                            <div className="flex items-center justify-center h-40 gap-2 text-white/25">
                                <Loader2 size={13} className="animate-spin" />
                                <span className="font-mono text-[10px]">Bericht wird geladen...</span>
                            </div>
                        ) : viewMode === "preview" ? (
                            <div className="px-5 py-4 prose prose-invert prose-sm max-w-none
                                prose-headings:font-mono prose-headings:text-white/80 prose-headings:text-xs prose-headings:tracking-wide
                                prose-p:text-white/60 prose-p:text-[11px] prose-p:leading-relaxed
                                prose-code:text-[#39ff14] prose-code:text-[9px] prose-code:bg-white/5 prose-code:px-1 prose-code:rounded
                                prose-pre:bg-white/4 prose-pre:border prose-pre:border-white/8 prose-pre:rounded-lg
                                prose-strong:text-white/85 prose-li:text-white/60 prose-li:text-[10px]
                                prose-a:text-[#00f0ff] prose-blockquote:border-[#00f0ff]/30">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
                            </div>
                        ) : (
                            <textarea
                                value={displayContent}
                                onChange={e => setEditedContent(e.target.value)}
                                className="w-full h-full min-h-[300px] bg-transparent px-5 py-4 font-mono text-[10px] text-white/65
                                           leading-relaxed resize-none outline-none placeholder:text-white/20"
                                placeholder="Inhalt wird geladen..."
                            />
                        )}
                    </div>

                    {editedContent && editedContent !== rawContent && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-[#ffb000]/5 border-t border-[#ffb000]/15">
                            <Edit3 size={9} className="text-[#ffb000]/60" />
                            <span className="font-mono text-[8px] text-[#ffb000]/60">Änderungen gespeichert (werden bei Genehmigung gesendet)</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Decision Zone — fixed bottom */}
            {!isPublishing ? (
                <div className="px-5 py-4 border-t border-white/8 shrink-0 space-y-2.5"
                    style={{ background: "rgba(7,12,20,0.95)" }}>
                    {rejectMode ? (
                        <>
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle size={10} className="text-[#ff2d55]/60" />
                                <span className="font-mono text-[8px] text-[#ff2d55]/60 uppercase tracking-widest">Ablehnungsgrund (Pflichtfeld)</span>
                            </div>
                            {/* Preset reject butonları */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {rejectPresets.map((p) => (
                                    <button
                                        key={p.label}
                                        onClick={() => setFeedback(p.feedback)}
                                        className={`px-2.5 py-1 rounded-md font-mono text-[8px] border transition-all
                                            ${feedback === p.feedback
                                                ? "border-[#ff2d55]/40 bg-[#ff2d55]/10 text-[#ff2d55]/80"
                                                : "border-white/10 bg-white/3 text-white/40 hover:border-[#ff2d55]/25 hover:text-white/60"}`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={feedback}
                                onChange={e => setFeedback(e.target.value)}
                                placeholder="Was soll geändert werden? Feedback an den Autor..."
                                rows={3}
                                className="w-full bg-white/4 border border-[#ff2d55]/20 rounded-lg px-3 py-2.5 font-mono text-[10px] text-white/70
                                           placeholder:text-white/20 outline-none focus:border-[#ff2d55]/40 resize-none"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleReject}
                                    disabled={!feedback.trim() || submitting}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-mono text-[9px] font-bold uppercase tracking-wider
                                               bg-[#ff2d55]/10 border border-[#ff2d55]/40 text-[#ff2d55] hover:bg-[#ff2d55]/20
                                               disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    {submitting ? <Loader2 size={10} className="animate-spin" /> : <XCircle size={10} />}
                                    Ablehnen — Neu schreiben
                                </button>
                                <button
                                    onClick={() => { setRejectMode(false); setFeedback(""); }}
                                    className="px-4 rounded-lg font-mono text-[9px] text-white/35 border border-white/10 hover:border-white/20 transition-colors"
                                >
                                    Abbrechen
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <input
                                value={feedback}
                                onChange={e => setFeedback(e.target.value)}
                                placeholder="Optionale Genehmigungsnotiz..."
                                className="w-full bg-white/3 border border-white/8 rounded-lg px-3 py-2 font-mono text-[10px] text-white/65
                                           placeholder:text-white/18 outline-none focus:border-[#39ff14]/25"
                            />
                            <div className="flex gap-2">
                                <motion.button
                                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                                    onClick={handleApprove}
                                    disabled={submitting || fetching}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider
                                               bg-[#39ff14]/10 border border-[#39ff14]/40 text-[#39ff14]
                                               hover:bg-[#39ff14]/18 hover:border-[#39ff14]/60 hover:shadow-[0_0_24px_rgba(57,255,20,0.18)]
                                               disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    {submitting ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                                    Autorisieren & Veröffentlichen
                                </motion.button>
                                <button
                                    onClick={() => setRejectMode(true)}
                                    className="px-5 rounded-lg font-mono text-[9px] font-bold uppercase tracking-wider
                                               border border-[#ff2d55]/25 text-[#ff2d55]/55
                                               hover:bg-[#ff2d55]/8 hover:border-[#ff2d55]/45 transition-all"
                                >
                                    Override
                                </button>
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <div className="px-5 py-4 border-t border-white/8 shrink-0 flex items-center justify-center gap-2">
                    <Loader2 size={12} className="animate-spin text-[#00f0ff]" />
                    <span className="font-mono text-[10px] text-[#00f0ff]/70">Wird übertragen...</span>
                </div>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════
   SUPPORT PANEL
═══════════════════════════════════════════════════════════════ */
function SupportPanel({ ticket }: { ticket: SupportTicketSummary }) {
    const { approveSupportTicket, setDrawerItem } = useAgentStore();
    const [draft, setDraft] = useState(ticket.draftResponse || "");
    const [feedback, setFeedback] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const isBug = ticket.category === "SUPPORT_BUG";
    const accentColor = isBug ? "#ff2d55" : "#00f0ff";

    const handleSend = async () => {
        setSubmitting(true);
        await approveSupportTicket(ticket._id, true, feedback || undefined);
        setSubmitting(false);
        setDrawerItem(null);
    };

    const handleArchive = async () => {
        setSubmitting(true);
        await approveSupportTicket(ticket._id, false, "Archived by operator");
        setSubmitting(false);
        setDrawerItem(null);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Top bar */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-white/6 shrink-0">
                <Mail size={13} style={{ color: `${accentColor}99` }} className="shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="font-mono text-[7px] uppercase tracking-widest mb-0.5" style={{ color: `${accentColor}66` }}>
                        {isBug ? "Technischer Support" : "Preisanfrage"}
                    </p>
                    <p className="font-mono text-[11px] text-white/75 truncate">{ticket.subject}</p>
                </div>
                <div className="flex items-center gap-2">
                    {ticket.priority && (
                        <span className={`font-mono text-[7px] uppercase tracking-wider px-2 py-0.5 rounded border
                            ${ticket.priority === "critical" ? "text-[#ff2d55] border-[#ff2d55]/30 bg-[#ff2d55]/8" :
                              ticket.priority === "high"     ? "text-[#ffb000] border-[#ffb000]/30 bg-[#ffb000]/8" :
                              "text-white/40 border-white/12"}`}>
                            {ticket.priority}
                        </span>
                    )}
                    <span className="font-mono text-[7px] text-white/20 bg-white/5 px-2 py-0.5 rounded border border-white/8 uppercase">
                        {ticket.platform}
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-hide">

                {/* A: Original Message */}
                <AccordionSection title="Originalnachricht" icon={<Mail size={10} />} defaultOpen={true} accent={accentColor}>
                    <div className="space-y-2">
                        <div className="flex gap-4">
                            <div>
                                <p className="font-mono text-[7px] text-white/25 uppercase tracking-wider mb-0.5">Von</p>
                                <p className="font-mono text-[9px] text-white/60">{ticket.from}</p>
                            </div>
                            <div>
                                <p className="font-mono text-[7px] text-white/25 uppercase tracking-wider mb-0.5">Datum</p>
                                <p className="font-mono text-[9px] text-white/60 flex items-center gap-1">
                                    <Clock size={8} />
                                    {new Date(ticket.createdAt).toLocaleString("tr-TR")}
                                </p>
                            </div>
                        </div>
                        {ticket.aiSummary && (
                            <div className="bg-white/3 rounded-lg px-3 py-2.5 border border-white/6">
                                <p className="font-mono text-[8px] text-white/30 uppercase tracking-wider mb-1">KI-Zusammenfassung</p>
                                <p className="font-mono text-[10px] text-white/60 leading-relaxed">{ticket.aiSummary}</p>
                            </div>
                        )}
                    </div>
                </AccordionSection>

                {/* B: RAG Sources */}
                {ticket.ragSources?.length > 0 && (
                    <AccordionSection title="RAG-Quellen" icon={<Database size={10} />} defaultOpen={false} accent="#39ff14">
                        <div className="space-y-1.5">
                            {ticket.ragSources.map((src: { title: string; score: number }, i: number) => (
                                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/3 border border-white/6">
                                    <Database size={8} className="text-[#39ff14]/50 shrink-0" />
                                    <span className="font-mono text-[9px] text-white/65 flex-1 truncate">{src.title}</span>
                                    <span className="font-mono text-[8px] text-[#39ff14]/60 bg-[#39ff14]/8 px-2 py-0.5 rounded border border-[#39ff14]/20">
                                        {Math.round(src.score * 100)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </AccordionSection>
                )}

                {/* C: Draft Reply — Editable */}
                <div className="rounded-xl border border-white/8 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white/2 border-b border-white/6">
                        <Edit3 size={9} className="text-white/35" />
                        <span className="font-mono text-[8px] text-white/40 uppercase tracking-widest flex-1">KI Antwortentwurf — Bearbeitbar</span>
                    </div>
                    <textarea
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        rows={8}
                        className="w-full bg-transparent px-4 py-3 font-mono text-[10px] text-white/65 leading-relaxed
                                   resize-none outline-none placeholder:text-white/20"
                        placeholder="AI taslak yanıtı burada görünecek..."
                    />
                </div>
            </div>

            {/* Decision Zone */}
            <div className="px-5 py-4 border-t border-white/8 shrink-0 space-y-2.5"
                style={{ background: "rgba(7,12,20,0.95)" }}>
                <input
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="Optionale Anmerkung..."
                    className="w-full bg-white/3 border border-white/8 rounded-lg px-3 py-2 font-mono text-[10px] text-white/65
                               placeholder:text-white/18 outline-none focus:border-[#00f0ff]/25"
                />
                <div className="flex gap-2">
                    <motion.button
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                        onClick={handleSend}
                        disabled={submitting}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider
                                   bg-[#00f0ff]/10 border border-[#00f0ff]/40 text-[#00f0ff]
                                   hover:bg-[#00f0ff]/18 hover:border-[#00f0ff]/60 hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]
                                   disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        {submitting ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                        Antwort senden
                    </motion.button>
                    <button
                        onClick={handleArchive}
                        disabled={submitting}
                        className="px-5 rounded-lg font-mono text-[9px] border border-white/12 text-white/35
                                   hover:bg-white/5 hover:border-white/20 disabled:opacity-30 transition-all"
                    >
                        <XCircle size={11} />
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════
   EMPTY STATE
═══════════════════════════════════════════════════════════════ */
function EmptyState() {
    const { workflowPhase, activeAgent, agents, clientProduct } = useAgentStore();
    const theme = getProductTheme(clientProduct);
    const isRunning = workflowPhase === "RUNNING" || workflowPhase === "DISPATCHING" || workflowPhase === "REVISING";
    const agent = activeAgent ? agents[activeAgent] : null;

    return (
        <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center">
            {isRunning && agent ? (
                <>
                    <div className="relative">
                        <div className="w-20 h-20 rounded-2xl border border-white/10 flex items-center justify-center text-3xl"
                            style={{ boxShadow: `0 0 40px ${agent.color}20` }}>
                            {agent.icon}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#070c14] flex items-center justify-center"
                            style={{ background: agent.color }}>
                            <Loader2 size={10} className="animate-spin text-black" />
                        </div>
                    </div>
                    <div>
                        <p className="font-mono text-[11px] font-bold text-white/70 mb-1">{agent.label}</p>
                        <p className="font-mono text-[9px] text-white/30 uppercase tracking-widest animate-pulse">
                            läuft...
                        </p>
                    </div>
                    <div className="flex gap-1.5">
                        {(["CEO","SCR","ANL","VZN","WRT","QA"] as const).map(s => {
                            const agentMap: Record<string, string> = { CEO:"ceo", SCR:"scraper", ANL:"analyst", VZN:"innovator", WRT:"writer", QA:"qa" };
                            const a = agents[agentMap[s] as keyof typeof agents];
                            return (
                                <div key={s} className={`w-2 h-2 rounded-full transition-all duration-300
                                    ${a?.status === "ACTIVE"  ? "animate-pulse scale-125" :
                                      a?.status === "SUCCESS" ? "opacity-100" : "opacity-20"}`}
                                    style={{ background: a?.status === "ACTIVE" ? a.color : a?.status === "SUCCESS" ? "#39ff14" : "rgba(255,255,255,0.3)" }}
                                />
                            );
                        })}
                    </div>
                </>
            ) : (
                <>
                    <div
                        className="w-16 h-16 rounded-2xl border flex items-center justify-center text-2xl"
                        style={{
                            borderColor: `${theme.accent}20`,
                            background: `${theme.accent}08`,
                            boxShadow: `0 0 30px ${theme.accent}10`,
                        }}
                    >
                        {theme.icon}
                    </div>
                    <div>
                        <p className="font-mono text-[11px] font-semibold mb-2" style={{ color: `${theme.accent}88` }}>
                            {theme.emptyTitle}
                        </p>
                        <p className="font-mono text-[9px] text-white/18 leading-relaxed max-w-[280px]">
                            {theme.emptyDescription}
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT — Right Overlay Drawer
═══════════════════════════════════════════════════════════════ */
export const OperatingTable = () => {
    const { drawerItem, setDrawerItem } = useAgentStore();

    const typeLabel = drawerItem?.type === "report"   ? "HITL-Bericht" :
                      drawerItem?.type === "support"  ? "Support-Anfrage" :
                      drawerItem?.type === "campaign" ? "CMO Studio" :
                      "Aufgaben-Archiv";

    const typeAccent = drawerItem?.type === "report"   ? "#ff2d55" :
                       drawerItem?.type === "support"  ? "#00f0ff" :
                       drawerItem?.type === "campaign" ? "#ff6b35" :
                       "rgba(255,255,255,0.3)";

    return (
        <AnimatePresence>
            {drawerItem && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setDrawerItem(null)}
                        className="absolute inset-0 z-10"
                        style={{ background: "rgba(0,0,0,0.35)" }}
                    />

                    {/* Drawer */}
                    <motion.aside
                        key="drawer"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 32, stiffness: 300 }}
                        className="absolute right-0 top-0 h-full w-[520px] z-20 flex flex-col overflow-hidden"
                        style={{ background: "#0b1220", borderLeft: "1px solid rgba(255,255,255,0.09)" }}
                    >
                        {/* Drawer header */}
                        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/8 shrink-0">
                            <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: typeAccent, opacity: 0.8 }}
                            />
                            <span className="text-sm font-semibold text-white/80 flex-1">{typeLabel}</span>
                            <button
                                onClick={() => setDrawerItem(null)}
                                className="p-1.5 rounded-lg hover:bg-white/8 text-white/35 hover:text-white/70 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Drawer content */}
                        <div className="flex-1 overflow-hidden relative">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={`${drawerItem.type}-${
                                        drawerItem.type === "report"   ? drawerItem.threadId :
                                        drawerItem.type === "support"  ? drawerItem.ticket._id :
                                        drawerItem.type === "campaign" ? drawerItem.campaign._id :
                                        "mission"
                                    }`}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -8 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute inset-0 flex flex-col"
                                >
                                    {drawerItem.type === "report" && (
                                        <ReportPanel threadId={drawerItem.threadId} />
                                    )}
                                    {drawerItem.type === "support" && (
                                        <SupportPanel ticket={drawerItem.ticket} />
                                    )}
                                    {drawerItem.type === "campaign" && (
                                        <CmoStudio campaign={drawerItem.campaign} />
                                    )}
                                    {drawerItem.type === "mission" && (
                                        <div className="flex flex-col h-full">
                                            <div className="px-5 py-4 border-b border-white/6 shrink-0">
                                                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5">
                                                    Archiv — Vergangene Aufgabe
                                                </p>
                                                <p className="text-sm font-semibold text-white/75 truncate">
                                                    {drawerItem.mission.task}
                                                </p>
                                            </div>
                                            <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hide">
                                                <div className="prose prose-invert prose-sm max-w-none
                                                    prose-headings:font-mono prose-headings:text-white/70 prose-headings:text-xs
                                                    prose-p:text-white/50 prose-p:text-[11px] prose-p:leading-relaxed
                                                    prose-strong:text-white/70 prose-li:text-white/50 prose-li:text-[11px]">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {drawerItem.mission.content ?? drawerItem.mission.contentPreview}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
};

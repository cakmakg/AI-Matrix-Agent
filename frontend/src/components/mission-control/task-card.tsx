"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronDown, ChevronUp, CheckCircle2, XCircle,
    Loader2, Eye, Edit3, FileText, Megaphone, Bug, AlertTriangle,
    Database, Clock,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAgentStore } from "@/store/agent-store";
import type { SupportTicketSummary, CampaignDraftSummary } from "@/store/types";
import { getProductTheme } from "@/config/product-theme";

// ── HITL Report Card ────────────────────────────────────────────────────────
interface HitlTaskCardProps {
    threadId: string;
    task: string;
    preview: string;
    createdAt: string;
}

export function HitlTaskCard({ threadId, task, preview, createdAt }: HitlTaskCardProps) {
    const {
        pendingContent, threadId: storeThreadId,
        workflowPhase, approveMission, rejectMission,
        apiKey, editedContent, setEditedContent, clientProduct,
    } = useAgentStore();

    const expandedTaskId   = useAgentStore((s) => s.expandedTaskId);
    const setExpandedTask  = useAgentStore((s) => s.setExpandedTask);
    const isExpanded       = expandedTaskId === threadId;

    const theme        = getProductTheme(clientProduct);
    const rejectPresets = theme.rejectPresets;

    const [viewMode,    setViewMode]   = useState<"preview" | "edit">("preview");
    const [feedback,    setFeedback]   = useState("");
    const [rejectMode,  setRejectMode] = useState(false);
    const [submitting,  setSubmitting] = useState(false);
    const [fetching,    setFetching]   = useState(false);
    const [localContent, setLocalContent] = useState<string | null>(null);

    // Sync thread when expanded
    useEffect(() => {
        if (isExpanded && threadId && threadId !== storeThreadId) {
            useAgentStore.setState({ threadId, workflowPhase: "AWAITING_APPROVAL", missionCategory: "HOT_LEAD" });
        }
    }, [isExpanded, threadId, storeThreadId]);

    // Fetch content when card is expanded and pendingContent is empty
    useEffect(() => {
        if (!isExpanded) return;
        const activeContent = (threadId === storeThreadId ? pendingContent : null)?.trim();
        if (activeContent) return; // pendingContent available, no fetch needed
        setFetching(true);
        const headers: Record<string, string> = {};
        if (apiKey) headers["x-api-key"] = apiKey;
        fetch(`/api/artifact/${threadId}`, { headers })
            .then(r => r.json())
            .then(data => {
                const text = (data.content || "").trim();
                setLocalContent(text || "*(Inhalt nicht gefunden)*");
                if (text && threadId === storeThreadId) {
                    useAgentStore.setState({ pendingContent: text, workflowPhase: "AWAITING_APPROVAL" });
                }
            })
            .catch(() => setLocalContent("*(Inhalt konnte nicht geladen werden)*"))
            .finally(() => setFetching(false));
    }, [isExpanded, threadId, storeThreadId, pendingContent, apiKey]);

    const rawContent = (
        (threadId === storeThreadId ? pendingContent : null) || localContent || ""
    ).trim();

    useEffect(() => {
        if (rawContent && !editedContent && isExpanded) setEditedContent(rawContent);
    }, [rawContent, editedContent, setEditedContent, isExpanded]);

    const displayContent  = editedContent ?? rawContent;
    const isPublishing    = workflowPhase === "PUBLISHING" || workflowPhase === "DELIVERED";

    const handleApprove = async () => {
        setSubmitting(true);
        await approveMission(feedback || undefined);
        setSubmitting(false);
        setEditedContent(null);
        setExpandedTask(null, null);
    };

    const handleReject = async () => {
        if (!feedback.trim()) return;
        setSubmitting(true);
        await rejectMission(feedback);
        setSubmitting(false);
        setRejectMode(false);
        setFeedback("");
        setEditedContent(null);
        setExpandedTask(null, null);
    };

    const pipeline = ["CEO", "SCR", "ANL", "VZN", "WRT", "QA", "SAVED", "HITL"];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border overflow-hidden transition-colors duration-150 ${
                isExpanded
                    ? "border-[#ff2d55]/40 bg-[#ff2d55]/4"
                    : "border-white/8 bg-white/2 hover:border-[#ff2d55]/25 hover:bg-[#ff2d55]/3"
            }`}
        >
            {/* ── Card Header (always visible) ── */}
            <button
                onClick={() => setExpandedTask(isExpanded ? null : threadId, isExpanded ? null : "report")}
                className="w-full text-left"
            >
                <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-white/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff2d55] animate-pulse shrink-0" />
                    <span className="text-[10px] font-bold text-[#ff2d55] uppercase tracking-wider flex-1">
                        HITL — Genehmigung ausstehend
                    </span>
                    <span className="text-[9px] text-white/20 font-mono">
                        {new Date(createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {isExpanded ? (
                        <ChevronUp size={11} className="text-white/35 shrink-0" />
                    ) : (
                        <ChevronDown size={11} className="text-white/35 shrink-0" />
                    )}
                </div>
                <div className="px-4 py-3">
                    <p className="text-sm font-semibold text-white/85 truncate mb-1">{task}</p>
                    {!isExpanded && (
                        <p className="text-xs text-white/35 line-clamp-2 leading-relaxed">{preview}</p>
                    )}
                </div>
            </button>

            {/* ── Expanded content ── */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-white/6">
                            {/* Pipeline */}
                            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/5 flex-wrap">
                                {pipeline.map((s, i) => (
                                    <React.Fragment key={s}>
                                        <span className={`font-mono text-[7px] px-2 py-0.5 rounded border
                                            ${s === "HITL"
                                                ? "text-[#ff2d55] border-[#ff2d55]/40 bg-[#ff2d55]/8 animate-pulse"
                                                : "text-[#39ff14]/60 border-[#39ff14]/20 bg-[#39ff14]/5"
                                            }`}>{s}</span>
                                        {i < pipeline.length - 1 && (
                                            <span className="text-white/15 text-[8px]">›</span>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>

                            {/* Content viewer / editor */}
                            <div className="border-b border-white/6">
                                {/* Toolbar */}
                                <div className="flex items-center gap-2 px-4 py-2 bg-white/2 border-b border-white/5">
                                    <FileText size={9} className="text-white/30" />
                                    <span className="font-mono text-[8px] text-white/35 uppercase tracking-widest flex-1">Inhalt</span>
                                    <div className="flex gap-1 bg-white/5 rounded p-0.5">
                                        {(["preview", "edit"] as const).map(m => (
                                            <button
                                                key={m}
                                                onClick={e => { e.stopPropagation(); setViewMode(m); }}
                                                className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[7px] uppercase tracking-wider transition-all
                                                    ${viewMode === m ? "bg-white/12 text-white/80" : "text-white/30 hover:text-white/55"}`}
                                            >
                                                {m === "preview" ? <Eye size={7} /> : <Edit3 size={7} />}
                                                {m === "preview" ? "Preview" : "Edit"}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="min-h-[200px] max-h-[480px] overflow-y-auto scrollbar-hide">
                                    {fetching ? (
                                        <div className="flex items-center justify-center h-32 gap-2 text-white/25">
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
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {displayContent || "*(Kein Inhalt)*"}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <textarea
                                            value={displayContent}
                                            onChange={e => setEditedContent(e.target.value)}
                                            className="w-full h-full min-h-[200px] bg-transparent px-5 py-4 font-mono text-[10px] text-white/65
                                                       leading-relaxed resize-none outline-none placeholder:text-white/20"
                                            placeholder="Inhalt wird geladen..."
                                        />
                                    )}
                                </div>

                                {editedContent && editedContent !== rawContent && (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-[#ffb000]/5 border-t border-[#ffb000]/15">
                                        <Edit3 size={8} className="text-[#ffb000]/60" />
                                        <span className="font-mono text-[7px] text-[#ffb000]/60">
                                            Änderungen gespeichert (werden bei Genehmigung gesendet)
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Decision Zone */}
                            <div className="px-4 py-4 space-y-2.5">
                                {isPublishing ? (
                                    <div className="flex items-center justify-center gap-2 py-3">
                                        <Loader2 size={12} className="animate-spin text-[#00f0ff]" />
                                        <span className="font-mono text-[10px] text-[#00f0ff]/70">Wird übertragen...</span>
                                    </div>
                                ) : rejectMode ? (
                                    <>
                                        <div className="flex items-center gap-2 mb-1">
                                            <AlertTriangle size={9} className="text-[#ff2d55]/60" />
                                            <span className="font-mono text-[8px] text-[#ff2d55]/60 uppercase tracking-widest">
                                                Ablehnungsgrund (Pflichtfeld)
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {rejectPresets.map((p) => (
                                                <button
                                                    key={p.label}
                                                    onClick={() => setFeedback(p.feedback)}
                                                    className={`px-2.5 py-1 rounded font-mono text-[8px] border transition-all
                                                        ${feedback === p.feedback
                                                            ? "border-[#ff2d55]/40 bg-[#ff2d55]/10 text-[#ff2d55]/80"
                                                            : "border-white/10 bg-white/3 text-white/40 hover:border-[#ff2d55]/25"}`}
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
                                                           bg-[#ff2d55]/10 border border-[#ff2d55]/40 text-[#ff2d55]
                                                           hover:bg-[#ff2d55]/18 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
                                                           hover:bg-[#39ff14]/18 hover:shadow-[0_0_24px_rgba(57,255,20,0.18)]
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
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ── Support Ticket Card ─────────────────────────────────────────────────────
interface SupportTaskCardProps {
    ticket: SupportTicketSummary;
}

export function SupportTaskCard({ ticket }: SupportTaskCardProps) {
    const { approveSupportTicket } = useAgentStore();
    const expandedTaskId  = useAgentStore((s) => s.expandedTaskId);
    const setExpandedTask = useAgentStore((s) => s.setExpandedTask);
    const isExpanded = expandedTaskId === ticket._id;

    const [draft,      setDraft]     = useState(ticket.draftResponse || "");
    const [feedback,   setFeedback]  = useState("");
    const [submitting, setSubmitting] = useState(false);

    const isBug       = ticket.category === "SUPPORT_BUG";
    const accentColor = isBug ? "#ff2d55" : "#00f0ff";

    const handleSend = async () => {
        setSubmitting(true);
        await approveSupportTicket(ticket._id, true, feedback || undefined);
        setSubmitting(false);
        setExpandedTask(null, null);
    };

    const handleArchive = async () => {
        setSubmitting(true);
        await approveSupportTicket(ticket._id, false, "Archived by operator");
        setSubmitting(false);
        setExpandedTask(null, null);
    };

    const priorityColor: Record<string, string> = {
        critical: "text-[#ff2d55] border-[#ff2d55]/40 bg-[#ff2d55]/8",
        high:     "text-[#ffb000] border-[#ffb000]/40 bg-[#ffb000]/8",
        medium:   "text-[#00f0ff] border-[#00f0ff]/40 bg-[#00f0ff]/8",
        low:      "text-white/40  border-white/15      bg-white/4",
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border overflow-hidden transition-colors duration-150 ${
                isExpanded
                    ? "border-white/20 bg-white/4"
                    : "border-white/8 bg-white/2 hover:border-white/15 hover:bg-white/3"
            }`}
        >
            <button
                className="w-full text-left"
                onClick={() => setExpandedTask(isExpanded ? null : ticket._id, isExpanded ? null : "support")}
            >
                <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-white/5">
                    {isBug
                        ? <Bug size={10} style={{ color: accentColor }} />
                        : <AlertTriangle size={10} style={{ color: accentColor }} />
                    }
                    <span className="text-[10px] font-bold uppercase tracking-wider flex-1" style={{ color: `${accentColor}cc` }}>
                        {isBug ? "Fehlerbericht" : "Preisanfrage"}
                    </span>
                    {ticket.priority && (
                        <span className={`text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-bold ${priorityColor[ticket.priority ?? "medium"]}`}>
                            {ticket.priority}
                        </span>
                    )}
                    {isExpanded ? <ChevronUp size={11} className="text-white/35" /> : <ChevronDown size={11} className="text-white/35" />}
                </div>
                <div className="px-4 py-3">
                    <p className="text-sm font-semibold text-white/85 truncate mb-0.5">{ticket.subject}</p>
                    <p className="text-xs text-white/40 truncate">{ticket.from}</p>
                    {!isExpanded && ticket.aiSummary && (
                        <p className="text-[10px] text-white/30 mt-2 line-clamp-2 leading-relaxed">{ticket.aiSummary}</p>
                    )}
                </div>
            </button>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-white/6"
                    >
                        <div className="px-4 py-4 space-y-3">
                            {/* Ticket details */}
                            <div className="bg-white/3 rounded-lg px-3 py-2.5 border border-white/6 space-y-1.5">
                                <div className="flex gap-6">
                                    <div>
                                        <p className="font-mono text-[7px] text-white/25 uppercase tracking-wider mb-0.5">Von</p>
                                        <p className="font-mono text-[9px] text-white/60">{ticket.from}</p>
                                    </div>
                                    <div>
                                        <p className="font-mono text-[7px] text-white/25 uppercase tracking-wider mb-0.5">Plattform</p>
                                        <p className="font-mono text-[9px] text-white/50 uppercase">{ticket.platform}</p>
                                    </div>
                                </div>
                                {ticket.aiSummary && (
                                    <div>
                                        <p className="font-mono text-[7px] text-white/25 uppercase tracking-wider mb-0.5">KI-Zusammenfassung</p>
                                        <p className="font-mono text-[10px] text-white/55 leading-relaxed">{ticket.aiSummary}</p>
                                    </div>
                                )}
                            </div>

                            {/* RAG Sources */}
                            {ticket.ragSources?.length > 0 && (
                                <div className="space-y-1">
                                    <p className="font-mono text-[7px] text-white/25 uppercase tracking-widest flex items-center gap-1.5">
                                        <Database size={8} className="text-[#39ff14]/50" /> RAG-Quellen
                                    </p>
                                    {ticket.ragSources.map((src: { title: string; score: number }, i: number) => (
                                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/3 border border-white/6">
                                            <Database size={7} className="text-[#39ff14]/40 shrink-0" />
                                            <span className="font-mono text-[9px] text-white/55 flex-1 truncate">{src.title}</span>
                                            <span className="font-mono text-[8px] text-[#39ff14]/60 bg-[#39ff14]/8 px-1.5 py-0.5 rounded border border-[#39ff14]/20">
                                                {Math.round(src.score * 100)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Editable draft */}
                            <div className="rounded-lg border border-white/8 overflow-hidden">
                                <div className="flex items-center gap-2 px-3 py-2 bg-white/2 border-b border-white/6">
                                    <Edit3 size={8} className="text-white/30" />
                                    <span className="font-mono text-[7px] text-white/35 uppercase tracking-widest">
                                        KI Antwortentwurf — Bearbeitbar
                                    </span>
                                </div>
                                <textarea
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    rows={6}
                                    className="w-full bg-transparent px-4 py-3 font-mono text-[10px] text-white/65 leading-relaxed
                                               resize-none outline-none placeholder:text-white/20"
                                    placeholder="AI taslak yanıtı burada görünecek..."
                                />
                            </div>

                            {/* Actions */}
                            <div className="space-y-2">
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
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider
                                                   border border-[#00f0ff]/40 text-[#00f0ff] bg-[#00f0ff]/8
                                                   hover:bg-[#00f0ff]/15 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        {submitting ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                                        Antwort senden
                                    </motion.button>
                                    <button
                                        onClick={handleArchive}
                                        disabled={submitting}
                                        className="px-4 rounded-lg font-mono text-[9px] border border-white/12 text-white/35
                                                   hover:bg-white/5 hover:border-white/20 disabled:opacity-30 transition-all"
                                    >
                                        <XCircle size={11} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ── Campaign Card ───────────────────────────────────────────────────────────
interface CampaignTaskCardProps {
    campaign: CampaignDraftSummary;
}

export function CampaignTaskCard({ campaign }: CampaignTaskCardProps) {
    const { approveCampaign } = useAgentStore();
    const expandedTaskId  = useAgentStore((s) => s.expandedTaskId);
    const setExpandedTask = useAgentStore((s) => s.setExpandedTask);
    const isExpanded = expandedTaskId === campaign._id;
    const [submitting, setSubmitting] = useState(false);

    const handleApprove = async () => {
        setSubmitting(true);
        await approveCampaign(campaign._id, true);
        setSubmitting(false);
        setExpandedTask(null, null);
    };

    const handleReject = async () => {
        setSubmitting(true);
        await approveCampaign(campaign._id, false);
        setSubmitting(false);
        setExpandedTask(null, null);
    };

    const channels = ["Li", "Tw", "Fb"];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border overflow-hidden transition-colors duration-150 ${
                isExpanded
                    ? "border-[#ff6b35]/40 bg-[#ff6b35]/4"
                    : "border-white/8 bg-white/2 hover:border-[#ff6b35]/25 hover:bg-[#ff6b35]/3"
            }`}
        >
            <button
                className="w-full text-left"
                onClick={() => setExpandedTask(isExpanded ? null : campaign._id, isExpanded ? null : "campaign")}
            >
                <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-white/5">
                    <Megaphone size={10} className="text-[#ff6b35]" />
                    <span className="text-[10px] font-bold text-[#ff6b35] uppercase tracking-wider flex-1">CMO — Kampagne</span>
                    <div className="flex gap-1">
                        {channels.map(ch => (
                            <span key={ch} className="text-[8px] text-[#ff6b35]/60 bg-[#ff6b35]/10 px-1.5 py-0.5 rounded">{ch}</span>
                        ))}
                    </div>
                    <span className="text-[9px] text-white/20 font-mono ml-1">
                        {new Date(campaign.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {isExpanded ? <ChevronUp size={11} className="text-white/35" /> : <ChevronDown size={11} className="text-white/35" />}
                </div>
                <div className="px-4 py-3">
                    <p className="text-sm font-semibold text-white/85 truncate">{campaign.reportTitle}</p>
                </div>
            </button>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-white/6"
                    >
                        <div className="px-4 py-4 space-y-3">
                            {/* Campaign content */}
                            <div className="rounded-lg border border-white/8 overflow-hidden">
                                <div className="flex items-center gap-2 px-3 py-2 bg-white/2 border-b border-white/5">
                                    <Megaphone size={8} className="text-[#ff6b35]/60" />
                                    <span className="font-mono text-[7px] text-white/35 uppercase tracking-widest">Kampagneninhalt</span>
                                </div>
                                <div className="px-4 py-3 prose prose-invert prose-sm max-w-none max-h-[360px] overflow-y-auto scrollbar-hide
                                    prose-headings:font-mono prose-headings:text-white/70 prose-headings:text-xs
                                    prose-p:text-white/55 prose-p:text-[11px] prose-p:leading-relaxed
                                    prose-strong:text-white/80 prose-li:text-white/55 prose-li:text-[10px]">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {campaign.campaignContent || "*(Kein Inhalt)*"}
                                    </ReactMarkdown>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <motion.button
                                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                                    onClick={handleApprove}
                                    disabled={submitting}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider
                                               bg-[#ff6b35]/10 border border-[#ff6b35]/40 text-[#ff6b35]
                                               hover:bg-[#ff6b35]/18 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    {submitting ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                                    🚀 Veröffentlichen
                                </motion.button>
                                <button
                                    onClick={handleReject}
                                    disabled={submitting}
                                    className="px-5 rounded-lg font-mono text-[9px] border border-[#ff2d55]/25 text-[#ff2d55]/55
                                               hover:bg-[#ff2d55]/8 disabled:opacity-30 transition-all"
                                >
                                    <XCircle size={11} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ── Archive Card ────────────────────────────────────────────────────────────
interface ArchiveTaskCardProps {
    mission: { threadId: string; task: string; status: string; createdAt: string; contentPreview: string };
}

export function ArchiveTaskCard({ mission }: ArchiveTaskCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-white/5 bg-white/2 hover:bg-white/3 hover:border-white/10 transition-all px-4 py-3"
        >
            <div className="flex items-center gap-3">
                <Clock size={10} className="text-white/20 shrink-0" />
                <p className="text-[11px] text-white/50 truncate flex-1">{mission.task}</p>
                <span className={`text-[8px] uppercase tracking-wider px-2 py-0.5 rounded border font-semibold shrink-0 ${
                    mission.status === "PUBLISHED" ? "text-[#39ff14]/70 border-[#39ff14]/20 bg-[#39ff14]/5" :
                    mission.status === "REJECTED"  ? "text-[#ff2d55]/60 border-[#ff2d55]/20 bg-[#ff2d55]/5" :
                    "text-white/30 border-white/10"
                }`}>{mission.status}</span>
            </div>
        </motion.div>
    );
}

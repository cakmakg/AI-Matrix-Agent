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
function AccordionSection({ title, icon, defaultOpen = false, children }: {
    title: string; icon: React.ReactNode; defaultOpen?: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-2.5 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
                <span className="text-gray-400">{icon}</span>
                <span className="text-[12px] font-semibold text-gray-700 flex-1">
                    {title}
                </span>
                {open
                    ? <ChevronDown size={13} className="text-gray-400" />
                    : <ChevronRight size={13} className="text-gray-400" />
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
                        <div className="px-4 py-3 border-t border-gray-100 bg-white">
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
        <div className="flex flex-col h-full bg-white">
            {/* Top bar */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 shrink-0">
                <FileText size={13} className="text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-amber-500 uppercase tracking-wider mb-0.5 font-semibold">İnsan Onayı Gerekiyor</p>
                    <p className="text-[13px] text-gray-700 truncate font-medium">
                        {missionMessage?.slice(0, 80) ?? `Thread: ${threadId.slice(0, 20)}...`}
                    </p>
                </div>
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full border" style={{ background: "#FEF3C7", color: "#B45309", borderColor: "#FDE68A" }}>
                    ⏳ Onay Bekleniyor
                </span>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-styled">

                {/* A: Mission Brief */}
                <AccordionSection title="Görev Özeti" icon={<Activity size={10} />} defaultOpen={false}>
                    {missionMessage && (
                        <div className="space-y-2">
                            <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Orijinal Görev</p>
                            <p className="text-[12px] text-gray-700 leading-relaxed bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200">
                                {missionMessage}
                            </p>
                        </div>
                    )}
                    <div className="mt-3">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2 font-medium">İş Akışı</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {steps.map((s, i) => (
                                <React.Fragment key={s}>
                                    <span className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium
                                        ${s === "HITL"
                                            ? "text-amber-700 border-amber-200 bg-amber-50 animate-pulse"
                                            : "text-green-700 border-green-200 bg-green-50"
                                        }`}>{s}</span>
                                    {i < steps.length - 1 && <ChevronRight size={10} className="text-gray-300" />}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </AccordionSection>

                {/* B: Content Editor */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                        <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold flex-1">İçerik</span>
                        <div className="flex gap-1 bg-gray-100 rounded-md p-0.5">
                            {(["preview", "edit"] as const).map(m => (
                                <button
                                    key={m}
                                    onClick={() => setViewMode(m)}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-all
                                        ${viewMode === m ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                                >
                                    {m === "preview" ? <Eye size={10} /> : <Edit3 size={10} />}
                                    {m === "preview" ? "Önizleme" : "Düzenle"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content area */}
                    <div className="min-h-[300px] max-h-[420px] overflow-y-auto scrollbar-styled">
                        {fetching ? (
                            <div className="flex items-center justify-center h-40 gap-2 text-gray-400">
                                <Loader2 size={14} className="animate-spin" />
                                <span className="text-[12px]">Rapor yükleniyor...</span>
                            </div>
                        ) : viewMode === "preview" ? (
                            <div className="px-5 py-4 prose-light">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
                            </div>
                        ) : (
                            <textarea
                                value={displayContent}
                                onChange={e => setEditedContent(e.target.value)}
                                className="w-full h-full min-h-[300px] bg-white px-5 py-4 text-[13px] text-gray-700 leading-relaxed resize-none outline-none placeholder:text-gray-400"
                                placeholder="İçerik yükleniyor..."
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
                <div className="px-5 py-4 border-t border-gray-100 shrink-0 space-y-2.5" style={{ background: "#FAFAFA" }}>
                    {rejectMode ? (
                        <>
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle size={13} className="text-red-400" />
                                <span className="text-[12px] text-red-600 font-semibold">Red Gerekçesi (Zorunlu)</span>
                            </div>
                            {/* Preset reject butonları */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {rejectPresets.map((p) => (
                                    <button
                                        key={p.label}
                                        onClick={() => setFeedback(p.feedback)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all
                                            ${feedback === p.feedback
                                                ? "border-red-300 bg-red-50 text-red-700"
                                                : "border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:text-red-600"}`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={feedback}
                                onChange={e => setFeedback(e.target.value)}
                                placeholder="Ne değiştirilsin? Yazara geri bildirim..."
                                rows={3}
                                className="w-full bg-white border border-red-200 rounded-xl px-3 py-2.5 text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleReject}
                                    disabled={!feedback.trim() || submitting}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 disabled:opacity-40 transition-all"
                                >
                                    {submitting ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                                    Reddet — Yeniden Yaz
                                </button>
                                <button
                                    onClick={() => { setRejectMode(false); setFeedback(""); }}
                                    className="px-4 rounded-xl text-[12px] font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
                                >
                                    İptal
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <input
                                value={feedback}
                                onChange={e => setFeedback(e.target.value)}
                                placeholder="Opsiyonel onay notu..."
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            />
                            <div className="flex gap-2">
                                <motion.button
                                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                                    onClick={handleApprove}
                                    disabled={submitting || fetching}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold bg-green-500 border border-green-400 text-white hover:bg-green-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                    {submitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                    Onayla & Yayınla
                                </motion.button>
                                <button
                                    onClick={() => setRejectMode(true)}
                                    className="px-5 rounded-xl text-[12px] font-semibold border border-red-200 text-red-500 hover:bg-red-50 transition-all"
                                >
                                    Reddet
                                </button>
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <div className="px-5 py-4 border-t border-gray-100 shrink-0 flex items-center justify-center gap-2">
                    <Loader2 size={13} className="animate-spin text-indigo-500" />
                    <span className="text-[12px] text-indigo-600 font-medium">Gönderiliyor...</span>
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
                <AccordionSection title="Orijinal Mesaj" icon={<Mail size={10} />} defaultOpen={true}>
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
                    <AccordionSection title="RAG Kaynakları" icon={<Database size={10} />} defaultOpen={false}>
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

    const typeLabel = drawerItem?.type === "report"   ? "⏳ Onay Bekleyen Rapor" :
                      drawerItem?.type === "support"  ? "💬 Destek Talebi" :
                      drawerItem?.type === "campaign" ? "📣 Kampanya Taslağı" :
                      "📄 Arşiv";

    const headerColor = drawerItem?.type === "report"   ? { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E" } :
                        drawerItem?.type === "support"  ? { bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" } :
                        drawerItem?.type === "campaign" ? { bg: "#FFF7ED", border: "#FED7AA", text: "#C2410C" } :
                        { bg: "#F9FAFB", border: "#E5E7EB", text: "#374151" };

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
                        style={{ background: "rgba(17, 24, 39, 0.4)" }}
                    />

                    {/* Drawer */}
                    <motion.aside
                        key="drawer"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 32, stiffness: 300 }}
                        className="absolute right-0 top-0 h-full w-[540px] z-20 flex flex-col overflow-hidden"
                        style={{ background: "#FFFFFF", borderLeft: "1px solid #E5E7EB", boxShadow: "-4px 0 24px rgba(0,0,0,0.08)" }}
                    >
                        {/* Drawer header */}
                        <div
                            className="flex items-center gap-3 px-5 py-3.5 shrink-0"
                            style={{ background: headerColor.bg, borderBottom: `1px solid ${headerColor.border}` }}
                        >
                            <span className="text-[14px] font-bold flex-1" style={{ color: headerColor.text }}>
                                {typeLabel}
                            </span>
                            <button
                                onClick={() => setDrawerItem(null)}
                                className="p-1.5 rounded-lg hover:bg-black/5 text-gray-400 hover:text-gray-700 transition-colors"
                            >
                                <X size={16} />
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
                                        <div className="flex flex-col h-full bg-white">
                                            <div className="px-5 py-4 border-b border-gray-100 shrink-0">
                                                <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1.5 font-medium">
                                                    Arşiv — Geçmiş Görev
                                                </p>
                                                <p className="text-[15px] font-semibold text-gray-900 truncate">
                                                    {drawerItem.mission.task}
                                                </p>
                                            </div>
                                            <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-styled">
                                                <div className="prose-light">
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

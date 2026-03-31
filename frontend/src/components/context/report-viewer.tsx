"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAgentStore } from "@/store/agent-store";
import { getProductTheme } from "@/config/product-theme";

interface Props {
    threadId: string;
}

interface ReportMeta {
    confidenceScore: number;
    estimatedCostUsd: number;
}

function ConfidenceBar({ score }: { score: number }) {
    const color =
        score >= 80 ? "#39ff14" :
        score >= 60 ? "#ffb000" : "#ff2d55";
    const label =
        score >= 80 ? "HIGH" :
        score >= 60 ? "MEDIUM" : "LOW";
    return (
        <div className="px-4 py-2.5 border-b border-white/5 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[8px] text-white/30 uppercase tracking-widest">AI Confidence</span>
                <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[8px] tracking-wider" style={{ color }}>{label}</span>
                    <span className="font-mono text-[12px] font-bold" style={{ color }}>{score}%</span>
                </div>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}55` }}
                />
            </div>
        </div>
    );
}

export const ReportViewer = ({ threadId }: Props) => {
    const { pendingContent, threadId: storeThreadId, approveMission, rejectMission, workflowPhase, setDrawerItem, apiKey, clientProduct } = useAgentStore();
    const theme = getProductTheme(clientProduct);
    const rejectPresets = theme.rejectPresets;
    const [feedback, setFeedback] = useState("");
    const [rejectMode, setRejectMode] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [fetchedContent, setFetchedContent] = useState<string | null>(null);
    const [fetching, setFetching] = useState(false);
    const [meta, setMeta] = useState<ReportMeta | null>(null);
    const [reportStatus, setReportStatus] = useState<string | null>(null);
    const [feedbackDone, setFeedbackDone] = useState<"up" | "down" | null>(null);
    const [showReasonBox, setShowReasonBox] = useState(false);
    const [feedbackReason, setFeedbackReason] = useState("");
    const [submittingFeedback, setSubmittingFeedback] = useState(false);

    // Sync store threadId when viewing a DB report (so Authorize uses correct threadId)
    useEffect(() => {
        if (threadId && threadId !== storeThreadId) {
            useAgentStore.setState({
                threadId,
                workflowPhase: "AWAITING_APPROVAL",
                missionCategory: "HOT_LEAD",
            });
        }
    }, [threadId, storeThreadId]);

    // Fetch from DB — always captures metadata (score + cost), content only if pendingContent is empty
    useEffect(() => {
        const headers: Record<string, string> = {};
        if (apiKey) headers["x-api-key"] = apiKey;
        if (!pendingContent?.trim()) {
            setFetching(true);
            setFetchedContent(null);
        }
        fetch("/api/artifact/" + threadId, { headers })
            .then((r) => r.json())
            .then((data) => {
                if (data.confidenceScore !== undefined) {
                    setMeta({ confidenceScore: data.confidenceScore, estimatedCostUsd: data.estimatedCostUsd || 0 });
                }
                if (data.status) setReportStatus(data.status);
                if (!pendingContent?.trim()) {
                    const text = (data.content || "").trim();
                    setFetchedContent(text || "*(Icerik bulunamadi)*");
                    if (text) {
                        useAgentStore.setState({ pendingContent: text, workflowPhase: "AWAITING_APPROVAL" });
                    }
                }
            })
            .catch(() => { if (!pendingContent?.trim()) setFetchedContent("*(Icerik yuklenemedi)*"); })
            .finally(() => setFetching(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [threadId]);

    const content = (pendingContent || "").trim() || fetchedContent || "";
    const isActivelyPublishing = workflowPhase === "PUBLISHING";
    const showFeedback = workflowPhase === "DELIVERED"
        || reportStatus === "PUBLISHED"
        || reportStatus === "APPROVED";

    const handleApprove = async () => {
        setSubmitting(true);
        await approveMission(feedback || undefined);
        setSubmitting(false);
        setDrawerItem(null);
    };

    const handleReject = async () => {
        if (!feedback.trim()) return;
        setSubmitting(true);
        await rejectMission(feedback);
        setSubmitting(false);
        setRejectMode(false);
        setFeedback("");
        setDrawerItem(null);
    };

    const formatCost = (usd: number) =>
        usd === 0 ? "–" :
        usd < 0.01 ? `$${(usd * 100).toFixed(3)}¢` :
        `$${usd.toFixed(4)}`;

    const handleFeedback = async (vote: "up" | "down") => {
        if (vote === "down") { setShowReasonBox(true); return; }
        setSubmittingFeedback(true);
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (apiKey) headers["x-api-key"] = apiKey;
        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers,
                body: JSON.stringify({ threadId, vote: "up", agentName: "WRITER" }),
            });
            if (!res.ok) throw new Error();
            setFeedbackDone("up");
        } catch {
            console.warn("Feedback submission failed");
        } finally {
            setSubmittingFeedback(false);
        }
    };

    const handleFeedbackSubmit = async () => {
        if (!feedbackReason.trim()) return;
        setSubmittingFeedback(true);
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (apiKey) headers["x-api-key"] = apiKey;
        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers,
                body: JSON.stringify({ threadId, vote: "down", reason: feedbackReason.trim(), agentName: "WRITER" }),
            });
            if (!res.ok) throw new Error();
            setFeedbackDone("down");
            setShowReasonBox(false);
            setFeedbackReason("");
        } catch {
            console.warn("Feedback submission failed");
        } finally {
            setSubmittingFeedback(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 shrink-0">
                <FileText size={13} className="text-alert-red/70 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="font-mono text-[8px] text-alert-red/60 uppercase tracking-widest">HITL Gate</p>
                    <p className="font-mono text-[10px] text-white/70 truncate mt-0.5">
                        Thread: {threadId.slice(0, 16)}...
                    </p>
                </div>
                {meta && (
                    <div className="text-right shrink-0">
                        <p className="font-mono text-[7px] text-white/20 uppercase tracking-wider">AI Cost</p>
                        <p className="font-mono text-[10px] text-white/40">{formatCost(meta.estimatedCostUsd)}</p>
                    </div>
                )}
            </div>

            {/* Confidence Score Bar */}
            {meta && meta.confidenceScore > 0 && <ConfidenceBar score={meta.confidenceScore} />}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-hide">
                {fetching ? (
                    <div className="flex items-center justify-center h-32 gap-2 text-white/25">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="font-mono text-[10px]">Loading report from database...</span>
                    </div>
                ) : content ? (
                    <div className="prose prose-invert prose-sm max-w-none
                        prose-headings:font-mono prose-headings:text-white/80 prose-headings:text-xs
                        prose-p:text-white/60 prose-p:text-[11px] prose-p:leading-relaxed
                        prose-code:text-neon-green prose-code:text-[10px] prose-code:bg-white/5 prose-code:px-1 prose-code:rounded
                        prose-pre:bg-white/4 prose-pre:border prose-pre:border-white/8 prose-pre:rounded-lg
                        prose-strong:text-white/85 prose-li:text-white/60 prose-li:text-[11px]
                        prose-a:text-neon-blue prose-blockquote:border-neon-blue/30 prose-blockquote:text-white/40">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {content}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-32 gap-2 text-white/25">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="font-mono text-[10px]">Loading report...</span>
                    </div>
                )}
            </div>

            {/* Actions */}
            {!isActivelyPublishing && !showFeedback && (
                <div className="px-4 py-3 border-t border-white/5 shrink-0 space-y-2">
                    {rejectMode ? (
                        <>
                            {/* Preset reject seçenekleri */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {rejectPresets.map((p) => (
                                    <button
                                        key={p.label}
                                        onClick={() => setFeedback(p.feedback)}
                                        className={`px-2.5 py-1 rounded-md font-mono text-[8px] border transition-all
                                            ${feedback === p.feedback
                                                ? "border-alert-red/40 bg-alert-red/10 text-alert-red/80"
                                                : "border-white/10 bg-white/3 text-white/40 hover:border-alert-red/25 hover:text-white/60"}`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Was soll geändert werden? Feedback an den Autor..."
                                className="w-full bg-white/4 border border-white/10 rounded px-3 py-2 font-mono text-[10px] text-white/70
                                           placeholder:text-white/20 outline-none focus:border-alert-red/40 resize-none"
                                rows={3}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleReject}
                                    disabled={!feedback.trim() || submitting}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded font-mono text-[9px] font-bold uppercase tracking-wider
                                               bg-alert-red/10 border border-alert-red/40 text-alert-red hover:bg-alert-red/20
                                               disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    {submitting ? <Loader2 size={10} className="animate-spin" /> : <XCircle size={10} />}
                                    Override
                                </button>
                                <button
                                    onClick={() => { setRejectMode(false); setFeedback(""); }}
                                    className="px-4 py-2 rounded font-mono text-[9px] text-white/40 border border-white/10 hover:border-white/20 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <input
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Optional feedback note..."
                                className="w-full bg-white/4 border border-white/10 rounded px-3 py-2 font-mono text-[10px] text-white/70
                                           placeholder:text-white/20 outline-none focus:border-neon-green/30"
                            />
                            <div className="flex gap-2">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleApprove}
                                    disabled={submitting || fetching}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider
                                               bg-neon-green/10 border border-neon-green/40 text-neon-green hover:bg-neon-green/20
                                               hover:border-neon-green/60 hover:shadow-[0_0_20px_rgba(57,255,20,0.15)]
                                               disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    {submitting ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                                    {theme.hitlApproveLabel}
                                </motion.button>
                                <button
                                    onClick={() => setRejectMode(true)}
                                    className="px-4 py-2.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider
                                               border border-alert-red/30 text-alert-red/60 hover:bg-alert-red/8 hover:border-alert-red/50 transition-all"
                                >
                                    Override
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {isActivelyPublishing && (
                <div className="px-4 py-4 border-t border-white/5 shrink-0 flex items-center justify-center gap-2">
                    <Loader2 size={12} className="animate-spin text-neon-blue" />
                    <span className="font-mono text-[10px] text-neon-blue">Publishing payload...</span>
                </div>
            )}


            {/* Feedback -- shown after delivery or for already-published reports */}
            {showFeedback && (
                <div className="px-4 py-3 border-t border-white/5 shrink-0">
                    {feedbackDone ? (
                        <div className="flex items-center justify-center gap-2 py-2">
                            <span
                                className="font-mono text-[9px]"
                                style={{ color: feedbackDone === "up" ? "#39ff14" : "#ff2d55" }}
                            >
                                {feedbackDone === "up"
                                    ? "Positive Bewertung gespeichert"
                                    : "Feedback gespeichert — KI lernt daraus"}
                            </span>
                        </div>
                    ) : showReasonBox ? (
                        <>
                            <textarea
                                value={feedbackReason}
                                onChange={(e) => setFeedbackReason(e.target.value)}
                                placeholder="Was war falsch? (z.B. Zu technisch, falscher Ton...)"
                                className="w-full bg-white/4 border border-white/10 rounded px-3 py-2 font-mono text-[10px] text-white/70 placeholder:text-white/20 outline-none focus:border-alert-red/40 resize-none mb-2"
                                rows={3}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleFeedbackSubmit}
                                    disabled={!feedbackReason.trim() || submittingFeedback}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded font-mono text-[9px] font-bold uppercase tracking-wider bg-alert-red/10 border border-alert-red/40 text-alert-red hover:bg-alert-red/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    {submittingFeedback ? <Loader2 size={10} className="animate-spin" /> : null}
                                    Senden
                                </button>
                                <button
                                    onClick={() => { setShowReasonBox(false); setFeedbackReason(""); }}
                                    className="px-4 py-2 rounded font-mono text-[9px] text-white/40 border border-white/10 hover:border-white/20 transition-colors"
                                >
                                    Abbrechen
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="font-mono text-[8px] text-white/30 uppercase tracking-widest mb-2">
                                War dieser Bericht hilfreich?
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleFeedback("up")}
                                    disabled={submittingFeedback}
                                    className="flex-1 py-2 rounded font-mono text-[13px] border border-neon-green/30 text-neon-green/60 hover:bg-neon-green/8 hover:border-neon-green/50 transition-all disabled:opacity-30"
                                >
                                    👍
                                </button>
                                <button
                                    onClick={() => handleFeedback("down")}
                                    disabled={submittingFeedback}
                                    className="flex-1 py-2 rounded font-mono text-[13px] border border-alert-red/30 text-alert-red/60 hover:bg-alert-red/8 hover:border-alert-red/50 transition-all disabled:opacity-30"
                                >
                                    👎
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { X, Download, FileText, Copy, Check, ExternalLink } from "lucide-react";
import type { MissionSummary } from "@/store/types";
import { useAgentStore } from "@/store/agent-store";
import { exportMarkdown } from "@/lib/export/export-markdown";

interface Props {
    mission: MissionSummary;
    onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
    AWAITING_APPROVAL: "Ausstehend",
    APPROVED:          "Genehmigt",
    REJECTED:          "Abgelehnt",
    PUBLISHED:         "Veröffentlicht",
};

const STATUS_COLORS: Record<string, string> = {
    AWAITING_APPROVAL: "#ffb000",
    APPROVED:          "#39ff14",
    REJECTED:          "#ff2d55",
    PUBLISHED:         "#00f0ff",
};

export const ReportFullscreenModal = ({ mission, onClose }: Props) => {
    const { apiKey } = useAgentStore();
    const [content, setContent]   = useState(mission.content ?? mission.contentPreview ?? "");
    const [loading, setLoading]   = useState(false);
    const [copied, setCopied]     = useState(false);
    const contentRef              = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (mission.content) { setContent(mission.content); return; }
        setLoading(true);
        fetch(`/api/artifact/${mission.threadId}`, { headers: { "x-api-key": apiKey ?? "" } })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.content) setContent(d.content); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [mission.threadId, mission.content, apiKey]);

    // Close on Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}?thread=${mission.threadId}`).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExportMd = () => {
        exportMarkdown(content || mission.contentPreview, `bericht-${mission.threadId.slice(0, 8)}.md`);
    };

    const handleExportPdf = async () => {
        const { exportPdf } = await import("@/lib/export/export-pdf");
        if (contentRef.current) exportPdf(contentRef.current, `bericht-${mission.threadId.slice(0, 8)}.pdf`);
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 12 }}
                    transition={{ duration: 0.2 }}
                    className="w-full max-w-4xl h-[90vh] bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 shrink-0 bg-white">
                        <div className="flex-1 min-w-0 pr-4">
                            <h2 className="text-[14px] font-bold text-gray-900 truncate">{mission.task}</h2>
                            <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-[11px] text-gray-500">
                                    {new Date(mission.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono">
                                    {mission.threadId}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                                    style={{
                                        background: `${STATUS_COLORS[mission.status] ?? "#9CA3AF"}1f`,
                                        color: STATUS_COLORS[mission.status] ?? "#6B7280",
                                        border: `1px solid ${STATUS_COLORS[mission.status] ?? "#9CA3AF"}55`,
                                    }}>
                                    {STATUS_LABELS[mission.status] ?? mission.status}
                                </span>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors shrink-0">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto scrollbar-styled px-8 py-6 bg-gray-50">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-[12px] text-gray-400 animate-pulse">Lade Berichtsinhalt…</p>
                            </div>
                        ) : (
                            <div ref={contentRef} className="prose prose-sm max-w-none text-[13px] leading-relaxed text-gray-800
                                prose-headings:text-gray-900
                                prose-h1:text-[18px] prose-h2:text-[16px] prose-h3:text-[14px]
                                prose-code:text-indigo-600 prose-code:bg-gray-100 prose-code:rounded prose-code:px-1 prose-code:text-[12px]
                                prose-pre:bg-gray-100 prose-pre:border prose-pre:border-gray-200 prose-pre:rounded-lg
                                prose-blockquote:border-indigo-300 prose-blockquote:text-gray-600
                                prose-th:text-gray-700 prose-td:text-gray-700
                                prose-a:text-indigo-600 prose-strong:text-gray-900">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {content || "*Kein Inhalt verfügbar.*"}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>

                    {/* Footer actions */}
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 shrink-0 bg-white">
                        <div className="flex items-center gap-2">
                            <button onClick={handleExportMd}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 transition-all">
                                <Download size={12} />
                                Markdown
                            </button>
                            <button onClick={handleExportPdf}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 transition-all">
                                <FileText size={12} />
                                PDF
                            </button>
                            <button onClick={handleCopyLink}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 transition-all">
                                {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                                {copied ? "Kopiert!" : "Link kopieren"}
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <a href={`?thread=${mission.threadId}`} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all">
                                <ExternalLink size={12} />
                                Öffnen
                            </a>
                            <button onClick={onClose}
                                className="px-4 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all">
                                Schließen
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Mail, Clock, Database, Edit3, CheckCircle2, XCircle, Loader2,
    Inbox, Brain, X, ChevronDown, ChevronUp, BarChart3,
} from "lucide-react";
import {
    ResponsiveContainer,
    PieChart as RPieChart, Pie, Cell,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    BarChart, Bar,
    Legend,
} from "recharts";
import { useAgentStore } from "@/store/agent-store";
import type { SupportTicketSummary } from "@/store/types";
import { RagKnowledgePanel } from "@/components/knowledge/knowledge-view";
import { ChartCard, CyberTooltip, NoData, CHART_COLORS, PLATFORM_COLORS, axisTickStyle, gridProps } from "@/components/charts";

const DEFAULT_CLIENT = process.env.NEXT_PUBLIC_CLIENT_ID ?? "default";

/* ── Analytics Types ── */
interface SupportAnalytics {
    platformDist: Array<{ platform: string; count: number }>;
    weeklyTrend: Array<{ date: string; count: number }>;
    categoryDist: Array<{ category: string; count: number }>;
}

const CATEGORY_COLORS: Record<string, string> = {
    HOT_LEAD: "#ff6b35",
    SUPPORT_PRICING: "#00f0ff",
    SUPPORT_BUG: "#ff2d55",
    OTHER: "#bf5fff",
    SPAM: "#666666",
};

const CATEGORY_LABELS: Record<string, string> = {
    HOT_LEAD: "Hot Lead",
    SUPPORT_PRICING: "Preisanfrage",
    SUPPORT_BUG: "Technisch",
    OTHER: "Sonstige",
    SPAM: "Spam",
};

/* ── CX Analytics Panel ── */
function CxAnalyticsPanel() {
    const [data, setData] = useState<SupportAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(true);

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/analytics/support");
            if (res.ok) {
                const json = await res.json();
                setData(json.data ?? json);
            }
        } catch {
            /* silent */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    if (!expanded) {
        return (
            <button
                onClick={() => setExpanded(true)}
                className="w-full flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
                <BarChart3 size={10} className="text-[#00f0ff]/50" />
                <span className="font-mono text-[8px] text-white/40 uppercase tracking-widest">Analytics</span>
                <ChevronDown size={10} className="text-white/20 ml-auto" />
            </button>
        );
    }

    /* Donut: platform distribution — Email, WhatsApp, YouTube etc. with total in center */
    const donutData = (data?.platformDist ?? []).map(p => ({
        name: p.platform,
        value: p.count,
        color: PLATFORM_COLORS[p.platform] ?? "#ffffff",
    }));
    const totalTickets = donutData.reduce((sum, d) => sum + d.value, 0);

    /* Category horizontal bar */
    const categoryData = (data?.categoryDist ?? []).map(c => ({
        name: CATEGORY_LABELS[c.category] ?? c.category,
        count: c.count,
        color: CATEGORY_COLORS[c.category] ?? "#ffffff",
    }));

    /* Weekly trend area */
    const trendData = data?.weeklyTrend ?? [];

    return (
        <div className="border-b border-white/5">
            <button
                onClick={() => setExpanded(false)}
                className="w-full flex items-center gap-2 px-4 py-2 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
                <BarChart3 size={10} className="text-[#00f0ff]/50" />
                <span className="font-mono text-[8px] text-white/40 uppercase tracking-widest flex-1 text-left">Support Analytics</span>
                <ChevronUp size={10} className="text-white/20" />
            </button>
            <div className="px-3 pb-4 space-y-3">
                {/* Row 1: Donut + Category Bar */}
                <div className="grid grid-cols-2 gap-3">
                    <ChartCard title="Kanal Dağılımı" accent="#00f0ff" minHeight={180}>
                        {donutData.length === 0 ? (
                            <NoData accent="#00f0ff" message="Ticket verisi yok" />
                        ) : (
                            <ResponsiveContainer width="100%" height={180}>
                                <RPieChart>
                                    <Pie
                                        data={donutData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={65}
                                        paddingAngle={3}
                                        stroke="none"
                                    >
                                        {donutData.map((entry, idx) => (
                                            <Cell key={idx} fill={entry.color} opacity={0.8} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CyberTooltip />} />
                                    <Legend formatter={(v: string) => <span className="font-mono text-[8px] text-white/40">{v}</span>} />
                                    {/* Center label */}
                                    <text x="50%" y="48%" textAnchor="middle" dominantBaseline="central" className="font-mono" fill="white" fontSize={18} fontWeight="bold">
                                        {totalTickets}
                                    </text>
                                    <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" className="font-mono" fill="rgba(255,255,255,0.3)" fontSize={8}>
                                        TICKETS
                                    </text>
                                </RPieChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>

                    <ChartCard title="Kategori Dağılımı" accent="#00f0ff" minHeight={180}>
                        {categoryData.length === 0 ? (
                            <NoData accent="#00f0ff" message="Kategori verisi yok" />
                        ) : (
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                                    <CartesianGrid {...gridProps} horizontal={false} />
                                    <XAxis type="number" tick={axisTickStyle} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="name" tick={{ ...axisTickStyle, fontSize: 8 }} axisLine={false} tickLine={false} width={70} />
                                    <Tooltip content={<CyberTooltip />} />
                                    <Bar dataKey="count" name="Ticket" radius={[0, 4, 4, 0]}>
                                        {categoryData.map((entry, idx) => (
                                            <Cell key={idx} fill={entry.color} opacity={0.75} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>
                </div>

                {/* Row 2: Weekly trend */}
                <ChartCard title="Haftalık Ticket Trendi" subtitle="Son 4 hafta" accent="#00f0ff" minHeight={140}>
                    {trendData.length === 0 ? (
                        <NoData accent="#00f0ff" message="Trend verisi yok" />
                    ) : (
                        <ResponsiveContainer width="100%" height={140}>
                            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="cxTrendGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#00f0ff" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid {...gridProps} />
                                <XAxis dataKey="date" tick={{ ...axisTickStyle, fontSize: 8 }} axisLine={false} tickLine={false} />
                                <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
                                <Tooltip content={<CyberTooltip />} />
                                <Area type="monotone" dataKey="count" name="Tickets" stroke="#00f0ff" fill="url(#cxTrendGrad)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </div>
        </div>
    );
}

// ── CUSTOM COMPONENTS ────────────────────────────────────────────────────────

const AccordionSection = ({
    title, icon, children, defaultOpen = false, accent = "#00f0ff"
}: {
    title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; accent?: string;
}) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="rounded-xl border border-white/8 overflow-hidden bg-black/20">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-2 px-4 py-3 bg-white/2 hover:bg-white/4 transition-colors border-b border-transparent"
                style={{ borderColor: open ? "rgba(255,255,255,0.06)" : "transparent" }}
            >
                <div style={{ color: `${accent}88` }}>{icon}</div>
                <span className="font-mono text-[9px] text-white/60 uppercase tracking-widest flex-1 text-left">{title}</span>
                {open ? <ChevronUp size={12} className="text-white/20" /> : <ChevronDown size={12} className="text-white/20" />}
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 py-3 border-t border-black/20">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ── TICKET POPUP MODAL (HITL) ────────────────────────────────────────────────

function TicketApprovalModal({
    ticket, onClose
}: {
    ticket: SupportTicketSummary; onClose: () => void;
}) {
    const { approveSupportTicket } = useAgentStore();
    const [draft, setDraft] = useState(ticket.draftResponse || "");
    const [feedback, setFeedback] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const isBug = ticket.category === "SUPPORT_BUG";
    const accentColor = isBug ? "#ff2d55" : "#00f0ff";

    const handleSend = async () => {
        setSubmitting(true);
        await approveSupportTicket(ticket._id, true, feedback || draft);
        setSubmitting(false);
        onClose();
    };

    const handleArchive = async () => {
        setSubmitting(true);
        await approveSupportTicket(ticket._id, false, "Archived by Operator");
        setSubmitting(false);
        onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 10 }}
                className="w-full max-w-2xl bg-[#0a1018] border rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                style={{ borderColor: `${accentColor}40`, boxShadow: `0 0 80px ${accentColor}10` }}
            >
                {/* Header */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-white/5 bg-white/2 shrink-0">
                    <div className="flex gap-3">
                        <Mail size={16} style={{ color: accentColor }} className="mt-1 shrink-0" />
                        <div>
                            <p className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: `${accentColor}88` }}>
                                {isBug ? "Technischer Support" : "Preisanfrage"} · {ticket.platform}
                            </p>
                            <h2 className="font-mono text-[13px] text-white/90 leading-snug">{ticket.subject}</h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-white/30 hover:text-white/80 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 scrollbar-hide">
                    {/* A: Original Message */}
                    <AccordionSection title="Kunde / Original Message" icon={<Inbox size={12} />} defaultOpen={true} accent={accentColor}>
                        <div className="space-y-3">
                            <div className="flex gap-6">
                                <div>
                                    <p className="font-mono text-[8px] text-white/30 uppercase tracking-widest mb-1">Von</p>
                                    <p className="font-mono text-[10px] text-white/70">{ticket.from}</p>
                                </div>
                                <div>
                                    <p className="font-mono text-[8px] text-white/30 uppercase tracking-widest mb-1">Datum</p>
                                    <p className="font-mono text-[10px] text-white/70 flex items-center gap-1.5">
                                        <Clock size={10} className="text-white/40" />
                                        {new Date(ticket.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                                    </p>
                                </div>
                            </div>
                            {ticket.aiSummary && (
                                <div className="bg-white/4 rounded-lg px-4 py-3 border border-white/5">
                                    <p className="font-mono text-[9px] text-[#00f0ff]/60 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <Brain size={10} /> AI Summary
                                    </p>
                                    <p className="font-mono text-[11px] text-white/75 leading-relaxed">{ticket.aiSummary}</p>
                                </div>
                            )}
                        </div>
                    </AccordionSection>

                    {/* B: RAG Sources */}
                    {ticket.ragSources && ticket.ragSources.length > 0 && (
                        <AccordionSection title="Knowledge Base Matches" icon={<Database size={12} />} defaultOpen={false} accent="#00f0ff">
                            <div className="space-y-2">
                                {ticket.ragSources.map((src, i) => (
                                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/3 border border-[#00f0ff]/10">
                                        <Database size={10} className="text-[#00f0ff]/50 shrink-0" />
                                        <span className="font-mono text-[10px] text-white/75 flex-1 truncate">{src.title}</span>
                                        <span className="font-mono text-[9px] text-[#00f0ff]/70 bg-[#00f0ff]/10 px-2 py-0.5 rounded border border-[#00f0ff]/20">
                                            {Math.round(src.score * 100)}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </AccordionSection>
                    )}

                    {/* C: Draft Reply */}
                    <div className="rounded-xl border border-white/10 overflow-hidden bg-black/20">
                        <div className="flex items-center gap-2 px-4 py-3 bg-white/3 border-b border-white/5">
                            <Edit3 size={12} className="text-white/40" />
                            <span className="font-mono text-[10px] text-white/50 uppercase tracking-widest flex-1">AI Response Draft (Editable)</span>
                        </div>
                        <textarea
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            rows={8}
                            className="w-full bg-transparent px-5 py-4 font-mono text-[11px] text-white/80 leading-relaxed
                                       resize-none outline-none placeholder:text-white/20 focus:bg-white/2 transition-colors"
                            placeholder="Type or edit the response here..."
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-white/5 bg-white/2 shrink-0 space-y-3">
                    <input
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                        placeholder="Internal notes or AI feedback (Optional)..."
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 font-mono text-[10px] text-white/70
                                   placeholder:text-white/20 outline-none focus:border-[#00f0ff]/40 transition-colors"
                    />
                    <div className="flex gap-3">
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={handleSend}
                            disabled={submitting || !draft.trim()}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-mono text-[11px] font-bold uppercase tracking-wider
                                       bg-[#00f0ff]/10 border border-[#00f0ff]/40 text-[#00f0ff] hover:bg-[#00f0ff]/20
                                       hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            {submitting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                            Approve & Publish Response
                        </motion.button>
                        <button
                            onClick={handleArchive}
                            disabled={submitting}
                            className="px-6 py-3 rounded-lg font-mono text-[11px] uppercase tracking-wider
                                       border border-white/10 text-white/40 hover:bg-white/5 hover:text-white/60 transition-all"
                        >
                            Archive Ticket
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ── MAIN DASHBOARD (LEFT: INBOX, RIGHT: RAG) ─────────────────────────────────

export function CxDashboard() {
    const { supportTickets, fetchSupportTickets } = useAgentStore();
    const [selectedTicket, setSelectedTicket] = useState<SupportTicketSummary | null>(null);

    // Initial fetch
    useEffect(() => {
        fetchSupportTickets();
    }, [fetchSupportTickets]);

    return (
        <div className="flex w-full h-full relative text-white">
            
            {/* Modal Layer */}
            <AnimatePresence>
                {selectedTicket && (
                    <TicketApprovalModal
                        ticket={selectedTicket}
                        onClose={() => setSelectedTicket(null)}
                    />
                )}
            </AnimatePresence>

            {/* ── LEFT PANEL: LIVE INBOX (40%) ── */}
            <div className="w-[45%] lg:w-[40%] flex flex-col border-r border-white/5 bg-[#05080c] z-10">
                <div className="px-6 py-5 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/20 flex items-center justify-center">
                            <Inbox size={16} className="text-[#00f0ff]" />
                        </div>
                        <div>
                            <h2 className="font-mono text-[14px] text-white/90">Support Triage</h2>
                            <p className="font-mono text-[10px] text-[#00f0ff]/60 uppercase tracking-widest mt-0.5">
                                N8N Inbox Queue
                            </p>
                        </div>
                    </div>
                </div>

                {/* Analytics Panel — collapse/expand */}
                <CxAnalyticsPanel />

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-hide">
                    {supportTickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-30 gap-4">
                            <Inbox size={32} />
                            <p className="font-mono text-[11px] tracking-widest uppercase">Inbox is clear</p>
                        </div>
                    ) : (
                        supportTickets.map((ticket, i) => (
                            <motion.button
                                key={ticket._id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => setSelectedTicket(ticket)}
                                className="w-full text-left p-4 rounded-xl border border-white/5 bg-white/2 hover:bg-[#00f0ff]/5 hover:border-[#00f0ff]/20 transition-all group"
                            >
                                <div className="flex items-start justify-between mb-2 gap-3">
                                    <h3 className="font-mono text-[11px] text-white/80 line-clamp-1 flex-1 group-hover:text-[#00f0ff] transition-colors">
                                        {ticket.subject}
                                    </h3>
                                    <span className="shrink-0 font-mono text-[8px] text-white/30 truncate max-w-[80px]">
                                        {ticket.from.split("@")[0]}
                                    </span>
                                </div>
                                
                                <p className="font-mono text-[9px] text-white/40 line-clamp-2 leading-relaxed mb-3">
                                    {ticket.aiSummary || "Ticket is waiting for AI summary..."}
                                </p>
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex gap-1.5">
                                        <span className={`font-mono text-[7px] uppercase tracking-wider px-2 py-0.5 rounded border
                                            ${ticket.category === "SUPPORT_BUG" ? "text-[#ff2d55] border-[#ff2d55]/30 bg-[#ff2d55]/10" : "text-[#00f0ff] border-[#00f0ff]/30 bg-[#00f0ff]/10"}`}>
                                            {ticket.category === "SUPPORT_BUG" ? "TECH ISSUE" : "INQUIRY"}
                                        </span>
                                        {ticket.priority && (
                                            <span className={`font-mono text-[7px] uppercase tracking-wider px-2 py-0.5 rounded border
                                                ${ticket.priority === "critical" ? "text-[#ffb000] border-[#ffb000]/30 bg-[#ffb000]/10" : "text-white/30 border-white/10"}`}>
                                                {ticket.priority}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 font-mono text-[8px] text-white/30">
                                        <Clock size={8} />
                                        <span>{new Date(ticket.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                                    </div>
                                </div>
                            </motion.button>
                        ))
                    )}
                </div>
            </div>

            {/* ── RIGHT PANEL: RAG KNOWLEDGE BASE (60%) ── */}
            <div className="flex-1 flex flex-col bg-[#070c14] z-0">
                <div className="px-6 py-5 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                            <Database size={16} className="text-white/50" />
                        </div>
                        <div>
                            <h2 className="font-mono text-[14px] text-white/90">Knowledge Base</h2>
                            <p className="font-mono text-[10px] text-white/40 uppercase tracking-widest mt-0.5">
                                RAG Policy & Document Store
                            </p>
                        </div>
                    </div>
                </div>
                {/* 
                  Burada KnowledgeView içerisindeki RagKnowledgePanel'i kullanıyoruz. 
                  Tam genişlik/yükseklik kaplayacak şekilde embed edildi.
                */}
                <div className="flex-1 overflow-hidden relative">
                    <RagKnowledgePanel clientId={DEFAULT_CLIENT} />
                </div>
            </div>

        </div>
    );
}

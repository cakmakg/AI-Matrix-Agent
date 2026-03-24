"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, DollarSign, RefreshCw, BarChart3, Cpu } from "lucide-react";

interface AgentCost {
    agentName: string;
    totalCost: number;
    callCount: number;
}

interface FinanceSummary {
    totalExpenses: number | null;
    totalRevenue: number | null;
    netPnl: number | null;
    allTimeExpenses: number | null;
    agentBreakdown: AgentCost[];
    periodLabel: string;
}

const AGENT_COLORS: Record<string, string> = {
    ORCHESTRATOR: "#00f0ff",
    SCRAPER:      "#ffb000",
    ANALYZER:     "#00f0ff",
    WRITER:       "#39ff14",
    CRITIC:       "#ffb000",
    ARCHITECT:    "#39ff14",
    CMO:          "#ff6b35",
    SYSTEM:       "#ffffff",
};

const formatUSD = (v: number | null | undefined) => {
    const n = Number(v) || 0;
    return n < 0.01 && n > 0 ? `$${(n * 100).toFixed(3)}¢` : `$${n.toFixed(4)}`;
};

export const CfoDashboard = () => {
    const [data, setData] = useState<FinanceSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/finance/summary");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json() as FinanceSummary;
            setData(json);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSummary(); }, [fetchSummary]);

    const maxCost = data?.agentBreakdown?.reduce((m, a) => Math.max(m, a.totalCost), 0) ?? 1;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                    <BarChart3 size={14} className="text-[#00d4aa]" />
                    <span className="font-mono text-[10px] font-bold text-white/60 uppercase tracking-widest">
                        CFO Dashboard
                    </span>
                    {data?.periodLabel && (
                        <span className="font-mono text-[8px] text-white/25">{data.periodLabel}</span>
                    )}
                </div>
                <button
                    onClick={fetchSummary}
                    disabled={loading}
                    className="p-1.5 rounded hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors disabled:opacity-30"
                >
                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {loading && !data && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-white/25">
                        <RefreshCw size={14} className="animate-spin" />
                        <span className="font-mono text-[10px]">Loading financial data...</span>
                    </div>
                </div>
            )}

            {error && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <p className="font-mono text-[10px] text-alert-red/60">{error}</p>
                        <button
                            onClick={fetchSummary}
                            className="mt-3 font-mono text-[9px] text-neon-blue/50 hover:text-neon-blue transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            )}

            {data && (
                <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hide space-y-5">
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <SummaryCard
                            label="Monthly Expenses"
                            value={formatUSD(data.totalExpenses)}
                            icon={<TrendingDown size={13} />}
                            color="text-alert-red"
                            bg="bg-alert-red/6 border-alert-red/15"
                        />
                        <SummaryCard
                            label="Monthly Revenue"
                            value={formatUSD(data.totalRevenue)}
                            icon={<TrendingUp size={13} />}
                            color="text-neon-green"
                            bg="bg-neon-green/6 border-neon-green/15"
                        />
                        <SummaryCard
                            label="Net P&L"
                            value={formatUSD(data.netPnl)}
                            icon={<DollarSign size={13} />}
                            color={(data.netPnl ?? 0) >= 0 ? "text-neon-green" : "text-alert-red"}
                            bg={(data.netPnl ?? 0) >= 0 ? "bg-neon-green/6 border-neon-green/15" : "bg-alert-red/6 border-alert-red/15"}
                        />
                        <SummaryCard
                            label="All-Time AI Cost"
                            value={formatUSD(data.allTimeExpenses)}
                            icon={<Cpu size={13} />}
                            color="text-[#00f0ff]"
                            bg="bg-[#00f0ff]/6 border-[#00f0ff]/15"
                        />
                    </div>

                    {/* Agent breakdown */}
                    <div>
                        <h3 className="font-mono text-[8px] text-white/30 uppercase tracking-widest mb-3">
                            LLM Cost by Agent
                        </h3>
                        <div className="space-y-2.5">
                            {(data.agentBreakdown?.length ?? 0) === 0 ? (
                                <p className="font-mono text-[10px] text-white/20 text-center py-4">
                                    No cost data yet — run a mission first
                                </p>
                            ) : (
                                (data.agentBreakdown ?? [])
                                    .sort((a, b) => b.totalCost - a.totalCost)
                                    .map((agent) => {
                                        const color = AGENT_COLORS[agent.agentName.toUpperCase()] ?? "#ffffff";
                                        const pct = maxCost > 0 ? (agent.totalCost / maxCost) * 100 : 0;
                                        return (
                                            <div key={agent.agentName}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-mono text-[9px] text-white/60">
                                                        {agent.agentName}
                                                    </span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-mono text-[8px] text-white/30">
                                                            {agent.callCount} calls
                                                        </span>
                                                        <span className="font-mono text-[9px] font-bold" style={{ color }}>
                                                            {formatUSD(agent.totalCost)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${pct}%` }}
                                                        transition={{ duration: 0.6, ease: "easeOut" }}
                                                        className="h-full rounded-full"
                                                        style={{ backgroundColor: color, opacity: 0.7 }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface SummaryCardProps {
    label: string;
    value: string;
    icon: React.ReactNode;
    color: string;
    bg: string;
}

const SummaryCard = ({ label, value, icon, color, bg }: SummaryCardProps) => (
    <div className={`rounded-lg border p-3 ${bg}`}>
        <div className={`flex items-center gap-1.5 mb-2 ${color}`}>
            {icon}
            <span className="font-mono text-[7px] uppercase tracking-wider opacity-70">{label}</span>
        </div>
        <p className={`font-mono text-sm font-bold ${color}`}>{value}</p>
    </div>
);

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, DollarSign, RefreshCw, BarChart3, Cpu, PieChart } from "lucide-react";
import {
    ResponsiveContainer,
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
    PieChart as RPieChart,
    Pie,
    Legend,
} from "recharts";
import { ChartCard, CyberTooltip, NoData, CHART_COLORS, AGENT_CHART_COLORS, axisTickStyle, gridProps } from "../charts";

/* ── types ── */
interface AgentCost { agentName: string; totalCost: number; callCount: number; }
interface FinanceSummary {
    totalExpenses: number | null;
    totalRevenue: number | null;
    netPnl: number | null;
    allTimeExpenses: number | null;
    agentBreakdown: AgentCost[];
    periodLabel: string;
}
interface MonthlyTrend { month: string; revenue: number; expenses: number; net: number; }
interface FinanceAnalytics { monthlyTrend: MonthlyTrend[]; agentBreakdown: { name: string; cost: number; calls: number }[]; }

const formatUSD = (v: number | null | undefined) => {
    const n = Number(v) || 0;
    return n < 0.01 && n > 0 ? `$${(n * 100).toFixed(3)}¢` : `$${n.toFixed(4)}`;
};

export const CfoDashboard = () => {
    const [data, setData] = useState<FinanceSummary | null>(null);
    const [analytics, setAnalytics] = useState<FinanceAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [summaryRes, analyticsRes] = await Promise.all([
                fetch("/api/finance/summary"),
                fetch("/api/analytics/finance"),
            ]);
            if (summaryRes.ok) {
                setData(await summaryRes.json() as FinanceSummary);
            }
            if (analyticsRes.ok) {
                const json = await analyticsRes.json();
                setAnalytics(json.data ?? json);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const donutData = (analytics?.agentBreakdown ?? data?.agentBreakdown?.map(a => ({ name: a.agentName, cost: a.totalCost, calls: a.callCount })) ?? [])
        .filter(a => a.cost > 0);

    return (
        <div className="flex flex-col h-full overflow-y-auto" style={{ background: "#070c14" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg border border-[#ffb000]/30 bg-[#ffb000]/8 flex items-center justify-center">
                        <BarChart3 size={16} className="text-[#ffb000]" />
                    </div>
                    <div>
                        <h1 className="text-[15px] font-bold text-white tracking-wide">CFO Dashboard</h1>
                        <p className="text-[11px] text-white/35 font-mono">
                            Finanzübersicht & Kostenanalyse
                            {data?.periodLabel && <span className="ml-2 text-white/20">· {data.periodLabel}</span>}
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchAll}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 transition-all text-xs"
                >
                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                    Aktualisieren
                </button>
            </div>

            {error && (
                <div className="mx-6 mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            <div className="flex-1 px-6 py-5 space-y-5 scrollbar-hide">
                {/* KPI Cards */}
                <div className="grid grid-cols-4 gap-3">
                    {[
                        {
                            label: "Monthly Expenses",
                            value: formatUSD(data?.totalExpenses),
                            icon: <TrendingDown size={14} />,
                            color: "#ff2d55",
                        },
                        {
                            label: "Monthly Revenue",
                            value: formatUSD(data?.totalRevenue),
                            icon: <TrendingUp size={14} />,
                            color: "#39ff14",
                        },
                        {
                            label: "Net P&L",
                            value: formatUSD(data?.netPnl),
                            icon: <DollarSign size={14} />,
                            color: (data?.netPnl ?? 0) >= 0 ? "#39ff14" : "#ff2d55",
                        },
                        {
                            label: "All-Time AI Cost",
                            value: formatUSD(data?.allTimeExpenses),
                            icon: <Cpu size={14} />,
                            color: "#00f0ff",
                        },
                    ].map((card) => (
                        <motion.div
                            key={card.label}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-white/6 bg-white/[0.02] p-4"
                        >
                            <div className="flex items-center gap-2 mb-2" style={{ color: card.color }}>
                                {card.icon}
                                <span className="font-mono text-[8px] uppercase tracking-wider opacity-70">{card.label}</span>
                            </div>
                            <p className="font-mono text-lg font-bold" style={{ color: card.color }}>
                                {loading ? "..." : card.value}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Charts Row — Revenue vs Expense + Agent Donut */}
                <div className="grid grid-cols-5 gap-4">
                    {/* Combo Chart: Monthly Revenue vs Expenses */}
                    <ChartCard
                        title="Monatlicher Umsatz vs. Kosten"
                        subtitle="Letzte 6 Monate"
                        accent="#ffb000"
                        icon={<BarChart3 size={12} />}
                        className="col-span-3"
                        minHeight={240}
                    >
                        {(analytics?.monthlyTrend?.length ?? 0) === 0 ? (
                            <NoData accent="#ffb000" />
                        ) : (
                            <ResponsiveContainer width="100%" height={240}>
                                <ComposedChart data={analytics!.monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid {...gridProps} />
                                    <XAxis dataKey="month" tick={axisTickStyle} axisLine={false} tickLine={false} />
                                    <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v.toFixed(2)}`} />
                                    <Tooltip content={<CyberTooltip formatter={(v) => `$${v.toFixed(4)}`} />} />
                                    <Bar dataKey="expenses" name="Kosten" fill="#ff2d55" radius={[4, 4, 0, 0]} opacity={0.7} />
                                    <Bar dataKey="revenue" name="Umsatz" fill="#39ff14" radius={[4, 4, 0, 0]} opacity={0.7} />
                                    <Line type="monotone" dataKey="net" name="Netto" stroke="#ffb000" strokeWidth={2} dot={false} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>

                    {/* Donut Chart: Agent Cost Distribution */}
                    <ChartCard
                        title="Ajan Maliyet Dağılımı"
                        accent="#00f0ff"
                        icon={<PieChart size={12} />}
                        className="col-span-2"
                        minHeight={240}
                    >
                        {donutData.length === 0 ? (
                            <NoData accent="#00f0ff" message="Henüz maliyet verisi yok" />
                        ) : (
                            <ResponsiveContainer width="100%" height={240}>
                                <RPieChart>
                                    <Pie
                                        data={donutData}
                                        dataKey="cost"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={85}
                                        paddingAngle={2}
                                        stroke="none"
                                    >
                                        {donutData.map((entry, idx) => (
                                            <Cell
                                                key={idx}
                                                fill={AGENT_CHART_COLORS[entry.name.toUpperCase()] ?? "#ffffff"}
                                                opacity={0.8}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CyberTooltip formatter={(v) => `$${v.toFixed(4)}`} />} />
                                    <Legend
                                        formatter={(value: string) => (
                                            <span className="font-mono text-[9px] text-white/50">{value}</span>
                                        )}
                                        wrapperStyle={{ fontSize: 9, fontFamily: "monospace" }}
                                    />
                                </RPieChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>
                </div>

                {/* Agent Cost Breakdown — horizontal bars (existing feature enhanced) */}
                <ChartCard
                    title="LLM Cost by Agent"
                    subtitle={`${data?.agentBreakdown?.length ?? 0} agents`}
                    accent="#ffb000"
                    icon={<Cpu size={12} />}
                    minHeight={120}
                >
                    {(data?.agentBreakdown?.length ?? 0) === 0 ? (
                        <NoData accent="#ffb000" message="Keine Kostendaten — starte zuerst eine Mission" />
                    ) : (
                        <div className="space-y-2.5">
                            {(data?.agentBreakdown ?? [])
                                .sort((a, b) => b.totalCost - a.totalCost)
                                .map((agent) => {
                                    const color = AGENT_CHART_COLORS[agent.agentName.toUpperCase()] ?? "#ffffff";
                                    const maxCost = data!.agentBreakdown.reduce((m, a) => Math.max(m, a.totalCost), 0);
                                    const pct = maxCost > 0 ? (agent.totalCost / maxCost) * 100 : 0;
                                    return (
                                        <div key={agent.agentName}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-mono text-[9px] text-white/60">{agent.agentName}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-[8px] text-white/30">{agent.callCount} calls</span>
                                                    <span className="font-mono text-[9px] font-bold" style={{ color }}>{formatUSD(agent.totalCost)}</span>
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
                                })}
                        </div>
                    )}
                </ChartCard>
            </div>
        </div>
    );
};

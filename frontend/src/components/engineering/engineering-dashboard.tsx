"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
    Cpu, RefreshCw, Activity, PieChart as PieChartIcon, Hammer, Layers,
} from "lucide-react";
import {
    ResponsiveContainer,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart as RPieChart, Pie, Cell,
    BarChart, Bar,
    ComposedChart,
    Legend,
} from "recharts";
import { ChartCard, CyberTooltip, NoData, CHART_COLORS, AGENT_CHART_COLORS, axisTickStyle, gridProps } from "../charts";

/* ── types ── */
interface EngineeringAnalytics {
    hourlyBurn: Array<{ hour: string; tokens: number; cost: number }>;
    agentCalls: Array<{ agent: string; calls: number }>;
    weeklyBlueprints: Array<{ week: string; count: number }>;
}

export function EngineeringDashboard() {
    const [data, setData] = useState<EngineeringAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/analytics/engineering");
            if (res.ok) {
                const json = await res.json();
                setData(json.data ?? json);
            }
        } catch { /* silent */ } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const hourlyData = (data?.hourlyBurn ?? []).map(h => ({
        ...h,
        hourLabel: h.hour.split("T")[1] ?? h.hour,
    }));

    const agentDonutData = (data?.agentCalls ?? []).filter(a => a.calls > 0);
    const blueprintData = data?.weeklyBlueprints ?? [];

    /* Total tokens for KPI */
    const totalTokens = hourlyData.reduce((s, h) => s + h.tokens, 0);
    const totalCost = hourlyData.reduce((s, h) => s + h.cost, 0);
    const totalCalls = agentDonutData.reduce((s, a) => s + a.calls, 0);

    return (
        <div className="h-full overflow-y-auto px-6 py-5 space-y-5" style={{ background: "#070c14" }}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg border border-[#10b981]/30 bg-[#10b981]/8 flex items-center justify-center">
                        <Cpu size={16} className="text-[#10b981]" />
                    </div>
                    <div>
                        <h1 className="text-[15px] font-bold text-white tracking-wide">Engineering Lab</h1>
                        <p className="text-[11px] text-white/35 font-mono">LLM Token Burn · Ajan Aktivitesi · Blueprint Üretimi</p>
                    </div>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 transition-all text-xs"
                >
                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* KPI mini cards */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: "24h Token Burn", value: totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(1)}K` : `${totalTokens}`, color: "#10b981", icon: <Activity size={12} /> },
                    { label: "24h Maliyet", value: `$${totalCost.toFixed(4)}`, color: "#ffb000", icon: <Layers size={12} /> },
                    { label: "Toplam Çağrı", value: `${totalCalls}`, color: "#00f0ff", icon: <Cpu size={12} /> },
                ].map(k => (
                    <div key={k.label} className="rounded-xl border border-white/6 bg-white/[0.02] p-3 flex items-center gap-3">
                        <span style={{ color: k.color }}>{k.icon}</span>
                        <div>
                            <div className="font-mono text-[8px] text-white/35 uppercase tracking-widest">{k.label}</div>
                            <div className="font-mono text-[16px] font-bold" style={{ color: k.color }}>{loading ? "..." : k.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Row 1: Token Burn Rate (Live Pulse Line) + Agent Donut */}
            <div className="grid grid-cols-5 gap-4">
                {/* Real-time Line Chart: Saatlik token burn rate
                    Y ekseni: token sayısı, X ekseni: saat.
                    Canlı pulse efekti ile akan çizgi grafik — son 24 saat. */}
                <ChartCard
                    title="LLM Token Burn Rate"
                    subtitle="Son 24 saat — saatlik"
                    accent="#10b981"
                    icon={<Activity size={12} />}
                    className="col-span-3"
                    minHeight={260}
                >
                    {hourlyData.length === 0 ? (
                        <NoData accent="#10b981" message="Token verisi yok — ajan çalıştırın" />
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <ComposedChart data={hourlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="tokenBurnGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid {...gridProps} />
                                <XAxis dataKey="hourLabel" tick={{ ...axisTickStyle, fontSize: 8 }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="tokens" tick={axisTickStyle} axisLine={false} tickLine={false} tickFormatter={(v: number) => v > 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} />
                                <YAxis yAxisId="cost" orientation="right" tick={axisTickStyle} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v.toFixed(3)}`} />
                                <Tooltip content={<CyberTooltip formatter={(v, name) => name === "Maliyet" ? `$${v.toFixed(4)}` : `${v} tokens`} />} />
                                <Line yAxisId="tokens" type="monotone" dataKey="tokens" name="Tokens" stroke="#10b981" strokeWidth={2} dot={false} />
                                <Line yAxisId="cost" type="monotone" dataKey="cost" name="Maliyet" stroke="#ffb000" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                                <Legend formatter={(v: string) => <span className="font-mono text-[8px] text-white/40">{v}</span>} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                {/* Donut Chart: Ajan Çağrı Dağılımı
                    Hangi ajan en çok çağrılıyor? Her ajan dilimi kendi rengiyle. */}
                <ChartCard
                    title="Ajan Çağrı Dağılımı"
                    subtitle="Son 24 saat"
                    accent="#00f0ff"
                    icon={<PieChartIcon size={12} />}
                    className="col-span-2"
                    minHeight={260}
                >
                    {agentDonutData.length === 0 ? (
                        <NoData accent="#00f0ff" message="Çağrı verisi yok" />
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <RPieChart>
                                <Pie
                                    data={agentDonutData}
                                    dataKey="calls"
                                    nameKey="agent"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    stroke="none"
                                >
                                    {agentDonutData.map((entry, idx) => (
                                        <Cell key={idx} fill={AGENT_CHART_COLORS[entry.agent.toUpperCase()] ?? "#ffffff"} opacity={0.8} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CyberTooltip formatter={(v) => `${v} çağrı`} />} />
                                <Legend formatter={(v: string) => <span className="font-mono text-[8px] text-white/40">{v}</span>} />
                            </RPieChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </div>

            {/* Row 2: Blueprint Production — haftalık teknik blueprint üretim hızı */}
            <ChartCard
                title="Blueprint Üretim Hızı"
                subtitle="Haftalık teknik blueprint sayısı"
                accent="#10b981"
                icon={<Hammer size={12} />}
                minHeight={200}
            >
                {blueprintData.length === 0 ? (
                    <NoData accent="#10b981" message="Blueprint verisi yok" />
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={blueprintData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid {...gridProps} />
                            <XAxis dataKey="week" tick={{ ...axisTickStyle, fontSize: 8 }} axisLine={false} tickLine={false} />
                            <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<CyberTooltip />} />
                            <Bar dataKey="count" name="Blueprint" fill="#10b981" radius={[6, 6, 0, 0]} opacity={0.7} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </ChartCard>
        </div>
    );
}

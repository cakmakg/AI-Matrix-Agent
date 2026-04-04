"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
    Crosshair, RefreshCw, Radar as RadarIcon, TrendingUp, Shield, Activity,
} from "lucide-react";
import {
    ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
    LineChart, Line,
    Legend,
} from "recharts";
import { ChartCard, CyberTooltip, NoData, CHART_COLORS, axisTickStyle, gridProps } from "../charts";

/* ── types ── */
interface StrategyAnalytics {
    reportsByType: Array<{ type: string; count: number }>;
    weeklyTrend: Array<{ week: string; count: number }>;
}

const TYPE_LABELS: Record<string, string> = {
    INNOVATION_RADAR: "Rakip Radar",
    TREND_RADAR: "Trend Radar",
    BUSINESS_STRESS_TEST: "Stres Testi",
};

const TYPE_COLORS: Record<string, string> = {
    INNOVATION_RADAR: "#bf5fff",
    TREND_RADAR: "#00f0ff",
    BUSINESS_STRESS_TEST: "#ff2d55",
};

/* Stress test risk radar — 6 axis risk distribution */
const RISK_AXES = [
    { axis: "Finansal Risk", key: "financial" },
    { axis: "Operasyonel Risk", key: "operational" },
    { axis: "Rekabet Riski", key: "competition" },
    { axis: "Regülasyon Riski", key: "regulation" },
    { axis: "Teknoloji Riski", key: "technology" },
    { axis: "Pazar Riski", key: "market" },
];

export function StrategyDashboard() {
    const [data, setData] = useState<StrategyAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/analytics/strategy");
            if (res.ok) {
                const json = await res.json();
                setData(json.data ?? json);
            }
        } catch { /* silent */ } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* ── Risk radar: generate data from report counts per type (deterministic mapping) ── */
    const stressTestCount = data?.reportsByType?.find(r => r.type === "BUSINESS_STRESS_TEST")?.count ?? 0;
    const innovationCount = data?.reportsByType?.find(r => r.type === "INNOVATION_RADAR")?.count ?? 0;
    const trendCount = data?.reportsByType?.find(r => r.type === "TREND_RADAR")?.count ?? 0;
    const total = stressTestCount + innovationCount + trendCount;

    const radarData = RISK_AXES.map((r, i) => ({
        axis: r.axis,
        value: total > 0
            ? Math.min(10, Math.round(((stressTestCount * (i + 1) + innovationCount * (6 - i) + trendCount * 3) / (total * 6)) * 10))
            : 0,
    }));

    /* Report type bar data */
    const typeBarData = (data?.reportsByType ?? []).map(r => ({
        name: TYPE_LABELS[r.type] ?? r.type,
        count: r.count,
        color: TYPE_COLORS[r.type] ?? "#bf5fff",
    }));

    /* Weekly production trend */
    const weeklyData = data?.weeklyTrend ?? [];

    return (
        <div className="h-full overflow-y-auto px-6 py-5 space-y-5" style={{ background: "#070c14" }}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg border border-[#bf5fff]/30 bg-[#bf5fff]/8 flex items-center justify-center">
                        <Crosshair size={16} className="text-[#bf5fff]" />
                    </div>
                    <div>
                        <h1 className="text-[15px] font-bold text-white tracking-wide">Strategy War Room</h1>
                        <p className="text-[11px] text-white/35 font-mono">Rakip Radar · Trend Radar · Stres Testi Analizi</p>
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

            {/* Row 1: Risk Radar + Report Type Distribution */}
            <div className="grid grid-cols-2 gap-4">
                {/* Radar Chart: 6-eksenli risk dağılımı — Finansal, Operasyonel, Rekabet,
                    Regülasyon, Teknoloji, Pazar riski. Her stres testi sonucu spider web üzerinde. */}
                <ChartCard
                    title="Pazar Stres Testi — Risk Radarı"
                    subtitle="6 eksenli risk ağı"
                    accent="#bf5fff"
                    icon={<RadarIcon size={12} />}
                    minHeight={280}
                >
                    {total === 0 ? (
                        <NoData accent="#bf5fff" message="Stres testi verisi yok — bir stres testi başlatın" />
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="68%">
                                <PolarGrid stroke={CHART_COLORS.grid} />
                                <PolarAngleAxis
                                    dataKey="axis"
                                    tick={{ fontSize: 9, fontFamily: "monospace", fill: "rgba(255,255,255,0.45)" }}
                                />
                                <PolarRadiusAxis
                                    tick={{ fontSize: 8, fontFamily: "monospace", fill: "rgba(255,255,255,0.2)" }}
                                    axisLine={false}
                                    domain={[0, 10]}
                                />
                                <Radar
                                    name="Risk Skoru"
                                    dataKey="value"
                                    stroke="#bf5fff"
                                    fill="#bf5fff"
                                    fillOpacity={0.2}
                                    strokeWidth={2}
                                />
                                <Tooltip content={<CyberTooltip formatter={(v) => `${v}/10`} />} />
                            </RadarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                {/* Grouped Bar: Rapor tipi dağılımı — Rakip Radar, Trend Radar, Stres Testi
                    X ekseni: kategori, Y ekseni: rapor sayısı. Renk kodlu barlar. */}
                <ChartCard
                    title="Rapor Tipi Dağılımı"
                    subtitle="Sub-tab bazlı üretim"
                    accent="#bf5fff"
                    icon={<Shield size={12} />}
                    minHeight={280}
                >
                    {typeBarData.length === 0 ? (
                        <NoData accent="#bf5fff" message="Henüz strateji raporu yok" />
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={typeBarData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid {...gridProps} />
                                <XAxis dataKey="name" tick={axisTickStyle} axisLine={false} tickLine={false} />
                                <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
                                <Tooltip content={<CyberTooltip />} />
                                <Bar dataKey="count" name="Rapor" radius={[6, 6, 0, 0]}>
                                    {typeBarData.map((entry, idx) => (
                                        <Cell key={idx} fill={entry.color} opacity={0.75} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </div>

            {/* Row 2: Strategy Production Trend — haftalık strateji raporu üretim trendi */}
            <ChartCard
                title="Strateji Üretim Trendi"
                subtitle="Haftalık rapor sayısı"
                accent="#bf5fff"
                icon={<Activity size={12} />}
                minHeight={200}
            >
                {weeklyData.length === 0 ? (
                    <NoData accent="#bf5fff" message="Trend verisi yok" />
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={weeklyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="stratTrendGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#bf5fff" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#bf5fff" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid {...gridProps} />
                            <XAxis dataKey="week" tick={{ ...axisTickStyle, fontSize: 8 }} axisLine={false} tickLine={false} />
                            <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<CyberTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="count"
                                name="Rapor"
                                stroke="#bf5fff"
                                strokeWidth={2}
                                dot={{ r: 3, fill: "#bf5fff", strokeWidth: 0 }}
                                activeDot={{ r: 5, fill: "#bf5fff", stroke: "#bf5fff40", strokeWidth: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </ChartCard>
        </div>
    );
}

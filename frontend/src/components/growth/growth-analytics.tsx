"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
    TrendingUp, RefreshCw, BarChart3, Target, Share2,
} from "lucide-react";
import {
    ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    BarChart, Bar, Cell,
    ComposedChart, Line,
    Legend,
} from "recharts";
import { ChartCard, CyberTooltip, NoData, PLATFORM_COLORS, axisTickStyle, gridProps } from "../charts";

/* ── types ── */
interface DailyPost { date: string; count: number; platform: string; }
interface PlatformPerf { platform: string; published: number; failed: number; }
interface SocialAnalytics {
    dailyTrend: DailyPost[];
    platformPerformance: PlatformPerf[];
}

export function GrowthAnalytics() {
    const [data, setData] = useState<SocialAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/analytics/social");
            if (res.ok) {
                const json = await res.json();
                setData(json.data ?? json);
            }
        } catch { /* silent */ } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* ── Pivot daily trend: date → { date, twitter, linkedin, instagram, ... } ── */
    const pivotedTrend = (() => {
        const map = new Map<string, Record<string, number>>();
        for (const d of data?.dailyTrend ?? []) {
            if (!map.has(d.date)) map.set(d.date, {});
            map.get(d.date)![d.platform] = (map.get(d.date)![d.platform] ?? 0) + d.count;
        }
        return Array.from(map.entries()).map(([date, platforms]) => ({ date, ...platforms }));
    })();

    /* All platform names from trend data */
    const platforms = [...new Set((data?.dailyTrend ?? []).map(d => d.platform))];

    /* Platform performance data */
    const perfData = data?.platformPerformance ?? [];

    /* Funnel data — simulated from totals */
    const totalPublished = perfData.reduce((s, p) => s + p.published, 0);
    const totalFailed = perfData.reduce((s, p) => s + p.failed, 0);
    const totalSent = totalPublished + totalFailed;
    const funnelData = [
        { name: "Gönderilen", value: totalSent, color: "#00f0ff" },
        { name: "Yayınlanan", value: totalPublished, color: "#39ff14" },
        { name: "Başarısız", value: totalFailed, color: "#ff2d55" },
    ];

    return (
        <div className="h-full overflow-y-auto px-6 py-5 space-y-5" style={{ background: "#070c14" }}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg border border-[#39ff14]/30 bg-[#39ff14]/8 flex items-center justify-center">
                        <TrendingUp size={16} className="text-[#39ff14]" />
                    </div>
                    <div>
                        <h1 className="text-[15px] font-bold text-white tracking-wide">Growth Analytics</h1>
                        <p className="text-[11px] text-white/35 font-mono">Revenue Engine · Sosyal Medya & Satış Performansı</p>
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

            {/* Row 1: 30-day social engagement area + Funnel */}
            <div className="grid grid-cols-5 gap-4">
                {/* Area Chart: 30 Günlük Sosyal Medya Etkileşimi
                    Platformlara göre renkli gradient alanlar (Twitter: #1DA1F2, LinkedIn: #0077B5, Instagram: #E4405F).
                    X ekseni: günler, Y ekseni: yayınlanan post sayısı. */}
                <ChartCard
                    title="30 Günlük Sosyal Medya Etkileşimi"
                    subtitle="Platformlara göre günlük yayın"
                    accent="#39ff14"
                    icon={<Share2 size={12} />}
                    className="col-span-3"
                    minHeight={260}
                >
                    {pivotedTrend.length === 0 ? (
                        <NoData accent="#39ff14" message="Henüz sosyal medya verisi yok — içerik planlayın" />
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={pivotedTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    {platforms.map(p => (
                                        <linearGradient key={p} id={`grad_${p}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={PLATFORM_COLORS[p] ?? "#39ff14"} stopOpacity={0.35} />
                                            <stop offset="95%" stopColor={PLATFORM_COLORS[p] ?? "#39ff14"} stopOpacity={0} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid {...gridProps} />
                                <XAxis dataKey="date" tick={{ ...axisTickStyle, fontSize: 8 }} axisLine={false} tickLine={false} />
                                <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
                                <Tooltip content={<CyberTooltip />} />
                                {platforms.map(p => (
                                    <Area
                                        key={p}
                                        type="monotone"
                                        dataKey={p}
                                        name={p}
                                        stackId="1"
                                        stroke={PLATFORM_COLORS[p] ?? "#39ff14"}
                                        fill={`url(#grad_${p})`}
                                        strokeWidth={1.5}
                                    />
                                ))}
                                <Legend formatter={(v: string) => <span className="font-mono text-[8px] text-white/40">{v}</span>} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                {/* Funnel: Dönüşüm Hunisi — Gönderilen → Yayınlanan → Başarısız */}
                <ChartCard
                    title="Dönüşüm Hunisi"
                    subtitle="Toplam post akışı"
                    accent="#39ff14"
                    icon={<Target size={12} />}
                    className="col-span-2"
                    minHeight={260}
                >
                    {totalSent === 0 ? (
                        <NoData accent="#39ff14" message="Henüz post verisi yok" />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-1 py-2">
                            {funnelData.map((step, i) => {
                                const widthPct = totalSent > 0 ? Math.max(20, (step.value / totalSent) * 100) : 20;
                                const convRate = i > 0 && funnelData[i - 1].value > 0
                                    ? ((step.value / funnelData[i - 1].value) * 100).toFixed(0)
                                    : null;
                                return (
                                    <React.Fragment key={step.name}>
                                        {convRate && (
                                            <div className="font-mono text-[8px] text-white/25 py-0.5">
                                                ↓ {convRate}%
                                            </div>
                                        )}
                                        <div
                                            className="rounded-lg py-3 flex items-center justify-center gap-2 font-mono transition-all"
                                            style={{
                                                width: `${widthPct}%`,
                                                background: `${step.color}15`,
                                                border: `1px solid ${step.color}40`,
                                            }}
                                        >
                                            <span className="text-[9px] text-white/50">{step.name}</span>
                                            <span className="text-[14px] font-bold" style={{ color: step.color }}>{step.value}</span>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}
                </ChartCard>
            </div>

            {/* Row 2: Platform Success Rate (Grouped Bar)
                Her platform için yan yana iki bar: başarılı (yeşil) ve başarısız (kırmızı).
                Hangi platformun en verimli olduğunu gösterir. */}
            <ChartCard
                title="Platform Başarı Oranı"
                subtitle="Yayınlanan vs Başarısız — platform bazlı"
                accent="#39ff14"
                icon={<BarChart3 size={12} />}
                minHeight={200}
            >
                {perfData.length === 0 ? (
                    <NoData accent="#39ff14" message="Platform verisi yok" />
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <ComposedChart data={perfData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid {...gridProps} />
                            <XAxis dataKey="platform" tick={axisTickStyle} axisLine={false} tickLine={false} />
                            <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
                            <Tooltip content={<CyberTooltip />} />
                            <Bar dataKey="published" name="Yayınlanan" fill="#39ff14" radius={[4, 4, 0, 0]} opacity={0.7} />
                            <Bar dataKey="failed" name="Başarısız" fill="#ff2d55" radius={[4, 4, 0, 0]} opacity={0.7} />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </ChartCard>
        </div>
    );
}

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
    Truck, RefreshCw, AlertTriangle, CheckCircle, Clock, Package, Zap, Send,
} from "lucide-react";
import {
    ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
    PieChart as RPieChart, Pie,
    AreaChart, Area,
    Legend,
} from "recharts";
import { ChartCard, CyberTooltip, NoData, CHART_COLORS, URGENCY_COLORS, axisTickStyle, gridProps } from "../charts";

/* ── types ── */
interface SupplyAlert {
    threadId: string;
    sku: string;
    productName: string;
    currentStock: number;
    reorderPoint: number;
    daysUntilStockout: number;
    urgencyLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    supplierName: string;
    status: string;
    createdAt: string;
}
interface UrgencyBreakdown { _id: string; count: number; }
interface StatusBreakdown  { _id: string; count: number; }
interface SupplySummary {
    criticalAlerts: number;
    awaitingApproval: number;
    urgencyBreakdown: UrgencyBreakdown[];
    statusBreakdown: StatusBreakdown[];
    topAlerts: SupplyAlert[];
}

const URGENCY_LABEL: Record<string, string> = {
    CRITICAL: "KRİTİK",
    HIGH:     "YÜKSEK",
    MEDIUM:   "ORTA",
    LOW:      "DÜŞÜK",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
    ALERT:             <Zap size={12} className="text-[#ff2d55]" />,
    AWAITING_APPROVAL: <Clock size={12} className="text-[#ffb000]" />,
    ORDER_SENT:        <Send size={12} className="text-[#00f0ff]" />,
    ACKNOWLEDGED:      <CheckCircle size={12} className="text-[#39ff14]" />,
    RESOLVED:          <CheckCircle size={12} className="text-white/40" />,
};

export const SupplyChainDashboard = () => {
    const [summary, setSummary] = useState<SupplySummary | null>(null);
    const [alerts, setAlerts] = useState<SupplyAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [summaryRes, alertsRes] = await Promise.all([
                fetch("/api/supply/summary"),
                fetch("/api/supply/alerts?limit=15"),
            ]);
            if (!summaryRes.ok || !alertsRes.ok) throw new Error("API hatası");
            const s = await summaryRes.json() as SupplySummary;
            const a = await alertsRes.json() as { alerts: SupplyAlert[] };
            setSummary(s);
            setAlerts(a.alerts ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Yüklenemedi");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* ── Chart data: supplier performance (horizontal bar) ── */
    const supplierData = (() => {
        const map = new Map<string, { name: string; critical: number; high: number; medium: number; low: number }>();
        for (const a of alerts) {
            const name = a.supplierName || "Bilinmiyor";
            if (!map.has(name)) map.set(name, { name, critical: 0, high: 0, medium: 0, low: 0 });
            const entry = map.get(name)!;
            const key = a.urgencyLevel.toLowerCase() as "critical" | "high" | "medium" | "low";
            entry[key]++;
        }
        return Array.from(map.values()).sort((a, b) => (b.critical + b.high) - (a.critical + a.high)).slice(0, 8);
    })();

    /* ── Chart data: stockout countdown (top 10 most critical) ── */
    const countdownData = alerts
        .filter(a => a.daysUntilStockout != null)
        .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout)
        .slice(0, 10)
        .map(a => ({
            name: a.productName || a.sku,
            days: a.daysUntilStockout,
            color: a.daysUntilStockout <= 3 ? "#ff2d55" : a.daysUntilStockout <= 7 ? "#ffb000" : "#39ff14",
        }));

    /* ── Chart data: urgency pie ── */
    const urgencyPieData = (summary?.urgencyBreakdown ?? []).map(u => ({
        name: URGENCY_LABEL[u._id] ?? u._id,
        value: u.count,
        color: URGENCY_COLORS[u._id] ?? "#ffffff",
    }));

    /* ── Chart data: weekly trend by urgency (stacked area) ── */
    const weeklyTrendData = (() => {
        const dayMap = new Map<string, Record<string, number>>();
        for (const a of alerts) {
            const day = new Date(a.createdAt).toLocaleDateString("tr-TR", { month: "short", day: "numeric" });
            if (!dayMap.has(day)) dayMap.set(day, { date: 0, CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 });
            const entry = dayMap.get(day)!;
            entry[a.urgencyLevel]++;
        }
        return Array.from(dayMap.entries()).map(([date, vals]) => ({ date, ...vals }));
    })();

    return (
        <div className="flex flex-col h-full overflow-y-auto" style={{ background: "#070c14" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg border border-[#ffb000]/30 bg-[#ffb000]/8 flex items-center justify-center">
                        <Truck size={16} className="text-[#ffb000]" />
                    </div>
                    <div>
                        <h1 className="text-[15px] font-bold text-white tracking-wide">Supply Chain</h1>
                        <p className="text-[11px] text-white/35 font-mono">Ajan 14 — Planlayıcı · Stok & Tedarik Yönetimi</p>
                    </div>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 transition-all text-xs"
                >
                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                    Aktualisieren
                </button>
            </div>

            {error && (
                <div className="mx-8 mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
            )}

            <div className="px-8 py-6 space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { label: "Kritik Uyarı", value: summary?.criticalAlerts ?? "—", icon: <AlertTriangle size={14} />, color: (summary?.criticalAlerts ?? 0) > 0 ? "#ff2d55" : "#39ff14", sub: "stok tükenmek üzere", pulse: (summary?.criticalAlerts ?? 0) > 0 },
                        { label: "Onay Bekleyen", value: summary?.awaitingApproval ?? "—", icon: <Clock size={14} />, color: "#ffb000", sub: "sipariş maili bekliyor", pulse: false },
                        { label: "Toplam Uyarı", value: alerts.length, icon: <Package size={14} />, color: "#00f0ff", sub: "aktif stok olayı", pulse: false },
                        { label: "Gönderilen Sipariş", value: summary?.statusBreakdown?.find(s => s._id === "ORDER_SENT")?.count ?? 0, icon: <Send size={14} />, color: "#39ff14", sub: "bu ay", pulse: false },
                    ].map((card) => (
                        <motion.div
                            key={card.label}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-white/6 bg-white/[0.02] p-4"
                            style={{ borderColor: card.pulse ? `${card.color}30` : undefined }}
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <span style={{ color: card.color }} className={card.pulse ? "animate-pulse" : ""}>{card.icon}</span>
                                <span className="text-[11px] text-white/40 font-mono uppercase tracking-wider">{card.label}</span>
                            </div>
                            <div className="text-[22px] font-bold font-mono" style={{ color: card.color }}>{loading ? "..." : card.value}</div>
                            <div className="text-[10px] text-white/30 mt-1 font-mono">{card.sub}</div>
                        </motion.div>
                    ))}
                </div>

                {/* Charts Row 1 — Supplier Performance + Stockout Countdown */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Horizontal Bar: Supplier Performance Score */}
                    <ChartCard
                        title="Tedarikçi Performans Skoru"
                        subtitle="Aciliyet ağırlıklı dağılım"
                        accent="#ffb000"
                        icon={<Truck size={12} />}
                        minHeight={240}
                    >
                        {supplierData.length === 0 ? (
                            <NoData accent="#ffb000" message="Tedarikçi verisi yok" />
                        ) : (
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={supplierData} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                                    <CartesianGrid {...gridProps} horizontal={false} />
                                    <XAxis type="number" tick={axisTickStyle} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="name" tick={axisTickStyle} axisLine={false} tickLine={false} width={80} />
                                    <Tooltip content={<CyberTooltip />} />
                                    <Bar dataKey="critical" name="Kritik" stackId="a" fill="#ff2d55" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="high" name="Yüksek" stackId="a" fill="#ff6b35" />
                                    <Bar dataKey="medium" name="Orta" stackId="a" fill="#ffb000" />
                                    <Bar dataKey="low" name="Düşük" stackId="a" fill="#39ff14" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>

                    {/* Bar Chart: Stockout Countdown — top 10 most critical products */}
                    <ChartCard
                        title="Stok Tükenme Takvimi"
                        subtitle="En kritik 10 ürün — kalan gün"
                        accent="#ff2d55"
                        icon={<AlertTriangle size={12} />}
                        minHeight={240}
                    >
                        {countdownData.length === 0 ? (
                            <NoData accent="#ff2d55" message="Kritik stok yok" />
                        ) : (
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={countdownData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                    <CartesianGrid {...gridProps} />
                                    <XAxis dataKey="name" tick={{ ...axisTickStyle, fontSize: 8 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={50} />
                                    <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} label={{ value: "Gün", style: { ...axisTickStyle, fill: "rgba(255,255,255,0.25)" }, position: "insideLeft", offset: 10 }} />
                                    <Tooltip content={<CyberTooltip formatter={(v) => `${v} gün`} />} />
                                    <Bar dataKey="days" name="Kalan Gün" radius={[4, 4, 0, 0]}>
                                        {countdownData.map((entry, idx) => (
                                            <Cell key={idx} fill={entry.color} opacity={0.8} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>
                </div>

                {/* Charts Row 2 — Urgency Pie + Weekly Stacked Area */}
                <div className="grid grid-cols-5 gap-4">
                    {/* Pie Chart: Urgency distribution */}
                    <ChartCard
                        title="Aciliyet Dağılımı"
                        accent="#ffb000"
                        icon={<Zap size={12} />}
                        className="col-span-2"
                        minHeight={220}
                    >
                        {urgencyPieData.length === 0 ? (
                            <NoData accent="#ffb000" message="Uyarı verisi yok" />
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <RPieChart>
                                    <Pie
                                        data={urgencyPieData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={75}
                                        paddingAngle={3}
                                        stroke="none"
                                    >
                                        {urgencyPieData.map((entry, idx) => (
                                            <Cell key={idx} fill={entry.color} opacity={0.8} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CyberTooltip />} />
                                    <Legend formatter={(value: string) => <span className="font-mono text-[9px] text-white/50">{value}</span>} />
                                </RPieChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>

                    {/* Stacked Area: Weekly alert trend by urgency level */}
                    <ChartCard
                        title="Haftalık Stok Uyarı Trendi"
                        subtitle="Aciliyet seviyesine göre"
                        accent="#ffb000"
                        icon={<Package size={12} />}
                        className="col-span-3"
                        minHeight={220}
                    >
                        {weeklyTrendData.length === 0 ? (
                            <NoData accent="#ffb000" message="Trend verisi yok" />
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={weeklyTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid {...gridProps} />
                                    <XAxis dataKey="date" tick={axisTickStyle} axisLine={false} tickLine={false} />
                                    <YAxis tick={axisTickStyle} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CyberTooltip />} />
                                    <Area type="monotone" dataKey="CRITICAL" name="Kritik" stackId="1" stroke="#ff2d55" fill="#ff2d55" fillOpacity={0.3} />
                                    <Area type="monotone" dataKey="HIGH" name="Yüksek" stackId="1" stroke="#ff6b35" fill="#ff6b35" fillOpacity={0.25} />
                                    <Area type="monotone" dataKey="MEDIUM" name="Orta" stackId="1" stroke="#ffb000" fill="#ffb000" fillOpacity={0.2} />
                                    <Area type="monotone" dataKey="LOW" name="Düşük" stackId="1" stroke="#39ff14" fill="#39ff14" fillOpacity={0.15} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>
                </div>

                {/* Stok Uyarıları Tablosu */}
                <div className="rounded-xl border border-white/6 bg-white/[0.02] overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                        <span className="text-[12px] font-mono text-white/50 uppercase tracking-wider">Stok Uyarıları</span>
                        <span className="text-[10px] text-white/25 font-mono">{alerts.length} uyarı</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px]">
                            <thead>
                                <tr className="border-b border-white/5">
                                    {["SKU / Ürün", "Mevcut Stok", "Eşik", "Tahmini Bitiş", "Aciliyet", "Tedarikçi", "Durum"].map(h => (
                                        <th key={h} className="px-4 py-3 text-left font-mono text-[10px] text-white/30 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} className="px-4 py-8 text-center text-white/20">Yükleniyor...</td></tr>
                                ) : alerts.length === 0 ? (
                                    <tr><td colSpan={7} className="px-4 py-8 text-center text-white/20">Stok uyarısı yok</td></tr>
                                ) : alerts.map(a => (
                                    <tr key={a.threadId} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="text-white/80 font-mono font-semibold">{a.sku}</div>
                                            {a.productName && <div className="text-white/35 text-[10px] font-mono">{a.productName}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-white font-mono font-bold">{a.currentStock}</td>
                                        <td className="px-4 py-3 text-white/40 font-mono">{a.reorderPoint}</td>
                                        <td className="px-4 py-3">
                                            <span className="font-mono font-bold" style={{ color: a.daysUntilStockout <= 3 ? "#ff2d55" : a.daysUntilStockout <= 7 ? "#ffb000" : "#39ff14" }}>
                                                {a.daysUntilStockout} gün
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border"
                                                style={{ color: URGENCY_COLORS[a.urgencyLevel], borderColor: `${URGENCY_COLORS[a.urgencyLevel]}40`, background: `${URGENCY_COLORS[a.urgencyLevel]}10` }}
                                            >
                                                {a.urgencyLevel}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-white/50 font-mono">{a.supplierName || "—"}</td>
                                        <td className="px-4 py-3">
                                            <span className="flex items-center gap-1.5">
                                                {STATUS_ICON[a.status] ?? <Package size={10} />}
                                                <span className="text-white/50 font-mono text-[10px]">{a.status}</span>
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

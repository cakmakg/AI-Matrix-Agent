"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Truck, RefreshCw, AlertTriangle, CheckCircle, Clock, Package, Zap, Send } from "lucide-react";

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

const URGENCY_COLOR: Record<string, string> = {
    CRITICAL: "#ff2d55",
    HIGH:     "#ff6b35",
    MEDIUM:   "#ffb000",
    LOW:      "#39ff14",
};

const URGENCY_LABEL: Record<string, string> = {
    CRITICAL: "🔴 KRİTİK",
    HIGH:     "🟠 YÜKSEK",
    MEDIUM:   "🟡 ORTA",
    LOW:      "🟢 DÜŞÜK",
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
                <div className="mx-8 mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            <div className="px-8 py-6 space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-4 gap-4">
                    {[
                        {
                            label: "Kritik Uyarı",
                            value: summary?.criticalAlerts ?? "—",
                            icon: <AlertTriangle size={14} />,
                            color: (summary?.criticalAlerts ?? 0) > 0 ? "#ff2d55" : "#39ff14",
                            sub: "stok tükenmek üzere",
                            pulse: (summary?.criticalAlerts ?? 0) > 0,
                        },
                        {
                            label: "Onay Bekleyen",
                            value: summary?.awaitingApproval ?? "—",
                            icon: <Clock size={14} />,
                            color: "#ffb000",
                            sub: "sipariş maili bekliyor",
                            pulse: false,
                        },
                        {
                            label: "Toplam Uyarı",
                            value: alerts.length,
                            icon: <Package size={14} />,
                            color: "#00f0ff",
                            sub: "aktif stok olayı",
                            pulse: false,
                        },
                        {
                            label: "Gönderilen Sipariş",
                            value: summary?.statusBreakdown?.find(s => s._id === "ORDER_SENT")?.count ?? 0,
                            icon: <Send size={14} />,
                            color: "#39ff14",
                            sub: "bu ay",
                            pulse: false,
                        },
                    ].map((card) => (
                        <motion.div
                            key={card.label}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-white/6 bg-white/2 p-4"
                            style={{ borderColor: card.pulse ? `${card.color}30` : undefined }}
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <span style={{ color: card.color }} className={card.pulse ? "animate-pulse" : ""}>{card.icon}</span>
                                <span className="text-[11px] text-white/40 font-mono uppercase tracking-wider">{card.label}</span>
                            </div>
                            <div className="text-[22px] font-bold font-mono" style={{ color: card.color }}>
                                {loading ? "..." : card.value}
                            </div>
                            <div className="text-[10px] text-white/30 mt-1 font-mono">{card.sub}</div>
                        </motion.div>
                    ))}
                </div>

                {/* Aciliyet Dağılımı + Durum + Top Kritik */}
                <div className="grid grid-cols-3 gap-4">
                    {/* Aciliyet seviyeleri */}
                    <div className="rounded-xl border border-white/6 bg-white/2 p-5">
                        <div className="text-[11px] font-mono text-white/40 uppercase tracking-wider mb-4">Aciliyet Seviyeleri</div>
                        {loading ? (
                            <div className="text-white/20 text-sm">Yükleniyor...</div>
                        ) : (
                            <div className="space-y-3">
                                {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map(level => {
                                    const item = summary?.urgencyBreakdown?.find(u => u._id === level);
                                    return (
                                        <div key={level} className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full" style={{ background: URGENCY_COLOR[level] }} />
                                            <span className="text-[11px] text-white/60 flex-1 font-mono">{URGENCY_LABEL[level]}</span>
                                            <span className="text-[13px] font-bold" style={{ color: URGENCY_COLOR[level] }}>
                                                {item?.count ?? 0}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Durum dağılımı */}
                    <div className="rounded-xl border border-white/6 bg-white/2 p-5">
                        <div className="text-[11px] font-mono text-white/40 uppercase tracking-wider mb-4">Durum Dağılımı</div>
                        {loading ? (
                            <div className="text-white/20 text-sm">Yükleniyor...</div>
                        ) : (
                            <div className="space-y-3">
                                {(summary?.statusBreakdown ?? []).map(s => (
                                    <div key={s._id} className="flex items-center gap-3">
                                        {STATUS_ICON[s._id] ?? <Package size={12} className="text-white/30" />}
                                        <span className="text-[11px] text-white/60 flex-1 font-mono">{s._id}</span>
                                        <span className="text-[13px] font-bold text-white">{s.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* En kritik ürün */}
                    <div className="rounded-xl border border-[#ff2d55]/20 bg-[#ff2d55]/3 p-5">
                        <div className="text-[11px] font-mono text-[#ff2d55]/60 uppercase tracking-wider mb-3">En Kritik Ürün</div>
                        {loading ? (
                            <div className="text-white/20 text-sm">Yükleniyor...</div>
                        ) : (summary?.topAlerts?.[0] ? (
                            <>
                                <div className="text-[13px] font-bold text-white truncate">{summary.topAlerts[0].productName || summary.topAlerts[0].sku}</div>
                                <div className="text-[11px] text-white/40 font-mono mt-1">SKU: {summary.topAlerts[0].sku}</div>
                                <div className="text-[28px] font-bold text-[#ff2d55] font-mono mt-2">
                                    {summary.topAlerts[0].daysUntilStockout}
                                    <span className="text-[14px] text-[#ff2d55]/60 ml-1">gün</span>
                                </div>
                                <div className="text-[10px] text-[#ff2d55]/50 font-mono">tahmini stok bitişi</div>
                                <div className="mt-2 text-[10px] font-mono text-white/30">
                                    Stok: {summary.topAlerts[0].currentStock} / Eşik: {summary.topAlerts[0].reorderPoint}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-2 text-[#39ff14] text-sm mt-2">
                                <CheckCircle size={14} /> Kritik stok yok
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stok Uyarıları Tablosu */}
                <div className="rounded-xl border border-white/6 bg-white/2 overflow-hidden">
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
                                    <tr key={a.threadId} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="text-white/80 font-mono font-semibold">{a.sku}</div>
                                            {a.productName && <div className="text-white/35 text-[10px] font-mono">{a.productName}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-white font-mono font-bold">{a.currentStock}</td>
                                        <td className="px-4 py-3 text-white/40 font-mono">{a.reorderPoint}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className="font-mono font-bold"
                                                style={{ color: a.daysUntilStockout <= 3 ? "#ff2d55" : a.daysUntilStockout <= 7 ? "#ffb000" : "#39ff14" }}
                                            >
                                                {a.daysUntilStockout} gün
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border"
                                                style={{
                                                    color: URGENCY_COLOR[a.urgencyLevel],
                                                    borderColor: `${URGENCY_COLOR[a.urgencyLevel]}40`,
                                                    background: `${URGENCY_COLOR[a.urgencyLevel]}10`,
                                                }}
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

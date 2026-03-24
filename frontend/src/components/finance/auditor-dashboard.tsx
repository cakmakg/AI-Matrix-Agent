"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { FileSearch, RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp, ShieldAlert } from "lucide-react";

interface AnomalyBreakdown { _id: string; count: number; }
interface StatusBreakdown  { _id: string; count: number; }
interface AuditFinding {
    threadId: string;
    vendorName: string;
    invoiceAmount: number;
    agreedAmount: number;
    anomalyDetected: boolean;
    anomalyType: string;
    status: string;
    confidenceScore: number;
    createdAt: string;
}

interface AuditSummary {
    period: string;
    invoiceCount: number;
    totalInvoiced: number;
    totalAgreed: number;
    variance: number;
    anomalyCount: number;
    awaitingApproval: number;
    statusBreakdown: StatusBreakdown[];
    anomalyBreakdown: AnomalyBreakdown[];
}

const ANOMALY_COLORS: Record<string, string> = {
    PRICE_MISMATCH:        "#ff2d55",
    DUPLICATE_INVOICE:     "#ffb000",
    SUSPICIOUS_VENDOR:     "#ff6b35",
    AMOUNT_EXCEEDS_LIMIT:  "#ff2d55",
    NONE:                  "#39ff14",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
    AWAITING_APPROVAL: <Clock size={12} className="text-[#ffb000]" />,
    APPROVED:          <CheckCircle size={12} className="text-[#39ff14]" />,
    REJECTED:          <XCircle size={12} className="text-[#ff2d55]" />,
    ESCALATED:         <AlertTriangle size={12} className="text-[#ff6b35]" />,
    POSTED:            <CheckCircle size={12} className="text-[#00f0ff]" />,
};

const formatCurrency = (v: number, currency = "TRY") =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);

export const AuditorDashboard = () => {
    const [summary, setSummary] = useState<AuditSummary | null>(null);
    const [findings, setFindings] = useState<AuditFinding[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [summaryRes, findingsRes] = await Promise.all([
                fetch("/api/auditor/summary"),
                fetch("/api/auditor/findings?limit=15"),
            ]);
            if (!summaryRes.ok || !findingsRes.ok) throw new Error("API hatası");
            const s = await summaryRes.json() as AuditSummary;
            const f = await findingsRes.json() as { findings: AuditFinding[] };
            setSummary(s);
            setFindings(f.findings ?? []);
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
                    <div className="w-8 h-8 rounded-lg border border-[#00f0ff]/30 bg-[#00f0ff]/8 flex items-center justify-center">
                        <FileSearch size={16} className="text-[#00f0ff]" />
                    </div>
                    <div>
                        <h1 className="text-[15px] font-bold text-white tracking-wide">Rechnungsprüfung</h1>
                        <p className="text-[11px] text-white/35 font-mono">Ajan 13 — Denetçi · Fatura Anomali Tespiti</p>
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
                            label: "Fatura Sayısı",
                            value: summary?.invoiceCount ?? "—",
                            icon: <FileSearch size={14} />,
                            color: "#00f0ff",
                            sub: summary ? `${summary.period}` : "",
                        },
                        {
                            label: "Toplam Faturalanan",
                            value: summary ? formatCurrency(summary.totalInvoiced) : "—",
                            icon: <TrendingUp size={14} />,
                            color: "#39ff14",
                            sub: summary ? `Anlaşılan: ${formatCurrency(summary.totalAgreed)}` : "",
                        },
                        {
                            label: "Fark (Sapma)",
                            value: summary ? formatCurrency(Math.abs(summary.variance)) : "—",
                            icon: <AlertTriangle size={14} />,
                            color: summary && summary.variance > 0 ? "#ff2d55" : "#39ff14",
                            sub: summary && summary.variance > 0 ? "Fazla ödenecek" : "Normal",
                        },
                        {
                            label: "Anomali Tespiti",
                            value: summary?.anomalyCount ?? "—",
                            icon: <ShieldAlert size={14} />,
                            color: (summary?.anomalyCount ?? 0) > 0 ? "#ff2d55" : "#39ff14",
                            sub: `${summary?.awaitingApproval ?? 0} onay bekliyor`,
                        },
                    ].map((card) => (
                        <motion.div
                            key={card.label}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-white/6 bg-white/2 p-4"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <span style={{ color: card.color }}>{card.icon}</span>
                                <span className="text-[11px] text-white/40 font-mono uppercase tracking-wider">{card.label}</span>
                            </div>
                            <div className="text-[22px] font-bold text-white font-mono">{loading ? "..." : card.value}</div>
                            <div className="text-[10px] text-white/30 mt-1 font-mono">{card.sub}</div>
                        </motion.div>
                    ))}
                </div>

                {/* Anomali Dağılımı + Son Faturalar */}
                <div className="grid grid-cols-3 gap-4">
                    {/* Anomali Tipi */}
                    <div className="rounded-xl border border-white/6 bg-white/2 p-5">
                        <div className="text-[11px] font-mono text-white/40 uppercase tracking-wider mb-4">Anomali Tipleri</div>
                        {loading ? (
                            <div className="text-white/20 text-sm">Yükleniyor...</div>
                        ) : (summary?.anomalyBreakdown?.length ?? 0) === 0 ? (
                            <div className="flex items-center gap-2 text-[#39ff14] text-sm">
                                <CheckCircle size={14} /> Anomali yok
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {summary!.anomalyBreakdown.map(a => (
                                    <div key={a._id} className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full" style={{ background: ANOMALY_COLORS[a._id] ?? "#fff" }} />
                                        <span className="text-[11px] text-white/60 flex-1 font-mono">{a._id.replace(/_/g, " ")}</span>
                                        <span className="text-[13px] font-bold" style={{ color: ANOMALY_COLORS[a._id] ?? "#fff" }}>{a.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Durum Dağılımı */}
                    <div className="rounded-xl border border-white/6 bg-white/2 p-5">
                        <div className="text-[11px] font-mono text-white/40 uppercase tracking-wider mb-4">Durum Dağılımı</div>
                        {loading ? (
                            <div className="text-white/20 text-sm">Yükleniyor...</div>
                        ) : (
                            <div className="space-y-3">
                                {(summary?.statusBreakdown ?? []).map(s => (
                                    <div key={s._id} className="flex items-center gap-3">
                                        {STATUS_ICON[s._id] ?? <Clock size={12} className="text-white/30" />}
                                        <span className="text-[11px] text-white/60 flex-1 font-mono">{s._id}</span>
                                        <span className="text-[13px] font-bold text-white">{s.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Hızlı İstatistik */}
                    <div className="rounded-xl border border-[#ffb000]/20 bg-[#ffb000]/3 p-5">
                        <div className="text-[11px] font-mono text-[#ffb000]/60 uppercase tracking-wider mb-4">Onay Bekleyenler</div>
                        <div className="text-[40px] font-bold text-[#ffb000] font-mono">
                            {loading ? "..." : summary?.awaitingApproval ?? 0}
                        </div>
                        <div className="text-[11px] text-[#ffb000]/50 mt-1 font-mono">fatura inceleme bekliyor</div>
                        {(summary?.awaitingApproval ?? 0) > 0 && (
                            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[#ffb000]/70 animate-pulse">
                                <Clock size={10} /> HITL onayı gerekiyor
                            </div>
                        )}
                    </div>
                </div>

                {/* Son Faturalar Tablosu */}
                <div className="rounded-xl border border-white/6 bg-white/2 overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                        <span className="text-[12px] font-mono text-white/50 uppercase tracking-wider">Son Fatura Kayıtları</span>
                        <span className="text-[10px] text-white/25 font-mono">{findings.length} kayıt</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px]">
                            <thead>
                                <tr className="border-b border-white/5">
                                    {["Tedarikçi", "Fatura Tutarı", "Anlaşılan", "Anomali", "Durum", "Güven", "Tarih"].map(h => (
                                        <th key={h} className="px-4 py-3 text-left font-mono text-[10px] text-white/30 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} className="px-4 py-8 text-center text-white/20">Yükleniyor...</td></tr>
                                ) : findings.length === 0 ? (
                                    <tr><td colSpan={7} className="px-4 py-8 text-center text-white/20">Kayıt bulunamadı</td></tr>
                                ) : findings.map(f => (
                                    <tr key={f.threadId} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                                        <td className="px-4 py-3 text-white/70 font-mono">{f.vendorName || "—"}</td>
                                        <td className="px-4 py-3 text-white font-mono font-semibold">{formatCurrency(f.invoiceAmount)}</td>
                                        <td className="px-4 py-3 text-white/50 font-mono">{f.agreedAmount ? formatCurrency(f.agreedAmount) : "—"}</td>
                                        <td className="px-4 py-3">
                                            {f.anomalyDetected ? (
                                                <span className="flex items-center gap-1 text-[#ff2d55]">
                                                    <AlertTriangle size={10} /> {f.anomalyType.replace(/_/g, " ")}
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-[#39ff14]">
                                                    <CheckCircle size={10} /> Temiz
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="flex items-center gap-1.5">
                                                {STATUS_ICON[f.status] ?? <Clock size={10} />}
                                                <span className="text-white/50 font-mono text-[10px]">{f.status}</span>
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1 rounded-full bg-white/10 w-16">
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{
                                                            width: `${f.confidenceScore}%`,
                                                            background: f.confidenceScore >= 80 ? "#39ff14" : f.confidenceScore >= 50 ? "#ffb000" : "#ff2d55",
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-white/40 font-mono text-[10px]">{f.confidenceScore}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-white/30 font-mono text-[10px]">
                                            {new Date(f.createdAt).toLocaleDateString("tr-TR")}
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

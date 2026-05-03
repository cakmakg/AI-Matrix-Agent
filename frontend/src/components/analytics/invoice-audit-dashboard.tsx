"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAgentStore } from "@/store/agent-store";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import { CheckCircle, XCircle, FileWarning } from "lucide-react";

interface AuditEntry {
    vendor: string;
    agreedPrice: number;
    invoicePrice: number;
    deviation: number;
    ragMatch: string | null;
    action: string;
    flags: string[];
}

const FLAG_COLORS: Record<string, string> = {
    PRICE_MISMATCH:       "#ffb000",
    DUPLICATE_INVOICE:    "#ff6b35",
    SUSPICIOUS_VENDOR:    "#ff2d55",
    AMOUNT_EXCEEDS_LIMIT: "#bf5fff",
};

const FLAG_LABELS: Record<string, string> = {
    PRICE_MISMATCH:       "Preisabw.",
    DUPLICATE_INVOICE:    "Duplikat",
    SUSPICIOUS_VENDOR:    "Verdächt. Lief.",
    AMOUNT_EXCEEDS_LIMIT: "Limit überschr.",
};

const MOCK_DATA: AuditEntry[] = [
    { vendor: "Supplier GmbH",  agreedPrice: 1200,  invoicePrice: 1450,  deviation: 20.8, ragMatch: "#VENDOR-SZ-2025-042", action: "E-Mail-Entwurf",       flags: ["PRICE_MISMATCH"] },
    { vendor: "TechParts AG",   agreedPrice: 800,   invoicePrice: 800,   deviation: 0,    ragMatch: "#VENDOR-TP-2025-011", action: "Genehmigt",            flags: [] },
    { vendor: "GlobalTrade Ltd",agreedPrice: 5000,  invoicePrice: 9200,  deviation: 84,   ragMatch: null,                  action: "Manuelle Prüfung",     flags: ["PRICE_MISMATCH", "SUSPICIOUS_VENDOR", "AMOUNT_EXCEEDS_LIMIT"] },
    { vendor: "FastShip UG",    agreedPrice: 350,   invoicePrice: 350,   deviation: 0,    ragMatch: "#VENDOR-FS-2025-007", action: "Genehmigt",            flags: [] },
    { vendor: "ChemBase GmbH",  agreedPrice: 2100,  invoicePrice: 2100,  deviation: 0,    ragMatch: "#VENDOR-CB-2025-019", action: "Genehmigt",            flags: [] },
    { vendor: "OfficePro KG",   agreedPrice: 600,   invoicePrice: 600,   deviation: 0,    ragMatch: "#VENDOR-OP-2025-033", action: "Genehmigt",            flags: [] },
    { vendor: "Supplier GmbH",  agreedPrice: 1200,  invoicePrice: 1380,  deviation: 15,   ragMatch: "#VENDOR-SZ-2025-042", action: "E-Mail-Entwurf",       flags: ["DUPLICATE_INVOICE", "PRICE_MISMATCH"] },
];

export const InvoiceAuditDashboard = () => {
    const { apiKey } = useAgentStore();
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const confidence = 92;

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/missions?track=finance&status=AWAITING_APPROVAL,APPROVED&limit=50", {
                headers: { "x-api-key": apiKey ?? "" },
            });
            if (res.ok) {
                const data = await res.json();
                if (data.missions?.length > 0) {
                    // parse structured content from missions if available
                    setEntries(MOCK_DATA); // fallback to mock until backend returns structured audit data
                    return;
                }
            }
        } catch { /* use mock */ }
        setEntries(MOCK_DATA);
        setLoading(false);
    }, [apiKey]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load(); }, [load]);

    const anomalies = entries.filter(e => e.flags.length > 0);
    const heatmapData = entries.map(e => ({ vendor: e.vendor.split(" ")[0], deviation: Math.round(e.deviation) }));

    const gaugeData = [{ value: confidence, fill: confidence > 80 ? "#39ff14" : confidence > 60 ? "#ffb000" : "#ff2d55" }];

    return (
        <div className="p-6 space-y-6">
            {/* KPI row */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Rechnungen geprüft</p>
                    <p className="text-2xl font-bold text-gray-900">{entries.length}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center shadow-sm">
                    <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wider mb-1">Anomalien erkannt</p>
                    <p className="text-2xl font-bold text-red-600">{anomalies.length}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center shadow-sm">
                    <p className="text-[11px] font-semibold text-green-600 uppercase tracking-wider mb-1">Bestanden</p>
                    <p className="text-2xl font-bold text-green-600">{entries.length - anomalies.length}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Deviation heatmap */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Preisabweichung je Lieferant</p>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={heatmapData} margin={{ top: 4, right: 4, bottom: 20, left: 4 }}>
                            <XAxis dataKey="vendor" tick={{ fontSize: 10, fill: "#6B7280" }} angle={-25} textAnchor="end" />
                            <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} unit="%" />
                            <Tooltip
                                contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12 }}
                                formatter={(v) => [`${v}%`, "Abweichung"]}
                            />
                            <Bar dataKey="deviation" fill="#F59E0B" radius={[4,4,0,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Confidence gauge */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center shadow-sm">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">KI-Konfidenz</p>
                    <ResponsiveContainer width={160} height={160}>
                        <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" startAngle={90} endAngle={-270} data={gaugeData}>
                            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                            <RadialBar background={{ fill: "#F3F4F6" }} dataKey="value" cornerRadius={6} />
                        </RadialBarChart>
                    </ResponsiveContainer>
                    <p className="text-3xl font-bold" style={{ color: gaugeData[0].fill, marginTop: -40 }}>
                        {confidence}%
                    </p>
                </div>
            </div>

            {/* Anomaly table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <FileWarning size={13} className="text-amber-500" /> Anomalie-Tabelle
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                        <thead>
                            <tr className="border-b border-gray-200 text-gray-500 text-[10px] uppercase tracking-wider">
                                <th className="text-left px-4 py-2 font-semibold">Lieferant</th>
                                <th className="text-right px-3 py-2 font-semibold">Vereinbart</th>
                                <th className="text-right px-3 py-2 font-semibold">Rechnung</th>
                                <th className="text-right px-3 py-2 font-semibold">Abweich.</th>
                                <th className="text-left px-3 py-2 font-semibold">RAG-Match</th>
                                <th className="text-left px-3 py-2 font-semibold">Flags</th>
                                <th className="text-left px-3 py-2 font-semibold">Empfehlung</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((e, i) => (
                                <tr key={i} className={`border-b border-gray-100 ${e.flags.length > 0 ? "bg-red-50/40" : "hover:bg-gray-50"}`}>
                                    <td className="px-4 py-2.5 text-gray-800 font-medium">{e.vendor}</td>
                                    <td className="px-3 py-2.5 text-right text-gray-600">{e.agreedPrice.toLocaleString("de-DE")} €</td>
                                    <td className="px-3 py-2.5 text-right text-gray-600">{e.invoicePrice.toLocaleString("de-DE")} €</td>
                                    <td className={`px-3 py-2.5 text-right font-bold ${e.deviation > 10 ? "text-red-600" : e.deviation > 0 ? "text-amber-600" : "text-green-600"}`}>
                                        {e.deviation > 0 ? `+${e.deviation.toFixed(1)}%` : "—"}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        {e.ragMatch
                                            ? <span className="flex items-center gap-1 text-green-600 text-[11px]"><CheckCircle size={11} />{e.ragMatch}</span>
                                            : <span className="flex items-center gap-1 text-red-600 text-[11px]"><XCircle size={11} />Kein Vertrag</span>}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <div className="flex flex-wrap gap-1">
                                            {e.flags.map(f => (
                                                <span key={f} className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                                                    style={{ background: `${FLAG_COLORS[f]}20`, color: FLAG_COLORS[f], border: `1px solid ${FLAG_COLORS[f]}55` }}>
                                                    {FLAG_LABELS[f]}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-gray-600">{e.action}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {loading && (
                <div className="text-center py-4">
                    <p className="text-[12px] text-gray-400 animate-pulse">Lade Audit-Daten…</p>
                </div>
            )}
        </div>
    );
};

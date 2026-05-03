"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAgentStore } from "@/store/agent-store";
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
    FunnelChart, Funnel, LabelList, Cell,
} from "recharts";
import { AlertTriangle, Clock } from "lucide-react";

interface StockItem {
    product: string;
    currentStock: number;
    dailySales: number;
    daysUntilStockout: number;
    reorderQty: number;
    urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

const URGENCY_COLOR: Record<string, string> = {
    CRITICAL: "#ff2d55",
    HIGH:     "#ff6b35",
    MEDIUM:   "#ffb000",
    LOW:      "#39ff14",
};

const URGENCY_LABEL: Record<string, string> = {
    CRITICAL: "Kritisch",
    HIGH:     "Hoch",
    MEDIUM:   "Mittel",
    LOW:      "Niedrig",
};

const MOCK_STOCK: StockItem[] = [
    { product: "Laptop Pro 15",    currentStock: 12,  dailySales: 4,   daysUntilStockout: 3,  reorderQty: 50,  urgency: "CRITICAL" },
    { product: "USB-C Hub 7-Port", currentStock: 45,  dailySales: 8,   daysUntilStockout: 6,  reorderQty: 200, urgency: "HIGH" },
    { product: "Wireless Mouse",   currentStock: 120, dailySales: 10,  daysUntilStockout: 12, reorderQty: 300, urgency: "MEDIUM" },
    { product: "Mechanical Kbd",   currentStock: 85,  dailySales: 5,   daysUntilStockout: 17, reorderQty: 150, urgency: "MEDIUM" },
    { product: "27\" Monitor",     currentStock: 200, dailySales: 6,   daysUntilStockout: 33, reorderQty: 100, urgency: "LOW" },
    { product: "Laptop Stand",     currentStock: 310, dailySales: 7,   daysUntilStockout: 44, reorderQty: 200, urgency: "LOW" },
];

function buildForecast(item: StockItem, days = 14) {
    return Array.from({ length: days + 1 }, (_, i) => ({
        day: i,
        stock: Math.max(0, item.currentStock - item.dailySales * i),
        reorderLine: item.reorderQty * 0.2,
    }));
}

export const StockUrgencyDashboard = () => {
    const { apiKey } = useAgentStore();
    const [items, setItems] = useState<StockItem[]>([]);
    const [selected, setSelected] = useState<StockItem | null>(null);
    const [, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/missions?track=supply&limit=50", {
                headers: { "x-api-key": apiKey ?? "" },
            });
            if (res.ok) {
                const data = await res.json();
                if (data.missions?.length > 0) {
                    setItems(MOCK_STOCK);
                    setSelected(MOCK_STOCK[0]);
                    return;
                }
            }
        } catch { /* fallback */ }
        setItems(MOCK_STOCK);
        setSelected(MOCK_STOCK[0]);
        setLoading(false);
    }, [apiKey]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load(); }, [load]);

    const funnelData = (["CRITICAL","HIGH","MEDIUM","LOW"] as const).map(u => ({
        name: URGENCY_LABEL[u],
        value: items.filter(i => i.urgency === u).length,
        fill: URGENCY_COLOR[u],
    }));

    const criticalItems = items.filter(i => i.urgency === "CRITICAL");
    const forecast = selected ? buildForecast(selected) : [];

    return (
        <div className="p-6 space-y-6">
            {/* Critical alert banner */}
            {criticalItems.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertTriangle size={16} className="text-red-500 shrink-0" />
                    <span className="text-[12px] text-red-700 font-semibold">
                        {criticalItems.length} Produkt{criticalItems.length > 1 ? "e" : ""} erreichen in &lt;7 Tagen den Nullbestand:&nbsp;
                        {criticalItems.map(i => i.product).join(", ")}
                    </span>
                </div>
            )}

            <div className="grid grid-cols-2 gap-6">
                {/* Urgency funnel */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Dringlichkeits-Pyramide</p>
                    <ResponsiveContainer width="100%" height={220}>
                        <FunnelChart>
                            <Tooltip
                                contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12, color: "#111827" }}
                            />
                            <Funnel dataKey="value" data={funnelData} isAnimationActive>
                                {funnelData.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} fillOpacity={0.9} />
                                ))}
                                <LabelList position="right" fill="#374151" fontSize={11} />
                            </Funnel>
                        </FunnelChart>
                    </ResponsiveContainer>
                </div>

                {/* Countdown cards */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Tage bis Nullbestand</p>
                    <div className="space-y-2 max-h-55 overflow-y-auto scrollbar-styled">
                        {items.map((item, i) => (
                            <button
                                key={i}
                                onClick={() => setSelected(item)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${selected?.product === item.product ? "bg-indigo-50 border border-indigo-200" : "hover:bg-gray-50 border border-transparent"}`}
                            >
                                <span className="text-[12px] font-medium text-gray-700 truncate">{item.product}</span>
                                <span className="flex items-center gap-1.5 shrink-0">
                                    <Clock size={11} style={{ color: URGENCY_COLOR[item.urgency] }} />
                                    <span className="text-[13px] font-bold" style={{ color: URGENCY_COLOR[item.urgency] }}>
                                        {item.daysUntilStockout}d
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Forecast chart */}
            {selected && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Bestandsprognose — {selected.product}
                    </p>
                    <p className="text-[11px] text-gray-400 mb-4">
                        Aktuell: {selected.currentStock} Stk. · Tagesverkauf: {selected.dailySales} Stk. · Nachbestellung: {selected.reorderQty} Stk.
                    </p>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={forecast}>
                            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#6B7280" }} label={{ value: "Tage", position: "insideBottom", offset: -2, fill: "#9CA3AF", fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} />
                            <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12 }} />
                            <ReferenceLine y={selected.reorderQty * 0.2} stroke="#ff6b35" strokeDasharray="4 2" label={{ value: "Nachbestellpunkt", fill: "#ff6b35", fontSize: 10 }} />
                            <Line type="monotone" dataKey="stock" stroke={URGENCY_COLOR[selected.urgency]} strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Alert table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Bestandsübersicht</p>
                </div>
                <table className="w-full text-[12px]">
                    <thead>
                        <tr className="border-b border-gray-200 text-gray-500 text-[10px] uppercase tracking-wider">
                            <th className="text-left px-4 py-2 font-semibold">Produkt</th>
                            <th className="text-right px-3 py-2 font-semibold">Bestand</th>
                            <th className="text-right px-3 py-2 font-semibold">Tägl. Verk.</th>
                            <th className="text-right px-3 py-2 font-semibold">Tage bis 0</th>
                            <th className="text-right px-3 py-2 font-semibold">Nachbestellung</th>
                            <th className="text-center px-3 py-2 font-semibold">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, i) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-2.5 text-gray-800 font-medium">{item.product}</td>
                                <td className="px-3 py-2.5 text-right text-gray-600">{item.currentStock}</td>
                                <td className="px-3 py-2.5 text-right text-gray-600">{item.dailySales}</td>
                                <td className="px-3 py-2.5 text-right font-bold" style={{ color: URGENCY_COLOR[item.urgency] }}>
                                    {item.daysUntilStockout}
                                </td>
                                <td className="px-3 py-2.5 text-right text-gray-600">{item.reorderQty} Stk.</td>
                                <td className="px-3 py-2.5 text-center">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                        style={{ background: `${URGENCY_COLOR[item.urgency]}20`, color: URGENCY_COLOR[item.urgency], border: `1px solid ${URGENCY_COLOR[item.urgency]}55` }}>
                                        {URGENCY_LABEL[item.urgency]}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

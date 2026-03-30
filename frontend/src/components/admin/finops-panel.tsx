"use client";

import React, { useState } from "react";
import { useAgentStore } from "@/store/agent-store";
import { BurnRateChart } from "./burn-rate-chart";

const ALERT_COLORS: Record<string, string> = {
    healthy: "#39ff14", warning: "#ffb000", danger: "#ff6b35", critical: "#ff2d55", loss: "#ff0040",
};

export const FinopsPanel = () => {
    const globalFinance = useAgentStore((s) => s.globalFinance);
    const tenantPnL = useAgentStore((s) => s.tenantPnL);
    const financeAlerts = useAgentStore((s) => s.financeAlerts);
    const throttleTenant = useAgentStore((s) => s.throttleTenant);
    const [throttling, setThrottling] = useState<string | null>(null);

    const handleThrottle = async (slug: string, throttle: boolean) => {
        setThrottling(slug);
        await throttleTenant(slug, throttle);
        setThrottling(null);
    };

    return (
        <div className="p-3 h-full flex flex-col gap-2">
            {/* Ticker Bar */}
            <div className="flex items-center gap-4 px-3 py-2 rounded-lg bg-white/2 border border-white/5 overflow-hidden shrink-0">
                <TickerItem label="PROJECTED" value={`$${globalFinance?.projectedRevenue?.toLocaleString() || "0"}`} color="#39ff14" />
                <TickerItem label="LLM COST" value={`$${globalFinance?.totalExpense?.toFixed(2) || "0"}`} color="#ff6b35" />
                <TickerItem label="NET P&L" value={`$${globalFinance?.netPnl?.toFixed(2) || "0"}`}
                    color={(globalFinance?.netPnl || 0) >= 0 ? "#39ff14" : "#ff2d55"} />
                <TickerItem label="LLM CALLS" value={String(globalFinance?.totalLLMCalls || 0)} color="#00f0ff" />
                <TickerItem label="STRIPE" value={String(globalFinance?.stripePayments || 0)} color="#bf5fff" />

                {financeAlerts.length > 0 && (
                    <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 border border-red-500/20">
                        <span className="text-[10px] font-bold text-red-400 font-mono animate-pulse">
                            {financeAlerts.length} ALARM{financeAlerts.length > 1 ? "E" : ""}
                        </span>
                    </div>
                )}
            </div>

            {/* Burn Rate Chart + P&L Table side by side */}
            <div className="flex-1 min-h-0 flex gap-2">
                {/* Left: Burn Rate Chart */}
                <div className="w-[310px] shrink-0 flex flex-col justify-start">
                    <BurnRateChart />
                </div>

                {/* Right: P&L Table */}
                <div className="flex-1 min-w-0 overflow-y-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-[9px] font-mono text-white/25 uppercase">
                                <th className="text-left px-2 py-1">Tenant</th>
                                <th className="text-left px-2 py-1">Plan</th>
                                <th className="text-right px-2 py-1">Einnahmen</th>
                                <th className="text-right px-2 py-1">Ausgaben</th>
                                <th className="text-right px-2 py-1">P&L</th>
                                <th className="text-right px-2 py-1">Marge</th>
                                <th className="text-right px-2 py-1">Calls</th>
                                <th className="text-right px-2 py-1"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {tenantPnL.map((t) => {
                                const alertColor = ALERT_COLORS[t.alertLevel] || "#666";
                                const isCritical = t.alertLevel === "critical" || t.alertLevel === "loss";
                                return (
                                    <tr key={t.slug} className="border-t border-white/3 hover:bg-white/2 transition-colors group">
                                        <td className="px-2 py-1.5 text-[10px] text-white/60 font-mono truncate max-w-[100px]">{t.name}</td>
                                        <td className="px-2 py-1.5">
                                            <span className="text-[9px] font-mono font-bold uppercase"
                                                style={{ color: { free: "#00f0ff", pro: "#39ff14", enterprise: "#ffb000", holding: "#d400ff" }[t.plan] || "#666" }}>
                                                {t.plan}
                                            </span>
                                        </td>
                                        <td className="px-2 py-1.5 text-[10px] text-white/40 font-mono text-right">${t.revenue}</td>
                                        <td className="px-2 py-1.5 text-[10px] text-[#ff6b35]/70 font-mono text-right">${t.expense.toFixed(2)}</td>
                                        <td className="px-2 py-1.5 text-[10px] font-mono font-bold text-right"
                                            style={{ color: t.pnl >= 0 ? "#39ff14" : "#ff2d55" }}>
                                            {t.pnl >= 0 ? "+" : ""}{t.pnl.toFixed(2)}
                                        </td>
                                        <td className="px-2 py-1.5 text-right">
                                            <span className="text-[10px] font-mono font-bold" style={{ color: alertColor }}>
                                                {t.margin.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="px-2 py-1.5 text-[10px] text-white/25 font-mono text-right">{t.llmCalls}</td>
                                        <td className="px-2 py-1.5 text-right">
                                            {isCritical && (
                                                <button
                                                    onClick={() => handleThrottle(t.slug, true)}
                                                    disabled={throttling === t.slug}
                                                    title="Tenant drosseln (Modell-Downgrade)"
                                                    className="text-[8px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400/70 border border-orange-500/20 opacity-0 group-hover:opacity-100 transition-all hover:bg-orange-500/20 disabled:opacity-30 font-mono"
                                                >
                                                    {throttling === t.slug ? "..." : "⚡THROTTLE"}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {tenantPnL.length === 0 && (
                        <div className="text-center py-4 text-white/15 text-[10px] font-mono">
                            Keine Finanzdaten verfugbar
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const TickerItem = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <div className="shrink-0">
        <div className="text-[8px] font-mono text-white/25 uppercase">{label}</div>
        <div className="text-xs font-bold font-mono" style={{ color }}>{value}</div>
    </div>
);

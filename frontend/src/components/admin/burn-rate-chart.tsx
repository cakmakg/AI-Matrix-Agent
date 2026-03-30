"use client";

import React, { useMemo } from "react";
import { useAgentStore } from "@/store/agent-store";
import type { BurnRatePoint } from "@/store/agent-store";

const CHART_W = 280;
const CHART_H = 48;
const PAD = 4;

function buildPath(points: BurnRatePoint[], key: "cost" | "cumulative"): string {
    if (points.length < 2) return "";

    const values = points.map((p) => p[key]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const xs = points.map((_, i) =>
        PAD + (i / (points.length - 1)) * (CHART_W - PAD * 2)
    );
    const ys = values.map((v) =>
        PAD + (1 - (v - min) / range) * (CHART_H - PAD * 2)
    );

    return xs
        .map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`)
        .join(" ");
}

function buildAreaPath(points: BurnRatePoint[], key: "cost" | "cumulative"): string {
    const line = buildPath(points, key);
    if (!line) return "";

    const values = points.map((p) => p[key]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const firstX = PAD;
    const lastX = CHART_W - PAD;
    const baselineY = (CHART_H - PAD).toFixed(1);
    const firstY = (PAD + (1 - (values[0] - min) / range) * (CHART_H - PAD * 2)).toFixed(1);

    return `${line} L${lastX},${baselineY} L${firstX},${baselineY} L${firstX},${firstY} Z`;
}

export const BurnRateChart = () => {
    const burnRateHistory = useAgentStore((s) => s.burnRateHistory);

    const { costPath, cumulPath, costArea, cumulArea, lastCost, totalCost, callsPerMin } =
        useMemo(() => {
            if (burnRateHistory.length < 2) {
                return { costPath: "", cumulPath: "", costArea: "", cumulArea: "", lastCost: 0, totalCost: 0, callsPerMin: 0 };
            }

            const last = burnRateHistory[burnRateHistory.length - 1];
            const first = burnRateHistory[0];
            const spanMs = last.timestamp - first.timestamp || 1;
            const callsPerMin = Math.round((burnRateHistory.length / spanMs) * 60_000);

            return {
                costPath: buildPath(burnRateHistory, "cost"),
                cumulPath: buildPath(burnRateHistory, "cumulative"),
                costArea: buildAreaPath(burnRateHistory, "cost"),
                cumulArea: buildAreaPath(burnRateHistory, "cumulative"),
                lastCost: last.cost,
                totalCost: last.cumulative,
                callsPerMin,
            };
        }, [burnRateHistory]);

    return (
        <div className="border border-white/5 rounded-lg px-3 py-2 bg-white/2">
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">
                    Live Burn Rate
                </span>
                <div className="flex items-center gap-3">
                    <Stat label="LAST" value={`$${lastCost.toFixed(5)}`} color="#ff6b35" />
                    <Stat label="SESSION" value={`$${totalCost.toFixed(4)}`} color="#ff2d55" />
                    <Stat label="CALLS/MIN" value={String(callsPerMin)} color="#00f0ff" />
                </div>
            </div>

            {burnRateHistory.length < 2 ? (
                <div className="flex items-center justify-center h-12 text-[9px] font-mono text-white/15">
                    Warte auf LLM-Aufrufe...
                </div>
            ) : (
                <svg
                    viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                    className="w-full"
                    style={{ height: CHART_H }}
                    preserveAspectRatio="none"
                >
                    <defs>
                        <linearGradient id="burnAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ff6b35" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#ff6b35" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="cumulAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ff2d55" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#ff2d55" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    {[0.25, 0.5, 0.75].map((t) => (
                        <line
                            key={t}
                            x1={PAD} y1={PAD + t * (CHART_H - PAD * 2)}
                            x2={CHART_W - PAD} y2={PAD + t * (CHART_H - PAD * 2)}
                            stroke="rgba(255,255,255,0.04)" strokeWidth="1"
                        />
                    ))}

                    {/* Cumulative area (background) */}
                    {cumulArea && (
                        <path d={cumulArea} fill="url(#cumulAreaGrad)" />
                    )}

                    {/* Per-call cost area */}
                    {costArea && (
                        <path d={costArea} fill="url(#burnAreaGrad)" />
                    )}

                    {/* Cumulative line */}
                    {cumulPath && (
                        <path
                            d={cumulPath}
                            fill="none"
                            stroke="#ff2d55"
                            strokeWidth="1"
                            strokeOpacity="0.5"
                            strokeDasharray="3,2"
                        />
                    )}

                    {/* Per-call cost line */}
                    {costPath && (
                        <path
                            d={costPath}
                            fill="none"
                            stroke="#ff6b35"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                    {/* Latest point dot */}
                    {burnRateHistory.length >= 2 && (() => {
                        const values = burnRateHistory.map((p) => p.cost);
                        const min = Math.min(...values);
                        const max = Math.max(...values);
                        const range = max - min || 1;
                        const lastVal = values[values.length - 1];
                        const cx = CHART_W - PAD;
                        const cy = PAD + (1 - (lastVal - min) / range) * (CHART_H - PAD * 2);
                        return (
                            <circle cx={cx} cy={cy} r="2.5" fill="#ff6b35" opacity="0.9" />
                        );
                    })()}
                </svg>
            )}

            {/* Legend */}
            <div className="flex items-center gap-3 mt-1">
                <LegendItem color="#ff6b35" label="Cost/Call" />
                <LegendItem color="#ff2d55" label="Cumulative" dashed />
            </div>
        </div>
    );
};

const Stat = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <div className="text-right">
        <div className="text-[7px] font-mono text-white/20 uppercase">{label}</div>
        <div className="text-[10px] font-mono font-bold" style={{ color }}>{value}</div>
    </div>
);

const LegendItem = ({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) => (
    <div className="flex items-center gap-1">
        <svg width="16" height="6">
            <line
                x1="0" y1="3" x2="16" y2="3"
                stroke={color} strokeWidth="1.5"
                strokeDasharray={dashed ? "3,2" : undefined}
            />
        </svg>
        <span className="text-[8px] font-mono text-white/25">{label}</span>
    </div>
);

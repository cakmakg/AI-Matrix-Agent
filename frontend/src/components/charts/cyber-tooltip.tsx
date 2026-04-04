"use client";

import React from "react";

interface CyberTooltipProps {
    active?: boolean;
    payload?: Array<{
        name: string;
        value: number;
        color: string;
        dataKey: string;
    }>;
    label?: string;
    formatter?: (value: number, name: string) => string;
}

export const CyberTooltip = ({ active, payload, label, formatter }: CyberTooltipProps) => {
    if (!active || !payload?.length) return null;

    return (
        <div
            className="rounded-lg border border-white/10 px-3 py-2 font-mono text-[10px] shadow-2xl"
            style={{
                background: "rgba(0,0,0,0.88)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
            }}
        >
            {label && (
                <p className="text-white/50 mb-1.5 text-[9px] uppercase tracking-wider">{label}</p>
            )}
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                    <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-white/60">{entry.name}:</span>
                    <span className="font-bold" style={{ color: entry.color }}>
                        {formatter ? formatter(entry.value, entry.name) : entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

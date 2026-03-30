"use client";

import React from "react";
import type { WorkflowSnapshotEntry } from "@/store/agent-store";

// Ajan adına göre renk
const NODE_COLORS: Record<string, string> = {
    guardrail:    "#ff2d55",
    orchestrator: "#00f0ff",
    scraper:      "#ffb000",
    analyzer:     "#39ff14",
    innovator:    "#bf5fff",
    writer:       "#00f0ff",
    critic:       "#ff6b35",
    fileSaver:    "#00f0ff",
    publisher:    "#39ff14",
    architect:    "#00f0ff",
    salesRep:     "#ffb000",
    auditor:      "#ff6b35",
    supplyChain:  "#bf5fff",
};

function formatValue(v: unknown): { text: string; color: string } {
    if (v === null || v === undefined) return { text: "—", color: "#ffffff20" };
    if (typeof v === "boolean") return { text: String(v), color: v ? "#39ff14" : "#ff2d55" };
    if (typeof v === "number")  return { text: String(v), color: "#00f0ff" };
    if (typeof v === "string") {
        if (v === "") return { text: '""', color: "#ffffff20" };
        return { text: v, color: "#ffffff90" };
    }
    return { text: JSON.stringify(v).slice(0, 200), color: "#ffb000" };
}

interface Props {
    snapshot: WorkflowSnapshotEntry;
}

export const StateInspector = ({ snapshot }: Props) => {
    const nodeColor = NODE_COLORS[snapshot.nodeName] || "#ffffff40";
    const outputEntries = Object.entries(snapshot.output || {});

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-white/5">
                <div className="w-2 h-2 rounded-full" style={{ background: nodeColor }} />
                <span className="text-[11px] font-bold font-mono uppercase tracking-wider" style={{ color: nodeColor }}>
                    {snapshot.nodeName}
                </span>
                <span className="text-[10px] font-mono text-white/30 ml-1">
                    Step {snapshot.step}
                </span>
                <span className="ml-auto text-[9px] font-mono text-white/20">
                    {new Date(snapshot.createdAt).toLocaleTimeString("de-DE")}
                </span>
            </div>

            {/* Key State pills */}
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 flex-wrap border-b border-white/5">
                <KeyStatePill label="→" value={snapshot.keyState.nextAgent || "—"} color="#00f0ff" />
                {snapshot.keyState.revisionCount > 0 && (
                    <KeyStatePill label="rev" value={String(snapshot.keyState.revisionCount)} color="#ff6b35" />
                )}
                {snapshot.keyState.confidenceScore > 0 && (
                    <KeyStatePill label="conf" value={`${snapshot.keyState.confidenceScore}%`} color="#39ff14" />
                )}
                {snapshot.keyState.threatScore > 0 && (
                    <KeyStatePill label="threat" value={String(snapshot.keyState.threatScore)} color="#ff2d55" />
                )}
                {snapshot.keyState.fileSaved && (
                    <KeyStatePill label="saved" value="✓" color="#39ff14" />
                )}
            </div>

            {/* Output fields */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1">
                {outputEntries.length === 0 ? (
                    <div className="text-[9px] font-mono text-white/20 text-center py-4">Keine Ausgabe</div>
                ) : (
                    outputEntries.map(([key, value]) => {
                        const { text, color } = formatValue(value);
                        return (
                            <div key={key} className="group">
                                <div className="text-[8px] font-mono text-white/30 uppercase tracking-wider mb-0.5">
                                    {key}
                                </div>
                                <div
                                    className="text-[10px] font-mono break-all leading-relaxed px-2 py-1 rounded bg-white/2 border border-white/3"
                                    style={{ color }}
                                >
                                    {text}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

const KeyStatePill = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono"
        style={{ borderColor: `${color}33`, background: `${color}10`, color }}>
        <span className="text-white/30">{label}:</span>
        <span className="font-bold">{value}</span>
    </div>
);

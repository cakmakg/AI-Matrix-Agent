"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAgentStore } from "@/store/agent-store";
import { StateInspector } from "./state-inspector";

const NODE_COLORS: Record<string, string> = {
    guardrail:    "#ff2d55",
    orchestrator: "#00f0ff",
    scraper:      "#ffb000",
    analyzer:     "#39ff14",
    innovator:    "#bf5fff",
    writer:       "#00f0ff",
    critic:       "#ff6b35",
    fileSaver:    "#39ff14",
    publisher:    "#39ff14",
    architect:    "#00f0ff",
    salesRep:     "#ffb000",
    auditor:      "#ff6b35",
    supplyChain:  "#bf5fff",
};

const NODE_ICONS: Record<string, string> = {
    guardrail:    "🛡",
    orchestrator: "🧠",
    scraper:      "🕵",
    analyzer:     "📊",
    innovator:    "💡",
    writer:       "✍",
    critic:       "🔍",
    fileSaver:    "💾",
    publisher:    "📢",
    architect:    "🏗",
    salesRep:     "💼",
    auditor:      "🧾",
    supplyChain:  "📦",
};

export const TimeMachine = () => {
    const snapshots = useAgentStore((s) => s.workflowSnapshots);
    const selectedStep = useAgentStore((s) => s.selectedSnapshotStep);
    const setSelectedStep = useAgentStore((s) => s.setSelectedSnapshotStep);
    const timeMachineThreadId = useAgentStore((s) => s.timeMachineThreadId);

    const selectedSnapshot = selectedStep !== null
        ? snapshots.find((s) => s.step === selectedStep) ?? null
        : null;

    if (snapshots.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full opacity-40">
                <div className="text-3xl mb-2">⏱</div>
                <div className="text-[10px] font-mono text-white/50">Lade Snapshots...</div>
                <div className="text-[9px] font-mono text-white/25 mt-1 max-w-[200px] text-center">
                    {timeMachineThreadId?.slice(0, 16)}…
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full gap-2">
            {/* Left: Step Timeline */}
            <div className="w-[200px] shrink-0 overflow-y-auto border-r border-white/5 pr-2">
                <div className="text-[9px] font-mono text-white/25 uppercase tracking-widest mb-2 px-1">
                    {snapshots.length} Schritte
                </div>
                <div className="relative">
                    {/* Vertical connector line */}
                    <div className="absolute left-[11px] top-0 bottom-0 w-px bg-white/5" />

                    {snapshots.map((snap, idx) => {
                        const color = NODE_COLORS[snap.nodeName] || "#ffffff40";
                        const icon = NODE_ICONS[snap.nodeName] || "◆";
                        const isSelected = selectedStep === snap.step;
                        const isLast = idx === snapshots.length - 1;

                        return (
                            <motion.button
                                key={snap._id}
                                onClick={() => setSelectedStep(isSelected ? null : snap.step)}
                                className="relative w-full flex items-start gap-2 text-left py-1 px-1 rounded transition-colors"
                                style={{
                                    background: isSelected ? `${color}15` : "transparent",
                                }}
                                whileHover={{ x: 2 }}
                            >
                                {/* Step dot */}
                                <div
                                    className="relative z-10 w-[22px] h-[22px] shrink-0 rounded-full flex items-center justify-center text-[10px] border"
                                    style={{
                                        borderColor: isSelected ? color : `${color}50`,
                                        background: isSelected ? `${color}20` : "transparent",
                                    }}
                                >
                                    {icon}
                                </div>

                                <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="text-[10px] font-mono font-bold truncate"
                                        style={{ color: isSelected ? color : `${color}90` }}>
                                        {snap.nodeName}
                                    </div>
                                    <div className="text-[8px] font-mono text-white/25">
                                        #{snap.step} · {new Date(snap.createdAt).toLocaleTimeString("de-DE")}
                                    </div>
                                    {snap.keyState.nextAgent && (
                                        <div className="text-[8px] font-mono text-white/20 truncate">
                                            → {snap.keyState.nextAgent}
                                        </div>
                                    )}
                                </div>
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* Right: State Inspector */}
            <div className="flex-1 min-w-0 overflow-hidden">
                <AnimatePresence mode="wait">
                    {selectedSnapshot ? (
                        <motion.div
                            key={selectedSnapshot._id}
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            transition={{ duration: 0.15 }}
                            className="h-full"
                        >
                            <StateInspector snapshot={selectedSnapshot} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-full flex flex-col items-center justify-center opacity-30"
                        >
                            <div className="text-2xl mb-2">◈</div>
                            <div className="text-[10px] font-mono text-white/50">
                                Schritt auswählen
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { useAgentStore } from "@/store/agent-store";
import { TimeMachine } from "./time-machine";

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

export const OperatingRoom = () => {
    const recentWorkflows = useAgentStore((s) => s.recentWorkflows);
    const timeMachineThreadId = useAgentStore((s) => s.timeMachineThreadId);
    const fetchRecentWorkflows = useAgentStore((s) => s.fetchRecentWorkflows);
    const setTimeMachineThread = useAgentStore((s) => s.setTimeMachineThread);

    useEffect(() => {
        fetchRecentWorkflows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex h-full gap-0">
            {/* Left: Recent Workflow List (35%) */}
            <div className="w-[35%] shrink-0 border-r border-white/5 flex flex-col overflow-hidden">
                <div className="shrink-0 px-3 py-2 border-b border-white/5 flex items-center justify-between">
                    <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">
                        Zaman Makinesi
                    </span>
                    <span className="text-[9px] font-mono text-white/20">
                        {recentWorkflows.length} workflow
                    </span>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-1">
                    {recentWorkflows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-30">
                            <div className="text-2xl mb-2">⏱</div>
                            <div className="text-[10px] font-mono text-white/40">Henüz workflow yok</div>
                        </div>
                    ) : (
                        recentWorkflows.map((wf) => {
                            const isSelected = timeMachineThreadId === wf.threadId;
                            const nodeColor = NODE_COLORS[wf.lastNode || ""] || "#ffffff30";
                            const nodeIcon = NODE_ICONS[wf.lastNode || ""] || "◆";

                            return (
                                <motion.button
                                    key={wf.threadId}
                                    onClick={() => setTimeMachineThread(isSelected ? null : wf.threadId)}
                                    className="w-full text-left px-2 py-2 rounded border transition-colors"
                                    style={{
                                        borderColor: isSelected ? `${nodeColor}40` : "rgba(255,255,255,0.05)",
                                        background: isSelected ? `${nodeColor}08` : "transparent",
                                    }}
                                    whileHover={{ x: 2 }}
                                >
                                    {/* Top row */}
                                    <div className="flex items-center gap-1.5 mb-1">
                                        {wf.isActive && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
                                        )}
                                        <span className="text-[9px] font-mono text-white/20 truncate flex-1">
                                            {wf.threadId.slice(0, 24)}…
                                        </span>
                                    </div>

                                    {/* Middle row: tenant + last node */}
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-mono text-white/30 truncate flex-1">
                                            {wf.tenantSlug || wf.clientId?.slice(0, 8) || "—"}
                                        </span>
                                        {wf.lastNode && (
                                            <div className="flex items-center gap-1 shrink-0">
                                                <span className="text-[9px]">{nodeIcon}</span>
                                                <span className="text-[8px] font-mono"
                                                    style={{ color: nodeColor }}>
                                                    {wf.lastNode}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Bottom row: stats */}
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[8px] font-mono text-white/20">
                                            {wf.stepCount != null ? `${wf.stepCount} adım` : "—"}
                                        </span>
                                        <span className="text-[8px] font-mono text-white/15 ml-auto">
                                            {new Date(wf.lastActivity).toLocaleTimeString("de-DE", {
                                                hour: "2-digit", minute: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                </motion.button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Right: Time Machine (65%) */}
            <div className="flex-1 min-w-0 overflow-hidden">
                {timeMachineThreadId ? (
                    <TimeMachine />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-30">
                        <div className="text-3xl mb-3">⏳</div>
                        <div className="text-[10px] font-mono text-white/40">
                            Bir workflow seç
                        </div>
                        <div className="text-[9px] font-mono text-white/20 mt-1">
                            Her adımın durumunu incele
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

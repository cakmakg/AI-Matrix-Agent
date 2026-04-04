"use client";

import { Activity, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { useAgentStore } from "@/store/agent-store";
import { WorkflowPipeline } from "./workflow-pipeline";
import { AgentChips } from "./agent-chips";
import { MiniTerminal } from "./mini-terminal";

export function SystemMonitor() {
    const monitorCollapsed   = useAgentStore((s) => s.monitorCollapsed);
    const setMonitorCollapsed = useAgentStore((s) => s.setMonitorCollapsed);

    /* ── Collapsed strip ── */
    if (monitorCollapsed) {
        return (
            <div className="w-9 shrink-0 flex flex-col items-center border-l border-white/5"
                style={{ background: "#0b1220" }}>
                <button
                    onClick={() => setMonitorCollapsed(false)}
                    className="p-2 mt-4 rounded hover:bg-white/8 text-white/20 hover:text-white/55 transition-colors"
                    title="System Monitor öffnen"
                >
                    <ChevronLeft size={12} />
                </button>
                {/* Rotated label */}
                <span
                    className="font-mono text-[7px] text-white/12 uppercase tracking-widest mt-4 select-none"
                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                    Monitor
                </span>
            </div>
        );
    }

    return (
        <aside
            className="w-[320px] shrink-0 flex flex-col border-l border-white/5 overflow-hidden"
            style={{ background: "#0b1220" }}
        >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/6 shrink-0">
                <div className="flex items-center gap-2">
                    <Activity size={11} className="text-[#00f0ff]/50" />
                    <span className="font-mono text-[8px] text-white/30 uppercase tracking-widest">
                        System Monitor
                    </span>
                </div>
                <button
                    onClick={() => setMonitorCollapsed(true)}
                    className="p-1 rounded hover:bg-white/8 text-white/18 hover:text-white/50 transition-colors"
                    title="Einklappen"
                >
                    <ChevronRight size={10} />
                </button>
            </div>

            {/* ── Scrollable content ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 scrollbar-hide">

                {/* A — Workflow Pipeline */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Zap size={9} className="text-[#00f0ff]/40" />
                        <span className="font-mono text-[7px] text-white/25 uppercase tracking-widest">
                            Workflow Pipeline
                        </span>
                    </div>
                    <WorkflowPipeline />
                </div>

                <div className="h-px bg-white/5" />

                {/* B — Agent Chips */}
                <AgentChips />

                <div className="h-px bg-white/5" />

                {/* C — Mini Event Terminal */}
                <MiniTerminal />
            </div>
        </aside>
    );
}

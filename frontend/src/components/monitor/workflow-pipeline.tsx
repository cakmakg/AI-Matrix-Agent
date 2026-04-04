"use client";

import { useAgentStore } from "@/store/agent-store";
import type { AgentId } from "@/store/types";

interface PipelineStep {
    id: AgentId;
    label: string;
    abbr: string;
    isGate?: boolean;
}

const PIPELINE_STEPS: PipelineStep[] = [
    { id: "ceo",       label: "Orchestrator", abbr: "CEO" },
    { id: "scraper",   label: "Web Scraper",  abbr: "SCR" },
    { id: "analyst",   label: "Analyzer",     abbr: "ANL" },
    { id: "innovator", label: "Innovator",    abbr: "VZN" },
    { id: "writer",    label: "Writer",       abbr: "WRT" },
    { id: "qa",        label: "Critic / QA",  abbr: "QA"  },
    { id: "hitl",      label: "HITL Gate",    abbr: "HIT", isGate: true },
    { id: "publisher", label: "Publisher",    abbr: "PUB" },
];

export function WorkflowPipeline() {
    const agents        = useAgentStore((s) => s.agents);
    const workflowPhase = useAgentStore((s) => s.workflowPhase);
    const isIdle        = workflowPhase === "IDLE" || workflowPhase === "DELIVERED";

    if (isIdle) {
        return (
            <div className="flex items-center justify-center py-3">
                <span className="font-mono text-[8px] text-white/15 border border-white/8 px-3 py-1.5 rounded-full">
                    System bereit
                </span>
            </div>
        );
    }

    return (
        <div className="space-y-0.5">
            {PIPELINE_STEPS.map((step, i) => {
                const agent    = agents[step.id];
                const isActive = agent.status === "ACTIVE" || agent.status === "THINKING";
                const isDone   = agent.status === "SUCCESS";
                const isError  = agent.status === "ERROR";
                const isGate   = step.isGate;

                const dotClass = isActive
                    ? isGate
                        ? "bg-[#ff2d55] animate-pulse ring-2 ring-[#ff2d55]/30"
                        : "bg-[#39ff14] animate-pulse ring-2 ring-[#39ff14]/25"
                    : isDone  ? "bg-[#39ff14]/50"
                    : isError ? "bg-[#ff2d55]"
                    : "bg-white/10";

                const labelClass = isActive
                    ? isGate ? "text-[#ff2d55]" : "text-[#39ff14]"
                    : isDone  ? "text-[#39ff14]/45"
                    : isError ? "text-[#ff2d55]"
                    : "text-white/18";

                const textClass = isActive
                    ? "text-white/65"
                    : isDone ? "text-white/25"
                    : "text-white/12";

                return (
                    <div key={step.id} className="flex items-start gap-2.5">
                        {/* Dot + connector */}
                        <div className="flex flex-col items-center shrink-0 w-4 mt-1">
                            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${dotClass}`} />
                            {i < PIPELINE_STEPS.length - 1 && (
                                <div
                                    className={`w-px h-4 mt-0.5 transition-colors duration-500 ${isDone ? "bg-[#39ff14]/18" : "bg-white/5"}`}
                                />
                            )}
                        </div>

                        {/* Step info */}
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 pb-3">
                            <span className={`font-mono text-[7px] font-bold w-7 shrink-0 ${labelClass}`}>
                                {step.abbr}
                            </span>
                            <span className={`text-[7px] flex-1 truncate ${textClass}`}>
                                {step.label}
                            </span>
                            {isActive && (
                                <span className={`font-mono text-[6px] ml-auto shrink-0 ${isGate ? "text-[#ff2d55]/70" : "text-[#39ff14]/70"}`}>
                                    {agent.status === "THINKING" ? "denkend" : isGate ? "wartend" : "aktiv"}
                                </span>
                            )}
                            {isDone && (
                                <span className="font-mono text-[6px] text-white/20 ml-auto">✓</span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

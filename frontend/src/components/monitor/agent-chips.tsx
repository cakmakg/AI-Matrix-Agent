"use client";

import { useAgentStore } from "@/store/agent-store";
import type { AgentId } from "@/store/types";

const AGENT_ORDER: AgentId[] = [
    "ceo", "cto", "scraper", "analyst", "innovator", "writer",
    "qa", "hitl", "publisher", "radar", "cmo", "cfo",
    "auditor", "supplyChain", "salesRep", "customerBot",
];

const CHIP_LABELS: Record<AgentId, string> = {
    ceo: "CEO", cto: "CTO", scraper: "SCR", analyst: "ANL",
    innovator: "VZN", writer: "WRT", qa: "QA ", hitl: "HIT",
    publisher: "PUB", radar: "RDR", cmo: "CMO", cfo: "CFO",
    auditor: "AUD", supplyChain: "SCM", salesRep: "SLS", customerBot: "CXB",
};

const STATUS_DOT: Record<string, string> = {
    IDLE:     "bg-white/20",
    THINKING: "bg-[#00f0ff] animate-pulse",
    ACTIVE:   "bg-[#39ff14] animate-pulse",
    SUCCESS:  "bg-[#39ff14]",
    ERROR:    "bg-[#ff2d55]",
};

const CHIP_TEXT: Record<string, string> = {
    IDLE:     "text-white/30",
    THINKING: "text-[#00f0ff]",
    ACTIVE:   "text-[#39ff14]",
    SUCCESS:  "text-[#39ff14]/55",
    ERROR:    "text-[#ff2d55]",
};

const CHIP_BORDER: Record<string, string> = {
    IDLE:     "border-white/5 bg-white/2",
    THINKING: "border-[#00f0ff]/25 bg-[#00f0ff]/5 ring-1 ring-[#00f0ff]/15",
    ACTIVE:   "border-[#39ff14]/25 bg-[#39ff14]/5 ring-1 ring-[#39ff14]/15",
    SUCCESS:  "border-white/5 bg-white/2",
    ERROR:    "border-[#ff2d55]/25 bg-[#ff2d55]/5",
};

export function AgentChips() {
    const agents = useAgentStore((s) => s.agents);
    const activeCount = Object.values(agents).filter(
        (a) => a.status === "ACTIVE" || a.status === "THINKING"
    ).length;

    return (
        <div>
            <div className="flex items-center justify-between mb-2.5">
                <span className="font-mono text-[8px] text-white/30 uppercase tracking-widest">
                    Agenten
                </span>
                <span className={`font-mono text-[8px] font-bold ${activeCount > 0 ? "text-[#39ff14]/70" : "text-white/20"}`}>
                    {activeCount > 0 ? `${activeCount}/16 aktiv` : "Bereit"}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
                {AGENT_ORDER.map((id) => {
                    const agent = agents[id];
                    return (
                        <div
                            key={id}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-300 ${CHIP_BORDER[agent.status]}`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[agent.status]}`} />
                            <span className={`font-mono text-[9px] font-bold tracking-wider ${CHIP_TEXT[agent.status]}`}>
                                {CHIP_LABELS[id]}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

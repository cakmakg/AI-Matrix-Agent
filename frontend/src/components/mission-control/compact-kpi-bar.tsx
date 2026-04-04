"use client";

import { RefreshCw } from "lucide-react";
import { useAgentStore } from "@/store/agent-store";

interface CompactKpiBarProps {
    onRefresh: () => void;
    loading: boolean;
}

const PHASE_LABEL: Record<string, string> = {
    IDLE:               "Bereit",
    DISPATCHING:        "Sendet...",
    RUNNING:            "Läuft",
    AWAITING_APPROVAL:  "HITL — Genehmigung",
    PUBLISHING:         "Publiziert",
    DELIVERED:          "Ausgeliefert",
    REVISING:           "Revision",
};

export function CompactKpiBar({ onRefresh, loading }: CompactKpiBarProps) {
    const agents          = useAgentStore((s) => s.agents);
    const missions        = useAgentStore((s) => s.missions);
    const supportTickets  = useAgentStore((s) => s.supportTickets);
    const campaignDrafts  = useAgentStore((s) => s.campaignDrafts);
    const cronSecondsLeft = useAgentStore((s) => s.cronSecondsLeft);
    const workflowPhase   = useAgentStore((s) => s.workflowPhase);
    const threadId        = useAgentStore((s) => s.threadId);

    const activeAgentCount = Object.values(agents).filter(
        (a) => a.status === "ACTIVE" || a.status === "THINKING"
    ).length;

    const pendingCount =
        missions.filter((m) => m.status === "AWAITING_APPROVAL").length +
        supportTickets.length +
        campaignDrafts.filter((c) => c.status === "AWAITING_APPROVAL").length;

    const cronMin = Math.floor(cronSecondsLeft / 60);
    const cronSec = String(cronSecondsLeft % 60).padStart(2, "0");

    const isRunning = workflowPhase !== "IDLE" && workflowPhase !== "DELIVERED";

    return (
        <header
            className="flex items-center gap-4 px-6 py-3 border-b border-white/8 shrink-0"
            style={{ background: "#0b1220" }}
        >
            {/* Title + phase */}
            <div className="flex-1 min-w-0">
                <h1 className="text-sm font-semibold text-white/85 tracking-wide truncate">
                    AI Orchestra Kontrollzentrum
                </h1>
                {isRunning && (
                    <p className="text-[9px] text-white/30 mt-0.5 font-mono">
                        {PHASE_LABEL[workflowPhase] ?? workflowPhase}
                        {threadId ? ` — #${threadId.slice(0, 8)}` : ""}
                    </p>
                )}
            </div>

            {/* Compact badges */}
            <div className="flex items-center gap-2 shrink-0">

                {/* Active agents */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[8px] font-mono font-bold
                    ${activeAgentCount > 0
                        ? "border-[#39ff14]/30 bg-[#39ff14]/8 text-[#39ff14]/85"
                        : "border-white/10 bg-white/3 text-white/30"}`}
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${activeAgentCount > 0 ? "bg-[#39ff14] animate-pulse" : "bg-white/18"}`} />
                    {activeAgentCount}/12
                </div>

                {/* Pending tasks */}
                {pendingCount > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#ff2d55]/30 bg-[#ff2d55]/8 text-[8px] font-mono font-bold text-[#ff2d55]/85">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ff2d55] animate-pulse" />
                        {pendingCount} ausstehend
                    </div>
                )}

                {/* Cron timer */}
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#ffb000]/20 bg-[#ffb000]/5 text-[8px] font-mono text-[#ffb000]/65">
                    ⏱ {cronMin}:{cronSec}
                </div>

                {/* Refresh */}
                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/65 transition-colors disabled:opacity-30"
                    title="Aktualisieren"
                >
                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                </button>
            </div>
        </header>
    );
}

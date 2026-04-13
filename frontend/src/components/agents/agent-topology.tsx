"use client";

import React from "react";
import { motion } from "framer-motion";
import { Network, Lock } from "lucide-react";
import { useAgentStore } from "@/store/agent-store";
import type { AgentId, AgentStatus } from "@/store/agent-store";
import { getProductTheme } from "@/config/product-theme";

const STATUS_RING: Record<AgentStatus, string> = {
    IDLE:     "border-white/10",
    THINKING: "border-neon-blue/60  shadow-[0_0_12px_rgba(0,240,255,0.25)] animate-pulse",
    ACTIVE:   "border-neon-green/60 shadow-[0_0_12px_rgba(57,255,20,0.25)]  animate-pulse",
    SUCCESS:  "border-neon-green/30",
    ERROR:    "border-alert-red/60  shadow-[0_0_12px_rgba(255,45,85,0.25)]",
};

const STATUS_DOT: Record<AgentStatus, string> = {
    IDLE:     "bg-white/15",
    THINKING: "bg-neon-blue  animate-pulse",
    ACTIVE:   "bg-neon-green animate-pulse",
    SUCCESS:  "bg-neon-green/60",
    ERROR:    "bg-alert-red",
};

const STATUS_LABEL: Record<AgentStatus, string> = {
    IDLE:     "text-white/20",
    THINKING: "text-neon-blue",
    ACTIVE:   "text-neon-green",
    SUCCESS:  "text-neon-green/60",
    ERROR:    "text-alert-red",
};

const AGENT_ORDER: AgentId[] = [
    "ceo", "cto", "scraper", "analyst", "innovator", "writer",
    "qa", "hitl", "publisher", "radar", "cmo", "cfo",
    "auditor", "supplyChain", "salesRep", "customerBot",
];

const AGENT_ROLE_DESC: Record<AgentId, string> = {
    ceo:         "Orchestration & Routing",
    cto:         "Architecture & Blueprints",
    scraper:     "Web Research & Data Acquisition",
    analyst:     "Data Processing & Analysis",
    innovator:   "Lateral Thinking & Devil's Advocate",
    writer:      "Content Generation",
    qa:          "Quality Review & Critique",
    hitl:        "Human-in-the-Loop Gate",
    publisher:   "Multi-channel Distribution",
    radar:       "R&D Proactive Scanning",
    cmo:         "Marketing Campaign Generation",
    cfo:         "Financial Tracking & P&L",
    auditor:     "Invoice Audit & Anomaly Detection",
    supplyChain: "Stock Monitoring & Supplier Orders",
    salesRep:    "B2B Sales Negotiation",
    customerBot: "AI Customer Service & Ticket Response",
};

export const AgentTopology = () => {
    const { agents, activeAgent, workflowPhase, clientProduct } = useAgentStore();
    const theme = getProductTheme(clientProduct);
    const unlockedSet = new Set<AgentId>(theme.activeAgents);

    const activeCount = Object.values(agents).filter((a) =>
        a.status === "ACTIVE" || a.status === "THINKING"
    ).length;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                    <Network size={14} className="text-white/40" />
                    <span className="font-mono text-[10px] font-bold text-white/60 uppercase tracking-widest">
                        Agent Topology
                    </span>
                    <span className="font-mono text-[8px] text-white/25">16 agents</span>
                </div>
                <div className="flex items-center gap-2">
                    {activeCount > 0 && (
                        <span className="flex items-center gap-1.5 font-mono text-[8px] text-neon-green">
                            <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                            {activeCount} active
                        </span>
                    )}
                    <span className={`font-mono text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        workflowPhase === "IDLE"
                            ? "text-white/20 border-white/8"
                            : "text-neon-green border-neon-green/30"
                    }`}>
                        {workflowPhase}
                    </span>
                </div>
            </div>

            {/* Agent grid */}
            <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hide">
                <div className="grid grid-cols-2 gap-3">
                    {AGENT_ORDER.map((id, i) => {
                        const agent = agents[id];
                        const isActive = activeAgent === id;
                        const isLocked = !unlockedSet.has(id);

                        return (
                            <motion.div
                                key={id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                title={isLocked ? "Bu ajanı uyandırmak için üst pakete geçin" : undefined}
                                className={`glass-panel rounded-xl p-4 border transition-all duration-300 ${
                                    isLocked
                                        ? "border-white/4 opacity-35 cursor-not-allowed"
                                        : isActive
                                            ? "border-neon-green/25 bg-neon-green/4"
                                            : "border-white/6 hover:border-white/12"
                                }`}
                            >
                                {/* Avatar + status ring */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center text-lg
                                                     transition-all duration-300 ${isLocked ? "border-white/8 grayscale" : STATUS_RING[agent.status]}`}>
                                        {isLocked ? "🔒" : agent.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`font-mono text-[10px] font-bold ${isLocked ? "text-white/25" : "text-white/70"}`}>
                                                {agent.shortLabel}
                                            </span>
                                            {!isLocked && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[agent.status]}`} />}
                                            {isLocked && <Lock size={8} className="text-white/15 shrink-0" />}
                                        </div>
                                        <p className="font-mono text-[8px] text-white/30 truncate">{agent.label}</p>
                                    </div>
                                </div>

                                {/* Role description */}
                                <p className="font-mono text-[8px] text-white/30 leading-relaxed mb-2">
                                    {AGENT_ROLE_DESC[id]}
                                </p>

                                {/* Status badge */}
                                <div className="flex items-center justify-between">
                                    {isLocked ? (
                                        <span className="font-mono text-[7px] uppercase tracking-widest text-white/15">LOCKED</span>
                                    ) : (
                                        <span className={`font-mono text-[7px] uppercase tracking-widest font-bold ${STATUS_LABEL[agent.status]}`}>
                                            {agent.status}
                                        </span>
                                    )}
                                    {isActive && !isLocked && (
                                        <span className="font-mono text-[7px] text-neon-green/70 uppercase tracking-wider">
                                            Active
                                        </span>
                                    )}
                                </div>

                                {/* Active pulse line */}
                                {(agent.status === "ACTIVE" || agent.status === "THINKING") && (
                                    <motion.div
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        className="mt-2 h-px bg-neon-green/40 rounded-full origin-left"
                                    />
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

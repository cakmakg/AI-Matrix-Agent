"use client";

import React from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, BarChart3, BookOpen, Settings, Blocks, Activity, Share2, ShieldAlert } from "lucide-react";
import { useAgentStore } from "@/store/agent-store";
import type { ActiveView } from "@/store/agent-store";
import { CronTimer } from "@/components/hud/cron-timer";

const NAV_ITEMS: { view: ActiveView; label: string; icon: React.ReactNode }[] = [
    { view: "control",   label: "Übersicht",          icon: <LayoutDashboard size={16} /> },
    { view: "cfo",       label: "CFO-Dashboard",      icon: <BarChart3 size={16} /> },
    { view: "social",    label: "Soziale Medien",      icon: <Share2 size={16} /> },
    { view: "knowledge", label: "Wissensdatenbank",   icon: <BookOpen size={16} /> },
    { view: "skills",    label: "Skill Store",        icon: <Blocks size={16} /> },
    { view: "settings",  label: "Einstellungen",      icon: <Settings size={16} /> },
];

export const Sidebar = () => {
    const { activeView, setActiveView, workflowPhase, supportTickets, campaignDrafts, threadId } = useAgentStore();

    const pendingCount =
        (workflowPhase === "AWAITING_APPROVAL" ? 1 : 0) +
        supportTickets.filter(t => t.category === "SUPPORT_PRICING" || t.category === "SUPPORT_BUG").length +
        campaignDrafts.filter(c => c.status === "AWAITING_APPROVAL").length;

    const isRunning = workflowPhase !== "IDLE" && workflowPhase !== "DELIVERED";

    return (
        <aside
            className="w-[200px] shrink-0 flex flex-col h-screen"
            style={{ background: "#0d1829", borderRight: "1px solid rgba(255,255,255,0.07)" }}
        >
            {/* Logo */}
            <div className="px-5 py-5 border-b border-white/8">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg border border-[#00f0ff]/40 flex items-center justify-center text-[#00f0ff] text-sm font-bold bg-[#00f0ff]/8">
                        ◈
                    </div>
                    <div>
                        <div className="text-[13px] font-bold text-white tracking-wide">AI Orchestra</div>
                        <div className="text-[9px] text-white/40 tracking-widest uppercase">Agent Matrix</div>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex flex-col gap-0.5 px-3 py-4 flex-1">
                {NAV_ITEMS.map(({ view, label, icon }) => {
                    const isActive = activeView === view;
                    const badge = view === "control" && pendingCount > 0 ? pendingCount : null;
                    return (
                        <motion.button
                            key={view}
                            whileHover={{ x: 2 }}
                            onClick={() => setActiveView(view)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 w-full
                                ${isActive
                                    ? "bg-white/8 border border-white/10 text-white"
                                    : "text-white/50 hover:text-white/80 hover:bg-white/4 border border-transparent"
                                }`}
                        >
                            <span className={isActive ? "text-[#00f0ff]" : "text-white/35"}>{icon}</span>
                            <span className="text-sm font-medium flex-1">{label}</span>
                            {badge !== null && (
                                <span className="min-w-[18px] h-5 px-1.5 rounded-full bg-[#ff2d55] font-mono text-[9px] font-bold text-white flex items-center justify-center">
                                    {badge}
                                </span>
                            )}
                        </motion.button>
                    );
                })}
            </nav>

            {/* System status + Cron */}
            <div className="px-4 py-4 border-t border-white/8 space-y-2.5">
                <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${
                    isRunning ? "bg-[#39ff14]/5 border-[#39ff14]/20" : "bg-white/2 border-white/6"
                }`}>
                    <Activity size={12} className={isRunning ? "text-[#39ff14] animate-pulse" : "text-white/25"} />
                    <div className="flex-1 min-w-0">
                        <div className={`text-[11px] font-semibold ${isRunning ? "text-[#39ff14]/90" : "text-white/35"}`}>
                            {isRunning ? "Agent läuft" : "System bereit"}
                        </div>
                        {isRunning && threadId && (
                            <div className="text-[9px] text-white/30 font-mono truncate">#{threadId.slice(0, 8)}</div>
                        )}
                    </div>
                </div>
                <CronTimer />
            </div>
        </aside>
    );
};

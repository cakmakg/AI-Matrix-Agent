"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard, BarChart3, BookOpen, Settings, Blocks,
    Activity, Share2, ShieldAlert, ChevronDown, Plus, LogOut,
    Check, Building2, Lock, FileSearch, Truck, Terminal, MessageSquare,
} from "lucide-react";
import { useAgentStore } from "@/store/agent-store";
import type { ActiveView } from "@/store/agent-store";
import { CronTimer } from "@/components/hud/cron-timer";
import { getProductTheme } from "@/config/product-theme";

const NAV_ITEMS: { view: ActiveView; label: string; icon: React.ReactNode; requiredPlan?: "pro" | "enterprise" }[] = [
    { view: "chat",      label: "Command Center",   icon: <MessageSquare size={16} /> },
    { view: "control",   label: "Übersicht",        icon: <LayoutDashboard size={16} /> },
    { view: "cfo",       label: "CFO-Dashboard",    icon: <BarChart3 size={16} />,       requiredPlan: "pro" },
    { view: "auditor",   label: "Rechnungsprüfung", icon: <FileSearch size={16} />,      requiredPlan: "enterprise" },
    { view: "supply",    label: "Supply Chain",     icon: <Truck size={16} />,           requiredPlan: "enterprise" },
    { view: "social",    label: "Soziale Medien",    icon: <Share2 size={16} />,          requiredPlan: "pro" },
    { view: "knowledge", label: "Wissensdatenbank",  icon: <BookOpen size={16} /> },
    { view: "skills",    label: "Skill Store",       icon: <Blocks size={16} />,          requiredPlan: "pro" },
    { view: "settings",  label: "Einstellungen",     icon: <Settings size={16} /> },
    { view: "security",  label: "Sicherheit",        icon: <ShieldAlert size={16} />,     requiredPlan: "enterprise" },
];

// Hangi plan hangi özelliklere erişebilir
const PLAN_ORDER: Record<string, number> = { free: 0, pro: 1, enterprise: 2, holding: 3 };
function isPlanSufficient(clientPlan: string | null, required?: "pro" | "enterprise"): boolean {
    if (!required) return true;
    return (PLAN_ORDER[clientPlan ?? "free"] ?? 0) >= (PLAN_ORDER[required] ?? 0);
}

const PLAN_BADGE: Record<string, { label: string; color: string }> = {
    free:       { label: "Support",    color: "#00f0ff" },
    pro:        { label: "Marketing",  color: "#39ff14" },
    enterprise: { label: "Enterprise", color: "#ffb000" },
    holding:    { label: "Holding",    color: "#d400ff" },
};

export const Sidebar = () => {
    const {
        activeView, setActiveView,
        workflowPhase, supportTickets, campaignDrafts, threadId,
        clientName, clientSlug, apiKey, clientPlan, clientProduct, workspaces,
        switchWorkspace, logout, isAdmin,
    } = useAgentStore();

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    // SSR sırasında her zaman varsayılan temayı kullan (hydration mismatch önleme)
    const productTheme = getProductTheme(mounted ? clientProduct : null);

    const [wsOpen, setWsOpen] = useState(false);

    const pendingCount =
        (workflowPhase === "AWAITING_APPROVAL" ? 1 : 0) +
        supportTickets.filter(t => t.category === "SUPPORT_PRICING" || t.category === "SUPPORT_BUG").length +
        campaignDrafts.filter(c => c.status === "AWAITING_APPROVAL").length;

    const isRunning    = workflowPhase !== "IDLE" && workflowPhase !== "DELIVERED";
    const displayName  = clientName || "Default Tenant";
    const displaySlug  = clientSlug || "default";

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

            {/* Workspace Switcher */}
            <div className="px-3 pt-3 pb-1 relative">
                <button
                    onClick={() => setWsOpen(v => !v)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/3 border border-white/6 hover:border-white/14 transition-all"
                >
                    <div className="w-5 h-5 rounded bg-[#00f0ff]/15 border border-[#00f0ff]/25 flex items-center justify-center shrink-0">
                        <Building2 size={10} className="text-[#00f0ff]" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                        <div className="font-mono text-[10px] font-semibold text-white/75 truncate">{displayName}</div>
                        <div className="font-mono text-[8px] truncate flex items-center gap-1" style={{ color: productTheme.accent, opacity: 0.7 }}>
                            <span>{productTheme.icon}</span>
                            <span>{productTheme.slogan}</span>
                        </div>
                    </div>
                    <ChevronDown size={11} className={`text-white/30 shrink-0 transition-transform duration-200 ${wsOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                    {wsOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="absolute left-3 right-3 top-[calc(100%-4px)] mt-1 bg-[#0a1120] border border-white/10 rounded-lg overflow-hidden shadow-2xl z-50"
                        >
                            {/* Kayıtlı workspace'ler */}
                            {workspaces.length > 0 && (
                                <div className="p-1 border-b border-white/5">
                                    {workspaces.map(ws => (
                                        <button
                                            key={ws.slug}
                                            onClick={() => { switchWorkspace(ws.apiKey); setWsOpen(false); }}
                                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded hover:bg-white/5 transition-colors"
                                        >
                                            <Building2 size={9} className="text-[#00f0ff]/60 shrink-0" />
                                            <div className="flex-1 min-w-0 text-left">
                                                <div className="font-mono text-[10px] text-white/65 truncate">{ws.name}</div>
                                            </div>
                                            {ws.apiKey === apiKey && (
                                                <Check size={10} className="text-[#39ff14] shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Yeni workspace ekle → login modal'ı açar (logout ile tetiklenir) */}
                            <button
                                onClick={() => { logout(); setWsOpen(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/4 transition-colors"
                            >
                                <Plus size={10} className="text-[#00f0ff]/50" />
                                <span className="font-mono text-[10px] text-white/40">Workspace ekle</span>
                            </button>

                            {/* Logout */}
                            <button
                                onClick={() => { logout(); setWsOpen(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-500/5 transition-colors border-t border-white/5"
                            >
                                <LogOut size={10} className="text-red-400/50" />
                                <span className="font-mono text-[10px] text-red-400/45">Çıkış Yap</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Nav */}
            <nav className="flex flex-col gap-0.5 px-3 py-3 flex-1">
                {NAV_ITEMS.map(({ view, label, icon, requiredPlan }) => {
                    const isActive  = activeView === view;
                    const isLocked  = !isPlanSufficient(clientPlan, requiredPlan);
                    const badge     = view === "control" && pendingCount > 0 ? pendingCount : null;
                    return (
                        <motion.button
                            key={view}
                            whileHover={isLocked ? {} : { x: 2 }}
                            onClick={() => isLocked ? undefined : setActiveView(view)}
                            title={isLocked ? `${requiredPlan === "enterprise" ? "Enterprise" : "Marketing"} paketi gerektirir` : undefined}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 w-full
                                ${isLocked
                                    ? "opacity-35 cursor-not-allowed border border-transparent"
                                    : isActive
                                        ? "bg-white/8 border border-white/10 text-white"
                                        : "text-white/50 hover:text-white/80 hover:bg-white/4 border border-transparent"
                                }`}
                        >
                            <span className={isLocked ? "text-white/20" : isActive ? "text-[#00f0ff]" : "text-white/35"}>{icon}</span>
                            <span className="text-sm font-medium flex-1">{label}</span>
                            {isLocked ? (
                                <Lock size={10} className="text-white/20 shrink-0" />
                            ) : badge !== null && (
                                <span className="min-w-[18px] h-5 px-1.5 rounded-full bg-[#ff2d55] font-mono text-[9px] font-bold text-white flex items-center justify-center">
                                    {badge}
                                </span>
                            )}
                        </motion.button>
                    );
                })}

                {/* God Mode — Admin Only */}
                {isAdmin && (
                    <motion.button
                        whileHover={{ x: 2 }}
                        onClick={() => setActiveView("admin")}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 w-full mt-2 border
                            ${activeView === "admin"
                                ? "bg-red-500/10 border-red-500/25 text-red-400"
                                : "border-red-500/15 text-red-400/60 hover:text-red-400 hover:bg-red-500/5"
                            }`}
                    >
                        <Terminal size={16} className={activeView === "admin" ? "text-red-400" : "text-red-400/40"} />
                        <span className="text-sm font-bold tracking-wide">GOD MODE</span>
                    </motion.button>
                )}
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

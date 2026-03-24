"use client";

import React, { useEffect } from "react";
import { useAgentStore } from "@/store/agent-store";
import { FleetRadar } from "./fleet-radar";
import { SocPanel } from "./soc-panel";
import { FinopsPanel } from "./finops-panel";
import { GhostViewer } from "./ghost-viewer";

export const AdminLayout = () => {
    const {
        fetchAdminTenants, fetchGlobalSecurity, fetchGlobalFinance,
        fetchTenantPnL, fetchFinanceAlerts, fetchAdminLogs,
        connectGlobalSSE, disconnectGlobalSSE, selectedTenantSlug,
    } = useAgentStore();

    useEffect(() => {
        fetchAdminTenants();
        fetchGlobalSecurity();
        fetchGlobalFinance();
        fetchTenantPnL();
        fetchFinanceAlerts();
        fetchAdminLogs();
        connectGlobalSSE();

        // 30 saniyede bir yenile
        const interval = setInterval(() => {
            fetchAdminTenants();
            fetchGlobalSecurity();
            fetchGlobalFinance();
            fetchFinanceAlerts();
        }, 30000);

        return () => {
            clearInterval(interval);
            disconnectGlobalSSE();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <main className="flex-1 min-w-0 overflow-hidden border-l border-white/5 flex flex-col h-screen">
            {/* Header */}
            <div className="shrink-0 px-6 py-3 border-b border-red-500/20 bg-gradient-to-r from-red-500/5 via-transparent to-cyan-500/5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                        <span className="text-sm">&#9762;</span>
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white tracking-wider uppercase">
                            God Mode <span className="text-red-400">// Global Command Center</span>
                        </h1>
                        <p className="text-[10px] text-white/30 font-mono tracking-widest">
                            ADMIN PANEL &mdash; FULL SYSTEM OVERSIGHT
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <StatusIndicator />
                    </div>
                </div>
            </div>

            {/* 4 Panel Grid */}
            <div className="flex-1 min-h-0 flex">
                {/* Sol: Fleet Radar (280px) */}
                <div className="w-[280px] shrink-0 border-r border-white/5 overflow-y-auto"
                    style={{ background: "linear-gradient(180deg, rgba(0,255,136,0.02) 0%, transparent 50%)" }}>
                    <FleetRadar />
                </div>

                {/* Orta + Sag */}
                <div className="flex-1 min-w-0 flex flex-col">
                    {/* Ust: Orta (Ghost/Ameliyathane) + Sag (SOC) */}
                    <div className="flex-1 min-h-0 flex">
                        {/* Orta Panel — Ghost Viewer / Placeholder */}
                        <div className="flex-1 min-w-0 overflow-y-auto p-4"
                            style={{ background: "linear-gradient(180deg, rgba(0,240,255,0.02) 0%, transparent 50%)" }}>
                            {selectedTenantSlug ? (
                                <GhostViewer />
                            ) : (
                                <OperatingRoomPlaceholder />
                            )}
                        </div>

                        {/* Sag: SOC Panel (350px) */}
                        <div className="w-[350px] shrink-0 border-l border-white/5 overflow-y-auto"
                            style={{ background: "linear-gradient(180deg, rgba(255,45,85,0.03) 0%, transparent 50%)" }}>
                            <SocPanel />
                        </div>
                    </div>

                    {/* Alt: FinOps (h-56) */}
                    <div className="h-56 shrink-0 border-t border-white/5 overflow-y-auto"
                        style={{ background: "linear-gradient(0deg, rgba(57,255,20,0.03) 0%, transparent 100%)" }}>
                        <FinopsPanel />
                    </div>
                </div>
            </div>
        </main>
    );
};

const StatusIndicator = () => {
    const globalSecurity = useAgentStore((s) => s.globalSecurity);
    const status = globalSecurity?.globalStatus || "NORMAL";
    const colors: Record<string, string> = {
        NORMAL: "#39ff14", ELEVATED: "#ffb000", WARNING: "#ff6b35", CRITICAL: "#ff2d55",
    };
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
            style={{ borderColor: `${colors[status]}33`, background: `${colors[status]}08` }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: colors[status] }} />
            <span className="text-[10px] font-mono font-bold" style={{ color: colors[status] }}>
                {status}
            </span>
        </div>
    );
};

const OperatingRoomPlaceholder = () => (
    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
        <div className="text-4xl mb-3">&#128373;</div>
        <div className="text-sm text-white/60 font-mono">Tenant auswahlen zum Ghost Mode</div>
        <div className="text-[10px] text-white/30 mt-1">Fleet Radar'dan bir tenant'a tikla</div>
    </div>
);

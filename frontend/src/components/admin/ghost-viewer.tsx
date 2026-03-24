"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAgentStore } from "@/store/agent-store";
import type { TenantDetail, AdminGlobalEvent } from "@/store/types";

export const GhostViewer = () => {
    const selectedTenantSlug = useAgentStore((s) => s.selectedTenantSlug);
    const globalEvents = useAgentStore((s) => s.globalEvents);
    const fetchTenantDetail = useAgentStore((s) => s.fetchTenantDetail);
    const setSelectedTenant = useAgentStore((s) => s.setSelectedTenant);

    const [detail, setDetail] = useState<TenantDetail | null>(null);

    useEffect(() => {
        if (selectedTenantSlug) {
            fetchTenantDetail(selectedTenantSlug).then(setDetail);
        }
    }, [selectedTenantSlug, fetchTenantDetail]);

    const tenantEvents = globalEvents.filter(
        (e) => e.tenantSlug === selectedTenantSlug || e.clientId === selectedTenantSlug
    );

    if (!selectedTenantSlug || !detail) return null;

    const { client, stats } = detail;
    const marginColor = stats.margin > 50 ? "#39ff14" : stats.margin > 20 ? "#ffb000" : "#ff2d55";

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/25 flex items-center justify-center">
                        <span className="text-sm">&#128123;</span>
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white">
                            Ghost Mode: <span className="text-[#00f0ff]">{client.name}</span>
                        </h2>
                        <span className="text-[10px] font-mono text-white/30">
                            {client.slug} / {client.plan} / {client.product}
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => setSelectedTenant(null)}
                    className="text-[10px] text-white/30 hover:text-red-400 transition-colors px-2 py-1 rounded border border-white/8 hover:border-red-400/30"
                >
                    EXIT GHOST
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-2 mb-4">
                <StatCard label="Einnahmen" value={`$${stats.revenue}`} color="#39ff14" />
                <StatCard label="Ausgaben" value={`$${stats.expense.toFixed(2)}`} color="#ff6b35" />
                <StatCard label="P&L" value={`$${stats.pnl.toFixed(2)}`} color={stats.pnl >= 0 ? "#39ff14" : "#ff2d55"} />
                <StatCard label="Marge" value={`${stats.margin}%`} color={marginColor} />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
                <StatCard label="Workflows" value={String(stats.totalWorkflows)} color="#00f0ff" />
                <StatCard label="Security Events" value={String(stats.securityEventsThisMonth)} color="#ffb000" />
            </div>

            {/* Live Event Feed */}
            <div className="mt-4">
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-pulse" />
                    Live Agent Feed
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                    <AnimatePresence mode="popLayout">
                        {tenantEvents.slice(0, 30).map((evt, i) => (
                            <motion.div
                                key={`${evt.threadId}-${evt.timestamp}-${i}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/2 border border-white/5"
                            >
                                <EventDot type={evt.type} />
                                <span className="text-[10px] font-mono text-[#00f0ff]/70">{evt.agent || "system"}</span>
                                <span className="text-[10px] font-mono text-white/25">{evt.type}</span>
                                <span className="text-[9px] font-mono text-white/15 ml-auto">
                                    {new Date(evt.timestamp).toLocaleTimeString("de-DE")}
                                </span>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {tenantEvents.length === 0 && (
                        <div className="text-center py-6 text-white/15 text-[10px] font-mono">
                            Warte auf Events...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, color }: { label: string; value: string; color: string }) => (
    <div className="px-3 py-2 rounded-lg bg-white/3 border border-white/5">
        <div className="text-[9px] text-white/30 font-mono uppercase">{label}</div>
        <div className="text-sm font-bold font-mono mt-0.5" style={{ color }}>{value}</div>
    </div>
);

const EventDot = ({ type }: { type: string }) => {
    const color = type === "error" ? "#ff2d55" : type === "workflow_complete" ? "#39ff14" : "#00f0ff";
    return <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />;
};

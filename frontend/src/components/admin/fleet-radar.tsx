"use client";

import React from "react";
import { motion } from "framer-motion";
import { useAgentStore } from "@/store/agent-store";
import type { TenantSummary } from "@/store/types";

const PLAN_COLORS: Record<string, string> = {
    free: "#00f0ff", pro: "#39ff14", enterprise: "#ffb000", holding: "#d400ff",
};

const STATUS_CONFIG: Record<string, { color: string; label: string; pulse: boolean }> = {
    active:    { color: "#39ff14", label: "AKTIV",    pulse: true },
    warning:   { color: "#ffb000", label: "WARNUNG",  pulse: true },
    error:     { color: "#ff2d55", label: "FEHLER",   pulse: true },
    idle:      { color: "#666",    label: "IDLE",      pulse: false },
    suspended: { color: "#ff2d55", label: "GESPERRT", pulse: false },
};

export const FleetRadar = () => {
    const adminTenants = useAgentStore((s) => s.adminTenants);
    const selectedTenantSlug = useAgentStore((s) => s.selectedTenantSlug);
    const setSelectedTenant = useAgentStore((s) => s.setSelectedTenant);

    return (
        <div className="p-3">
            <div className="flex items-center gap-2 px-2 py-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-[#39ff14] animate-pulse" />
                <span className="text-[11px] font-bold text-white/70 tracking-wider uppercase">
                    Fleet Radar
                </span>
                <span className="ml-auto text-[10px] font-mono text-white/30">
                    {adminTenants.length} tenants
                </span>
            </div>

            <div className="space-y-1">
                {adminTenants.map((tenant) => (
                    <TenantRow
                        key={tenant.slug}
                        tenant={tenant}
                        isSelected={selectedTenantSlug === tenant.slug}
                        onSelect={() => setSelectedTenant(
                            selectedTenantSlug === tenant.slug ? null : tenant.slug
                        )}
                    />
                ))}

                {adminTenants.length === 0 && (
                    <div className="text-center py-8 text-white/20 text-xs font-mono">
                        Keine Tenants gefunden
                    </div>
                )}
            </div>
        </div>
    );
};

const TenantRow = ({ tenant, isSelected, onSelect }: {
    tenant: TenantSummary;
    isSelected: boolean;
    onSelect: () => void;
}) => {
    const liveStatus = tenant.status === "suspended" ? "suspended" : (tenant.liveStatus || "idle");
    const cfg = STATUS_CONFIG[liveStatus] || STATUS_CONFIG.idle;

    return (
        <motion.button
            whileHover={{ x: 2 }}
            onClick={onSelect}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-150
                ${isSelected
                    ? "bg-[#00f0ff]/8 border border-[#00f0ff]/25"
                    : "bg-white/2 border border-transparent hover:bg-white/4 hover:border-white/8"
                }`}
        >
            {/* Durum isigi */}
            <div className="relative shrink-0">
                <div
                    className={`w-2.5 h-2.5 rounded-full ${cfg.pulse ? "animate-pulse" : ""}`}
                    style={{ background: cfg.color }}
                />
                {cfg.pulse && (
                    <div
                        className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping opacity-30"
                        style={{ background: cfg.color }}
                    />
                )}
            </div>

            {/* Tenant bilgisi */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-white/80 truncate">
                        {tenant.name}
                    </span>
                    {tenant.isAdmin && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/15 text-red-400 font-bold">
                            ADMIN
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span
                        className="text-[9px] font-mono font-bold uppercase"
                        style={{ color: PLAN_COLORS[tenant.plan] || "#666" }}
                    >
                        {tenant.plan}
                    </span>
                    {tenant.lastAgent && (
                        <span className="text-[9px] text-white/30 font-mono truncate">
                            {tenant.lastAgent}
                        </span>
                    )}
                </div>
            </div>

            {/* Workflow sayaci */}
            {tenant.workflowsThisMonth > 0 && (
                <span className="text-[9px] font-mono text-white/25 shrink-0">
                    {tenant.workflowsThisMonth}
                </span>
            )}
        </motion.button>
    );
};

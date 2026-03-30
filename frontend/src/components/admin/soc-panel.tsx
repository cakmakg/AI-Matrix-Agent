"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAgentStore } from "@/store/agent-store";
import { IPManager } from "./ip-manager";

const SEVERITY_COLORS: Record<string, string> = {
    LOW: "#00f0ff", MEDIUM: "#ffb000", HIGH: "#ff6b35", CRITICAL: "#ff2d55",
};

export const SocPanel = () => {
    const globalSecurity = useAgentStore((s) => s.globalSecurity);
    const adminTenants = useAgentStore((s) => s.adminTenants);
    const haltTenant = useAgentStore((s) => s.haltTenant);
    const resumeTenant = useAgentStore((s) => s.resumeTenant);

    const [haltTarget, setHaltTarget] = useState<string | null>(null);
    const [haltReason, setHaltReason] = useState("");

    const handleHalt = async () => {
        if (!haltTarget || !haltReason.trim()) return;
        const ok = await haltTenant(haltTarget, haltReason.trim());
        if (ok) { setHaltTarget(null); setHaltReason(""); }
    };

    const status = globalSecurity?.globalStatus || "NORMAL";
    const statusColor = { NORMAL: "#39ff14", ELEVATED: "#ffb000", WARNING: "#ff6b35", CRITICAL: "#ff2d55" }[status] || "#39ff14";

    return (
        <div className="p-3 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2 px-2 py-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: statusColor }} />
                <span className="text-[11px] font-bold text-white/70 tracking-wider uppercase">
                    SOC // Cyber Defense
                </span>
            </div>

            {/* Threat Summary */}
            {globalSecurity && (
                <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(globalSecurity.severityCounts).map(([sev, count]) => (
                        <div key={sev} className="px-2 py-1.5 rounded bg-white/3 border border-white/5">
                            <div className="text-[8px] font-mono uppercase" style={{ color: SEVERITY_COLORS[sev] }}>{sev}</div>
                            <div className="text-sm font-bold font-mono text-white/80">{count}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Kill Switch Zone */}
            <div className="border border-red-500/15 rounded-lg p-2.5 bg-red-500/3">
                <div className="text-[10px] font-bold text-red-400/70 uppercase tracking-wider mb-2">
                    Kill Switch
                </div>

                {/* Suspended tenants */}
                {adminTenants.filter(t => t.status === "suspended").map(t => (
                    <div key={t.slug} className="flex items-center gap-2 mb-1.5 px-2 py-1.5 rounded bg-red-500/8 border border-red-500/15">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-[10px] text-red-300 font-mono flex-1 truncate">{t.name}</span>
                        <button
                            onClick={() => resumeTenant(t.slug)}
                            className="text-[9px] px-2 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/25 transition-colors"
                        >
                            RESUME
                        </button>
                    </div>
                ))}

                {/* Halt Modal */}
                <AnimatePresence>
                    {haltTarget && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 space-y-2"
                        >
                            <div className="text-[10px] text-red-300/80 font-mono">
                                HALT: {adminTenants.find(t => t.slug === haltTarget)?.name}
                            </div>
                            <textarea
                                value={haltReason}
                                onChange={(e) => setHaltReason(e.target.value)}
                                placeholder="Askiya alma nedeni..."
                                className="w-full text-[11px] bg-black/50 border border-red-500/20 rounded px-2 py-1.5 text-white/70 placeholder:text-white/20 resize-none h-16 focus:outline-none focus:border-red-500/50"
                            />
                            <div className="flex gap-1.5">
                                <button
                                    onClick={handleHalt}
                                    disabled={!haltReason.trim()}
                                    className="flex-1 text-[10px] py-1.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-30 transition-all font-bold"
                                >
                                    HALT TENANT
                                </button>
                                <button
                                    onClick={() => { setHaltTarget(null); setHaltReason(""); }}
                                    className="px-3 text-[10px] py-1.5 rounded bg-white/5 text-white/40 border border-white/8 hover:bg-white/8 transition-all"
                                >
                                    ABBRUCH
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!haltTarget && (
                    <select
                        onChange={(e) => e.target.value && setHaltTarget(e.target.value)}
                        value=""
                        className="w-full mt-2 text-[10px] bg-black/50 border border-red-500/15 rounded px-2 py-1.5 text-white/40 focus:outline-none focus:border-red-500/30 appearance-none cursor-pointer"
                    >
                        <option value="">Tenant auswahlen zum sperren...</option>
                        {adminTenants.filter(t => t.status !== "suspended" && !t.isAdmin).map(t => (
                            <option key={t.slug} value={t.slug}>{t.name} ({t.plan})</option>
                        ))}
                    </select>
                )}
            </div>

            {/* IP Firewall */}
            <IPManager />

            {/* Recent Events */}
            <div>
                <div className="text-[10px] font-mono text-white/30 uppercase tracking-wider mb-2">
                    Recent Threats (24h)
                </div>
                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                    {(globalSecurity?.recentEvents || []).slice(0, 20).map((evt) => (
                        <div key={evt.id} className="flex items-center gap-2 px-2 py-1 rounded bg-white/2">
                            <div
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ background: SEVERITY_COLORS[evt.severity] || "#666" }}
                            />
                            <span className="text-[9px] font-mono text-white/40 truncate flex-1">{evt.eventType}</span>
                            <span className="text-[9px] font-mono text-white/20">{evt.threadId?.slice(0, 8)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

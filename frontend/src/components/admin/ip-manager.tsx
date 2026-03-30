"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAgentStore } from "@/store/agent-store";

export const IPManager = () => {
    const bannedIPs = useAgentStore((s) => s.bannedIPs);
    const fetchBannedIPs = useAgentStore((s) => s.fetchBannedIPs);
    const banIP = useAgentStore((s) => s.banIP);
    const unbanIP = useAgentStore((s) => s.unbanIP);

    const [showForm, setShowForm] = useState(false);
    const [ip, setIp] = useState("");
    const [reason, setReason] = useState("");
    const [duration, setDuration] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => { fetchBannedIPs(); }, [fetchBannedIPs]);

    const handleBan = async () => {
        if (!ip.trim() || !reason.trim()) return;
        setLoading(true);
        const durationHours = duration ? parseInt(duration) : undefined;
        const ok = await banIP(ip.trim(), reason.trim(), durationHours);
        if (ok) { setIp(""); setReason(""); setDuration(""); setShowForm(false); }
        setLoading(false);
    };

    const SOURCE_COLORS: Record<string, string> = {
        MANUAL: "#00f0ff",
        AUTO_PROMPT_INJECTION: "#ff2d55",
        AUTO_DDOS: "#ff6b35",
        AUTO_ABUSE: "#ffb000",
    };

    return (
        <div className="border border-white/5 rounded-lg p-2.5 bg-white/2">
            <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                    IP Firewall ({bannedIPs.length})
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="text-[9px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                >
                    {showForm ? "ABBRUCH" : "+ BAN IP"}
                </button>
            </div>

            {/* Ban Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-2 space-y-1.5 overflow-hidden"
                    >
                        <input
                            value={ip}
                            onChange={(e) => setIp(e.target.value)}
                            placeholder="IP Adresse (z.B. 192.168.1.1)"
                            className="w-full text-[10px] bg-black/50 border border-red-500/15 rounded px-2 py-1.5 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-red-500/40"
                        />
                        <input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Grund (z.B. Prompt Injection Versuch)"
                            className="w-full text-[10px] bg-black/50 border border-red-500/15 rounded px-2 py-1.5 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-red-500/40"
                        />
                        <div className="flex gap-1.5">
                            <input
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                placeholder="Dauer (Std) — leer = permanent"
                                type="number"
                                className="flex-1 text-[10px] bg-black/50 border border-white/10 rounded px-2 py-1.5 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/20"
                            />
                            <button
                                onClick={handleBan}
                                disabled={!ip.trim() || !reason.trim() || loading}
                                className="px-3 text-[10px] py-1.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-30 transition-all font-bold"
                            >
                                {loading ? "..." : "BAN"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Banned IP List */}
            <div className="space-y-0.5 max-h-36 overflow-y-auto">
                {bannedIPs.map((entry) => (
                    <div key={entry._id} className="flex items-center gap-2 px-2 py-1 rounded bg-white/2 hover:bg-white/4 group">
                        <div
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: SOURCE_COLORS[entry.source] || "#666" }}
                        />
                        <span className="text-[10px] font-mono text-red-300/80 shrink-0">{entry.ip}</span>
                        <span className="text-[9px] text-white/25 truncate flex-1">{entry.reason}</span>
                        {entry.expiresAt && (
                            <span className="text-[8px] text-white/15 font-mono shrink-0">
                                {new Date(entry.expiresAt).toLocaleDateString("de-DE")}
                            </span>
                        )}
                        <button
                            onClick={() => unbanIP(entry.ip)}
                            className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400/60 border border-green-500/15 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-500/20 shrink-0"
                        >
                            UNBAN
                        </button>
                    </div>
                ))}

                {bannedIPs.length === 0 && (
                    <div className="text-center py-3 text-white/15 text-[9px] font-mono">
                        Keine gesperrten IPs
                    </div>
                )}
            </div>
        </div>
    );
};

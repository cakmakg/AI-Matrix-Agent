"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ShieldAlert, ShieldCheck, ShieldX, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import type { SecurityStatus, SecurityEventItem, SystemSecurityStatus } from "@/store/agent-store";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000";

// ─── Renk Haritaları ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SystemSecurityStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
    NORMAL:   { label: "Normal",   color: "#39ff14", bg: "rgba(57,255,20,0.06)",   border: "rgba(57,255,20,0.25)",  icon: <ShieldCheck size={20} /> },
    ELEVATED: { label: "Erhöht",   color: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.25)", icon: <Shield size={20} /> },
    WARNING:  { label: "Warnung",  color: "#ff6b00", bg: "rgba(255,107,0,0.06)",  border: "rgba(255,107,0,0.25)",  icon: <ShieldAlert size={20} /> },
    CRITICAL: { label: "Kritisch", color: "#ff2d55", bg: "rgba(255,45,85,0.06)",  border: "rgba(255,45,85,0.25)",  icon: <ShieldX size={20} /> },
};

const SEVERITY_COLOR: Record<string, string> = {
    LOW:      "#39ff14",
    MEDIUM:   "#f59e0b",
    HIGH:     "#ff6b00",
    CRITICAL: "#ff2d55",
};

const EVENT_LABEL: Record<string, string> = {
    THREAT_BLOCKED:   "Bedrohung blockiert",
    THREAT_SANITIZED: "Eingabe bereinigt",
    ACTION_REJECTED:  "Aktion abgelehnt",
    RATE_LIMIT_HIT:   "Rate-Limit erreicht",
    INVALID_API_KEY:  "Ungültiger API-Key",
};

// ─── Yardımcı Bileşenler ─────────────────────────────────────────────────────

function KpiCard({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
    return (
        <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-[11px] text-white/40 uppercase tracking-wider">{label}</div>
            <div className="text-3xl font-bold font-mono" style={{ color }}>{value}</div>
            {sub && <div className="text-[10px] text-white/30">{sub}</div>}
        </div>
    );
}

function ThreatBar({ score }: { score: number }) {
    const color = score >= 8 ? "#ff2d55" : score >= 5 ? "#ff6b00" : score >= 3 ? "#f59e0b" : "#39ff14";
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
                <span className="text-white/40">Bedrohungsscore</span>
                <span className="font-mono font-bold" style={{ color }}>{score}/10</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                    className="h-full rounded-full"
                    style={{ background: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${score * 10}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                />
            </div>
        </div>
    );
}

function EventRow({ event, expanded, onToggle }: { event: SecurityEventItem; expanded: boolean; onToggle: () => void }) {
    const color = SEVERITY_COLOR[event.severity] ?? "#fff";
    const time  = new Date(event.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    return (
        <div
            className="rounded-lg overflow-hidden cursor-pointer"
            style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${color}22` }}
            onClick={onToggle}
        >
            <div className="flex items-center gap-3 px-3 py-2.5">
                {/* Severity dot */}
                <div className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: color }} />

                {/* Label */}
                <span className="text-[12px] font-medium text-white/80 flex-1">
                    {EVENT_LABEL[event.eventType] ?? event.eventType}
                </span>

                {/* Threat score */}
                {event.threatScore > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${color}22`, color }}>
                        {event.threatScore}/10
                    </span>
                )}

                {/* Ajan */}
                {event.agentId && (
                    <span className="text-[10px] text-white/30 font-mono">{event.agentId}</span>
                )}

                {/* Saat */}
                <span className="text-[10px] text-white/25 font-mono shrink-0">{time}</span>

                {expanded ? <ChevronUp size={12} className="text-white/30" /> : <ChevronDown size={12} className="text-white/30" />}
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="px-3 pb-3 space-y-1.5 border-t border-white/5"
                    >
                        {event.details && (
                            <div className="pt-2 text-[11px] text-white/50">{event.details}</div>
                        )}
                        {event.rawInput && (
                            <div className="font-mono text-[10px] px-2 py-1.5 rounded bg-white/3 text-white/30 break-all">
                                &quot;{event.rawInput}&quot;
                            </div>
                        )}
                        {event.threadId && (
                            <div className="text-[10px] text-white/20 font-mono">Thread: {event.threadId}</div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Ana Bileşen ──────────────────────────────────────────────────────────────

export const SecurityView = () => {
    const [data, setData]         = useState<SecurityStatus | null>(null);
    const [loading, setLoading]   = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    const fetch_ = useCallback(async () => {
        try {
            const r = await fetch(`${BACKEND}/api/security/status`);
            if (r.ok) {
                setData(await r.json());
                setLastUpdate(new Date());
            }
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, []);

    // İlk yükleme + 30 sn otomatik yenileme
    useEffect(() => {
        fetch_();
        const id = setInterval(fetch_, 30_000);
        return () => clearInterval(id);
    }, [fetch_]);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-white/30 text-sm animate-pulse">Sicherheitsdaten werden geladen...</div>
            </div>
        );
    }

    const d = data ?? {
        systemStatus: "NORMAL" as SystemSecurityStatus,
        maxThreatScore: 0,
        eventCounts: { THREAT_BLOCKED: 0, THREAT_SANITIZED: 0, ACTION_REJECTED: 0, RATE_LIMIT_HIT: 0, INVALID_API_KEY: 0 },
        severityCounts: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
        queue: { PENDING: 0, PROCESSING: 0, SUCCESS: 0, FAILED: 0, REJECTED: 0 },
        recentEvents: [],
    };

    const statusCfg = STATUS_CONFIG[d.systemStatus];
    const total24h  = Object.values(d.eventCounts).reduce((a, b) => a + b, 0);

    return (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#080e1a" }}>
            {/* ─── Header ── */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-white/6 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${statusCfg.color}15`, border: `1px solid ${statusCfg.color}30` }}>
                        <span style={{ color: statusCfg.color }}>{statusCfg.icon}</span>
                    </div>
                    <div>
                        <div className="text-white font-semibold text-[15px]">Sicherheitszentrum</div>
                        <div className="text-white/35 text-[11px]">MOAT Verteidigungsschichten — Echtzeit-Überwachung</div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {lastUpdate && (
                        <span className="text-[10px] text-white/25 font-mono">
                            Aktualisiert: {lastUpdate.toLocaleTimeString("de-DE")}
                        </span>
                    )}
                    <button
                        onClick={fetch_}
                        className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <RefreshCw size={13} className="text-white/40 hover:text-white/70" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* ─── Sistem Durumu Kartı ── */}
                <motion.div
                    className="rounded-2xl p-5"
                    style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.border}` }}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <span style={{ color: statusCfg.color }}>{statusCfg.icon}</span>
                            <div>
                                <div className="text-white font-bold text-lg">System: {statusCfg.label}</div>
                                <div className="text-white/40 text-[11px]">{total24h} Ereignisse in den letzten 24 Stunden</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[11px] text-white/40">Kritisch / Hoch</div>
                            <div className="font-mono text-xl font-bold" style={{ color: statusCfg.color }}>
                                {d.severityCounts.CRITICAL + d.severityCounts.HIGH}
                            </div>
                        </div>
                    </div>
                    <ThreatBar score={d.maxThreatScore} />
                </motion.div>

                {/* ─── KPI Satırı ── */}
                <div className="grid grid-cols-5 gap-3">
                    <KpiCard label="Blockiert"  value={d.eventCounts.THREAT_BLOCKED}   color="#ff2d55" sub="Workflow gestoppt" />
                    <KpiCard label="Bereinigt"  value={d.eventCounts.THREAT_SANITIZED} color="#f59e0b" sub="Sanitize & weiter" />
                    <KpiCard label="Abgelehnt"  value={d.eventCounts.ACTION_REJECTED}  color="#ff6b00" sub="ActionQueue" />
                    <KpiCard label="Rate-Limit" value={d.eventCounts.RATE_LIMIT_HIT}   color="#a78bfa" sub="Zu viele Anfragen" />
                    <KpiCard label="Unbekannte Keys" value={d.eventCounts.INVALID_API_KEY} color="#00f0ff" sub="Unauth. Zugriff" />
                </div>

                {/* ─── İki Kolon: ActionQueue + Severity ── */}
                <div className="grid grid-cols-2 gap-4">

                    {/* ActionQueue Durumu */}
                    <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="text-[11px] text-white/40 uppercase tracking-wider">Aktions-Warteschlange</div>
                        {([
                            ["PENDING",    d.queue.PENDING,    "#f59e0b"],
                            ["PROCESSING", d.queue.PROCESSING, "#00f0ff"],
                            ["SUCCESS",    d.queue.SUCCESS,    "#39ff14"],
                            ["FAILED",     d.queue.FAILED,     "#ff2d55"],
                            ["REJECTED",   d.queue.REJECTED,   "#ff6b00"],
                        ] as [string, number, string][]).map(([label, val, color]) => (
                            <div key={label} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                                    <span className="text-[12px] text-white/50">{label}</span>
                                </div>
                                <span className="font-mono text-[13px] font-bold" style={{ color }}>{val}</span>
                            </div>
                        ))}
                    </div>

                    {/* Severity Dağılımı */}
                    <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="text-[11px] text-white/40 uppercase tracking-wider">Schweregrad-Verteilung</div>
                        {([
                            ["CRITICAL", d.severityCounts.CRITICAL, "#ff2d55"],
                            ["HIGH",     d.severityCounts.HIGH,     "#ff6b00"],
                            ["MEDIUM",   d.severityCounts.MEDIUM,   "#f59e0b"],
                            ["LOW",      d.severityCounts.LOW,      "#39ff14"],
                        ] as [string, number, string][]).map(([label, val, color]) => {
                            const pct = total24h > 0 ? Math.round((val / total24h) * 100) : 0;
                            return (
                                <div key={label} className="space-y-0.5">
                                    <div className="flex justify-between text-[11px]">
                                        <span style={{ color }} className="font-medium">{label}</span>
                                        <span className="text-white/40 font-mono">{val} ({pct}%)</span>
                                    </div>
                                    <div className="h-1 rounded-full bg-white/5">
                                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ─── MOAT Katman Durumu ── */}
                <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="text-[11px] text-white/40 uppercase tracking-wider mb-3">MOAT Verteidigungsschichten</div>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { layer: "Schicht 1",  name: "Prompt-Injection-Schutz",     desc: "GuardrailNode — regex + regelbasiert",              active: true  },
                            { layer: "Schicht 1b", name: "Web-Inhalts-Bereinigung",      desc: "ScraperAgent — HTML & Injection-Filter",           active: true  },
                            { layer: "Schicht 2",  name: "Adversarial ML-Abwehr",        desc: "Noch nicht implementiert — kein ML-Modell",        active: false },
                            { layer: "Schicht 3",  name: "Rate-Limiting",                desc: "5 Ebenen — Global / Workflow / Approve / Social",   active: true  },
                            { layer: "Schicht 3b", name: "Tenant-Authentifizierung",     desc: "Unbekannte API-Keys → 401",                        active: true  },
                            { layer: "Schicht 4",  name: "Agenten-Isolation",            desc: "ActionQueue + Worker — kein direkter API-Zugriff", active: true  },
                        ].map((l) => (
                            <div key={l.layer} className="flex items-start gap-2.5 p-2.5 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                                <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${l.active ? "bg-[#39ff14]" : "bg-white/20"}`} />
                                <div>
                                    <div className="text-[11px] text-white/30 font-mono">{l.layer}</div>
                                    <div className={`text-[12px] font-medium ${l.active ? "text-white/80" : "text-white/30"}`}>{l.name}</div>
                                    <div className="text-[10px] text-white/30">{l.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── Son Olaylar ── */}
                <div>
                    <div className="text-[11px] text-white/40 uppercase tracking-wider mb-3">
                        Letzte Ereignisse (24 Stunden)
                    </div>

                    {d.recentEvents.length === 0 ? (
                        <div className="text-center py-8 text-white/20 text-sm">
                            Keine Sicherheitsereignisse in den letzten 24 Stunden.
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {d.recentEvents.map((ev) => (
                                <EventRow
                                    key={ev.id}
                                    event={ev}
                                    expanded={expanded === ev.id}
                                    onToggle={() => setExpanded(expanded === ev.id ? null : ev.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAgentStore } from "@/store/agent-store";
import type { MissionSummary } from "@/store/types";
import { Search, FileText, ChevronLeft, ChevronRight, RefreshCw, ExternalLink } from "lucide-react";
import { ReportFullscreenModal } from "./report-fullscreen-modal";

type StatusFilter = "all" | "AWAITING_APPROVAL" | "APPROVED" | "REJECTED" | "PUBLISHED";

const STATUS_LABELS: Record<string, string> = {
    AWAITING_APPROVAL: "Ausstehend",
    APPROVED:          "Genehmigt",
    REJECTED:          "Abgelehnt",
    PUBLISHED:         "Veröffentlicht",
};

const STATUS_COLORS: Record<string, string> = {
    AWAITING_APPROVAL: "#ffb000",
    APPROVED:          "#39ff14",
    REJECTED:          "#ff2d55",
    PUBLISHED:         "#00f0ff",
};

const PAGE_SIZE = 25;

export const BerichteView = () => {
    const { apiKey } = useAgentStore();
    const [missions, setMissions]     = useState<MissionSummary[]>([]);
    const [total, setTotal]           = useState(0);
    const [page, setPage]             = useState(0);
    const [loading, setLoading]       = useState(false);
    const [query, setQuery]           = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");
    const [statusFilter, setStatus]   = useState<StatusFilter>("all");
    const [selected, setSelected]     = useState<MissionSummary | null>(null);
    const debounceTimer               = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetch_ = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
            if (debouncedQ)                   params.set("q", debouncedQ);
            if (statusFilter !== "all")       params.set("status", statusFilter);
            const res = await fetch(`/api/missions?${params}`, {
                headers: { "x-api-key": apiKey ?? "" },
            });
            if (res.ok) {
                const data = await res.json();
                setMissions(data.missions ?? data ?? []);
                setTotal(data.total ?? (data.missions ?? data ?? []).length);
            }
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, [apiKey, page, debouncedQ, statusFilter]);

    useEffect(() => { fetch_(); }, [fetch_]);

    // Debounce search input
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => { setDebouncedQ(query); setPage(0); }, 350);
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, [query]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const STATUS_TABS: { key: StatusFilter; label: string }[] = [
        { key: "all",                label: "Alle" },
        { key: "AWAITING_APPROVAL",  label: "Ausstehend" },
        { key: "APPROVED",           label: "Genehmigt" },
        { key: "PUBLISHED",          label: "Veröffentlicht" },
        { key: "REJECTED",           label: "Abgelehnt" },
    ];

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 shrink-0 bg-white">
                <div className="flex items-center gap-3">
                    <FileText size={16} className="text-indigo-500" />
                    <span className="text-[13px] font-bold text-gray-900">
                        Berichte-Archiv
                    </span>
                    {total > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-medium text-gray-500">
                            {total}
                        </span>
                    )}
                </div>
                <button onClick={fetch_} disabled={loading}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-30">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Search & Filters */}
            <div className="px-6 py-3 border-b border-gray-200 space-y-3 shrink-0 bg-white">
                <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Berichte durchsuchen…"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-[12px] text-gray-800 placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
                    />
                </div>
                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                    {STATUS_TABS.map(tab => (
                        <button key={tab.key} onClick={() => { setStatus(tab.key); setPage(0); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors border ${
                                statusFilter === tab.key
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                    : "border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                            }`}
                        >
                            {tab.key !== "all" && (
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[tab.key] }} />
                            )}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto scrollbar-styled" style={{ background: "#F9FAFB" }}>
                {loading && missions.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-[12px] text-gray-400 animate-pulse">Lade Berichte…</p>
                    </div>
                ) : missions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
                        <FileText size={40} className="text-gray-300" />
                        <p className="text-[13px] text-gray-500">Keine Berichte gefunden</p>
                        {query && (
                            <button onClick={() => setQuery("")}
                                className="text-[11px] text-indigo-500 hover:text-indigo-700 transition-colors">
                                Suche zurücksetzen
                            </button>
                        )}
                    </div>
                ) : (
                    <table className="w-full text-[12px]">
                        <thead className="sticky top-0 z-10 bg-white shadow-sm">
                            <tr className="border-b border-gray-200 text-gray-500 text-[10px] uppercase tracking-wider">
                                <th className="text-left px-6 py-2.5 font-semibold">Datum</th>
                                <th className="text-left px-3 py-2.5 font-semibold">Aufgabe</th>
                                <th className="text-left px-3 py-2.5 font-semibold">Thread-ID</th>
                                <th className="text-center px-3 py-2.5 font-semibold">Status</th>
                                <th className="text-center px-3 py-2.5 w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {missions.map(m => (
                                <tr key={m.threadId}
                                    onClick={() => setSelected(m)}
                                    className="border-b border-gray-100 bg-white hover:bg-gray-50 cursor-pointer transition-colors">
                                    <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                                        {new Date(m.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                                        <span className="ml-1 text-gray-400">
                                            {new Date(m.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-gray-800 max-w-70">
                                        <span className="truncate block font-medium">{m.task}</span>
                                        {m.contentPreview && (
                                            <span className="block text-gray-400 text-[11px] truncate mt-0.5">{m.contentPreview}</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-3 text-gray-400 text-[10px] font-mono">
                                        {m.threadId.slice(0, 12)}…
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                            style={{
                                                background: `${STATUS_COLORS[m.status] ?? "#9CA3AF"}1f`,
                                                color: STATUS_COLORS[m.status] ?? "#6B7280",
                                                border: `1px solid ${STATUS_COLORS[m.status] ?? "#9CA3AF"}55`,
                                            }}>
                                            {STATUS_LABELS[m.status] ?? m.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <ExternalLink size={12} className="text-gray-400 hover:text-indigo-600 transition-colors inline" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 px-6 py-3 border-t border-gray-200 shrink-0 bg-white">
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 disabled:opacity-25 transition-colors">
                        <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const p = Math.max(0, Math.min(page - 2 + i, totalPages - 5 + i));
                        return (
                            <button key={p} onClick={() => setPage(p)}
                                className={`w-7 h-7 rounded text-[11px] font-semibold transition-colors ${page === p ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}>
                                {p + 1}
                            </button>
                        );
                    })}
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 disabled:opacity-25 transition-colors">
                        <ChevronRight size={14} />
                    </button>
                </div>
            )}

            {/* Fullscreen modal */}
            {selected && (
                <ReportFullscreenModal mission={selected} onClose={() => setSelected(null)} />
            )}
        </div>
    );
};

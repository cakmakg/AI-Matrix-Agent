"use client";

import React, { useEffect, useState } from "react";
import { useAgentStore } from "@/store/agent-store";
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis,
} from "recharts";
import { Twitter, Linkedin, Mail, FileText, Calendar } from "lucide-react";

interface ScheduledPostSummary {
    id: string;
    platform: string;
    content: string;
    scheduledAt: string;
    status: string;
}

const CHANNEL_COLORS: Record<string, string> = {
    twitter:       "#00f0ff",
    linkedin:      "#0077b5",
    cold_outreach: "#39ff14",
    rfp:           "#bf5fff",
};

const CHANNEL_LABELS: Record<string, string> = {
    twitter:       "Twitter/X",
    linkedin:      "LinkedIn",
    cold_outreach: "Cold Outreach",
    rfp:           "RFP-Antwort",
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
    twitter:       <Twitter size={11} />,
    linkedin:      <Linkedin size={11} />,
    cold_outreach: <Mail size={11} />,
    rfp:           <FileText size={11} />,
};

const STATUS_LABELS: Record<string, string> = {
    AWAITING_APPROVAL: "Ausstehend",
    SCHEDULED:         "Geplant",
    PUBLISHED:         "Veröffentlicht",
    REJECTED:          "Abgelehnt",
};

export const GrowthAnalytics = () => {
    const { scheduledPosts, fetchScheduledPosts } = useAgentStore();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        fetchScheduledPosts().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const posts: ScheduledPostSummary[] = (scheduledPosts ?? []).map((p: { _id: string; platforms: string[]; content: string; scheduledAt: string; status: string }) => ({
        id: p._id,
        platform: p.platforms?.[0] ?? "twitter",
        content: p.content?.slice(0, 80) ?? "",
        scheduledAt: p.scheduledAt,
        status: p.status,
    }));

    // Channel mix pie
    const channelCounts: Record<string, number> = {};
    posts.forEach(p => { channelCounts[p.platform] = (channelCounts[p.platform] ?? 0) + 1; });
    const pieData = Object.entries(channelCounts).map(([k, v]) => ({ name: CHANNEL_LABELS[k] ?? k, value: v, key: k }));

    // Status bar
    const statusCounts: Record<string, number> = {};
    posts.forEach(p => { statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1; });
    const barData = Object.entries(statusCounts).map(([k, v]) => ({ status: STATUS_LABELS[k] ?? k, count: v }));

    // Calendar grid: next 14 days
    const today = new Date();
    const calDays = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const key = d.toISOString().split("T")[0];
        const dayPosts = posts.filter(p => p.scheduledAt?.startsWith(key));
        return { date: d, key, posts: dayPosts };
    });

    return (
        <div className="p-6 space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: "Gesamt Posts",   value: posts.length,                                              color: "#0EA5E9" },
                    { label: "Ausstehend",     value: posts.filter(p => p.status === "AWAITING_APPROVAL").length, color: "#F59E0B" },
                    { label: "Geplant",        value: posts.filter(p => p.status === "SCHEDULED").length,         color: "#10B981" },
                    { label: "Veröffentlicht", value: posts.filter(p => p.status === "PUBLISHED").length,         color: "#8B5CF6" },
                ].map(kpi => (
                    <div key={kpi.label} className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{kpi.label}</p>
                        <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Channel mix */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Kanal-Mix</p>
                    {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                                    {pieData.map((entry, i) => (
                                        <Cell key={i} fill={CHANNEL_COLORS[entry.key] ?? "#0EA5E9"} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-50">
                            <p className="text-[12px] text-gray-400">Keine Daten verfügbar</p>
                        </div>
                    )}
                </div>

                {/* Status bar */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Post-Status</p>
                    {barData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 16 }}>
                                <XAxis type="number" tick={{ fontSize: 10, fill: "#6B7280" }} />
                                <YAxis type="category" dataKey="status" tick={{ fontSize: 10, fill: "#374151" }} width={90} />
                                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12 }} />
                                <Bar dataKey="count" fill="#6366F1" radius={[0,4,4,0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-50">
                            <p className="text-[12px] text-gray-400">Keine Daten verfügbar</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Content calendar */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Calendar size={13} className="text-gray-500" />
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Content-Kalender (14 Tage)</p>
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {calDays.map(day => (
                        <div key={day.key} className={`rounded-lg p-2 min-h-14 border transition-colors ${day.posts.length > 0 ? "border-indigo-200 bg-indigo-50/40" : "border-gray-200 bg-gray-50"}`}>
                            <p className="text-[10px] text-gray-500 font-semibold mb-1">
                                {day.date.toLocaleDateString("de-DE", { weekday: "short", day: "numeric" })}
                            </p>
                            {day.posts.map((p, i) => (
                                <div key={i} className="flex items-center gap-1 mb-0.5">
                                    <span style={{ color: CHANNEL_COLORS[p.platform] ?? "#0EA5E9" }}>
                                        {CHANNEL_ICONS[p.platform] ?? <FileText size={10} />}
                                    </span>
                                    <span className="text-[9px] text-gray-700 truncate">{p.content.slice(0, 18)}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {loading && (
                <div className="text-center py-4">
                    <p className="text-[12px] text-gray-400 animate-pulse">Lade Wachstumsdaten…</p>
                </div>
            )}
        </div>
    );
};

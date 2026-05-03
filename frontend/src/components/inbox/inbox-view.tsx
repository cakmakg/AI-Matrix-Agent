"use client";

import React, { useEffect, useState } from "react";
import { useAgentStore } from "@/store/agent-store";
import { HitlCard, SupportCard, CampaignCard } from "./approval-card";
import type { DrawerItem } from "@/store/agent-store";
import { RefreshCw, Inbox } from "lucide-react";

type FilterTab = "all" | "hitl" | "support" | "campaign";

export const InboxView = () => {
    const {
        workflowPhase,
        threadId,
        missionMessage,
        pendingContent,
        missions,
        supportTickets,
        campaignDrafts,
        fetchSupportTickets,
        fetchCampaignDrafts,
        fetchMissions,
        setDrawerItem,
        setActiveView,
    } = useAgentStore();

    const [activeTab, setActiveTab] = useState<FilterTab>("all");
    const [loading, setLoading] = useState(false);

    // In-memory HITL (active live workflow)
    const hasInMemoryHitl = workflowPhase === "AWAITING_APPROVAL" && !!threadId;
    const hitlTask = missionMessage ?? "Pending Report";
    const hitlPreview = pendingContent?.slice(0, 160) ?? "Report awaiting review...";

    // DB-backed HITL missions (AWAITING_APPROVAL in MongoDB, not already shown by in-memory card)
    const dbHitlMissions = missions.filter(
        (m) => m.status === "AWAITING_APPROVAL" && m.threadId !== threadId
    );

    const refresh = async () => {
        setLoading(true);
        await Promise.all([fetchSupportTickets(), fetchCampaignDrafts(), fetchMissions()]);
        setLoading(false);
    };

    useEffect(() => {
        refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSelect = (item: DrawerItem) => {
        setDrawerItem(item);
    };

    // Build filtered lists
    const showHitl     = activeTab === "all" || activeTab === "hitl";
    const showSupport  = activeTab === "all" || activeTab === "support";
    const showCampaign = activeTab === "all" || activeTab === "campaign";

    const hitlCount     = (hasInMemoryHitl ? 1 : 0) + dbHitlMissions.length;
    const supportCount  = supportTickets.length;
    const campaignCount = campaignDrafts.filter((c) => c.status === "AWAITING_APPROVAL").length;
    const totalCount    = hitlCount + supportCount + campaignCount;

    const tabs: { key: FilterTab; label: string; count: number }[] = [
        { key: "all",      label: "Alle",      count: totalCount    },
        { key: "hitl",     label: "HITL",      count: hitlCount     },
        { key: "support",  label: "Support",   count: supportCount  },
        { key: "campaign", label: "Kampagne",  count: campaignCount },
    ];

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                    <Inbox size={16} className="text-neon-blue/70" />
                    <span className="font-mono text-[13px] font-bold text-white/85 uppercase tracking-widest">
                        Posteingang
                    </span>
                    {totalCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-alert-red font-mono text-[9px] font-bold text-white">
                            {totalCount}
                        </span>
                    )}
                </div>
                <button
                    onClick={refresh}
                    disabled={loading}
                    className="p-2 rounded-lg hover:bg-white/8 text-white/50 hover:text-white/80 transition-colors disabled:opacity-30"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 px-5 py-3 border-b border-white/10 shrink-0">
                {tabs.map(({ key, label, count }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-[10px] font-semibold tracking-wider transition-colors
                            ${activeTab === key
                                ? "bg-neon-blue/15 border border-neon-blue/30 text-neon-blue"
                                : "text-white/50 hover:text-white/75 hover:bg-white/6 border border-transparent"
                            }`}
                    >
                        {label}
                        {count > 0 && (
                            <span className={`min-w-[16px] h-4 px-1.5 rounded-full font-mono text-[8px] flex items-center justify-center font-bold
                                ${activeTab === key ? "bg-neon-blue/25 text-neon-blue" : "bg-white/12 text-white/60"}`}>
                                {count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Card list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 scrollbar-styled">
                {/* HITL — in-memory (active workflow) */}
                {showHitl && hasInMemoryHitl && threadId && (
                    <HitlCard
                        threadId={threadId}
                        task={hitlTask}
                        contentPreview={hitlPreview}
                        createdAt={new Date().toISOString()}
                        onSelect={handleSelect}
                    />
                )}

                {/* HITL — from MongoDB (persisted, page-reload safe) */}
                {showHitl && dbHitlMissions.map((m) => (
                    <HitlCard
                        key={m.threadId}
                        threadId={m.threadId}
                        task={m.task}
                        contentPreview={m.contentPreview}
                        createdAt={m.createdAt}
                        onSelect={handleSelect}
                    />
                ))}

                {/* Support Tickets */}
                {showSupport && supportTickets.map((ticket) => (
                    <SupportCard key={ticket._id} ticket={ticket} onSelect={handleSelect} />
                ))}

                {/* Campaigns */}
                {showCampaign && campaignDrafts
                    .filter((c) => c.status === "AWAITING_APPROVAL")
                    .map((campaign) => (
                        <CampaignCard key={campaign._id} campaign={campaign} onSelect={handleSelect} />
                    ))}

                {/* Empty state */}
                {totalCount === 0 && (
                    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center py-16">
                        <Inbox size={40} className="text-white/20" />
                        <div>
                            <p className="font-mono text-[13px] text-white/45 font-semibold">Keine offenen Einträge</p>
                            <p className="font-mono text-[10px] text-white/30 mt-2">
                                Neue Aufgaben und Support-Tickets erscheinen hier
                            </p>
                        </div>
                        <button
                            onClick={() => setActiveView("control")}
                            className="font-mono text-[10px] text-neon-blue/60 hover:text-neon-blue transition-colors mt-1 font-semibold"
                        >
                            ← Zurück zur Aufgabenzentrale
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

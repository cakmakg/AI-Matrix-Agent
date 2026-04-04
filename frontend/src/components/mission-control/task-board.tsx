"use client";

import { AnimatePresence } from "framer-motion";
import { Clock } from "lucide-react";
import { useAgentStore } from "@/store/agent-store";
import { HitlTaskCard, SupportTaskCard, CampaignTaskCard, ArchiveTaskCard } from "./task-card";

type FilterTab = "all" | "hitl" | "support" | "campaign";

interface TaskBoardProps {
    activeTab: FilterTab;
    onTabChange: (tab: FilterTab) => void;
}

export function TaskBoard({ activeTab, onTabChange }: TaskBoardProps) {
    const {
        workflowPhase, threadId, missionMessage, pendingContent,
        missions, supportTickets, campaignDrafts,
    } = useAgentStore();

    const hasLiveHitl    = workflowPhase === "AWAITING_APPROVAL" && !!threadId;
    const dbHitlMissions = missions.filter(m => m.status === "AWAITING_APPROVAL" && m.threadId !== threadId);
    const pendingSupport = supportTickets;
    const pendingCampaigns = campaignDrafts.filter(c => c.status === "AWAITING_APPROVAL");
    const publishedMissions = missions.filter(m => m.status === "PUBLISHED" || m.status === "APPROVED").slice(0, 8);

    const counts = {
        hitl:     (hasLiveHitl ? 1 : 0) + dbHitlMissions.length,
        support:  pendingSupport.length,
        campaign: pendingCampaigns.length,
    };
    const total = counts.hitl + counts.support + counts.campaign;

    const showHitl     = activeTab === "all" || activeTab === "hitl";
    const showSupport  = activeTab === "all" || activeTab === "support";
    const showCampaign = activeTab === "all" || activeTab === "campaign";

    const tabs: { key: FilterTab; label: string; count: number }[] = [
        { key: "all",      label: "Alle",     count: total           },
        { key: "hitl",     label: "HITL",     count: counts.hitl     },
        { key: "support",  label: "Support",  count: counts.support  },
        { key: "campaign", label: "Kampagne", count: counts.campaign  },
    ];

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            {/* Filter tabs */}
            <div className="flex gap-1 px-6 py-3 border-b border-white/6 shrink-0" style={{ background: "#070c14" }}>
                {tabs.map(({ key, label, count }) => (
                    <button
                        key={key}
                        onClick={() => onTabChange(key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors
                            ${activeTab === key
                                ? "bg-[#00f0ff]/12 border border-[#00f0ff]/25 text-[#00f0ff]"
                                : "text-white/40 hover:text-white/65 hover:bg-white/5 border border-transparent"
                            }`}
                    >
                        {label}
                        {count > 0 && (
                            <span className={`min-w-[16px] h-4 px-1 rounded-full text-[9px] flex items-center justify-center font-bold
                                ${activeTab === key ? "bg-[#00f0ff]/20 text-[#00f0ff]" : "bg-white/10 text-white/50"}`}>
                                {count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3 scrollbar-hide" style={{ background: "#070c14" }}>
                <AnimatePresence mode="popLayout">
                    {/* Live HITL (running workflow) */}
                    {showHitl && hasLiveHitl && threadId && (
                        <HitlTaskCard
                            key={`live-${threadId}`}
                            threadId={threadId}
                            task={missionMessage ?? "Aktiv — Genehmigung ausstehend"}
                            preview={pendingContent?.slice(0, 200) ?? "Bericht wird vorbereitet..."}
                            createdAt={new Date().toISOString()}
                        />
                    )}

                    {/* DB HITL missions */}
                    {showHitl && dbHitlMissions.map(m => (
                        <HitlTaskCard
                            key={m.threadId}
                            threadId={m.threadId}
                            task={m.task}
                            preview={m.contentPreview}
                            createdAt={m.createdAt}
                        />
                    ))}

                    {/* Support tickets */}
                    {showSupport && pendingSupport.map(t => (
                        <SupportTaskCard key={t._id} ticket={t} />
                    ))}

                    {/* Campaign drafts */}
                    {showCampaign && pendingCampaigns.map(c => (
                        <CampaignTaskCard key={c._id} campaign={c} />
                    ))}
                </AnimatePresence>

                {/* Empty state */}
                {total === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                        <div className="w-14 h-14 rounded-2xl border border-white/8 flex items-center justify-center text-2xl text-white/12">
                            ◫
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white/20">Keine ausstehenden Aufgaben</p>
                            <p className="text-xs text-white/12 mt-1">Systeme bereit — neue Aufgabe senden</p>
                        </div>
                    </div>
                )}

                {/* Archive divider + cards */}
                {publishedMissions.length > 0 && (activeTab === "all" || activeTab === "hitl") && (
                    <>
                        <div className="flex items-center gap-2 mt-3 mb-1">
                            <div className="flex-1 h-px bg-white/5" />
                            <span className="text-[9px] text-white/18 uppercase tracking-widest flex items-center gap-1 font-mono">
                                <Clock size={8} /> Archiv
                            </span>
                            <div className="flex-1 h-px bg-white/5" />
                        </div>
                        {publishedMissions.map(m => (
                            <ArchiveTaskCard key={m.threadId} mission={m} />
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}

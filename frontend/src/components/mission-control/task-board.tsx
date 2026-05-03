"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Clock, FileText, Mail, Megaphone, Inbox } from "lucide-react";
import { useAgentStore } from "@/store/agent-store";
import type { MissionSummary, SupportTicketSummary, CampaignDraftSummary } from "@/store/types";

type FilterTab = "all" | "hitl" | "support" | "campaign";

interface TaskBoardProps {
    activeTab: FilterTab;
    onTabChange: (tab: FilterTab) => void;
}

// ── HITL Task Card ────────────────────────────────────────────
function HitlCard({
    threadId, task, preview, createdAt,
}: { threadId: string; task: string; preview: string; createdAt: string }) {
    const { setDrawerItem } = useAgentStore();

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            onClick={() => setDrawerItem({ type: "report", threadId })}
            className="cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md"
            style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}
        >
            <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#FEF3C7" }}>
                    <Inbox size={16} style={{ color: "#D97706" }} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#FEF3C7", color: "#B45309" }}>
                            ⏳ Wartet auf Genehmigung
                        </span>
                        <span className="text-[10px] text-gray-400">
                            #{threadId.slice(0, 8)}
                        </span>
                    </div>
                    <p className="text-[13px] font-semibold text-gray-900 truncate mb-1">{task}</p>
                    <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{preview}</p>
                    <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                        <Clock size={9} />
                        {new Date(createdAt).toLocaleString("de-DE")}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

// ── Support Task Card ─────────────────────────────────────────
function SupportCard({ ticket }: { ticket: SupportTicketSummary }) {
    const { setDrawerItem } = useAgentStore();
    const isBug = ticket.category === "SUPPORT_BUG";

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            onClick={() => setDrawerItem({ type: "support", ticket })}
            className="cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md"
            style={{
                background: isBug ? "#FFF1F2" : "#EFF6FF",
                borderColor: isBug ? "#FECDD3" : "#BFDBFE",
            }}
        >
            <div className="flex items-start gap-3">
                <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: isBug ? "#FEE2E2" : "#DBEAFE" }}
                >
                    <Mail size={16} style={{ color: isBug ? "#DC2626" : "#2563EB" }} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                                background: isBug ? "#FEE2E2" : "#DBEAFE",
                                color: isBug ? "#B91C1C" : "#1D4ED8",
                            }}
                        >
                            {isBug ? "🐛 Tech-Support" : "💬 Preisanfrage"}
                        </span>
                        <span className="text-[10px] text-gray-400 capitalize">{ticket.platform}</span>
                    </div>
                    <p className="text-[13px] font-semibold text-gray-900 truncate mb-1">{ticket.subject}</p>
                    <p className="text-[11px] text-gray-500">{ticket.from}</p>
                    <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                        <Clock size={9} />
                        {new Date(ticket.createdAt).toLocaleString("de-DE")}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

// ── Campaign Card ─────────────────────────────────────────────
function CampaignCard({ campaign }: { campaign: CampaignDraftSummary }) {
    const { setDrawerItem } = useAgentStore();

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            onClick={() => setDrawerItem({ type: "campaign", campaign })}
            className="cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md"
            style={{ background: "#FFF7ED", borderColor: "#FED7AA" }}
        >
            <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#FFEDD5" }}>
                    <Megaphone size={16} style={{ color: "#EA580C" }} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#FFEDD5", color: "#C2410C" }}>
                            📣 Kampagnenentwurf
                        </span>
                    </div>
                    <p className="text-[13px] font-semibold text-gray-900 truncate mb-1">{campaign.reportTitle}</p>
                    <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                        <Clock size={9} />
                        {new Date(campaign.createdAt).toLocaleString("de-DE")}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

// ── Archive Card ──────────────────────────────────────────────
function ArchiveCard({ mission }: { mission: MissionSummary }) {
    const { setDrawerItem } = useAgentStore();

    return (
        <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setDrawerItem({ type: "mission", mission })}
            className="cursor-pointer rounded-xl border p-3.5 transition-all hover:shadow-sm flex items-start gap-3"
            style={{ background: "#FFFFFF", borderColor: "#E5E7EB" }}
        >
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <FileText size={14} className="text-gray-400" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-gray-700 truncate">{mission.task}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-100">
                        ✓ Veröffentlicht
                    </span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock size={8} />
                        {new Date(mission.createdAt).toLocaleString("de-DE")}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

// ── MAIN TASK BOARD ───────────────────────────────────────────
export function TaskBoard({ activeTab, onTabChange }: TaskBoardProps) {
    const {
        workflowPhase, threadId, missionMessage, pendingContent,
        missions, supportTickets, campaignDrafts,
    } = useAgentStore();

    const hasLiveHitl     = workflowPhase === "AWAITING_APPROVAL" && !!threadId;
    const dbHitlMissions  = missions.filter(m => m.status === "AWAITING_APPROVAL" && m.threadId !== threadId);
    const pendingSupport  = supportTickets;
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
        { key: "all",      label: "Alle",       count: total           },
        { key: "hitl",     label: "Genehmigung", count: counts.hitl     },
        { key: "support",  label: "Support",     count: counts.support  },
        { key: "campaign", label: "Kampagne",    count: counts.campaign  },
    ];

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            {/* Filter tabs */}
            <div
                className="flex gap-1 px-4 py-2.5 shrink-0"
                style={{ background: "#FFFFFF", borderBottom: "1px solid #F3F4F6" }}
            >
                {tabs.map(({ key, label, count }) => (
                    <button
                        key={key}
                        onClick={() => onTabChange(key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                            activeTab === key
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-transparent"
                        }`}
                    >
                        {label}
                        {count > 0 && (
                            <span className={`min-w-[16px] h-4 px-1 rounded-full text-[9px] flex items-center justify-center font-bold ${
                                activeTab === key ? "bg-indigo-200 text-indigo-700" : "bg-gray-200 text-gray-600"
                            }`}>
                                {count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 scrollbar-styled">
                <AnimatePresence mode="popLayout">
                    {showHitl && hasLiveHitl && threadId && (
                        <HitlCard
                            key={`live-${threadId}`}
                            threadId={threadId}
                            task={missionMessage ?? "Aktiv — wartet auf Genehmigung"}
                            preview={pendingContent?.slice(0, 200) ?? "Bericht wird erstellt..."}
                            createdAt={new Date().toISOString()}
                        />
                    )}

                    {showHitl && dbHitlMissions.map(m => (
                        <HitlCard
                            key={m.threadId}
                            threadId={m.threadId}
                            task={m.task}
                            preview={m.contentPreview}
                            createdAt={m.createdAt}
                        />
                    ))}

                    {showSupport && pendingSupport.map(t => (
                        <SupportCard key={t._id} ticket={t} />
                    ))}

                    {showCampaign && pendingCampaigns.map(c => (
                        <CampaignCard key={c._id} campaign={c} />
                    ))}
                </AnimatePresence>

                {/* Empty state */}
                {total === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl">
                            ✅
                        </div>
                        <div>
                            <p className="text-[14px] font-medium text-gray-500">Keine offenen Aufgaben</p>
                            <p className="text-[12px] text-gray-400 mt-1">Senden Sie eine neue Aufgabe</p>
                        </div>
                    </div>
                )}

                {/* Archive */}
                {publishedMissions.length > 0 && (activeTab === "all" || activeTab === "hitl") && (
                    <>
                        <div className="flex items-center gap-2 mt-2 mb-1">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest flex items-center gap-1 font-medium">
                                <Clock size={9} /> Archiv
                            </span>
                            <div className="flex-1 h-px bg-gray-200" />
                        </div>
                        {publishedMissions.map(m => (
                            <ArchiveCard key={m.threadId} mission={m} />
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}

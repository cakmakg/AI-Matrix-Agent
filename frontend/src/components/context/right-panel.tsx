"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, PanelRight } from "lucide-react";
import { useAgentStore } from "@/store/agent-store";
import { ReportViewer } from "./report-viewer";
import { BlueprintViewer } from "./blueprint-viewer";
import { EmailViewer } from "./email-viewer";
import { CampaignViewer } from "./campaign-viewer";

export const RightPanel = () => {
    const { drawerItem, setDrawerItem, missionCategory } = useAgentStore();

    return (
        <aside className="w-[380px] shrink-0 flex flex-col h-screen bg-[rgba(9,14,26,0.95)] border-l border-white/5 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                    <PanelRight size={13} className="text-white/25" />
                    <span className="font-mono text-[8px] text-white/25 uppercase tracking-widest">Kontext-Panel</span>
                </div>
                {drawerItem && (
                    <button
                        onClick={() => setDrawerItem(null)}
                        className="p-1 rounded hover:bg-white/5 text-white/25 hover:text-white/60 transition-colors"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    {!drawerItem ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center"
                        >
                            <div className="w-14 h-14 rounded-xl border border-white/6 flex items-center justify-center text-2xl opacity-20">
                                ◫
                            </div>
                            <div>
                                <p className="font-mono text-[10px] text-white/20 tracking-wide">
                                    Wählen Sie einen Eintrag aus dem Posteingang
                                </p>
                                <p className="font-mono text-[8px] text-white/12 mt-1.5 leading-relaxed">
                                    Berichte, Support-Tickets und Kampagnen-<br />entwürfe erscheinen hier zur Prüfung
                                </p>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key={drawerItem.type + (drawerItem.type === "report" ? drawerItem.threadId : drawerItem.type === "support" ? drawerItem.ticket._id : drawerItem.type === "campaign" ? drawerItem.campaign._id : "mission")}
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            transition={{ duration: 0.18 }}
                            className="absolute inset-0 flex flex-col"
                        >
                            {drawerItem.type === "report" && (
                                missionCategory === "CTO"
                                    ? <BlueprintViewer threadId={drawerItem.threadId} />
                                    : <ReportViewer threadId={drawerItem.threadId} />
                            )}
                            {drawerItem.type === "support" && (
                                <EmailViewer ticket={drawerItem.ticket} />
                            )}
                            {drawerItem.type === "campaign" && (
                                <CampaignViewer campaign={drawerItem.campaign} />
                            )}
                            {drawerItem.type === "mission" && (
                                <div className="flex flex-col h-full px-4 py-3">
                                    <p className="font-mono text-[8px] text-white/30 uppercase tracking-widest mb-3">Auftragsarchiv</p>
                                    <p className="font-mono text-[11px] text-white/70 mb-2">{drawerItem.mission.task}</p>
                                    <div className="flex-1 overflow-y-auto scrollbar-hide text-white/50 font-mono text-[10px] leading-relaxed">
                                        {drawerItem.mission.content ?? drawerItem.mission.contentPreview}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </aside>
    );
};

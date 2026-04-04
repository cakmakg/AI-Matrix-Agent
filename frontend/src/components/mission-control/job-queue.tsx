"use client";

import { useEffect, useState } from "react";
import { useAgentStore } from "@/store/agent-store";
import type { SaaSProduct } from "@/store/types";
import { CompactKpiBar } from "./compact-kpi-bar";
import { InputZone } from "./input-zone";
import { TaskBoard } from "./task-board";
import { getProductTheme } from "@/config/product-theme";

type FilterTab = "all" | "hitl" | "support" | "campaign";

/* ══════════════════════════════════════════════════════════════
   MAIN STAGE — New Hub-style layout
   Layout: CompactKpiBar | InputZone | TaskBoard (flex-1)
═══════════════════════════════════════════════════════════════ */
export const JobQueue = () => {
    const {
        clientProduct,
        fetchSupportTickets, fetchCampaignDrafts, fetchMissions,
        sendMission, forceRdScan, pullLatestArtifact,
    } = useAgentStore();

    const [activeTab, setActiveTab] = useState<FilterTab>("all");
    const [loading,   setLoading]   = useState(false);
    const [sending,   setSending]   = useState(false);
    const [mounted,   setMounted]   = useState(false);

    useEffect(() => { setMounted(true); }, []);

    // SSR: always use default theme on first render
    const safeProduct = mounted ? (clientProduct ?? "cx") : "cx";
    const theme = getProductTheme(safeProduct);

    const refresh = async () => {
        setLoading(true);
        await Promise.all([fetchSupportTickets(), fetchCampaignDrafts(), fetchMissions()]);
        setLoading(false);
    };

    useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSend = async (msg: string) => {
        if (!msg || sending) return;
        setSending(true);
        await sendMission(msg);
        setSending(false);
    };

    return (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative" style={{ background: "#070c14" }}>

            {/* Department atmosphere background glow */}
            <div
                className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] blur-[180px] opacity-[0.04] animate-pulse pointer-events-none"
                style={{ backgroundColor: theme.accent }}
            />

            {/* ── Compact KPI header ── */}
            <CompactKpiBar onRefresh={refresh} loading={loading} />

            {/* ── Input Zone (full-width) ── */}
            <div className="relative">
                <InputZone
                    product={safeProduct as SaaSProduct}
                    sending={sending}
                    onSend={handleSend}
                    onRdScan={forceRdScan}
                    onPullArtifact={pullLatestArtifact}
                />
            </div>

            {/* ── Task Board (main work area, flex-1) ── */}
            <TaskBoard
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />
        </div>
    );
};

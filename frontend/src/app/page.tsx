"use client";

import { useAgentStore } from "@/store/agent-store";
import { SystemAlerts } from "@/components/ui/system-alert";
import { Sidebar } from "@/components/layout/sidebar";
import { JobQueue } from "@/components/mission-control/job-queue";
import { OperatingTable } from "@/components/mission-control/operating-table";
import { CfoDashboard } from "@/components/finance/cfo-dashboard";
import { KnowledgeView } from "@/components/knowledge/knowledge-view";
import { SettingsView } from "@/components/settings/settings-view";
import { SkillsView } from "@/components/skills/skills-view";
import { ApiKeyModal } from "@/components/auth/api-key-modal";

export default function Home() {
    const activeView = useAgentStore((s) => s.activeView);

    return (
        <div className="w-screen h-screen flex overflow-hidden" style={{ background: "#070c14" }}>
            <ApiKeyModal />
            <SystemAlerts />

            {/* ── LEFT: Sidebar + Live Agent Radar ── */}
            <Sidebar />

            {/* ── MISSION CONTROL (relative for overlay drawer) ── */}
            {activeView === "control" && (
                <div className="flex-1 relative min-w-0 overflow-hidden flex">
                    <JobQueue />
                    <OperatingTable />
                </div>
            )}

            {/* ── FULL-PAGE SECONDARY VIEWS ── */}
            {activeView === "cfo"       && <main className="flex-1 min-w-0 overflow-hidden border-l border-white/5"><CfoDashboard /></main>}
            {activeView === "knowledge" && <main className="flex-1 min-w-0 overflow-hidden border-l border-white/5"><KnowledgeView /></main>}
            {activeView === "settings"  && <main className="flex-1 min-w-0 overflow-hidden border-l border-white/5"><SettingsView /></main>}
            {activeView === "skills"    && <main className="flex-1 min-w-0 overflow-hidden border-l border-white/5"><SkillsView /></main>}
        </div>
    );
}

"use client";

import { useAgentStore } from "@/store/agent-store";
import { SystemAlerts } from "@/components/ui/system-alert";
import { AppSidebar } from "@/components/layout/sidebar";
import { CenterPanel } from "@/components/layout/center-panel";
import { RightPanel } from "@/components/layout/right-panel";
import { ApiKeyModal } from "@/components/auth/api-key-modal";
import { AdminLayout } from "@/components/admin/admin-layout";
import { OperatingTable } from "@/components/mission-control/operating-table";

export default function Home() {
    const activeView = useAgentStore((s) => s.activeView);

    // Admin layout tam ekran — kendi layout'una sahip
    if (activeView === "admin") {
        return (
            <div className="w-screen h-screen overflow-hidden" style={{ background: "#F5F7FA" }}>
                <ApiKeyModal />
                <SystemAlerts />
                <AdminLayout />
            </div>
        );
    }

    return (
        <div className="w-screen h-screen flex overflow-hidden relative" style={{ background: "#F5F7FA" }}>
            <ApiKeyModal />
            <SystemAlerts />

            {/* ── SOL PANEL: Sidebar Navigasyon ── */}
            <AppSidebar />

            {/* ── MERKEZ PANEL: Chat + Input ── */}
            <CenterPanel />

            {/* ── SAĞ PANEL: Sistem Durumu ── */}
            <RightPanel />

            {/* ── OVERLAY DRAWER: HITL Onay / Destek / Kampanya ── */}
            <OperatingTable />
        </div>
    );
}

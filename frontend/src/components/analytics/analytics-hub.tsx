"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Network, DollarSign, Package, TrendingUp, Target, Shield, FileSearch } from "lucide-react";

const WorkflowTopology   = dynamic(() => import("./workflow-topology").then(m => ({ default: m.WorkflowTopology })), { ssr: false });
const CfoDashboard       = dynamic(() => import("../finance/cfo-dashboard").then(m => ({ default: m.CfoDashboard })), { ssr: false });
const StockUrgency       = dynamic(() => import("./stock-urgency-dashboard").then(m => ({ default: m.StockUrgencyDashboard })), { ssr: false });
const InvoiceAudit       = dynamic(() => import("./invoice-audit-dashboard").then(m => ({ default: m.InvoiceAuditDashboard })), { ssr: false });
const GrowthAnalytics    = dynamic(() => import("./growth-analytics").then(m => ({ default: m.GrowthAnalytics })), { ssr: false });
const StrategyDashboard  = dynamic(() => import("../strategy/strategy-dashboard").then(m => ({ default: m.StrategyDashboard })), { ssr: false });

type AnalyticsTab = "workflow" | "finanzen" | "lager" | "rechnung" | "wachstum" | "strategie";

const TABS: { key: AnalyticsTab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "workflow",  label: "Workflow-Topologie", icon: <Network size={13} />,    color: "#00f0ff" },
    { key: "finanzen",  label: "Finanzen",            icon: <DollarSign size={13} />, color: "#00d4aa" },
    { key: "lager",     label: "Lager & Lieferkette", icon: <Package size={13} />,   color: "#ff6b35" },
    { key: "rechnung",  label: "Rechnungs-Audit",     icon: <FileSearch size={13} />, color: "#ffb000" },
    { key: "wachstum",  label: "Wachstum",            icon: <TrendingUp size={13} />, color: "#39ff14" },
    { key: "strategie", label: "Strategie",           icon: <Target size={13} />,    color: "#bf5fff" },
];

export const AnalyticsHub = () => {
    const [activeTab, setActiveTab] = useState<AnalyticsTab>("workflow");

    const current = TABS.find(t => t.key === activeTab)!;

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Tab bar */}
            <div className="flex gap-1.5 px-4 py-3 border-b border-gray-200 shrink-0 overflow-x-auto scrollbar-hide bg-white">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={activeTab === tab.key ? { borderColor: tab.color, color: tab.color, backgroundColor: `${tab.color}15` } : {}}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all border ${
                            activeTab === tab.key
                                ? "border-current"
                                : "border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-styled" style={{ background: "#F9FAFB" }}>
                {activeTab === "workflow"  && <WorkflowTopology />}
                {activeTab === "finanzen"  && <CfoDashboard />}
                {activeTab === "lager"     && <StockUrgency />}
                {activeTab === "rechnung"  && <InvoiceAudit />}
                {activeTab === "wachstum"  && <GrowthAnalytics />}
                {activeTab === "strategie" && <StrategyDashboard />}
            </div>

            {/* Footer breadcrumb */}
            <div className="px-6 py-2 border-t border-gray-200 shrink-0 bg-white">
                <span className="text-[10px] text-gray-400 tracking-wider uppercase">
                    Analytics Hub › {current.label}
                </span>
            </div>
        </div>
    );
};

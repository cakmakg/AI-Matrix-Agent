"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageSquare, LayoutDashboard, BarChart3, BookOpen,
    Settings, Blocks, ShieldAlert,
    Terminal, Building2, ChevronDown, Plus, LogOut, Check,
    Activity, Headphones, TrendingUp, Lightbulb, Briefcase,
    Cpu, Crown,
} from "lucide-react";
import { useAgentStore } from "@/store/agent-store";
import type { ActiveView, SaaSProduct } from "@/store/agent-store";
import { getProductTheme } from "@/config/product-theme";
import { PRODUCT_INPUT } from "@/components/layout/center-panel";

/**
 * Sidebar Nav Mimarisi:
 *
 * DEPARTMANLAR (Mega-Product) → SaaSProduct alanını değiştirir, CHAT view'ına geçer
 * ARAÇLAR → activeView değiştirir, farklı sayfa gösterir
 *
 * Kaynak: AGENTS.md § SaaS Ürünleri → 6 Mega-Departman
 */

interface DepartmentItem {
    product:  SaaSProduct;
    label:    string;
    icon:     React.ReactNode;
    /** hangi plan gerekli */
    plan?:    "pro" | "enterprise" | "holding";
}

const DEPARTMENTS: DepartmentItem[] = [
    { product: "cx",          label: "CX & Destek",           icon: <Headphones size={15} /> },
    { product: "growth",      label: "Büyüme & Gelir",        icon: <TrendingUp size={15} />,  plan: "pro" },
    { product: "strategy",    label: "Strateji & İnovasyon",  icon: <Lightbulb size={15} />,   plan: "enterprise" },
    { product: "backoffice",  label: "Finans & Operasyon",    icon: <Briefcase size={15} />,   plan: "enterprise" },
    { product: "engineering", label: "Mühendislik & BT",      icon: <Cpu size={15} />,         plan: "enterprise" },
    { product: "holding",     label: "Holding",               icon: <Crown size={15} />,        plan: "holding" },
];

interface ToolItem {
    view:   ActiveView;
    label:  string;
    icon:   React.ReactNode;
    plan?:  "pro" | "enterprise";
}

const TOOLS: ToolItem[] = [
    { view: "control",   label: "Görev Merkezi",    icon: <LayoutDashboard size={15} /> },
    { view: "cfo",       label: "CFO Paneli",        icon: <BarChart3 size={15} />,     plan: "pro" },
    { view: "knowledge", label: "Bilgi Tabanı (RAG)", icon: <BookOpen size={15} /> },
    { view: "skills",    label: "Beceri Mağazası",   icon: <Blocks size={15} />,        plan: "pro" },
    { view: "security",  label: "Güvenlik (MOAT)",   icon: <ShieldAlert size={15} />,   plan: "enterprise" },
    { view: "settings",  label: "Ayarlar",           icon: <Settings size={15} /> },
];

const PLAN_ORDER: Record<string, number> = { free: 0, pro: 1, enterprise: 2, holding: 3 };

function isPlanOk(clientPlan: string | null, required?: string): boolean {
    if (!required) return true;
    return (PLAN_ORDER[clientPlan ?? "free"] ?? 0) >= (PLAN_ORDER[required] ?? 0);
}

const PLAN_BADGE: Record<string, { label: string; bg: string; text: string }> = {
    free:       { label: "Free",       bg: "#DBEAFE", text: "#1D4ED8" },
    pro:        { label: "Pro",        bg: "#D1FAE5", text: "#065F46" },
    enterprise: { label: "Enterprise", bg: "#FEF3C7", text: "#92400E" },
    holding:    { label: "Holding",    bg: "#EDE9FE", text: "#5B21B6" },
};

export const AppSidebar = () => {
    const {
        activeView, setActiveView,
        workflowPhase, supportTickets, campaignDrafts,
        clientName, clientSlug, apiKey, clientPlan, clientProduct, workspaces,
        switchWorkspace, logout, isAdmin,
        setActiveTrack,
    } = useAgentStore();

    const [mounted, setMounted]     = useState(false);
    const [wsOpen,  setWsOpen]      = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const safeProduct  = mounted ? (clientProduct ?? "cx") : "cx";
    const productTheme = getProductTheme(mounted ? clientProduct : null);

    const pendingCount =
        (workflowPhase === "AWAITING_APPROVAL" ? 1 : 0) +
        supportTickets.filter(t => t.category === "SUPPORT_PRICING" || t.category === "SUPPORT_BUG").length +
        campaignDrafts.filter(c => c.status === "AWAITING_APPROVAL").length;

    const isRunning    = workflowPhase !== "IDLE" && workflowPhase !== "DELIVERED";
    const displayName  = mounted ? (clientName  || "Varsayılan Firma") : "Yükleniyor...";
    const planBadge    = PLAN_BADGE[clientPlan ?? "free"] ?? PLAN_BADGE.free;

    /** Departman tıklandığında: product değiştir, chat view aç, track güncelle */
    const handleDepartmentClick = (product: SaaSProduct) => {
        const cfg        = PRODUCT_INPUT[product];
        const firstTrack = cfg.subTabs?.[0]?.track ?? cfg.track;
        // Product store'u güncelle
        useAgentStore.setState({ clientProduct: product });
        setActiveTrack(firstTrack);
        setActiveView("chat");
    };

    return (
        <aside
            className="w-[240px] shrink-0 flex flex-col h-screen"
            style={{ background: "#FFFFFF", borderRight: "1px solid #E5E7EB" }}
        >
            {/* ── Logo ── */}
            <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)" }}
                    >
                        ◈
                    </div>
                    <div>
                        <div className="text-[13px] font-bold text-gray-900 leading-tight">AI Orchestra</div>
                        <div className="text-[10px] text-gray-400 font-medium">Agent Matrix</div>
                    </div>
                </div>
            </div>

            {/* ── Workspace Switcher ── */}
            <div className="px-3 pt-3 pb-1 relative">
                <button
                    onClick={() => setWsOpen(v => !v)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 hover:bg-gray-100 transition-all"
                >
                    <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm"
                        style={{ background: productTheme.accentLight }}
                    >
                        {productTheme.icon}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                        <div className="text-[12px] font-semibold text-gray-800 truncate">{displayName}</div>
                        <div className="text-[10px] text-gray-400 truncate">{productTheme.slogan}</div>
                    </div>
                    <ChevronDown
                        size={12}
                        className={`text-gray-400 shrink-0 transition-transform duration-200 ${wsOpen ? "rotate-180" : ""}`}
                    />
                </button>

                <AnimatePresence>
                    {wsOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="absolute left-3 right-3 top-[calc(100%-4px)] mt-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg z-50"
                        >
                            {workspaces.length > 0 && (
                                <div className="p-1 border-b border-gray-100">
                                    {workspaces.map(ws => (
                                        <button
                                            key={ws.slug}
                                            onClick={() => { switchWorkspace(ws.apiKey); setWsOpen(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            <Building2 size={10} className="text-gray-400 shrink-0" />
                                            <div className="flex-1 min-w-0 text-left">
                                                <div className="text-[11px] text-gray-700 truncate font-medium">{ws.name}</div>
                                            </div>
                                            {ws.apiKey === apiKey && (
                                                <Check size={10} className="text-green-500 shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <button
                                onClick={() => { setWsOpen(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors"
                            >
                                <Plus size={10} className="text-gray-400" />
                                <span className="text-[11px] text-gray-500">Çalışma alanı ekle</span>
                            </button>
                            <button
                                onClick={() => { logout(); setWsOpen(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 transition-colors border-t border-gray-100"
                            >
                                <LogOut size={10} className="text-red-400" />
                                <span className="text-[11px] text-red-400">Çıkış Yap</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Plan Badge ── */}
            {mounted && clientPlan && (
                <div className="px-4 pt-1 pb-2">
                    <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ background: planBadge.bg, color: planBadge.text }}
                    >
                        {planBadge.label} plan
                    </span>
                </div>
            )}

            {/* ── Scroll Area ── */}
            <nav className="flex flex-col gap-0.5 px-3 py-2 flex-1 overflow-y-auto scrollbar-hide">

                {/* ─ DEPARTMANLAR ─ */}
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-1 mt-1 mb-0.5">
                    Departmanlar
                </p>

                {DEPARTMENTS.map(({ product, label, icon, plan }) => {
                    const isActive = (activeView === "chat") && safeProduct === product;
                    const isLocked = !isPlanOk(clientPlan, plan);

                    return (
                        <motion.button
                            key={product}
                            whileHover={isLocked ? {} : { x: 2 }}
                            onClick={() => !isLocked && handleDepartmentClick(product)}
                            disabled={isLocked}
                            title={isLocked ? `${plan === "holding" ? "Holding" : plan === "enterprise" ? "Enterprise" : "Pro"} plan gerektirir` : label}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 w-full ${
                                isLocked
                                    ? "opacity-40 cursor-not-allowed"
                                    : isActive
                                        ? "text-gray-900 font-semibold"
                                        : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                            }`}
                            style={isActive ? {
                                background: productTheme.accentLight,
                                color:      productTheme.accentText,
                            } : {}}
                        >
                            <span
                                className="shrink-0"
                                style={isActive ? { color: productTheme.accent } : isLocked ? { color: "#D1D5DB" } : {}}
                            >
                                {icon}
                            </span>
                            <span className="text-[13px] flex-1 truncate">{label}</span>
                            {isActive && workflowPhase !== "IDLE" && (
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
                            )}
                        </motion.button>
                    );
                })}

                {/* ─ ARAÇLAR ─ */}
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-1 mt-4 mb-0.5">
                    Araçlar
                </p>

                {TOOLS.map(({ view, label, icon, plan }) => {
                    const isActive = activeView === view;
                    const isLocked = !isPlanOk(clientPlan, plan);
                    const badge    = view === "control" && pendingCount > 0 ? pendingCount : null;

                    return (
                        <motion.button
                            key={view}
                            whileHover={isLocked ? {} : { x: 2 }}
                            onClick={() => !isLocked && setActiveView(view)}
                            disabled={isLocked}
                            title={isLocked ? `${plan === "enterprise" ? "Enterprise" : "Pro"} plan gerektirir` : label}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 w-full ${
                                isLocked
                                    ? "opacity-40 cursor-not-allowed"
                                    : isActive
                                        ? "bg-gray-100 text-gray-900 font-semibold"
                                        : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                            }`}
                        >
                            <span className="shrink-0" style={isLocked ? { color: "#D1D5DB" } : {}}>
                                {icon}
                            </span>
                            <span className="text-[13px] flex-1 truncate">{label}</span>
                            {badge !== null && (
                                <span className="min-w-[18px] h-5 px-1.5 rounded-full bg-red-500 font-bold text-[9px] text-white flex items-center justify-center shrink-0">
                                    {badge}
                                </span>
                            )}
                        </motion.button>
                    );
                })}

                {/* ─ GOD MODE ─ */}
                {isAdmin && (
                    <motion.button
                        whileHover={{ x: 2 }}
                        onClick={() => setActiveView("admin")}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 w-full mt-4 border ${
                            activeView === "admin"
                                ? "bg-red-50 border-red-200 text-red-700"
                                : "border-red-100 text-red-400 hover:text-red-600 hover:bg-red-50"
                        }`}
                    >
                        <Terminal size={15} />
                        <span className="text-[13px] font-bold">GOD MODE</span>
                    </motion.button>
                )}
            </nav>

            {/* ── Sistem Durumu ── */}
            <div className="px-4 py-3 border-t border-gray-100">
                <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${
                    isRunning
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50 border-gray-100"
                }`}>
                    <Activity
                        size={12}
                        className={isRunning ? "text-green-500 animate-pulse" : "text-gray-300"}
                    />
                    <div className="flex-1 min-w-0">
                        <div className={`text-[11px] font-semibold ${isRunning ? "text-green-700" : "text-gray-400"}`}>
                            {isRunning ? "Ajan çalışıyor" : "Sistem hazır"}
                        </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-green-400 animate-pulse" : "bg-gray-200"}`} />
                </div>
            </div>

            {/* ── Tenant slug ── */}
            <div className="px-4 py-2 border-t border-gray-100">
                <div className="text-[10px] text-gray-400 truncate">
                    {mounted ? (clientSlug || "default") : "default"}
                </div>
            </div>
        </aside>
    );
};

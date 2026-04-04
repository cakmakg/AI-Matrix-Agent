"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Twitter, Linkedin, Instagram, Facebook, BarChart2,
    Plus, Trash2, RefreshCw, Send, Clock, CheckCircle,
    XCircle, AlertCircle, ChevronDown, ChevronUp, Link2,
    Users, TrendingUp, Calendar, Zap,
} from "lucide-react";
import { useAgentStore } from "@/store/agent-store";
import type { SocialPlatform, SocialAccount, ScheduledPost } from "@/store/agent-store";

// ─── Platform Meta ────────────────────────────────────────────────────────────

const PLATFORM_META: Record<SocialPlatform, { label: string; color: string; icon: React.ReactNode; charLimit: number }> = {
    twitter:    { label: "Twitter / X",    color: "#e7e9ea", icon: <Twitter size={14} />,   charLimit: 280 },
    linkedin:   { label: "LinkedIn",       color: "#0077b5", icon: <Linkedin size={14} />,  charLimit: 3000 },
    instagram:  { label: "Instagram",      color: "#e1306c", icon: <Instagram size={14} />, charLimit: 2200 },
    facebook:   { label: "Facebook",       color: "#1877f2", icon: <Facebook size={14} />,  charLimit: 63000 },
    google_ads: { label: "Google Ads",     color: "#fbbc04", icon: <BarChart2 size={14} />, charLimit: 90 },
};

const STATUS_STYLES: Record<ScheduledPost["status"], { label: string; color: string; icon: React.ReactNode }> = {
    AWAITING_APPROVAL: { label: "Freigabe ausstehend", color: "#bf5fff", icon: <AlertCircle size={12} /> },
    PENDING:   { label: "Ausstehend",    color: "#ffb000", icon: <Clock size={12} /> },
    PUBLISHED: { label: "Veröffentlicht",color: "#39ff14", icon: <CheckCircle size={12} /> },
    FAILED:    { label: "Fehlgeschlagen",color: "#ff2d55", icon: <XCircle size={12} /> },
    CANCELLED: { label: "Abgebrochen",   color: "#ffffff40", icon: <AlertCircle size={12} /> },
};

// ─── Connect Account Modal ────────────────────────────────────────────────────

function ConnectModal({ onClose }: { onClose: () => void }) {
    const { connectSocialAccount } = useAgentStore();
    const [platform, setPlatform] = useState<SocialPlatform>("twitter");
    const [form, setForm] = useState({ label: "", accessToken: "", accessTokenSecret: "", pageId: "", customerId: "" });
    const [saving, setSaving] = useState(false);

    const meta = PLATFORM_META[platform];
    const needsPageId = platform === "instagram" || platform === "facebook";
    const needsSecret = platform === "twitter";
    const needsCustomerId = platform === "google_ads";

    const handleSubmit = async () => {
        if (!form.accessToken.trim()) return;
        setSaving(true);
        await connectSocialAccount({ platform, label: form.label, accessToken: form.accessToken, accessTokenSecret: form.accessTokenSecret, pageId: form.pageId, customerId: form.customerId });
        setSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-full max-w-md bg-[#0d1829] border border-white/10 rounded-xl p-6 shadow-2xl"
            >
                <h2 className="font-mono text-sm text-white font-bold mb-4">Konto verknüpfen</h2>

                {/* Platform selector */}
                <div className="grid grid-cols-5 gap-2 mb-5">
                    {(Object.entries(PLATFORM_META) as [SocialPlatform, typeof PLATFORM_META[SocialPlatform]][]).map(([p, m]) => (
                        <button
                            key={p}
                            onClick={() => setPlatform(p)}
                            className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-all ${platform === p ? "border-white/30 bg-white/8" : "border-white/5 hover:border-white/15"}`}
                        >
                            <span style={{ color: m.color }}>{m.icon}</span>
                            <span className="text-[8px] font-mono text-white/50 text-center leading-tight">{p === "google_ads" ? "G-Ads" : m.label.split(" ")[0]}</span>
                        </button>
                    ))}
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="block font-mono text-[10px] text-white/50 mb-1">Bezeichnung (optional)</label>
                        <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder={meta.label} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 font-mono text-[11px] text-white/80 focus:border-white/30 outline-none" />
                    </div>
                    <div>
                        <label className="block font-mono text-[10px] text-white/50 mb-1">Access Token *</label>
                        <input value={form.accessToken} onChange={e => setForm({ ...form, accessToken: e.target.value })} placeholder="Token einfügen..." className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 font-mono text-[11px] text-white/80 focus:border-white/30 outline-none" />
                    </div>
                    {needsSecret && (
                        <div>
                            <label className="block font-mono text-[10px] text-white/50 mb-1">Access Token Secret</label>
                            <input value={form.accessTokenSecret} onChange={e => setForm({ ...form, accessTokenSecret: e.target.value })} placeholder="OAuth Secret..." className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 font-mono text-[11px] text-white/80 focus:border-white/30 outline-none" />
                        </div>
                    )}
                    {needsPageId && (
                        <div>
                            <label className="block font-mono text-[10px] text-white/50 mb-1">{platform === "instagram" ? "Instagram Business Account ID" : "Facebook Page ID"}</label>
                            <input value={form.pageId} onChange={e => setForm({ ...form, pageId: e.target.value })} placeholder="Page / Account ID..." className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 font-mono text-[11px] text-white/80 focus:border-white/30 outline-none" />
                        </div>
                    )}
                    {needsCustomerId && (
                        <div>
                            <label className="block font-mono text-[10px] text-white/50 mb-1">Google Ads Customer ID</label>
                            <input value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} placeholder="123-456-7890" className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 font-mono text-[11px] text-white/80 focus:border-white/30 outline-none" />
                        </div>
                    )}
                </div>

                <div className="flex gap-2 mt-5">
                    <button onClick={onClose} className="flex-1 py-2 border border-white/10 rounded font-mono text-[11px] text-white/50 hover:text-white/80 transition-colors">Abbrechen</button>
                    <button onClick={handleSubmit} disabled={saving || !form.accessToken.trim()} className="flex-1 py-2 bg-[#00f0ff]/10 border border-[#00f0ff]/30 rounded font-mono text-[11px] text-[#00f0ff] hover:bg-[#00f0ff]/20 disabled:opacity-40 transition-all">
                        {saving ? "Verbinde..." : "Verbinden"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Account Card ─────────────────────────────────────────────────────────────

function AccountCard({ account }: { account: SocialAccount }) {
    const { disconnectSocialAccount, syncSocialAccount } = useAgentStore();
    const meta = PLATFORM_META[account.platform];

    return (
        <div className="p-4 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${meta.color}20`, border: `1px solid ${meta.color}40` }}>
                        <span style={{ color: meta.color }}>{meta.icon}</span>
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-white">{account.label || meta.label}</div>
                        <div className="text-[10px] text-white/40 font-mono">{account.username ? `@${account.username}` : meta.label}</div>
                    </div>
                </div>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono ${account.isConnected ? "bg-[#39ff14]/10 text-[#39ff14]" : "bg-red-500/10 text-red-400"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${account.isConnected ? "bg-[#39ff14] animate-pulse" : "bg-red-400"}`} />
                    {account.isConnected ? "Verbunden" : "Getrennt"}
                </div>
            </div>

            {account.followerCount > 0 && (
                <div className="flex items-center gap-1.5 mb-3">
                    <Users size={10} className="text-white/30" />
                    <span className="font-mono text-[10px] text-white/50">{account.followerCount.toLocaleString("de-DE")} Follower</span>
                </div>
            )}

            <div className="flex gap-1.5">
                <button onClick={() => syncSocialAccount(account._id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 border border-white/8 rounded text-[9px] font-mono text-white/40 hover:text-white/70 hover:border-white/20 transition-all">
                    <RefreshCw size={10} /> Sync
                </button>
                <button onClick={() => disconnectSocialAccount(account._id)} className="flex items-center justify-center gap-1 px-3 py-1.5 border border-red-500/20 rounded text-[9px] font-mono text-red-400/60 hover:text-red-400 hover:border-red-400/40 transition-all">
                    <Trash2 size={10} />
                </button>
            </div>
        </div>
    );
}

// ─── Post Composer ────────────────────────────────────────────────────────────

function PostComposer() {
    const { createScheduledPost, socialAccounts } = useAgentStore();
    const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);
    const [content, setContent] = useState("");
    const [scheduledAt, setScheduledAt] = useState("");
    const [title, setTitle] = useState("");
    const [saving, setSaving] = useState(false);

    const connectedPlatforms = socialAccounts.filter(a => a.isConnected).map(a => a.platform);
    const activePlatform = selectedPlatforms[0] as SocialPlatform | undefined;
    const charLimit = activePlatform ? PLATFORM_META[activePlatform].charLimit : 280;
    const charColor = content.length > charLimit * 0.9 ? "#ff2d55" : content.length > charLimit * 0.7 ? "#ffb000" : "#ffffff40";

    const togglePlatform = (p: SocialPlatform) => {
        setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
    };

    const handleSubmit = async () => {
        if (!selectedPlatforms.length || !content.trim() || !scheduledAt) return;
        setSaving(true);
        await createScheduledPost({ platforms: selectedPlatforms, content, scheduledAt, title });
        setSaving(false);
        setContent("");
        setScheduledAt("");
        setTitle("");
        setSelectedPlatforms([]);
    };

    // Default scheduledAt to now + 1 hour
    const minDate = new Date(Date.now() + 60000).toISOString().slice(0, 16);

    return (
        <div className="p-5 rounded-xl border border-white/8 bg-white/[0.02]">
            <h3 className="font-mono text-[11px] text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Plus size={12} /> Neuer Beitrag
            </h3>

            {/* Platform selector */}
            <div className="mb-4">
                <div className="text-[10px] font-mono text-white/40 mb-2">Plattformen</div>
                <div className="flex flex-wrap gap-2">
                    {(Object.entries(PLATFORM_META) as [SocialPlatform, typeof PLATFORM_META[SocialPlatform]][]).map(([p, m]) => {
                        const isConnected = connectedPlatforms.includes(p);
                        const isSelected = selectedPlatforms.includes(p);
                        return (
                            <button
                                key={p}
                                onClick={() => isConnected && togglePlatform(p)}
                                disabled={!isConnected}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-mono transition-all
                                    ${isSelected ? "border-white/30 bg-white/10 text-white" : "border-white/8 text-white/40 hover:border-white/20"}
                                    ${!isConnected ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                            >
                                <span style={{ color: isSelected ? m.color : undefined }}>{m.icon}</span>
                                {m.label.split(" ")[0]}
                                {!isConnected && <span className="text-[8px] text-red-400">●</span>}
                            </button>
                        );
                    })}
                </div>
                {connectedPlatforms.length === 0 && (
                    <p className="text-[10px] text-white/30 mt-2 font-mono">Kein Konto verbunden — erst Konten hinzufügen.</p>
                )}
            </div>

            {/* Title */}
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Interner Titel (optional)" className="w-full bg-black/30 border border-white/8 rounded px-3 py-2 font-mono text-[11px] text-white/70 focus:border-white/25 outline-none mb-3" />

            {/* Content */}
            <div className="relative mb-3">
                <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Beitragsinhalt eingeben..."
                    className="w-full h-32 bg-black/30 border border-white/8 rounded px-3 py-2 font-mono text-[11px] text-white/80 focus:border-white/25 outline-none resize-none"
                />
                <div className="absolute bottom-2 right-2 font-mono text-[9px]" style={{ color: charColor }}>
                    {content.length}/{charLimit}
                </div>
            </div>

            {/* Schedule */}
            <div className="mb-4">
                <label className="block text-[10px] font-mono text-white/40 mb-1.5 flex items-center gap-1"><Calendar size={10} /> Zeitplan</label>
                <input
                    type="datetime-local"
                    value={scheduledAt}
                    min={minDate}
                    onChange={e => setScheduledAt(e.target.value)}
                    className="w-full bg-black/30 border border-white/8 rounded px-3 py-2 font-mono text-[11px] text-white/70 focus:border-white/25 outline-none"
                />
            </div>

            <button
                onClick={handleSubmit}
                disabled={saving || !selectedPlatforms.length || !content.trim() || !scheduledAt}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#39ff14]/10 border border-[#39ff14]/30 rounded font-mono text-[11px] text-[#39ff14] hover:bg-[#39ff14]/20 disabled:opacity-30 transition-all"
            >
                {saving ? <><RefreshCw size={12} className="animate-spin" /> Wird geplant...</> : <><Clock size={12} /> Post planen</>}
            </button>
        </div>
    );
}

// ─── Post Queue Row ───────────────────────────────────────────────────────────

function PostRow({ post }: { post: ScheduledPost }) {
    const { cancelScheduledPost, approveScheduledPost, publishPostNow } = useAgentStore();
    const [expanded, setExpanded] = useState(false);
    const statusMeta = STATUS_STYLES[post.status];

    const scheduledDate = new Date(post.scheduledAt);
    const isPast = scheduledDate < new Date();

    return (
        <div className="border border-white/6 rounded-lg overflow-hidden">
            <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpanded(v => !v)}
            >
                {/* Platforms */}
                <div className="flex gap-1">
                    {post.platforms.map(p => (
                        <span key={p} style={{ color: PLATFORM_META[p].color }} title={PLATFORM_META[p].label}>
                            {PLATFORM_META[p].icon}
                        </span>
                    ))}
                </div>

                {/* Title / preview */}
                <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-white/80 font-medium truncate">{post.title || post.content.slice(0, 60)}</div>
                    <div className="text-[9px] text-white/30 font-mono mt-0.5 flex items-center gap-1">
                        <Calendar size={8} />
                        {scheduledDate.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        {isPast && post.status === "PENDING" && <span className="text-[#ffb000]"> (überfällig)</span>}
                    </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-1 font-mono text-[9px] px-2 py-1 rounded-full border"
                    style={{ color: statusMeta.color, borderColor: `${statusMeta.color}30`, background: `${statusMeta.color}10` }}>
                    {statusMeta.icon}
                    {statusMeta.label}
                </div>

                {expanded ? <ChevronUp size={12} className="text-white/30" /> : <ChevronDown size={12} className="text-white/30" />}
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-white/6"
                    >
                        <div className="px-4 py-3 bg-black/20">
                            <p className="text-[11px] text-white/60 font-mono whitespace-pre-wrap mb-3">{post.content}</p>

                            {post.status === "FAILED" && post.errorMessage && (
                                <div className="text-[10px] text-red-400 font-mono mb-3 p-2 bg-red-500/10 rounded">
                                    Fehler: {post.errorMessage}
                                </div>
                            )}

                            {post.status === "AWAITING_APPROVAL" && (
                                <div className="flex gap-2">
                                    <button onClick={() => approveScheduledPost(post._id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#39ff14]/10 border border-[#39ff14]/30 rounded font-mono text-[10px] text-[#39ff14] hover:bg-[#39ff14]/20 transition-all">
                                        <CheckCircle size={10} /> Freigeben
                                    </button>
                                    <button onClick={() => cancelScheduledPost(post._id)} className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500/20 rounded font-mono text-[10px] text-red-400/60 hover:text-red-400 transition-all">
                                        <Trash2 size={10} /> Ablehnen
                                    </button>
                                </div>
                            )}

                            {post.status === "PENDING" && (
                                <div className="flex gap-2">
                                    <button onClick={() => publishPostNow(post._id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#39ff14]/10 border border-[#39ff14]/30 rounded font-mono text-[10px] text-[#39ff14] hover:bg-[#39ff14]/20 transition-all">
                                        <Send size={10} /> Jetzt senden
                                    </button>
                                    <button onClick={() => cancelScheduledPost(post._id)} className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500/20 rounded font-mono text-[10px] text-red-400/60 hover:text-red-400 transition-all">
                                        <Trash2 size={10} /> Abbrechen
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Main Social View ─────────────────────────────────────────────────────────

export const SocialView = () => {
    const {
        socialAccounts, scheduledPosts, socialSummary,
        fetchSocialAccounts, fetchScheduledPosts, fetchSocialSummary,
    } = useAgentStore();

    const [showConnect, setShowConnect] = useState(false);
    const [activeTab, setActiveTab] = useState<"approval" | "queue" | "published" | "failed">("approval");

    useEffect(() => {
        fetchSocialAccounts();
        fetchScheduledPosts();
        fetchSocialSummary();
    }, [fetchSocialAccounts, fetchScheduledPosts, fetchSocialSummary]);

    const approvalPosts = scheduledPosts.filter(p => p.status === "AWAITING_APPROVAL");
    const pendingPosts = scheduledPosts.filter(p => p.status === "PENDING");
    const publishedPosts = scheduledPosts.filter(p => p.status === "PUBLISHED");
    const failedPosts = scheduledPosts.filter(p => p.status === "FAILED");

    const tabPosts = activeTab === "approval" ? approvalPosts : activeTab === "queue" ? pendingPosts : activeTab === "published" ? publishedPosts : failedPosts;

    return (
        <div className="flex-1 flex flex-col h-full bg-[#090e1a] overflow-hidden">
            {/* Header */}
            <header className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                <div>
                    <h1 className="font-mono text-sm text-[#00f0ff] font-bold tracking-wider mb-0.5">SOZIALE MEDIEN</h1>
                    <p className="font-mono text-[10px] text-white/30">Konten verwalten · Beiträge planen · Analytics</p>
                </div>
                <button onClick={() => setShowConnect(true)} className="flex items-center gap-2 px-4 py-2 bg-[#00f0ff]/10 border border-[#00f0ff]/30 rounded-lg font-mono text-[11px] text-[#00f0ff] hover:bg-[#00f0ff]/20 transition-all">
                    <Link2 size={12} /> Konto verknüpfen
                </button>
            </header>

            {/* KPI Bar */}
            <div className="flex gap-4 px-6 py-4 border-b border-white/5 shrink-0">
                {[
                    { label: "Verbundene Konten", value: socialSummary.connectedCount, icon: <Link2 size={14} />, color: "#00f0ff" },
                    { label: "Ausstehende Posts", value: socialSummary.pendingCount, icon: <Clock size={14} />, color: "#ffb000" },
                    { label: "Diese Woche veröffentlicht", value: socialSummary.publishedThisWeek, icon: <TrendingUp size={14} />, color: "#39ff14" },
                    { label: "Plattformen", value: new Set(socialAccounts.map(a => a.platform)).size, icon: <Zap size={14} />, color: "#bf5fff" },
                ].map((kpi) => (
                    <div key={kpi.label} className="flex-1 px-4 py-3 rounded-xl border border-white/6 bg-white/[0.02]">
                        <div className="flex items-center gap-2 mb-1" style={{ color: kpi.color }}>
                            {kpi.icon}
                            <span className="font-mono text-[9px] text-white/40 uppercase tracking-wider">{kpi.label}</span>
                        </div>
                        <div className="text-3xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
                    </div>
                ))}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden flex gap-0">
                {/* Left: Accounts + Composer */}
                <div className="w-[340px] shrink-0 border-r border-white/5 overflow-y-auto p-5 space-y-5 scrollbar-thin">
                    {/* Connected Accounts */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-mono text-[11px] text-white/50 uppercase tracking-wider">Verbundene Konten</h3>
                            <span className="font-mono text-[10px] text-white/30">{socialAccounts.length}</span>
                        </div>
                        {socialAccounts.length === 0 ? (
                            <div className="text-[11px] text-white/25 font-mono text-center py-8 border border-dashed border-white/8 rounded-xl">
                                Kein Konto verbunden.<br />
                                <button onClick={() => setShowConnect(true)} className="text-[#00f0ff]/70 hover:text-[#00f0ff] mt-1 underline">Jetzt verbinden</button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {socialAccounts.map(acc => <AccountCard key={acc._id} account={acc} />)}
                            </div>
                        )}
                    </div>

                    {/* Composer */}
                    <PostComposer />
                </div>

                {/* Right: Post Queue */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Tabs */}
                    <div className="flex border-b border-white/5 px-5 shrink-0">
                        {([
                            { key: "approval",  label: "Freigabe", count: approvalPosts.length, accent: "#bf5fff" },
                            { key: "queue",     label: "Warteschlange", count: pendingPosts.length, accent: "#00f0ff" },
                            { key: "published", label: "Veröffentlicht", count: publishedPosts.length, accent: "#00f0ff" },
                            { key: "failed",    label: "Fehlgeschlagen", count: failedPosts.length, accent: "#00f0ff" },
                        ] as const).map(tab => {
                            const isActive = activeTab === tab.key;
                            const color = isActive ? tab.accent : undefined;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`px-4 py-3 font-mono text-[11px] border-b-2 transition-colors flex items-center gap-2 ${isActive ? "" : "border-transparent text-white/40 hover:text-white/60"}`}
                                    style={isActive ? { borderColor: color, color } : undefined}
                                >
                                    {tab.label}
                                    {tab.count > 0 && (
                                        <span
                                            className="min-w-[18px] h-4 px-1 rounded-full text-[8px] font-bold flex items-center justify-center"
                                            style={isActive ? { background: `${tab.accent}20`, color: tab.accent } : { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
                                        >
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Posts list */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-2 scrollbar-thin">
                        {tabPosts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-white/20 font-mono text-[11px] gap-2">
                                <Calendar size={28} className="text-white/10" />
                                {activeTab === "approval" ? "Keine Beiträge zur Freigabe." : activeTab === "queue" ? "Keine geplanten Beiträge." : activeTab === "published" ? "Noch nichts veröffentlicht." : "Keine fehlgeschlagenen Posts."}
                            </div>
                        ) : (
                            tabPosts.map(post => <PostRow key={post._id} post={post} />)
                        )}
                    </div>
                </div>
            </div>

            {/* Connect Modal */}
            <AnimatePresence>
                {showConnect && <ConnectModal onClose={() => setShowConnect(false)} />}
            </AnimatePresence>
        </div>
    );
};

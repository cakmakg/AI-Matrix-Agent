"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    BookOpen, RefreshCw, CheckCircle2, XCircle,
    Clock, Radio, Brain, Plus, Trash2, Search, Loader2,
} from "lucide-react";
import { useAgentStore } from "@/store/agent-store";
import type { MissionSummary } from "@/store/agent-store";

// ── Types ────────────────────────────────────────────────────────────────────

interface KnowledgeDoc {
    _id: string;
    title: string;
    metadata: { wordCount?: number };
    createdAt: string;
}

type ActiveTab = "archive" | "knowledge";

// ── Mission Archive helpers ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<MissionSummary["status"], { label: string; color: string; icon: React.ReactNode }> = {
    AWAITING_APPROVAL: { label: "Awaiting", color: "text-cyber-amber border-cyber-amber/30 bg-cyber-amber/6", icon: <Clock size={9} /> },
    APPROVED: { label: "Approved", color: "text-neon-green border-neon-green/30 bg-neon-green/6", icon: <CheckCircle2 size={9} /> },
    PUBLISHED: { label: "Published", color: "text-neon-blue  border-neon-blue/30  bg-neon-blue/6", icon: <Radio size={9} /> },
    REJECTED: { label: "Rejected", color: "text-alert-red  border-alert-red/30  bg-alert-red/6", icon: <XCircle size={9} /> },
};

// ── Main View ─────────────────────────────────────────────────────────────────

export const KnowledgeView = () => {
    const { missions, fetchMissions, setDrawerItem, apiKey } = useAgentStore();
    const [activeTab, setActiveTab] = useState<ActiveTab>("archive");
    const [clientObjectId, setClientObjectId] = useState<string | null>(null);

    useEffect(() => { fetchMissions(); }, [fetchMissions]);

    // Tenant gerçek ObjectId'sini /api/tenant/config'tan al — slug VEYA env yerine.
    useEffect(() => {
        if (!apiKey) return;
        fetch("/api/tenant/config", { headers: { "x-api-key": apiKey } })
            .then(r => r.ok ? r.json() : null)
            .then((data: { client?: { _id: string } } | null) => {
                if (data?.client?._id) setClientObjectId(data.client._id);
            })
            .catch(() => {});
    }, [apiKey]);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-white/40" />
                    <span className="font-mono text-[10px] font-bold text-white/60 uppercase tracking-widest">
                        Knowledge Base
                    </span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 py-2.5 border-b border-white/5 shrink-0">
                <TabBtn active={activeTab === "archive"} onClick={() => setActiveTab("archive")}>
                    <BookOpen size={10} /> Mission Archive
                    <span className="ml-1 font-mono text-[7px] opacity-60">{missions.length}</span>
                </TabBtn>
                <TabBtn active={activeTab === "knowledge"} onClick={() => setActiveTab("knowledge")}>
                    <Brain size={10} /> RAG Knowledge
                </TabBtn>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                    {activeTab === "archive" ? (
                        <motion.div
                            key="archive"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 8 }}
                            transition={{ duration: 0.15 }}
                            className="h-full overflow-y-auto px-5 py-4 scrollbar-hide"
                        >
                            {missions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3">
                                    <BookOpen size={32} className="text-white/10" />
                                    <p className="font-mono text-[10px] text-white/20">No missions archived yet</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {missions.map((mission, i) => (
                                        <MissionCard
                                            key={mission.threadId}
                                            mission={mission}
                                            index={i}
                                            onSelect={() => setDrawerItem({ type: "mission", mission })}
                                        />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="knowledge"
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            transition={{ duration: 0.15 }}
                            className="h-full overflow-hidden"
                        >
                            {clientObjectId ? (
                                <RagKnowledgePanel clientId={clientObjectId} apiKey={apiKey} />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="font-mono text-[10px] text-white/30">Tenant-Kontext wird geladen…</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

// ── RAG Knowledge Panel ───────────────────────────────────────────────────────

export const RagKnowledgePanel = ({ clientId, apiKey }: { clientId: string; apiKey?: string | null }) => {
    const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [inputMode, setInputMode] = useState<"text" | "pdf" | "url">("text");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [urlInput, setUrlInput] = useState("");
    const [file, setFile] = useState<File | null>(null);

    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [searchResult, setSearchResult] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

    const authHeaders = useCallback((extra: Record<string, string> = {}): Record<string, string> => {
        const h: Record<string, string> = { ...extra };
        if (apiKey) h["x-api-key"] = apiKey;
        return h;
    }, [apiKey]);

    const fetchDocs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/knowledge/${clientId}`, { headers: authHeaders() });
            const data = await res.json() as { docs: KnowledgeDoc[] };
            setDocs(data.docs ?? []);
        } finally {
            setLoading(false);
        }
    }, [clientId, authHeaders]);

    useEffect(() => { fetchDocs(); }, [fetchDocs]);

    const handleSave = async () => {
        setSaving(true);
        setSaveError(null);
        setSaveSuccess(null);
        try {
            if (inputMode === "text") {
                if (!title.trim() || !content.trim()) throw new Error("Titel und Inhalt erforderlich.");
                const res = await fetch("/api/knowledge", {
                    method: "POST",
                    headers: authHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify({ title: title.trim(), content: content.trim() }),
                });
                const data = await res.json() as { success?: boolean; error?: string };
                if (!data.success) throw new Error(data.error ?? "Speichern fehlgeschlagen");
                setSaveSuccess("Text erfolgreich vektorisiert.");
                setTitle("");
                setContent("");
            } else if (inputMode === "url") {
                if (!urlInput.trim()) throw new Error("URL erforderlich.");
                const res = await fetch("/api/knowledge/url", {
                    method: "POST",
                    headers: authHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify({ url: urlInput.trim() }),
                });
                const data = await res.json() as { success?: boolean; error?: string; saved?: number; domain?: string };
                if (!data.success) throw new Error(data.error ?? "Speichern fehlgeschlagen");
                setSaveSuccess(`${data.saved} Chunks gespeichert (${data.domain})`);
                setUrlInput("");
            } else if (inputMode === "pdf") {
                if (!file) throw new Error("Bitte PDF auswählen.");
                const formData = new FormData();
                formData.append("file", file);
                const res = await fetch("/api/knowledge/upload", {
                    method: "POST",
                    headers: authHeaders(),
                    body: formData,
                });
                const data = await res.json() as { success?: boolean; error?: string; saved?: number; pages?: number };
                if (!data.success) throw new Error(data.error ?? "Speichern fehlgeschlagen");
                setSaveSuccess(`${data.saved} Chunks, ${data.pages} Seiten gespeichert`);
                setFile(null);
            }
            await fetchDocs();
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setSaving(false);
            setTimeout(() => setSaveSuccess(null), 5000);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await fetch(`/api/knowledge/${clientId}/${id}`, { method: "DELETE", headers: authHeaders() });
            setDocs((prev) => prev.filter((d) => d._id !== id));
        } catch { /* ignore */ }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        setSearchResult(null);
        try {
            const res = await fetch("/api/knowledge/search", {
                method: "POST",
                headers: authHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ query: searchQuery.trim(), topK: 3 }),
            });
            const data = await res.json() as { context?: string };
            setSearchResult(data.context || "(Kein Treffer)");
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Doc list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-hide">
                <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[8px] text-white/25 uppercase tracking-widest">
                        Stored chunks — {clientId}
                    </span>
                    <button onClick={fetchDocs} className="p-1 rounded hover:bg-white/5 text-white/25 hover:text-white/50 transition-colors">
                        <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center gap-2 text-white/20 py-4">
                        <Loader2 size={12} className="animate-spin" />
                        <span className="font-mono text-[9px]">Loading...</span>
                    </div>
                ) : docs.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8">
                        <Brain size={24} className="text-white/10" />
                        <p className="font-mono text-[10px] text-white/20">Bilgi tabanı boş</p>
                        <p className="font-mono text-[8px] text-white/12">Aşağıdan ilk chunk'ı ekle</p>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        {docs.map((doc) => (
                            <motion.div
                                key={doc._id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/3 border border-white/6
                                           hover:border-white/12 group transition-colors"
                            >
                                <Brain size={11} className="text-neon-blue/40 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-mono text-[10px] text-white/70 truncate">{doc.title}</p>
                                    <p className="font-mono text-[7px] text-white/25">
                                        {doc.metadata?.wordCount ?? "?"} words ·{" "}
                                        {new Date(doc.createdAt).toLocaleDateString("en-GB")}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDelete(doc._id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-alert-red/15
                                               text-alert-red/50 hover:text-alert-red transition-all"
                                >
                                    <Trash2 size={10} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add form */}
            <div className="px-4 pb-3 border-t border-white/5 pt-3 space-y-3 shrink-0">
                <div className="flex justify-between items-center mb-1">
                    <p className="font-mono text-[8px] text-white/25 uppercase tracking-widest">
                        Yeni bilgi ekle
                    </p>
                    <div className="flex gap-1.5">
                        <button onClick={() => setInputMode("text")} className={`font-mono text-[8px] px-2 py-0.5 rounded ${inputMode === "text" ? "bg-neon-blue/20 text-neon-blue" : "text-white/30 hover:bg-white/5 transition-colors"}`}>METİN</button>
                        <button onClick={() => setInputMode("pdf")} className={`font-mono text-[8px] px-2 py-0.5 rounded ${inputMode === "pdf" ? "bg-neon-blue/20 text-neon-blue" : "text-white/30 hover:bg-white/5 transition-colors"}`}>PDF</button>
                        <button onClick={() => setInputMode("url")} className={`font-mono text-[8px] px-2 py-0.5 rounded ${inputMode === "url" ? "bg-neon-blue/20 text-neon-blue" : "text-white/30 hover:bg-white/5 transition-colors"}`}>URL</button>
                    </div>
                </div>

                {inputMode === "text" && (
                    <div className="space-y-2">
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder='Başlık — örn: "Fiyat Listesi 2024"'
                            className="w-full bg-white/3 border border-white/8 rounded px-3 py-2 font-mono text-[10px] text-white/70
                                       placeholder:text-white/20 outline-none focus:border-neon-blue/25 transition-colors"
                        />
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Bilgi içeriği — fiyatlar, kurallar, prosedürler..."
                            rows={4}
                            className="w-full bg-white/3 border border-white/8 rounded px-3 py-2 font-mono text-[10px] text-white/70
                                       placeholder:text-white/20 outline-none focus:border-neon-blue/25 resize-none scrollbar-hide transition-colors"
                        />
                    </div>
                )}

                {inputMode === "url" && (
                    <div className="space-y-2">
                        <input
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder='https://www.ornek.com/hakkimizda'
                            className="w-full bg-white/3 border border-white/8 rounded px-3 py-2 font-mono text-[10px] text-white/70
                                       placeholder:text-white/20 outline-none focus:border-neon-blue/25 transition-colors"
                        />
                        <p className="font-mono text-[8px] text-white/30 px-1">Belirtilen adresin ana metnini bulur, gereksiz kısımları temizler ve otomatik olarak RAG parçalarına böler.</p>
                    </div>
                )}

                {inputMode === "pdf" && (
                    <div className="space-y-2">
                        <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-white/10 rounded bg-white/3 hover:bg-white/5 transition-colors cursor-pointer group">
                            <div className="flex flex-col items-center justify-center pt-3 pb-4">
                                <Plus size={16} className="text-white/30 group-hover:text-neon-blue transition-colors mb-2" />
                                <p className="font-mono text-[10px] text-white/50 group-hover:text-white/70 transition-colors">
                                    {file ? file.name : "PDF dosyası seçin veya sürükleyin"}
                                </p>
                                {file && <p className="font-mono text-[8px] text-neon-blue mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>}
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                accept="application/pdf"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                        </label>
                    </div>
                )}

                {saveError && <p className="font-mono text-[8px] text-alert-red/70 px-1">{saveError}</p>}
                {saveSuccess && <p className="font-mono text-[8px] text-neon-green/70 px-1">{saveSuccess}</p>}

                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleSave}
                    disabled={saving || (inputMode === "text" && (!title.trim() || !content.trim())) || (inputMode === "url" && !urlInput.trim()) || (inputMode === "pdf" && !file)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded font-mono text-[9px] font-bold uppercase tracking-wider
                               bg-neon-blue/8 border border-neon-blue/25 text-neon-blue hover:bg-neon-blue/15
                               hover:shadow-[0_0_12px_rgba(0,240,255,0.1)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    {saving ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                    {saving ? "İşleniyor..." : inputMode === "url" ? "Tara ve Kaydet" : "Hafızaya Kaydet"}
                </motion.button>
            </div>

            {/* Search / Test */}
            <div className="px-4 pb-4 space-y-2 shrink-0">
                <div className="h-px bg-white/5" />
                <p className="font-mono text-[8px] text-white/25 uppercase tracking-widest mb-2">
                    RAG Test Sorgusu
                </p>
                <div className="flex gap-2">
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="Soru sor — örn: Kanal tedavisi ne kadar?"
                        className="flex-1 bg-white/3 border border-white/8 rounded px-3 py-2 font-mono text-[10px] text-white/70
                                   placeholder:text-white/20 outline-none focus:border-neon-green/25 transition-colors"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={searching || !searchQuery.trim()}
                        className="px-3 py-2 rounded bg-neon-green/8 border border-neon-green/20 text-neon-green
                                   hover:bg-neon-green/15 disabled:opacity-30 transition-all"
                    >
                        {searching ? <Loader2 size={11} className="animate-spin" /> : <Search size={11} />}
                    </button>
                </div>
                {searchResult !== null && (
                    <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-neon-green/4 border border-neon-green/10 rounded-lg p-3 max-h-32 overflow-y-auto scrollbar-hide"
                    >
                        <p className="font-mono text-[8px] text-neon-green/50 mb-1 uppercase tracking-wider">RAG Sonucu</p>
                        <p className="font-mono text-[9px] text-white/50 leading-relaxed whitespace-pre-wrap">{searchResult}</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

// ── MissionCard ────────────────────────────────────────────────────────────────

interface MissionCardProps {
    mission: MissionSummary;
    index: number;
    onSelect: () => void;
}

const MissionCard = ({ mission, index, onSelect }: MissionCardProps) => {
    const cfg = STATUS_CONFIG[mission.status] ?? STATUS_CONFIG["AWAITING_APPROVAL"];
    return (
        <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.2 }}
            whileHover={{ x: 2 }}
            onClick={onSelect}
            className="w-full text-left glass-panel rounded-lg p-4 hover:bg-white/3 transition-all duration-150 group"
        >
            <div className="flex items-start justify-between gap-3 mb-2">
                <p className="font-mono text-[11px] text-white/75 leading-snug flex-1 line-clamp-2">{mission.task}</p>
                <span className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full border font-mono text-[7px] uppercase tracking-wider ${cfg.color}`}>
                    {cfg.icon}{cfg.label}
                </span>
            </div>
            <p className="font-mono text-[9px] text-white/30 line-clamp-2 leading-relaxed mb-2">{mission.contentPreview}</p>
            <div className="flex items-center justify-between">
                <span className="font-mono text-[8px] text-white/20">
                    {new Date(mission.createdAt).toLocaleString("en-GB", { hour12: false, dateStyle: "short", timeStyle: "short" })}
                </span>
                {mission.humanFeedback && (
                    <span className="font-mono text-[8px] text-white/25 italic truncate max-w-[160px]">
                        &ldquo;{mission.humanFeedback}&rdquo;
                    </span>
                )}
            </div>
        </motion.button>
    );
};

// ── TabBtn ─────────────────────────────────────────────────────────────────────

const TabBtn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[9px] tracking-wider transition-colors
            ${active ? "bg-white/8 text-white/80" : "text-white/30 hover:text-white/50 hover:bg-white/4"}`}
    >
        {children}
    </button>
);

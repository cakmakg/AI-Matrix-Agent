"use client";

import { useState, useRef } from "react";
import { Send, Zap, Download, Link, Upload } from "lucide-react";
import type { SaaSProduct } from "@/store/types";
import { getProductTheme } from "@/config/product-theme";

// ── Sub-tab definition ────────────────────────────────────────
type SubTab = {
    key: string;
    label: string;
    type: "text" | "url" | "file";
    placeholder: string;
    taskPrefix: string;
};

type ProductInputConfig = {
    label: string;
    type: "text" | "url" | "file";
    placeholder: string;
    taskPrefix: string;
    subTabs?: SubTab[];
};

// ── 6 Mega-Departman konfigürasyonu ──────────────────────────
const PRODUCT_INPUT: Record<SaaSProduct, ProductInputConfig> = {
    cx: {
        label: "Customer Experience",
        type: "text",
        placeholder: "Kundenanfrage eingeben — Agent antwortet autonom via RAG",
        taskPrefix: "",
    },
    growth: {
        label: "Growth & Revenue",
        type: "text",
        placeholder: "",
        taskPrefix: "",
        subTabs: [
            { key: "twitter",   label: "🐦 Twitter/X",       type: "text", placeholder: "Twitter thread konusu girin (z.B. AI-Trends 2025)",              taskPrefix: "TWITTER: " },
            { key: "linkedin",  label: "💼 LinkedIn",         type: "text", placeholder: "LinkedIn post konusu girin (z.B. KI im Unternehmenseinsatz)",    taskPrefix: "LINKEDIN: " },
            { key: "instagram", label: "📸 Instagram",        type: "text", placeholder: "Instagram reels/post konusu girin",                              taskPrefix: "INSTAGRAM: " },
            { key: "youtube",   label: "▶️ YouTube",          type: "text", placeholder: "YouTube script/başlık konusu girin",                             taskPrefix: "YOUTUBE: " },
            { key: "tiktok",    label: "🎵 TikTok",           type: "text", placeholder: "TikTok video script konusu girin",                               taskPrefix: "TIKTOK: " },
            { key: "email",     label: "📧 E-Mail",           type: "text", placeholder: "E-posta kampanya konusu girin",                                  taskPrefix: "EMAIL_CAMPAIGN: " },
            { key: "outreach",  label: "🎯 Cold Outreach",    type: "url",  placeholder: "URL der Ziel-Firma eingeben...",                                 taskPrefix: "COLD_OUTREACH: " },
            { key: "rfp",       label: "📋 RFP Response",     type: "file", placeholder: "Ausschreibung hochladen — Agent generiert RAG-gestützte Antwort", taskPrefix: "RFP_RESPONSE: " },
        ],
    },
    strategy: {
        label: "Strategy & Innovation",
        type: "text",
        placeholder: "",
        taskPrefix: "",
        subTabs: [
            { key: "competitor", label: "⚔️ Konkurrenz-Radar", type: "url",  placeholder: "URL des anzugreifenden Konkurrenten eingeben (z.B. stripe.com)", taskPrefix: "INNOVATION_RADAR: " },
            { key: "trend",      label: "🌊 Trend-Radar",       type: "text", placeholder: "Welche Branche soll gescannt werden? (z.B. Wearable Health Tech)", taskPrefix: "TREND_RADAR: " },
            { key: "stress",     label: "💥 Stress-Test",       type: "file", placeholder: "Business Plan oder Pitch Deck hochladen",                       taskPrefix: "BUSINESS_STRESS_TEST: " },
        ],
    },
    backoffice: {
        label: "Finance & Operations",
        type: "text",
        placeholder: "",
        taskPrefix: "",
        subTabs: [
            { key: "audit",  label: "🧾 Rechnungsaudit", type: "text", placeholder: "Rechnungsscan starten — Agent findet Anomalien und Lecks", taskPrefix: "INVOICE_PROCESSING: " },
            { key: "supply", label: "📦 Supply Chain",   type: "text", placeholder: "Bestände prüfen — Agent meldet kritische Unterdeckungen",  taskPrefix: "STOCK_CHECK: " },
        ],
    },
    engineering: {
        label: "Engineering & IT",
        type: "text",
        placeholder: ">_ Projektanforderungen eingeben. (z.B. Erstelle B2B SaaS Architektur mit Next.js...)",
        taskPrefix: "",
    },
    holding: {
        label: "The Holding",
        type: "text",
        placeholder: ">_ Wie lautet Ihr Befehl an die Holding-KI?",
        taskPrefix: "",
    },
};

interface InputZoneProps {
    product: SaaSProduct;
    sending: boolean;
    onSend: (msg: string) => void;
    onRdScan: () => void;
    onPullArtifact: () => void;
}

export function InputZone({ product, sending, onSend, onRdScan, onPullArtifact }: InputZoneProps) {
    const cfg = PRODUCT_INPUT[product] ?? PRODUCT_INPUT.cx;
    const theme = getProductTheme(product);
    const [activeSubTab, setActiveSubTab] = useState(0);
    const [input, setInput]     = useState("");
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const activeSub    = cfg.subTabs?.[activeSubTab];
    const inputType    = activeSub?.type        ?? cfg.type;
    const placeholder  = activeSub?.placeholder ?? cfg.placeholder;
    const taskPrefix   = activeSub?.taskPrefix  ?? cfg.taskPrefix;

    const handleSend = () => {
        if (!input.trim() || sending) return;
        onSend(taskPrefix + input.trim());
        setInput("");
    };

    const handleFile = (file: File) => {
        const prefix = activeSub?.taskPrefix ?? cfg.taskPrefix ?? "RFP_RESPONSE: ";
        const name   = file.name.replace(/\.[^.]+$/, "");
        onSend(`${prefix}${name} — ${file.name}`);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    return (
        <div className="px-6 py-5 border-b border-white/6 shrink-0" style={{ background: "#070c14" }}>
            {/* Department label + sub-tabs */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
                    {cfg.label}
                    <span className="font-mono text-[8px] text-white/18 bg-white/4 px-2 py-0.5 rounded border border-white/8 normal-case tracking-normal">
                        {product}
                    </span>
                </h3>
            </div>

            {/* Sub-tabs (horizontal scroll) */}
            {cfg.subTabs && cfg.subTabs.length > 0 && (
                <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-1">
                    {cfg.subTabs.map((tab, i) => (
                        <button
                            key={tab.key}
                            onClick={() => { setActiveSubTab(i); setInput(""); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all border
                                ${i === activeSubTab
                                    ? "border-[#00f0ff]/40 bg-[#00f0ff]/10 text-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.08)]"
                                    : "border-white/8 bg-white/3 text-white/40 hover:border-white/15 hover:text-white/60"}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* FILE drop zone */}
            {inputType === "file" && (
                <>
                    <div
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileRef.current?.click()}
                        className={`flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-all
                            ${dragOver
                                ? "border-[#00f0ff]/60 bg-[#00f0ff]/8"
                                : "border-white/12 bg-white/2 hover:border-[#00f0ff]/35 hover:bg-[#00f0ff]/4"}`}
                    >
                        <Upload size={22} className="text-white/25" />
                        <p className="text-xs text-white/35 text-center leading-relaxed">{placeholder}</p>
                        <p className="text-[9px] text-white/18 font-mono">.pdf · .docx · .doc</p>
                    </div>
                    <input
                        ref={fileRef} type="file" accept=".pdf,.docx,.doc" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                    />
                </>
            )}

            {/* URL input */}
            {inputType === "url" && (
                <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                        <Link size={14} className="text-[#00f0ff]/40" />
                    </div>
                    <input
                        type="url"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSend(); } }}
                        placeholder={placeholder}
                        className="w-full bg-white/4 border border-white/10 rounded-xl pl-10 pr-12 py-3.5 text-sm text-white/80
                                   placeholder:text-white/20 outline-none focus:border-[#00f0ff]/35 focus:bg-white/5 transition-colors"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || sending}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-[#00f0ff]/12 border border-[#00f0ff]/25
                                   text-[#00f0ff]/70 hover:bg-[#00f0ff]/20 hover:border-[#00f0ff]/50
                                   disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                    >
                        <Send size={12} className={sending ? "animate-pulse" : ""} />
                    </button>
                </div>
            )}

            {/* TEXT textarea */}
            {inputType === "text" && (
                <div className="relative">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder={placeholder}
                        rows={3}
                        className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-sm text-white/80
                                   placeholder:text-white/20 outline-none focus:border-[#00f0ff]/35 focus:bg-white/5
                                   resize-none transition-colors leading-relaxed"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || sending}
                        className="absolute bottom-3.5 right-3.5 p-1.5 rounded-lg bg-[#00f0ff]/12 border border-[#00f0ff]/25
                                   text-[#00f0ff]/70 hover:bg-[#00f0ff]/20 hover:border-[#00f0ff]/50
                                   disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                    >
                        <Send size={12} className={sending ? "animate-pulse" : ""} />
                    </button>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
                <button
                    onClick={onRdScan}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold
                               uppercase tracking-wider border border-[#39ff14]/20 text-[#39ff14]/60
                               hover:bg-[#39ff14]/8 hover:border-[#39ff14]/40 hover:text-[#39ff14] transition-all"
                >
                    <Zap size={11} /> F&E-Radar
                </button>
                <button
                    onClick={onPullArtifact}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold
                               uppercase tracking-wider border border-white/10 text-white/35
                               hover:bg-white/5 hover:border-white/20 hover:text-white/60 transition-all"
                >
                    <Download size={11} /> Letzter Bericht
                </button>
            </div>

            {/* Theme background glow */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.03] blur-[100px]"
                style={{ background: theme.accent }}
            />
        </div>
    );
}

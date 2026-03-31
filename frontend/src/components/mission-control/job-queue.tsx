"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Send, RefreshCw, Zap, Download, Bug, Megaphone, FileText,
    Clock, ChevronRight, AlertTriangle, Users, Radio, Link, Upload,
} from "lucide-react";
import { useAgentStore } from "@/store/agent-store";
import type { DrawerItem, SupportTicketSummary, CampaignDraftSummary, MissionSummary, AgentId, SaaSProduct } from "@/store/agent-store";
import { getProductTheme } from "@/config/product-theme";

// ── Sub-tab tanımı (Growth, Strategy, Backoffice gibi çok-modlu departmanlar için) ──
type SubTab = {
    key: string;
    label: string;
    icon: string;
    type: "text" | "url" | "file";
    placeholder: string;
    inputLabel: string;
    taskPrefix: string;
};

type ProductInputConfig = {
    label: string;
    type: "text" | "url" | "file";
    placeholder: string;
    taskPrefix: string;
    subTabs?: SubTab[];
};

// ── 6 Mega-Departman input konfigürasyonu ──────────────────────────
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
            { key: "twitter",   label: "🐦 Twitter/X",  icon: "🐦", type: "text", placeholder: "Twitter thread konusu girin (z.B. AI-Trends 2025)",             inputLabel: "Twitter-Task",   taskPrefix: "TWITTER: " },
            { key: "linkedin",  label: "💼 LinkedIn",   icon: "💼", type: "text", placeholder: "LinkedIn post konusu girin (z.B. KI im Unternehmenseinsatz)",   inputLabel: "LinkedIn-Task",  taskPrefix: "LINKEDIN: " },
            { key: "instagram", label: "📸 Instagram",  icon: "📸", type: "text", placeholder: "Instagram reels/post konusu girin (z.B. Behind the Scenes KI)", inputLabel: "Instagram-Task", taskPrefix: "INSTAGRAM: " },
            { key: "youtube",   label: "▶️ YouTube",    icon: "▶️", type: "text", placeholder: "YouTube script/başlık konusu girin (z.B. KI Tool Demo)",        inputLabel: "YouTube-Task",   taskPrefix: "YOUTUBE: " },
            { key: "tiktok",    label: "🎵 TikTok",     icon: "🎵", type: "text", placeholder: "TikTok video script konusu girin (z.B. Viral KI Hack)",         inputLabel: "TikTok-Task",    taskPrefix: "TIKTOK: " },
            { key: "email",     label: "📧 E-Mail",     icon: "📧", type: "text", placeholder: "E-posta kampanya konusu girin (z.B. Yeni ürün lansmanı)",        inputLabel: "E-Mail-Task",    taskPrefix: "EMAIL_CAMPAIGN: " },
            { key: "outreach", label: "🎯 Cold Outreach",  icon: "🎯", type: "url",  placeholder: "URL der Ziel-Firma eingeben...", inputLabel: "Ziel-URL", taskPrefix: "COLD_OUTREACH: " },
            { key: "rfp",      label: "📋 RFP Response",icon: "📋", type: "file", placeholder: "Ausschreibung hochladen — Agent generiert RAG-gestützte Antwort",  inputLabel: "Ausschreibung",    taskPrefix: "RFP_RESPONSE: " },
        ],
    },
    strategy: {
        label: "Strategy & Innovation",
        type: "text",
        placeholder: "",
        taskPrefix: "",
        subTabs: [
            { key: "competitor", label: "⚔️ Konkurrenz-Radar",  icon: "🔍", type: "url",  placeholder: "URL des anzugreifenden Konkurrenten eingeben (z.B. stripe.com)", inputLabel: "Konkurrenz-URL",       taskPrefix: "INNOVATION_RADAR: " },
            { key: "trend",      label: "🌊 Trend-Radar", icon: "📡", type: "text", placeholder: "Welche Branche soll gescannt werden? (z.B. Wearable Health Tech)", inputLabel: "Branche / Trend", taskPrefix: "TREND_RADAR: " },
            { key: "stress",     label: "💥 Stress-Test",icon: "🧪", type: "file", placeholder: "Business Plan oder Pitch Deck hochladen — wir finden die Schwachstellen",            inputLabel: "Pitch Deck",            taskPrefix: "BUSINESS_STRESS_TEST: " },
        ],
    },
    backoffice: {
        label: "Finance & Operations",
        type: "text",
        placeholder: "",
        taskPrefix: "",
        subTabs: [
            { key: "audit",  label: "🧾 Rechnungsaudit",   icon: "🧾", type: "text", placeholder: "Rechnungsscan starten — Agent findet Anomalien und Lecks", inputLabel: "Rechnungs-Task", taskPrefix: "INVOICE_PROCESSING: " },
            { key: "supply", label: "📦 Supply Chain",  icon: "📦", type: "text", placeholder: "Bestände prüfen — Agent meldet kritische Unterdeckungen",  inputLabel: "Inventar-Task",   taskPrefix: "STOCK_CHECK: " },
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

/* ── ProductInput Component ────────────────────────────────────────────────
   6 Mega-Departman yapısı:
   - Sub-tab'ı olan departmanlar (growth, strategy, backoffice) → sekme UI gösterir
   - Tek modlu departmanlar (cx, engineering, holding) → direkt input
   TaskPrefix ile girdi otomatik etiketlenerek gönderilir.
═══════════════════════════════════════════════════════════════════════════ */
function ProductInput({ product, sending, onSend, onRdScan, onPullArtifact }: {
    product: SaaSProduct;
    sending: boolean;
    onSend: (msg: string) => void;
    onRdScan: () => void;
    onPullArtifact: () => void;
}) {
    const cfg = PRODUCT_INPUT[product] ?? PRODUCT_INPUT.cx;
    const [activeSubTab, setActiveSubTab] = useState(0);
    const [input, setInput] = useState("");
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // Aktif sub-tab veya root config'den gelen input bilgileri
    const activeSub = cfg.subTabs?.[activeSubTab];
    const inputType    = activeSub?.type        ?? cfg.type;
    const placeholder  = activeSub?.placeholder ?? cfg.placeholder;
    const taskPrefix   = activeSub?.taskPrefix  ?? cfg.taskPrefix;

    const handleSend = () => {
        if (!input.trim()) return;
        onSend(taskPrefix + input.trim());
        setInput("");
    };

    const handleFile = (file: File) => {
        const prefix = activeSub?.taskPrefix ?? cfg.taskPrefix ?? "RFP_RESPONSE: ";
        const name = file.name.replace(/\.[^.]+$/, "");
        onSend(`${prefix}${name} — ${file.name}`);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    return (
        <div>
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                {cfg.label}
                <span className="font-mono text-[8px] text-white/20 bg-white/5 px-2 py-0.5 rounded border border-white/8 normal-case tracking-normal">
                    {product}
                </span>
            </h3>

            {/* ── Sub-tab sekmeler (Growth, Strategy, Backoffice) ── */}
            {cfg.subTabs && cfg.subTabs.length > 0 && (
                <div className="flex gap-1.5 mb-3">
                    {cfg.subTabs.map((tab, i) => (
                        <button
                            key={tab.key}
                            onClick={() => { setActiveSubTab(i); setInput(""); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border
                                ${i === activeSubTab
                                    ? "border-[#00f0ff]/40 bg-[#00f0ff]/10 text-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.08)]"
                                    : "border-white/8 bg-white/3 text-white/40 hover:border-white/15 hover:text-white/60"}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* FILE input */}
            {inputType === "file" && (
                <>
                    <div
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileRef.current?.click()}
                        className={`flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-all
                            ${dragOver
                                ? "border-[#00f0ff]/60 bg-[#00f0ff]/8"
                                : "border-white/12 bg-white/2 hover:border-[#00f0ff]/35 hover:bg-[#00f0ff]/4"}`}
                    >
                        <Upload size={20} className="text-white/25" />
                        <p className="text-xs text-white/35 text-center leading-relaxed">{placeholder}</p>
                        <p className="text-[9px] text-white/18 font-mono">.pdf · .docx · .doc</p>
                    </div>
                    <input ref={fileRef} type="file" accept=".pdf,.docx,.doc" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                </>
            )}

            {/* URL input */}
            {inputType === "url" && (
                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <Link size={13} className="text-[#00f0ff]/40" />
                    </div>
                    <input
                        type="url"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSend(); } }}
                        placeholder={placeholder}
                        className="w-full bg-white/4 border border-white/10 rounded-xl pl-9 pr-10 py-3 text-sm text-white/80
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

            {/* TEXT textarea (default) */}
            {inputType === "text" && (
                <div className="relative">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder={placeholder}
                        rows={3}
                        className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm text-white/80
                                   placeholder:text-white/20 outline-none focus:border-[#00f0ff]/35 focus:bg-white/5
                                   resize-none transition-colors leading-relaxed"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || sending}
                        className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-[#00f0ff]/12 border border-[#00f0ff]/25
                                   text-[#00f0ff]/70 hover:bg-[#00f0ff]/20 hover:border-[#00f0ff]/50
                                   disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                    >
                        <Send size={12} className={sending ? "animate-pulse" : ""} />
                    </button>
                </div>
            )}

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
                               uppercase tracking-wider border border-white/12 text-white/40
                               hover:bg-white/5 hover:border-white/20 hover:text-white/60 transition-all"
                >
                    <Download size={11} /> Letzter Bericht
                </button>
            </div>
        </div>
    );
}

type FilterTab = "all" | "hitl" | "support" | "campaign";

const PRIORITY_COLOR: Record<string, string> = {
    critical: "text-[#ff2d55] border-[#ff2d55]/40 bg-[#ff2d55]/8",
    high:     "text-[#ffb000] border-[#ffb000]/40 bg-[#ffb000]/8",
    medium:   "text-[#00f0ff] border-[#00f0ff]/40 bg-[#00f0ff]/8",
    low:      "text-white/40  border-white/15      bg-white/4",
};

const AGENT_ORDER: AgentId[] = [
    "ceo", "cto", "scraper", "analyst", "innovator", "writer",
    "qa", "hitl", "publisher", "radar", "cmo", "cfo",
];

const STATUS_DOT: Record<string, string> = {
    IDLE:     "bg-white/20",
    THINKING: "bg-[#00f0ff] animate-pulse",
    ACTIVE:   "bg-[#39ff14] animate-pulse",
    SUCCESS:  "bg-[#39ff14]",
    ERROR:    "bg-[#ff2d55]",
};

const STATUS_LABEL: Record<string, string> = {
    IDLE:     "Wartend",
    THINKING: "Analysiert",
    ACTIVE:   "Aktiv",
    SUCCESS:  "Abgeschlossen",
    ERROR:    "Fehler",
};

/* ── KPI Card ────────────────────────────────────────────── */
function KpiCard({ title, value, subtitle, accent = "#00f0ff" }: {
    title: string; value: string | number; subtitle?: string; accent?: string;
}) {
    return (
        <div className="flex-1 min-w-0 rounded-xl border border-white/8 bg-white/2 px-5 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: `${accent}99` }}>
                {title}
            </div>
            <div className="text-3xl font-bold text-white tabular-nums leading-none">{value}</div>
            {subtitle && <div className="text-xs text-white/35 mt-1.5">{subtitle}</div>}
        </div>
    );
}

/* ── Agent Card (OpenClaw-style) ─────────────────────────── */
function AgentCard({ id }: { id: AgentId }) {
    const agent = useAgentStore(s => s.agents[id]);
    const isActive  = agent.status === "ACTIVE" || agent.status === "THINKING";
    const isError   = agent.status === "ERROR";
    const isSuccess = agent.status === "SUCCESS";

    return (
        <div className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all duration-300 ${
            isActive  ? "border-white/15 bg-white/4" :
            isError   ? "border-[#ff2d55]/25 bg-[#ff2d55]/5" :
            isSuccess ? "border-[#39ff14]/15 bg-[#39ff14]/3" :
            "border-white/5 bg-white/2"
        }`}>
            <div className="relative shrink-0">
                <span className="text-xl leading-none">{agent.icon}</span>
                <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-[#070c14] ${STATUS_DOT[agent.status]}`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-white/90 truncate">{agent.shortLabel}</div>
                <div className={`text-[10px] truncate ${
                    isActive  ? "text-[#39ff14]"    :
                    isError   ? "text-[#ff2d55]"    :
                    isSuccess ? "text-[#39ff14]/60" :
                    "text-white/30"
                }`}>
                    {STATUS_LABEL[agent.status]}
                </div>
            </div>
        </div>
    );
}

/* ── Activity Row ────────────────────────────────────────── */
function ActivityRow({ log }: {
    log: { id: string; timestamp: string; agent: string; message: string; level: string };
}) {
    const accent =
        log.level === "ERROR" || log.level === "CRITICAL" ? "#ff2d55" :
        log.level === "SUCCESS" ? "#39ff14" :
        log.level === "WARN"    ? "#ffb000" :
        "#00f0ff";

    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-white/4 last:border-0">
            <span className="font-mono text-[9px] text-white/20 shrink-0 mt-0.5 tabular-nums w-[52px]">
                {log.timestamp.slice(0, 8)}
            </span>
            <span className="text-[11px] font-bold shrink-0 w-[44px]" style={{ color: `${accent}99` }}>
                {log.agent.slice(0, 4)}
            </span>
            <span className="text-[11px] text-white/50 leading-relaxed flex-1">{log.message}</span>
        </div>
    );
}

/* ── Queue: HITL Card ────────────────────────────────────── */
function HitlCard({ threadId, task, preview, createdAt, onSelect }: {
    threadId: string; task: string; preview: string; createdAt: string;
    onSelect: (item: DrawerItem) => void;
}) {
    const { drawerItem } = useAgentStore();
    const isActive = drawerItem?.type === "report" && drawerItem.threadId === threadId;

    return (
        <motion.button
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            onClick={() => onSelect({ type: "report", threadId })}
            className={`w-full text-left rounded-xl border transition-all duration-150 group overflow-hidden
                ${isActive
                    ? "border-[#ff2d55]/50 bg-[#ff2d55]/6"
                    : "border-white/8 bg-white/2 hover:border-[#ff2d55]/30 hover:bg-[#ff2d55]/4"}`}
        >
            <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-white/5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff2d55] animate-pulse shrink-0" />
                <span className="text-[10px] font-bold text-[#ff2d55] uppercase tracking-wider flex-1">
                    HITL — Genehmigung ausstehend
                </span>
                <ChevronRight size={11} className="text-white/25 group-hover:text-white/50 transition-colors" />
            </div>
            <div className="px-4 py-3">
                <p className="text-sm font-semibold text-white/85 truncate mb-1">{task}</p>
                <p className="text-xs text-white/35 line-clamp-2 leading-relaxed">{preview}</p>
                <p className="text-[9px] text-white/20 mt-2 font-mono">
                    {new Date(createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
            </div>
        </motion.button>
    );
}

/* ── Queue: Support Card ─────────────────────────────────── */
function SupportCard({ ticket, onSelect }: {
    ticket: SupportTicketSummary; onSelect: (item: DrawerItem) => void;
}) {
    const { drawerItem } = useAgentStore();
    const isActive = drawerItem?.type === "support" && drawerItem.ticket._id === ticket._id;
    const isBug = ticket.category === "SUPPORT_BUG";
    const accentColor = isBug ? "#ff2d55" : "#00f0ff";
    const priorityClass = PRIORITY_COLOR[ticket.priority ?? "medium"];

    return (
        <motion.button
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            onClick={() => onSelect({ type: "support", ticket })}
            className={`w-full text-left rounded-xl border transition-all duration-150 group overflow-hidden
                ${isActive
                    ? "border-white/20 bg-white/5"
                    : "border-white/8 bg-white/2 hover:border-white/15 hover:bg-white/4"}`}
        >
            <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-white/5">
                {isBug
                    ? <Bug size={10} style={{ color: accentColor }} />
                    : <AlertTriangle size={10} style={{ color: accentColor }} />
                }
                <span className="text-[10px] font-bold uppercase tracking-wider flex-1" style={{ color: `${accentColor}cc` }}>
                    {isBug ? "Fehlerbericht" : "Preisanfrage"}
                </span>
                {ticket.priority && (
                    <span className={`text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-bold ${priorityClass}`}>
                        {ticket.priority}
                    </span>
                )}
                <ChevronRight size={11} className="text-white/25 group-hover:text-white/50 transition-colors" />
            </div>
            <div className="px-4 py-3">
                <p className="text-sm font-semibold text-white/85 truncate mb-0.5">{ticket.subject}</p>
                <p className="text-xs text-white/40 truncate">{ticket.from}</p>
                {ticket.aiSummary && (
                    <p className="text-[10px] text-white/30 mt-2 line-clamp-2 leading-relaxed">{ticket.aiSummary}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-[8px] text-white/25 uppercase bg-white/5 px-1.5 py-0.5 rounded">{ticket.platform}</span>
                    <span className="text-[9px] text-white/20 font-mono">
                        {new Date(ticket.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                </div>
            </div>
        </motion.button>
    );
}

/* ── Queue: Campaign Card ────────────────────────────────── */
function CampaignCard({ campaign, onSelect }: {
    campaign: CampaignDraftSummary; onSelect: (item: DrawerItem) => void;
}) {
    const { drawerItem } = useAgentStore();
    const isActive = drawerItem?.type === "campaign" && drawerItem.campaign._id === campaign._id;

    return (
        <motion.button
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            onClick={() => onSelect({ type: "campaign", campaign })}
            className={`w-full text-left rounded-xl border transition-all duration-150 group overflow-hidden
                ${isActive
                    ? "border-[#ff6b35]/40 bg-[#ff6b35]/6"
                    : "border-white/8 bg-white/2 hover:border-[#ff6b35]/25 hover:bg-[#ff6b35]/4"}`}
        >
            <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-white/5">
                <Megaphone size={10} className="text-[#ff6b35]" />
                <span className="text-[10px] font-bold text-[#ff6b35] uppercase tracking-wider flex-1">CMO — Kampagne</span>
                <div className="flex gap-1">
                    {["Li", "Tw", "Fb"].map(ch => (
                        <span key={ch} className="text-[8px] text-[#ff6b35]/60 bg-[#ff6b35]/10 px-1.5 py-0.5 rounded">{ch}</span>
                    ))}
                </div>
                <ChevronRight size={11} className="text-white/25 group-hover:text-white/50 transition-colors" />
            </div>
            <div className="px-4 py-3">
                <p className="text-sm font-semibold text-white/85 truncate">{campaign.reportTitle}</p>
                <p className="text-[9px] text-white/20 mt-1.5 font-mono">
                    {new Date(campaign.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
            </div>
        </motion.button>
    );
}

/* ── Queue: Archive Card ─────────────────────────────────── */
function ArchiveCard({ mission, onSelect }: { mission: MissionSummary; onSelect: (item: DrawerItem) => void }) {
    return (
        <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={() => onSelect({ type: "mission", mission })}
            className="w-full text-left rounded-xl border border-white/5 bg-white/2 hover:bg-white/4 hover:border-white/10 transition-all px-4 py-3 group"
        >
            <div className="flex items-center gap-3">
                <FileText size={11} className="text-white/25 shrink-0" />
                <p className="text-[11px] text-white/50 truncate flex-1">{mission.task}</p>
                <span className={`text-[8px] uppercase tracking-wider px-2 py-1 rounded border font-semibold shrink-0 ${
                    mission.status === "PUBLISHED" ? "text-[#39ff14]/70 border-[#39ff14]/20 bg-[#39ff14]/5" :
                    mission.status === "REJECTED"  ? "text-[#ff2d55]/60 border-[#ff2d55]/20 bg-[#ff2d55]/5" :
                    "text-white/30 border-white/10"
                }`}>{mission.status}</span>
            </div>
        </motion.button>
    );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT — OpenClaw-style Full Dashboard
═══════════════════════════════════════════════════════════════ */
export const JobQueue = () => {
    const {
        workflowPhase, threadId, missionMessage, pendingContent,
        missions, supportTickets, campaignDrafts, logs, agents, cronSecondsLeft,
        clientProduct,
        fetchSupportTickets, fetchCampaignDrafts, fetchMissions,
        setDrawerItem, sendMission, forceRdScan, pullLatestArtifact,
    } = useAgentStore();

    const [activeTab, setActiveTab] = useState<FilterTab>("all");
    const [loading, setLoading]   = useState(false);
    const [sending, setSending]   = useState(false);
    const [mounted, setMounted]   = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // SSR sırasında her zaman varsayılan temayı kullan
    const safeProduct = mounted ? (clientProduct ?? "cx") : "cx";
    const theme = getProductTheme(safeProduct);

    const hasLiveHitl     = workflowPhase === "AWAITING_APPROVAL" && !!threadId;
    const dbHitlMissions  = missions.filter(m => m.status === "AWAITING_APPROVAL" && m.threadId !== threadId);
    const pendingCampaigns = campaignDrafts.filter(c => c.status === "AWAITING_APPROVAL");

    const counts = {
        hitl:     (hasLiveHitl ? 1 : 0) + dbHitlMissions.length,
        support:  supportTickets.length,
        campaign: pendingCampaigns.length,
    };
    const total = counts.hitl + counts.support + counts.campaign;
    const activeAgentCount = Object.values(agents).filter(a => a.status === "ACTIVE" || a.status === "THINKING").length;
    const publishedMissions = missions.filter(m => m.status === "PUBLISHED" || m.status === "APPROVED").slice(0, 8);

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

    const handleSelect = (item: DrawerItem) => setDrawerItem(item);

    const tabs: { key: FilterTab; label: string; count: number }[] = [
        { key: "all",      label: "Alle",     count: total           },
        { key: "hitl",     label: "HITL",     count: counts.hitl     },
        { key: "support",  label: "Support",  count: counts.support  },
        { key: "campaign", label: "Kampagne", count: counts.campaign  },
    ];

    const showHitl     = activeTab === "all" || activeTab === "hitl";
    const showSupport  = activeTab === "all" || activeTab === "support";
    const showCampaign = activeTab === "all" || activeTab === "campaign";

    const cronMin = Math.floor(cronSecondsLeft / 60);
    const cronSec = String(cronSecondsLeft % 60).padStart(2, "0");

    const phaseLabel: Record<string, string> = {
        IDLE: "Bereit", DISPATCHING: "Wird gesendet", RUNNING: "Läuft",
        AWAITING_APPROVAL: "Genehmigung ausstehend", PUBLISHING: "Wird veröffentlicht",
        DELIVERED: "Ausgeliefert", REVISING: "Wird überarbeitet",
    };

    return (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            {/* DEPARTMAN ATMOSFERI (Background Pulse) */}
            <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] blur-[160px] opacity-[0.06] animate-pulse pointer-events-none" 
                style={{ backgroundColor: theme.accent }} 
            />

            {/* ── HEADER ── */}
            <header
                className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0"
                style={{ background: "#0b1220" }}
            >
                <div>
                    <h1 className="text-base font-semibold text-white tracking-wide">AI Orchestra Kontrollzentrum</h1>
                    <p className="text-xs text-white/40 mt-0.5">
                        {workflowPhase !== "IDLE" && workflowPhase !== "DELIVERED"
                            ? `${phaseLabel[workflowPhase] ?? workflowPhase} — #${threadId?.slice(0, 8) ?? "—"}`
                            : "System bereit. Neue Aufgabe erwartet."}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-[#39ff14]/70">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-pulse" />
                        Alle Systeme aktiv
                    </span>
                    <button
                        onClick={refresh}
                        disabled={loading}
                        className="p-2 rounded-lg hover:bg-white/8 text-white/40 hover:text-white/70 transition-colors disabled:opacity-30"
                    >
                        <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </header>

            {/* ── KPI ROW ── */}
            <div
                className="flex gap-4 px-6 py-4 border-b border-white/6 shrink-0"
                style={{ background: "#0b1220" }}
            >
                <KpiCard
                    title="Aktive Agenten"
                    value={`${activeAgentCount}/12`}
                    subtitle="Laufende Agenten"
                    accent="#39ff14"
                />
                <KpiCard
                    title="Ausstehende Aufgaben"
                    value={total}
                    subtitle="HITL + Support + Kampagne"
                    accent="#ff2d55"
                />
                <KpiCard
                    title="Arbeitsphase"
                    value={phaseLabel[workflowPhase] ?? workflowPhase}
                    subtitle={threadId ? `Thread: #${threadId.slice(0, 6)}` : "Keine Aufgabe"}
                    accent="#00f0ff"
                />
                <KpiCard
                    title="Nächster Radar"
                    value={`${cronMin}:${cronSec}`}
                    subtitle="Automatischer F&E-Scan"
                    accent="#ffb000"
                />
            </div>

            {/* ── MAIN BODY ── */}
            <div className="flex-1 flex overflow-hidden">

                {/* ── LEFT: Agent Grid + Activity Feed ── */}
                <div
                    className="flex-1 flex flex-col overflow-hidden border-r border-white/6"
                    style={{ background: "#070c14" }}
                >
                    {/* Agent Grid */}
                    <div className="px-6 py-5 border-b border-white/5 shrink-0">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-white/60 flex items-center gap-2">
                                <Users size={13} className="text-white/30" />
                                Agenten-Team
                            </h2>
                            <span className="text-xs font-semibold text-[#39ff14]/60">
                                {activeAgentCount > 0 ? `${activeAgentCount} Aktiv` : "Bereit"}
                            </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2.5">
                            {AGENT_ORDER.map(id => <AgentCard key={id} id={id} />)}
                        </div>
                    </div>

                    {/* Activity Feed */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-hide">
                        <h2 className="text-sm font-semibold text-white/60 flex items-center gap-2 mb-1 sticky top-0 pb-2 border-b border-white/4"
                            style={{ background: "#070c14" }}>
                            <Radio size={13} className="text-white/30" />
                            Echtzeit-Aktivitätslog
                        </h2>
                        {logs.length === 0 ? (
                            <p className="text-xs text-white/20 py-6 text-center">
                                Noch keine Aktivitäten. Aufgabe senden.
                            </p>
                        ) : (
                            [...logs].reverse().slice(0, 30).map(log => (
                                <ActivityRow key={log.id} log={log} />
                            ))
                        )}
                    </div>
                </div>

                {/* ── RIGHT: Mission Input + Queue ── */}
                <div
                    className="w-[380px] shrink-0 flex flex-col overflow-hidden"
                    style={{ background: "#0b1220" }}
                >
                    {/* Mission Input — ürüne göre dinamik form */}
                    <div className="px-5 py-4 border-b border-white/6 shrink-0">
                        <ProductInput
                            product={safeProduct}
                            sending={sending}
                            onSend={handleSend}
                            onRdScan={forceRdScan}
                            onPullArtifact={pullLatestArtifact}
                        />
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 px-4 py-3 border-b border-white/6 shrink-0">
                        {tabs.map(({ key, label, count }) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors
                                    ${activeTab === key
                                        ? "bg-[#00f0ff]/12 border border-[#00f0ff]/25 text-[#00f0ff]"
                                        : "text-white/40 hover:text-white/65 hover:bg-white/5 border border-transparent"
                                    }`}
                            >
                                {label}
                                {count > 0 && (
                                    <span className={`min-w-[16px] h-4 px-1 rounded-full text-[9px] flex items-center justify-center font-bold
                                        ${activeTab === key ? "bg-[#00f0ff]/20 text-[#00f0ff]" : "bg-white/10 text-white/50"}`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Queue Cards */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 scrollbar-hide">
                        <AnimatePresence mode="popLayout">
                            {showHitl && hasLiveHitl && threadId && (
                                <HitlCard
                                    key={`live-${threadId}`}
                                    threadId={threadId}
                                    task={missionMessage ?? "Aktif Görev"}
                                    preview={pendingContent?.slice(0, 150) ?? "Rapor hazırlanıyor..."}
                                    createdAt={new Date().toISOString()}
                                    onSelect={handleSelect}
                                />
                            )}
                            {showHitl && dbHitlMissions.map(m => (
                                <HitlCard
                                    key={m.threadId} threadId={m.threadId} task={m.task}
                                    preview={m.contentPreview} createdAt={m.createdAt}
                                    onSelect={handleSelect}
                                />
                            ))}
                            {showSupport && supportTickets.map(t => (
                                <SupportCard key={t._id} ticket={t} onSelect={handleSelect} />
                            ))}
                            {showCampaign && pendingCampaigns.map(c => (
                                <CampaignCard key={c._id} campaign={c} onSelect={handleSelect} />
                            ))}
                        </AnimatePresence>

                        {total === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                                <div className="w-12 h-12 rounded-2xl border border-white/8 flex items-center justify-center text-xl text-white/15">
                                    ◫
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white/25">Keine ausstehenden Aufgaben</p>
                                    <p className="text-xs text-white/15 mt-1">Systeme bereit</p>
                                </div>
                            </div>
                        )}

                        {publishedMissions.length > 0 && (activeTab === "all" || activeTab === "hitl") && (
                            <>
                                <div className="flex items-center gap-2 mt-2 mb-1">
                                    <div className="flex-1 h-px bg-white/6" />
                                    <span className="text-[9px] text-white/20 uppercase tracking-widest flex items-center gap-1 font-mono">
                                        <Clock size={8} /> Archiv
                                    </span>
                                    <div className="flex-1 h-px bg-white/6" />
                                </div>
                                {publishedMissions.map(m => (
                                    <ArchiveCard key={m.threadId} mission={m} onSelect={handleSelect} />
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

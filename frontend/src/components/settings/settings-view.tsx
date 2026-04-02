"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAgentStore } from "@/store/agent-store";
import { buildHeaders } from "@/store/utils";
import { Webhook, Bot, MessageSquare, Zap, Plus, X } from "lucide-react";

type ActiveTab = "agent" | "integrations" | "prompts" | "autopilot";

interface TenantConfigData {
    agentPersona: string;
    tone: string;
    companyContext: string;
    supportInstructions: string;
    companyName: string;
    language: string;
}

interface IntegrationsData {
    n8nWebhookUrl: string;
    n8nWebhookSecret: string;
    telegramBotToken: string;
    telegramChatId: string;
    discordWebhookUrl: string;
}

interface SocialAutoData {
    isActive: boolean;
    platforms: string[];
    topics: string[];
    persona: string;
    voice: string;
    lang: string;
    postHour: number;
    postsPerTopic: number;
    maxHashtags: number;
    requireHITL: boolean;
}

interface ClientData { name: string; slug: string; }
interface AgentPromptEntry {
    current: string;
    isCustom: boolean;
    default: string;
}
type PromptsData = Record<string, AgentPromptEntry>;

const DEFAULT_FORM: TenantConfigData = {
    agentPersona: "",
    tone: "Formal, professionell, vertrauenswürdig",
    companyContext: "",
    supportInstructions: "",
    companyName: "",
    language: "de",
};

const DEFAULT_INT: IntegrationsData = {
    n8nWebhookUrl: "", n8nWebhookSecret: "",
    telegramBotToken: "", telegramChatId: "",
    discordWebhookUrl: "",
};

const DEFAULT_SOCIAL_AUTO: SocialAutoData = {
    isActive: false,
    platforms: ["twitter"],
    topics: [],
    persona: "",
    voice: "",
    lang: "de",
    postHour: 7,
    postsPerTopic: 3,
    maxHashtags: 1,
    requireHITL: true,
};

const PLATFORM_OPTIONS = [
    { key: "twitter",   label: "𝕏 Twitter/X" },
    { key: "linkedin",  label: "💼 LinkedIn" },
    { key: "instagram", label: "📸 Instagram" },
];

const LANG_OPTIONS = [
    { value: "de",    label: "Deutsch" },
    { value: "en",    label: "Englisch" },
    { value: "tr",    label: "Türkisch" },
    { value: "mixed", label: "Gemischt (DE/EN)" },
];

// ─── Toggle-Schalter ──────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!checked)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 border ${
                checked ? "bg-[#39ff14]/20 border-[#39ff14]/50" : "bg-white/5 border-white/10"
            }`}
        >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all duration-200 ${
                checked ? "translate-x-5 bg-[#39ff14]" : "translate-x-0 bg-white/30"
            }`} />
        </button>
    );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export const SettingsView = () => {
    const addAlert = useAgentStore((s) => s.addAlert);
    const apiKey   = useAgentStore((s) => s.apiKey);
    const [activeTab, setActiveTab]           = useState<ActiveTab>("agent");
    const [client, setClient]                 = useState<ClientData | null>(null);
    const [loading, setLoading]               = useState(false);
    const [saving, setSaving]                 = useState(false);
    const [form, setForm]                     = useState<TenantConfigData>(DEFAULT_FORM);
    const [intForm, setIntForm]               = useState<IntegrationsData>(DEFAULT_INT);
    const [socialAutoForm, setSocialAutoForm] = useState<SocialAutoData>(DEFAULT_SOCIAL_AUTO);
    const [prompts, setPrompts]               = useState<PromptsData>({});
    const [promptSaving, setPromptSaving]     = useState<string | null>(null);
    const [topicInput, setTopicInput]         = useState("");

    useEffect(() => {
        setLoading(true);
        fetch("/api/prompts", { headers: buildHeaders(apiKey) })
            .then(r => r.json()).then(d => { if (d.success) setPrompts(d.prompts); }).catch(() => {});
        fetch("/api/tenant/config", { headers: buildHeaders(apiKey) })
            .then(r => r.json())
            .then((data) => {
                if (data.success) {
                    setClient(data.client);
                    if (data.config) {
                        setForm({
                            agentPersona:        data.config.agentPersona        || "",
                            tone:                data.config.tone                || DEFAULT_FORM.tone,
                            companyContext:       data.config.companyContext       || "",
                            supportInstructions: data.config.supportInstructions || "",
                            companyName:         data.config.companyName         || "",
                            language:            data.config.language            || "de",
                        });
                        if (data.config.integrations) {
                            setIntForm({
                                n8nWebhookUrl:    data.config.integrations.n8nWebhookUrl    || "",
                                n8nWebhookSecret: data.config.integrations.n8nWebhookSecret || "",
                                telegramBotToken: data.config.integrations.telegramBotToken || "",
                                telegramChatId:   data.config.integrations.telegramChatId   || "",
                                discordWebhookUrl:data.config.integrations.discordWebhookUrl|| "",
                            });
                        }
                        if (data.config.socialAuto) {
                            setSocialAutoForm({
                                isActive:      data.config.socialAuto.isActive      ?? false,
                                platforms:     data.config.socialAuto.platforms     ?? ["twitter"],
                                topics:        data.config.socialAuto.topics        ?? [],
                                persona:       data.config.socialAuto.persona       ?? "",
                                voice:         data.config.socialAuto.voice         ?? "",
                                lang:          data.config.socialAuto.lang          ?? "de",
                                postHour:      data.config.socialAuto.postHour      ?? 7,
                                postsPerTopic: data.config.socialAuto.postsPerTopic ?? 3,
                                maxHashtags:   data.config.socialAuto.maxHashtags   ?? 1,
                                requireHITL:   data.config.socialAuto.requireHITL   ?? true,
                            });
                        }
                    }
                }
            })
            .catch(() => addAlert({ message: "Einstellungen konnten nicht geladen werden.", type: "error" }))
            .finally(() => setLoading(false));
    }, [addAlert, apiKey]);

    // ── Speichern-Handler ─────────────────────────────────────────────────────
    const handleSaveAgent = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/tenant/config", {
                method: "PUT",
                headers: buildHeaders(apiKey, true),
                body: JSON.stringify(form),
            });
            if (res.ok) addAlert({ message: "Einstellungen erfolgreich gespeichert.", type: "success" });
            else        addAlert({ message: "Fehler beim Speichern.", type: "error" });
        } catch {
            addAlert({ message: "Fehler beim Speichern.", type: "error" });
        }
        setSaving(false);
    };

    const handleSaveIntegrations = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/tenant/integrations", {
                method: "PUT",
                headers: buildHeaders(apiKey, true),
                body: JSON.stringify(intForm),
            });
            if (res.ok) addAlert({ message: "Integrationen gespeichert.", type: "success" });
            else        addAlert({ message: "Fehler beim Speichern.", type: "error" });
        } catch {
            addAlert({ message: "Fehler beim Speichern.", type: "error" });
        }
        setSaving(false);
    };

    const handleSaveSocialAuto = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/tenant/config", {
                method: "PUT",
                headers: buildHeaders(apiKey, true),
                body: JSON.stringify({ socialAuto: socialAutoForm }),
            });
            if (res.ok) addAlert({ message: "Autopilot-Einstellungen gespeichert.", type: "success" });
            else        addAlert({ message: "Fehler beim Speichern.", type: "error" });
        } catch {
            addAlert({ message: "Fehler beim Speichern.", type: "error" });
        }
        setSaving(false);
    };

    const handleSavePrompt = async (agentName: string, text: string) => {
        setPromptSaving(agentName);
        try {
            const res = await fetch(`/api/prompts/${agentName}`, {
                method: "PUT",
                headers: buildHeaders(apiKey, true),
                body: JSON.stringify({ promptText: text }),
            });
            if (res.ok) {
                setPrompts(prev => ({ ...prev, [agentName]: { ...prev[agentName], current: text, isCustom: true } }));
                addAlert({ message: `${agentName}-Prompt gespeichert.`, type: "success" });
            } else {
                addAlert({ message: "Fehler beim Speichern.", type: "error" });
            }
        } catch {
            addAlert({ message: "Fehler beim Speichern.", type: "error" });
        }
        setPromptSaving(null);
    };

    const handleResetPrompt = async (agentName: string) => {
        setPromptSaving(agentName);
        try {
            const res = await fetch(`/api/prompts/${agentName}`, { method: "DELETE", headers: buildHeaders(apiKey) });
            if (res.ok) {
                const data = await res.json();
                setPrompts(prev => ({ ...prev, [agentName]: { current: data.default, isCustom: false, default: data.default } }));
                addAlert({ message: `${agentName}-Prompt zurückgesetzt.`, type: "success" });
            }
        } catch {
            addAlert({ message: "Fehler beim Zurücksetzen.", type: "error" });
        }
        setPromptSaving(null);
    };

    // ── Themen-Verwaltung ─────────────────────────────────────────────────────
    const addTopic = () => {
        const t = topicInput.trim();
        if (!t || socialAutoForm.topics.includes(t)) return;
        setSocialAutoForm(prev => ({ ...prev, topics: [...prev.topics, t] }));
        setTopicInput("");
    };

    const removeTopic = (topic: string) => {
        setSocialAutoForm(prev => ({ ...prev, topics: prev.topics.filter(t => t !== topic) }));
    };

    const togglePlatform = (key: string) => {
        setSocialAutoForm(prev => ({
            ...prev,
            platforms: prev.platforms.includes(key)
                ? prev.platforms.filter(p => p !== key)
                : [...prev.platforms, key],
        }));
    };

    const saveHandlers: Partial<Record<ActiveTab, () => void>> = {
        agent:        handleSaveAgent,
        integrations: handleSaveIntegrations,
        autopilot:    handleSaveSocialAuto,
    };

    if (loading) return <div className="p-8 text-white/50 font-mono text-sm">Wird geladen...</div>;

    return (
        <div className="flex-1 flex flex-col h-full bg-[#090e1a] overflow-hidden">
            {/* Header */}
            <header className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <div>
                    <h1 className="font-mono text-sm text-neon-blue font-bold tracking-wider mb-1">CLIENT SETTINGS</h1>
                    <p className="font-mono text-[10px] text-white/40">
                        {client ? `${client.name} (${client.slug})` : "Mandantenkonfiguration"}
                    </p>
                </div>
                <button
                    onClick={saveHandlers[activeTab]}
                    style={activeTab === "prompts" ? { display: "none" } : {}}
                    disabled={saving}
                    className="px-4 py-1.5 bg-neon-green/10 text-neon-green border border-neon-green/30 rounded font-mono text-[10px] hover:bg-neon-green hover:text-black transition-all disabled:opacity-50"
                >
                    {saving ? "WIRD GESPEICHERT..." : "SPEICHERN"}
                </button>
            </header>

            {/* Tabs */}
            <div className="flex border-b border-white/5 px-6">
                {([
                    ["agent",        "KI-Agent"],
                    ["integrations", "Integrationen"],
                    ["autopilot",    "⚡ Autopilot"],
                    ["prompts",      "KI-Prompts"],
                ] as [ActiveTab, string][]).map(([id, label]) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`py-3 px-4 font-mono text-[11px] tracking-wider border-b-2 transition-all ${
                            activeTab === id
                                ? id === "autopilot"
                                    ? "text-[#39ff14] border-[#39ff14]"
                                    : "text-[#00f0ff] border-[#00f0ff]"
                                : "text-white/30 border-transparent hover:text-white/60"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">

                {/* ── KI-Agent Tab ── */}
                {activeTab === "agent" && (
                    <div className="max-w-3xl space-y-6">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                            <h2 className="font-mono text-xs text-white/80 mb-3">Firmenname</h2>
                            <input type="text" value={form.companyName}
                                onChange={e => setForm({ ...form, companyName: e.target.value })}
                                placeholder="z.B.: Mustermann Immobilien GmbH"
                                className="w-full bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-neon-blue outline-none" />
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                            <h2 className="font-mono text-xs text-white/80 mb-3">Antwortsprache</h2>
                            <select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}
                                className="w-full bg-[#090e1a] border border-white/10 rounded px-3 py-2 font-mono text-[11px] text-white/70 focus:border-neon-blue outline-none">
                                <option value="de">Deutsch</option>
                                <option value="en">Englisch</option>
                                <option value="tr">Türkisch</option>
                            </select>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                            <h2 className="font-mono text-xs text-white/80 mb-3">KI-Agenten-Persona (System-Prompt)</h2>
                            <textarea value={form.agentPersona} onChange={e => setForm({ ...form, agentPersona: e.target.value })}
                                placeholder="Du bist der digitale Assistent von..."
                                className="w-full h-32 bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-neon-blue outline-none resize-none" />
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                            <h2 className="font-mono text-xs text-white/80 mb-3">Kommunikationston</h2>
                            <select value={form.tone} onChange={e => setForm({ ...form, tone: e.target.value })}
                                className="w-full bg-[#090e1a] border border-white/10 rounded px-3 py-2 font-mono text-[11px] text-white/70 focus:border-neon-blue outline-none">
                                <option value="Formal, professionell, vertrauenswürdig">Formal & Professionell</option>
                                <option value="Freundlich, locker, energetisch">Freundlich & Energetisch</option>
                                <option value="Technisch, detailliert, analytisch">Technisch & Analytisch</option>
                            </select>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                            <h2 className="font-mono text-xs text-white/80 mb-3">Allgemeine Unternehmensinformationen</h2>
                            <textarea value={form.companyContext} onChange={e => setForm({ ...form, companyContext: e.target.value })}
                                placeholder="z.B.: Unser Hauptbüro befindet sich in München..."
                                className="w-full h-24 bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-neon-blue outline-none resize-none" />
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                            <h2 className="font-mono text-xs text-white/80 mb-3">Support-Vorlagen-Richtlinien</h2>
                            <textarea value={form.supportInstructions} onChange={e => setForm({ ...form, supportInstructions: e.target.value })}
                                placeholder="Für Terminanfragen bitte an folgende Nummer weiterleiten..."
                                className="w-full h-24 bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-neon-blue outline-none resize-none" />
                        </motion.div>
                    </div>
                )}

                {/* ── Integrationen Tab ── */}
                {activeTab === "integrations" && (
                    <div className="max-w-3xl space-y-6">
                        <p className="font-mono text-[10px] text-white/30 leading-relaxed">
                            Mandantenspezifische Webhook-URLs. Der Publisher-Agent verwendet diese URLs vorrangig
                            gegenüber den globalen .env-Variablen. Leere Felder fallen auf die globale Konfiguration zurück.
                        </p>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-2 mb-4">
                                <Webhook size={14} className="text-[#ff6b35]" />
                                <h2 className="font-mono text-xs text-white/80">n8n Webhook</h2>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="font-mono text-[10px] text-white/40 block mb-1">Webhook-URL</label>
                                    <input type="url" value={intForm.n8nWebhookUrl}
                                        onChange={e => setIntForm({ ...intForm, n8nWebhookUrl: e.target.value })}
                                        placeholder="https://your-n8n.io/webhook/..."
                                        className="w-full bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-[#ff6b35]/50 outline-none" />
                                </div>
                                <div>
                                    <label className="font-mono text-[10px] text-white/40 block mb-1">Webhook-Secret (optional)</label>
                                    <input type="password" value={intForm.n8nWebhookSecret}
                                        onChange={e => setIntForm({ ...intForm, n8nWebhookSecret: e.target.value })}
                                        placeholder="••••••••••••"
                                        className="w-full bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-[#ff6b35]/50 outline-none" />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-2 mb-4">
                                <Bot size={14} className="text-[#00f0ff]" />
                                <h2 className="font-mono text-xs text-white/80">Telegram Bot</h2>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="font-mono text-[10px] text-white/40 block mb-1">Bot-Token</label>
                                    <input type="password" value={intForm.telegramBotToken}
                                        onChange={e => setIntForm({ ...intForm, telegramBotToken: e.target.value })}
                                        placeholder="1234567890:AAF..."
                                        className="w-full bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-[#00f0ff]/50 outline-none" />
                                </div>
                                <div>
                                    <label className="font-mono text-[10px] text-white/40 block mb-1">Chat-ID</label>
                                    <input type="text" value={intForm.telegramChatId}
                                        onChange={e => setIntForm({ ...intForm, telegramChatId: e.target.value })}
                                        placeholder="-100123456789"
                                        className="w-full bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-[#00f0ff]/50 outline-none" />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-2 mb-4">
                                <MessageSquare size={14} className="text-[#5865f2]" />
                                <h2 className="font-mono text-xs text-white/80">Discord Webhook</h2>
                            </div>
                            <input type="url" value={intForm.discordWebhookUrl}
                                onChange={e => setIntForm({ ...intForm, discordWebhookUrl: e.target.value })}
                                placeholder="https://discord.com/api/webhooks/..."
                                className="w-full bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-[#5865f2]/50 outline-none" />
                        </motion.div>
                    </div>
                )}

                {/* ── Autopilot Tab ── */}
                {activeTab === "autopilot" && (
                    <div className="max-w-3xl space-y-5">
                        <p className="font-mono text-[10px] text-white/30 leading-relaxed">
                            Der Autopilot erstellt täglich automatisch Social-Media-Inhalte zu den definierten Themen.
                            Mit aktivierter HITL-Genehmigung erscheinen Beiträge zuerst im Genehmigungsbereich.
                        </p>

                        {/* Aktivierung */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded border bg-white/[0.02] transition-colors ${
                            socialAutoForm.isActive ? "border-[#39ff14]/25" : "border-white/5"
                        }`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="font-mono text-xs text-white/80 flex items-center gap-2">
                                        <Zap size={12} className={socialAutoForm.isActive ? "text-[#39ff14]" : "text-white/30"} />
                                        Autopilot-Status
                                    </h2>
                                    <p className="font-mono text-[9px] text-white/30 mt-1">
                                        {socialAutoForm.isActive ? "Aktiv — tägliche Content-Erstellung läuft" : "Inaktiv — kein automatischer Content"}
                                    </p>
                                </div>
                                <Toggle
                                    checked={socialAutoForm.isActive}
                                    onChange={v => setSocialAutoForm(prev => ({ ...prev, isActive: v }))}
                                />
                            </div>
                        </motion.div>

                        {/* Themen */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                            <h2 className="font-mono text-xs text-white/80 mb-1">Inhaltsthemen</h2>
                            <p className="font-mono text-[9px] text-white/25 mb-3">Branchenspezifische Themen — z.B. &quot;Berliner Mietmarkt 2026&quot; oder &quot;Zinsentwicklung Immobilien&quot;</p>

                            {/* Chips */}
                            {socialAutoForm.topics.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {socialAutoForm.topics.map(topic => (
                                        <span key={topic} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff]/25 font-mono text-[10px] text-[#00f0ff]">
                                            {topic}
                                            <button onClick={() => removeTopic(topic)} className="hover:text-white transition-colors">
                                                <X size={10} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Eingabe */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={topicInput}
                                    onChange={e => setTopicInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTopic(); } }}
                                    placeholder="Thema eingeben und Enter drücken..."
                                    className="flex-1 bg-[#090e1a] border border-white/10 rounded p-2.5 font-mono text-[11px] text-white/70 focus:border-[#00f0ff]/40 outline-none"
                                />
                                <button
                                    onClick={addTopic}
                                    disabled={!topicInput.trim()}
                                    className="px-3 py-2 bg-[#00f0ff]/10 border border-[#00f0ff]/25 rounded text-[#00f0ff] hover:bg-[#00f0ff]/20 transition-all disabled:opacity-30"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        </motion.div>

                        {/* Zielplattformen */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                            <h2 className="font-mono text-xs text-white/80 mb-3">Zielplattformen</h2>
                            <div className="flex gap-3 flex-wrap">
                                {PLATFORM_OPTIONS.map(({ key, label }) => {
                                    const active = socialAutoForm.platforms.includes(key);
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => togglePlatform(key)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border font-mono text-[11px] transition-all ${
                                                active
                                                    ? "border-[#39ff14]/40 bg-[#39ff14]/8 text-[#39ff14]"
                                                    : "border-white/8 bg-white/2 text-white/40 hover:border-white/20"
                                            }`}
                                        >
                                            <span className={`w-3 h-3 rounded-full border flex-shrink-0 ${active ? "bg-[#39ff14] border-[#39ff14]" : "border-white/25"}`} />
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>

                        {/* Markenstimme + Schreibton */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                            <h2 className="font-mono text-xs text-white/80 mb-1">Markenstimme (Persona)</h2>
                            <p className="font-mono text-[9px] text-white/25 mb-2">Wer bist du? Deine Perspektive als Autor — z.B. &quot;Erfahrener Münchner Immobilienmakler mit 15 Jahren Marktkenntnis&quot;</p>
                            <textarea
                                value={socialAutoForm.persona}
                                onChange={e => setSocialAutoForm(prev => ({ ...prev, persona: e.target.value }))}
                                placeholder="Ein erfahrener Fachexperte mit fundiertem Branchenwissen..."
                                className="w-full h-20 bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-[#00f0ff]/40 outline-none resize-none"
                            />
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                            <h2 className="font-mono text-xs text-white/80 mb-1">Schreibton</h2>
                            <p className="font-mono text-[9px] text-white/25 mb-2">Wie schreibst du? — z.B. &quot;Direkt, datengetrieben, manchmal provokativ — kein Marketingsprech&quot;</p>
                            <textarea
                                value={socialAutoForm.voice}
                                onChange={e => setSocialAutoForm(prev => ({ ...prev, voice: e.target.value }))}
                                placeholder="Authentisch, nachdenklich, aus persönlicher Erfahrung schreibend..."
                                className="w-full h-20 bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-[#00f0ff]/40 outline-none resize-none"
                            />
                        </motion.div>

                        {/* Sprache + Uhrzeit */}
                        <div className="grid grid-cols-2 gap-4">
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                                <h2 className="font-mono text-xs text-white/80 mb-3">Inhaltssprache</h2>
                                <select
                                    value={socialAutoForm.lang}
                                    onChange={e => setSocialAutoForm(prev => ({ ...prev, lang: e.target.value }))}
                                    className="w-full bg-[#090e1a] border border-white/10 rounded px-3 py-2 font-mono text-[11px] text-white/70 focus:border-[#00f0ff]/40 outline-none"
                                >
                                    {LANG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                                <h2 className="font-mono text-xs text-white/80 mb-3">Tägliche Auslöseuhrzeit</h2>
                                <select
                                    value={socialAutoForm.postHour}
                                    onChange={e => setSocialAutoForm(prev => ({ ...prev, postHour: Number(e.target.value) }))}
                                    className="w-full bg-[#090e1a] border border-white/10 rounded px-3 py-2 font-mono text-[11px] text-white/70 focus:border-[#00f0ff]/40 outline-none"
                                >
                                    {Array.from({ length: 24 }, (_, i) => (
                                        <option key={i} value={i}>{String(i).padStart(2, "0")}:00 Uhr</option>
                                    ))}
                                </select>
                            </motion.div>
                        </div>

                        {/* Posts/Thema + Hashtags */}
                        <div className="grid grid-cols-2 gap-4">
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                                <h2 className="font-mono text-xs text-white/80 mb-1">Beiträge pro Thema</h2>
                                <p className="font-mono text-[9px] text-white/25 mb-2">1–10</p>
                                <input
                                    type="number" min={1} max={10}
                                    value={socialAutoForm.postsPerTopic}
                                    onChange={e => setSocialAutoForm(prev => ({ ...prev, postsPerTopic: Math.min(10, Math.max(1, Number(e.target.value))) }))}
                                    className="w-full bg-[#090e1a] border border-white/10 rounded p-2.5 font-mono text-[11px] text-white/70 focus:border-[#00f0ff]/40 outline-none"
                                />
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                                <h2 className="font-mono text-xs text-white/80 mb-1">Max. Hashtags</h2>
                                <p className="font-mono text-[9px] text-white/25 mb-2">0–5</p>
                                <input
                                    type="number" min={0} max={5}
                                    value={socialAutoForm.maxHashtags}
                                    onChange={e => setSocialAutoForm(prev => ({ ...prev, maxHashtags: Math.min(5, Math.max(0, Number(e.target.value))) }))}
                                    className="w-full bg-[#090e1a] border border-white/10 rounded p-2.5 font-mono text-[11px] text-white/70 focus:border-[#00f0ff]/40 outline-none"
                                />
                            </motion.div>
                        </div>

                        {/* HITL-Genehmigung */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className={`p-4 rounded border bg-white/[0.02] transition-colors ${
                            socialAutoForm.requireHITL ? "border-[#ffb000]/20" : "border-white/5"
                        }`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="font-mono text-xs text-white/80">HITL-Genehmigung</h2>
                                    <p className="font-mono text-[9px] text-white/30 mt-1">
                                        {socialAutoForm.requireHITL
                                            ? "Aktiv — Beiträge warten auf manuelle Freigabe (empfohlen)"
                                            : "Inaktiv — Beiträge werden sofort zur Veröffentlichung geplant"}
                                    </p>
                                </div>
                                <Toggle
                                    checked={socialAutoForm.requireHITL}
                                    onChange={v => setSocialAutoForm(prev => ({ ...prev, requireHITL: v }))}
                                />
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* ── KI-Prompts Tab ── */}
                {activeTab === "prompts" && (
                    <div className="max-w-3xl space-y-6">
                        <p className="font-mono text-[10px] text-white/30 leading-relaxed">
                            Benutzerdefinierte System-Prompts pro Agent. Leere Felder verwenden den Standard-Prompt.
                        </p>
                        {(["ANALYZER", "CRITIC", "WRITER"] as const).map((agent) => {
                            const entry = prompts[agent];
                            return (
                                <motion.div key={agent} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <h2 className="font-mono text-xs text-white/80">{agent}</h2>
                                            {entry?.isCustom && (
                                                <span className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-neon-green/10 text-neon-green border border-neon-green/20 uppercase tracking-wider">
                                                    Custom
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            {entry?.isCustom && (
                                                <button
                                                    onClick={() => handleResetPrompt(agent)}
                                                    disabled={promptSaving === agent}
                                                    className="px-3 py-1 font-mono text-[9px] border border-white/10 text-white/40 rounded hover:border-white/25 transition-colors disabled:opacity-30"
                                                >
                                                    Reset
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleSavePrompt(agent, entry?.current || "")}
                                                disabled={promptSaving === agent || !entry?.current?.trim()}
                                                className="px-3 py-1 font-mono text-[9px] bg-neon-blue/10 text-[#00f0ff] border border-[#00f0ff]/30 rounded hover:bg-neon-blue/20 transition-all disabled:opacity-30"
                                            >
                                                {promptSaving === agent ? "..." : "Speichern"}
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        value={entry?.current || ""}
                                        onChange={e => setPrompts(prev => ({ ...prev, [agent]: { ...prev[agent], current: e.target.value } }))}
                                        placeholder={entry?.default || "Prompt wird geladen..."}
                                        className="w-full h-40 bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[10px] text-white/70 focus:border-neon-blue outline-none resize-none leading-relaxed"
                                    />
                                    <p className="font-mono text-[8px] text-white/20 mt-1.5">
                                        {entry?.isCustom ? "Benutzerdefinierter Prompt aktiv" : "Standard-Prompt wird verwendet"}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

            </div>
        </div>
    );
};

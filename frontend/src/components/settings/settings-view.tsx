"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAgentStore } from "@/store/agent-store";
import { buildHeaders } from "@/store/utils";
import { Webhook, Bot, MessageSquare } from "lucide-react";

type ActiveTab = "agent" | "integrations" | "prompts";

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
    language: "tr",
};

const DEFAULT_INT: IntegrationsData = {
    n8nWebhookUrl: "", n8nWebhookSecret: "",
    telegramBotToken: "", telegramChatId: "",
    discordWebhookUrl: "",
};

export const SettingsView = () => {
    const { addAlert, apiKey } = useAgentStore((s) => ({ addAlert: s.addAlert, apiKey: s.apiKey }));
    const [activeTab, setActiveTab] = useState<ActiveTab>("agent");
    const [client, setClient]       = useState<ClientData | null>(null);
    const [loading, setLoading]     = useState(false);
    const [saving, setSaving]       = useState(false);
    const [form, setForm]           = useState<TenantConfigData>(DEFAULT_FORM);
    const [intForm, setIntForm]     = useState<IntegrationsData>(DEFAULT_INT);
    const [prompts, setPrompts]     = useState<PromptsData>({});
    const [promptSaving, setPromptSaving] = useState<string | null>(null);

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
                            language:            data.config.language            || "tr",
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
                    }
                }
            })
            .catch(() => addAlert({ message: "Einstellungen konnten nicht geladen werden.", type: "error" }))
            .finally(() => setLoading(false));
    }, [addAlert, apiKey]);

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

    const handleSaveIntegrations = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/tenant/integrations", {
                method: "PUT",
                headers: buildHeaders(apiKey, true),
                body: JSON.stringify(intForm),
            });
            if (res.ok) addAlert({ message: "Integrations gespeichert.", type: "success" });
            else        addAlert({ message: "Fehler beim Speichern.", type: "error" });
        } catch {
            addAlert({ message: "Fehler beim Speichern.", type: "error" });
        }
        setSaving(false);
    };

    if (loading) return <div className="p-8 text-white/50 font-mono text-sm">Wird geladen...</div>;

    return (
        <div className="flex-1 flex flex-col h-full bg-[#090e1a] overflow-hidden">
            {/* Header */}
            <header className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <div>
                    <h1 className="font-mono text-sm text-neon-blue font-bold tracking-wider mb-1">CLIENT SETTINGS</h1>
                    <p className="font-mono text-[10px] text-white/40">
                        {client ? `${client.name} (${client.slug})` : "Tenant Configuration"}
                    </p>
                </div>
                <button
                    onClick={activeTab === "agent" ? handleSaveAgent : activeTab === "integrations" ? handleSaveIntegrations : undefined}
                    style={activeTab === "prompts" ? { display: "none" } : {}}
                    disabled={saving}
                    className="px-4 py-1.5 bg-neon-green/10 text-neon-green border border-neon-green/30 rounded font-mono text-[10px] hover:bg-neon-green hover:text-black transition-all disabled:opacity-50"
                >
                    {saving ? "WIRD GESPEICHERT..." : "SPEICHERN"}
                </button>
            </header>

            {/* Tabs */}
            <div className="flex border-b border-white/5 px-6">
                {([["agent", "KI-Agent"], ["integrations", "Integrationen"], ["prompts", "Ajan Promptları"]] as [ActiveTab, string][]).map(([id, label]) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`py-3 px-4 font-mono text-[11px] tracking-wider border-b-2 transition-all ${
                            activeTab === id
                                ? "text-[#00f0ff] border-[#00f0ff]"
                                : "text-white/30 border-transparent hover:text-white/60"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                {activeTab === "agent" ? (
                    <div className="max-w-3xl space-y-6">
                        {/* Company Name */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                            <h2 className="font-mono text-xs text-white/80 mb-3">Firmenname</h2>
                            <input type="text" value={form.companyName}
                                onChange={e => setForm({ ...form, companyName: e.target.value })}
                                placeholder="z.B.: Agent Matrix GmbH"
                                className="w-full bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-neon-blue outline-none" />
                        </motion.div>

                        {/* Language */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                            <h2 className="font-mono text-xs text-white/80 mb-3">Antwortsprache</h2>
                            <select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}
                                className="w-full bg-[#090e1a] border border-white/10 rounded px-3 py-2 font-mono text-[11px] text-white/70 focus:border-neon-blue outline-none">
                                <option value="tr">Türkisch</option>
                                <option value="de">Deutsch</option>
                                <option value="en">Englisch</option>
                            </select>
                        </motion.div>

                        {/* Persona */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                            <h2 className="font-mono text-xs text-white/80 mb-3">KI-Agenten-Persona (System Prompt)</h2>
                            <textarea value={form.agentPersona} onChange={e => setForm({ ...form, agentPersona: e.target.value })}
                                placeholder="Du bist der digitale Assistent von Agent Matrix..."
                                className="w-full h-32 bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-neon-blue outline-none resize-none" />
                        </motion.div>

                        {/* Tone */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                            <h2 className="font-mono text-xs text-white/80 mb-3">Kommunikationston</h2>
                            <select value={form.tone} onChange={e => setForm({ ...form, tone: e.target.value })}
                                className="w-full bg-[#090e1a] border border-white/10 rounded px-3 py-2 font-mono text-[11px] text-white/70 focus:border-neon-blue outline-none">
                                <option value="Formal, professionell, vertrauenswürdig">Formal & Professionell</option>
                                <option value="Freundlich, locker, energetisch">Freundlich & Energetisch</option>
                                <option value="Technisch, detailliert, analytisch">Technisch & Analytisch</option>
                            </select>
                        </motion.div>

                        {/* Company Context */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                            <h2 className="font-mono text-xs text-white/80 mb-3">Allgemeine Unternehmensinformationen</h2>
                            <textarea value={form.companyContext} onChange={e => setForm({ ...form, companyContext: e.target.value })}
                                placeholder="z.B.: Unser Hauptbüro befindet sich in..."
                                className="w-full h-24 bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-neon-blue outline-none resize-none" />
                        </motion.div>

                        {/* Support Instructions */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                            <h2 className="font-mono text-xs text-white/80 mb-3">Support-Vorlagen-Richtlinien</h2>
                            <textarea value={form.supportInstructions} onChange={e => setForm({ ...form, supportInstructions: e.target.value })}
                                placeholder="Für Termine an folgende Nummer weiterleiten..."
                                className="w-full h-24 bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-neon-blue outline-none resize-none" />
                        </motion.div>
                    </div>
                ) : activeTab === "prompts" ? (
                    /* ── Agent Prompts Tab ── */
                    <div className="max-w-3xl space-y-6">
                        <p className="font-mono text-[10px] text-white/30 leading-relaxed">
                            Her ajan için özel sistem promptu tanımla. Boş bırakılan alanlar varsayılan prompta döner.
                        </p>
                        {(["ANALYZER", "CRITIC", "WRITER"] as const).map((agent) => {
                            const entry = prompts[agent];
                            const [localText, setLocalText] = [
                                entry?.current || "",
                                (v: string) => setPrompts(prev => ({ ...prev, [agent]: { ...prev[agent], current: v } }))
                            ];
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
                                        onChange={e => setLocalText(e.target.value)}
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
                ) : (
                    /* ── Integrations Tab ── */
                    <div className="max-w-3xl space-y-6">
                        <p className="font-mono text-[10px] text-white/30 leading-relaxed">
                            Bu alanda tenant&apos;a özel webhook URL&apos;leri tanımlarsın. Yayıncı ajan,
                            global .env değişkenleri yerine bu URL&apos;leri kullanır. Boş bırakılan alanlar
                            global env&apos;e düşer.
                        </p>

                        {/* n8n */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-2 mb-4">
                                <Webhook size={14} className="text-[#ff6b35]" />
                                <h2 className="font-mono text-xs text-white/80">n8n Webhook</h2>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="font-mono text-[10px] text-white/40 block mb-1">Webhook URL</label>
                                    <input type="url" value={intForm.n8nWebhookUrl}
                                        onChange={e => setIntForm({ ...intForm, n8nWebhookUrl: e.target.value })}
                                        placeholder="https://your-n8n.io/webhook/..."
                                        className="w-full bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-[#ff6b35]/50 outline-none" />
                                </div>
                                <div>
                                    <label className="font-mono text-[10px] text-white/40 block mb-1">Webhook Secret (opsiyonel)</label>
                                    <input type="password" value={intForm.n8nWebhookSecret}
                                        onChange={e => setIntForm({ ...intForm, n8nWebhookSecret: e.target.value })}
                                        placeholder="••••••••••••"
                                        className="w-full bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-[#ff6b35]/50 outline-none" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Telegram */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-2 mb-4">
                                <Bot size={14} className="text-[#00f0ff]" />
                                <h2 className="font-mono text-xs text-white/80">Telegram Bot</h2>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="font-mono text-[10px] text-white/40 block mb-1">Bot Token</label>
                                    <input type="password" value={intForm.telegramBotToken}
                                        onChange={e => setIntForm({ ...intForm, telegramBotToken: e.target.value })}
                                        placeholder="1234567890:AAF..."
                                        className="w-full bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-[#00f0ff]/50 outline-none" />
                                </div>
                                <div>
                                    <label className="font-mono text-[10px] text-white/40 block mb-1">Chat ID</label>
                                    <input type="text" value={intForm.telegramChatId}
                                        onChange={e => setIntForm({ ...intForm, telegramChatId: e.target.value })}
                                        placeholder="-100123456789"
                                        className="w-full bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-[#00f0ff]/50 outline-none" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Discord */}
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
            </div>
        </div>
    );
};

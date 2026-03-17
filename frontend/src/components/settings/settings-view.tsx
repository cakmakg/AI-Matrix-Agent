"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAgentStore } from "@/store/agent-store";

interface TenantConfigData {
    agentPersona: string;
    tone: string;
    companyContext: string;
    supportInstructions: string;
    companyName: string;
    language: string;
}

interface ClientData {
    name: string;
    slug: string;
}

interface TenantConfigResponse {
    success: boolean;
    config: TenantConfigData | null;
    client: ClientData | null;
}

const DEFAULT_FORM: TenantConfigData = {
    agentPersona: "",
    tone: "Formal, professionell, vertrauenswürdig",
    companyContext: "",
    supportInstructions: "",
    companyName: "",
    language: "tr",
};

export const SettingsView = () => {
    const addAlert = useAgentStore((s) => s.addAlert);
    const [client, setClient] = useState<ClientData | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<TenantConfigData>(DEFAULT_FORM);

    useEffect(() => {
        setLoading(true);
        fetch("/api/tenant/config")
            .then(r => r.json())
            .then((data: TenantConfigResponse) => {
                if (data.success) {
                    setClient(data.client);
                    if (data.config) {
                        setForm({
                            agentPersona: data.config.agentPersona || "",
                            tone: data.config.tone || DEFAULT_FORM.tone,
                            companyContext: data.config.companyContext || "",
                            supportInstructions: data.config.supportInstructions || "",
                            companyName: data.config.companyName || "",
                            language: data.config.language || "tr",
                        });
                    }
                }
            })
            .catch(() => addAlert({ message: "Einstellungen konnten nicht geladen werden.", type: "error" }))
            .finally(() => setLoading(false));
    }, [addAlert]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/tenant/config", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                addAlert({ message: "Einstellungen erfolgreich gespeichert.", type: "success" });
            } else {
                addAlert({ message: "Fehler beim Speichern.", type: "error" });
            }
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
                    <h1 className="font-mono text-sm text-neon-blue font-bold tracking-wider mb-1">
                        CLIENT SETTINGS
                    </h1>
                    <p className="font-mono text-[10px] text-white/40">
                        {client ? `${client.name} (${client.slug})` : "Tenant Configuration"}
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-1.5 bg-neon-green/10 text-neon-green border border-neon-green/30 rounded font-mono text-[10px] hover:bg-neon-green hover:text-black transition-all disabled:opacity-50"
                >
                    {saving ? "WIRD GESPEICHERT..." : "SPEICHERN"}
                </button>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                <div className="max-w-3xl space-y-6">
                    {/* Company Name */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                        <h2 className="font-mono text-xs text-white/80 mb-3">Firmenname</h2>
                        <input
                            type="text"
                            value={form.companyName}
                            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                            placeholder="z.B.: Agent Matrix GmbH"
                            className="w-full bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-neon-blue outline-none"
                        />
                    </motion.div>

                    {/* Language */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                        <h2 className="font-mono text-xs text-white/80 mb-3">Antwortsprache</h2>
                        <select
                            value={form.language}
                            onChange={(e) => setForm({ ...form, language: e.target.value })}
                            className="w-full bg-[#090e1a] border border-white/10 rounded px-3 py-2 font-mono text-[11px] text-white/70 focus:border-neon-blue outline-none"
                        >
                            <option value="tr">Türkisch</option>
                            <option value="de">Deutsch</option>
                            <option value="en">Englisch</option>
                        </select>
                    </motion.div>

                    {/* Persona */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                        <h2 className="font-mono text-xs text-white/80 mb-3">KI-Agenten-Persona (System Prompt)</h2>
                        <textarea
                            value={form.agentPersona}
                            onChange={(e) => setForm({ ...form, agentPersona: e.target.value })}
                            placeholder="Du bist der digitale Assistent von Agent Matrix..."
                            className="w-full h-32 bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-neon-blue outline-none resize-none"
                        />
                    </motion.div>

                    {/* Tone */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                        <h2 className="font-mono text-xs text-white/80 mb-3">Kommunikationston</h2>
                        <select
                            value={form.tone}
                            onChange={(e) => setForm({ ...form, tone: e.target.value })}
                            className="w-full bg-[#090e1a] border border-white/10 rounded px-3 py-2 font-mono text-[11px] text-white/70 focus:border-neon-blue outline-none"
                        >
                            <option value="Formal, professionell, vertrauenswürdig">Formal & Professionell</option>
                            <option value="Freundlich, locker, energetisch">Freundlich & Energetisch</option>
                            <option value="Technisch, detailliert, analytisch">Technisch & Analytisch</option>
                        </select>
                    </motion.div>

                    {/* Company Context */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                        <h2 className="font-mono text-xs text-white/80 mb-3">Allgemeine Unternehmensinformationen</h2>
                        <textarea
                            value={form.companyContext}
                            onChange={(e) => setForm({ ...form, companyContext: e.target.value })}
                            placeholder="z.B.: Unser Hauptbüro befindet sich in..."
                            className="w-full h-24 bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-neon-blue outline-none resize-none"
                        />
                    </motion.div>

                    {/* Support Instructions */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="p-4 rounded border border-white/5 bg-white/[0.02]">
                        <h2 className="font-mono text-xs text-white/80 mb-3">Support-Vorlagen-Richtlinien</h2>
                        <textarea
                            value={form.supportInstructions}
                            onChange={(e) => setForm({ ...form, supportInstructions: e.target.value })}
                            placeholder="Für Termine an folgende Nummer weiterleiten..."
                            className="w-full h-24 bg-[#090e1a] border border-white/10 rounded p-3 font-mono text-[11px] text-white/70 focus:border-neon-blue outline-none resize-none"
                        />
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

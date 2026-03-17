"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Blocks, Calendar, MessageCircle, FileText } from "lucide-react";
import { useAgentStore } from "@/store/agent-store";

interface SkillField {
    key: string;
    label: string;
}

interface Skill {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    fields?: SkillField[];
}

interface SkillConfig {
    [field: string]: string;
}

interface TenantConfigResponse {
    success: boolean;
    config: {
        enabledSkills?: string[];
        skillConfigs?: Record<string, SkillConfig>;
    } | null;
}

const SKILLS_MANIFEST: Skill[] = [
    {
        id: "knowledge_search",
        name: "Wissensdatenbank (RAG)",
        description: "Führt semantische Suche in der Wissensdatenbank des Kunden durch.",
        icon: <FileText size={16} />
    },
    {
        id: "calendar_booking",
        name: "Google Calendar Termin",
        description: "Fügt Terminevents im Google Calendar im Auftrag des Kunden hinzu.",
        icon: <Calendar size={16} />,
        fields: [{ key: "calendarId", label: "Calendar ID" }]
    },
    {
        id: "whatsapp_send",
        name: "WhatsApp-Nachrichtenversand",
        description: "Sendet WhatsApp-Nachrichten über Twilio oder Meta API.",
        icon: <MessageCircle size={16} />,
        fields: [{ key: "apiKey", label: "Twilio/Meta API Key" }, { key: "senderNumber", label: "Sender Number" }]
    }
];

export const SkillsView = () => {
    const addAlert = useAgentStore((s) => s.addAlert);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [enabledSkills, setEnabledSkills] = useState<string[]>([]);
    const [skillConfigs, setSkillConfigs] = useState<Record<string, SkillConfig>>({});

    useEffect(() => {
        setLoading(true);
        fetch("/api/tenant/config")
            .then(r => r.json())
            .then((data: TenantConfigResponse) => {
                if (data.success && data.config) {
                    setEnabledSkills(data.config.enabledSkills || []);
                    setSkillConfigs(data.config.skillConfigs || {});
                }
            })
            .catch(() => addAlert({ message: "Skill-Store konnte nicht geladen werden.", type: "error" }))
            .finally(() => setLoading(false));
    }, [addAlert]);

    const toggleSkill = (skillId: string) => {
        setEnabledSkills(prev =>
            prev.includes(skillId) ? prev.filter(id => id !== skillId) : [...prev, skillId]
        );
    };

    const handleConfigChange = (skillId: string, field: string, value: string) => {
        setSkillConfigs(prev => ({
            ...prev,
            [skillId]: { ...(prev[skillId] || {}), [field]: value }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/tenant/config", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabledSkills, skillConfigs })
            });
            if (res.ok) {
                addAlert({ message: "Skill-Store-Konfiguration gespeichert.", type: "success" });
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
                    <h1 className="font-mono text-sm text-neon-blue font-bold tracking-wider mb-1 flex items-center gap-2">
                        <Blocks size={16} /> SKILL STORE
                    </h1>
                    <p className="font-mono text-[10px] text-white/40">
                        Manage active AI Agent capabilities and tool integrations
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

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {SKILLS_MANIFEST.map((skill, idx) => {
                        const isEnabled = enabledSkills.includes(skill.id);

                        return (
                            <motion.div
                                key={skill.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`p-4 rounded border transition-all duration-300 relative overflow-hidden ${isEnabled
                                        ? "bg-neon-blue/5 border-neon-blue/40 shadow-[0_0_15px_rgba(0,240,255,0.1)]"
                                        : "bg-white/[0.02] border-white/5 hover:border-white/10"
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-2 rounded-full ${isEnabled ? "bg-neon-blue/20 text-neon-blue" : "bg-white/5 text-white/50"}`}>
                                        {skill.icon}
                                    </div>
                                    <button
                                        onClick={() => toggleSkill(skill.id)}
                                        className={`w-10 h-5 rounded-full relative transition-colors duration-300 flex items-center ${isEnabled ? "bg-neon-blue" : "bg-white/10"}`}
                                    >
                                        <div className={`absolute w-3.5 h-3.5 bg-white rounded-full transition-transform duration-300 shadow-sm ${isEnabled ? "translate-x-6 left-0.5 mt-auto" : "translate-x-0.5 left-0"}`} />
                                    </button>
                                </div>
                                <h3 className={`font-mono text-sm mb-2 ${isEnabled ? "text-white" : "text-white/70"}`}>
                                    {skill.name}
                                </h3>
                                <p className="font-mono text-[10px] text-white/40 leading-relaxed min-h-[40px] mb-4">
                                    {skill.description}
                                </p>

                                {/* Settings Form Dropdown if Enabled & Has Fields */}
                                <AnimatePresence>
                                    {isEnabled && skill.fields && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden pt-3 border-t border-white/5 mt-auto"
                                        >
                                            <div className="space-y-3">
                                                {skill.fields.map(field => (
                                                    <div key={field.key}>
                                                        <label className="block font-mono text-[9px] text-neon-blue mb-1 uppercase tracking-wider">{field.label}</label>
                                                        <input
                                                            type="text"
                                                            value={skillConfigs[skill.id]?.[field.key] || ""}
                                                            onChange={(e) => handleConfigChange(skill.id, field.key, e.target.value)}
                                                            className="w-full bg-[#090e1a] border border-white/10 rounded px-2 py-1.5 font-mono text-[10px] text-white/80 focus:border-neon-blue outline-none"
                                                            placeholder={`Enter ${field.label}`}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

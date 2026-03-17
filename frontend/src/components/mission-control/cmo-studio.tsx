"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Rocket, XCircle, Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { useAgentStore } from "@/store/agent-store";
import type { CampaignDraftSummary } from "@/store/agent-store";

interface PlatformSection {
    key: string;
    label: string;
    icon: string;
    color: string;
    charLimit?: number;
    content: string;
}

function parseCampaignSections(raw: string): PlatformSection[] {
    const sections: PlatformSection[] = [];
    const platforms = [
        { key: "linkedin", label: "LinkedIn Post",   icon: "🔷", color: "#0077b5", charLimit: undefined },
        { key: "twitter",  label: "Twitter / X",     icon: "⬛", color: "#e7e9ea", charLimit: 280 },
        { key: "meta",     label: "Meta / Google Ads",icon: "🟧", color: "#ff6b35", charLimit: 150 },
        { key: "summary",  label: "Kampagnenübersicht",  icon: "📋", color: "#00f0ff", charLimit: undefined },
    ];

    for (const p of platforms) {
        const regex = new RegExp(`##\\s*(?:${p.label}|LinkedIn|Twitter|X Thread|Meta|Google|Campaign Summary|Kampanya).*?\\n([\\s\\S]*?)(?=\\n##|$)`, "i");
        const match = raw.match(regex);
        if (match) {
            sections.push({ ...p, content: match[1].trim() });
        }
    }

    // Fallback: no headers found — show raw content in one block
    if (sections.length === 0) {
        sections.push({
            key: "raw", label: "Kampagneninhalt", icon: "📄", color: "#ff6b35",
            content: raw, charLimit: undefined,
        });
    }

    return sections;
}

interface Props { campaign: CampaignDraftSummary }

export const CmoStudio = ({ campaign }: Props) => {
    const { approveCampaign, setDrawerItem } = useAgentStore();

    const parsed = parseCampaignSections(campaign.campaignContent);
    const [sections, setSections] = useState<PlatformSection[]>(parsed);
    const [approved, setApproved] = useState<Record<string, boolean>>({});
    const [feedback, setFeedback] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [rewriteTarget, setRewriteTarget] = useState<string | null>(null);
    const [rewriteNote, setRewriteNote] = useState("");

    const handleEdit = (key: string, value: string) =>
        setSections(s => s.map(sec => sec.key === key ? { ...sec, content: value } : sec));

    const toggleApprove = (key: string) =>
        setApproved(a => ({ ...a, [key]: !a[key] }));

    const approvedCount = Object.values(approved).filter(Boolean).length;
    const allApproved = sections.length > 0 && approvedCount === sections.length;

    const handleLaunchAll = async () => {
        setSubmitting(true);
        const note = feedback.trim() || `Approved platforms: ${sections.filter(s => approved[s.key]).map(s => s.label).join(", ")}`;
        await approveCampaign(campaign._id, true, note);
        setSubmitting(false);
        setDrawerItem(null);
    };

    const handleReject = async () => {
        setSubmitting(true);
        await approveCampaign(campaign._id, false, feedback || "Rejected by operator");
        setSubmitting(false);
        setDrawerItem(null);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-5 py-3 border-b border-white/6 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-[#ff6b35] text-sm">📣</span>
                    <div>
                        <p className="font-mono text-[8px] text-[#ff6b35]/60 uppercase tracking-widest">CMO Studio</p>
                        <p className="font-mono text-[11px] text-white/75 truncate max-w-[400px]">{campaign.reportTitle}</p>
                    </div>
                    <div className="ml-auto font-mono text-[8px] text-white/25">
                        {approvedCount}/{sections.length} genehmigt
                    </div>
                </div>
            </div>

            {/* Platform Cards Grid */}
            <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hide">
                <div className="grid grid-cols-1 gap-4">
                    {sections.map((sec) => {
                        const isApproved = !!approved[sec.key];
                        const isRewriting = rewriteTarget === sec.key;
                        const charCount = sec.content.length;
                        const overLimit = sec.charLimit && charCount > sec.charLimit;

                        return (
                            <motion.div
                                key={sec.key}
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                className={`rounded-xl border transition-all duration-200 overflow-hidden
                                    ${isApproved
                                        ? "border-[#39ff14]/30 bg-[#39ff14]/4 shadow-[0_0_12px_rgba(57,255,20,0.08)]"
                                        : "border-white/8 bg-white/2 hover:border-white/14"
                                    }`}
                            >
                                {/* Card Header */}
                                <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-white/6">
                                    <span className="text-sm">{sec.icon}</span>
                                    <span className="font-mono text-[9px] font-bold text-white/70 uppercase tracking-wider flex-1">{sec.label}</span>
                                    {sec.charLimit && (
                                        <span className={`font-mono text-[8px] ${overLimit ? "text-[#ff2d55]" : "text-white/30"}`}>
                                            {charCount}/{sec.charLimit}
                                        </span>
                                    )}
                                    {isApproved && <CheckCircle2 size={12} className="text-[#39ff14]" />}
                                </div>

                                {/* Content / Rewrite input */}
                                {isRewriting ? (
                                    <div className="p-4 space-y-2">
                                        <p className="font-mono text-[8px] text-[#ffb000]/70 uppercase tracking-wider">Neuschreib-Hinweis:</p>
                                        <textarea
                                            value={rewriteNote}
                                            onChange={e => setRewriteNote(e.target.value)}
                                            placeholder="Was soll geändert werden? (z.B.: kürzer und witziger)"
                                            rows={3}
                                            className="w-full bg-white/5 border border-white/12 rounded-lg px-3 py-2 font-mono text-[10px] text-white/70
                                                       placeholder:text-white/20 outline-none focus:border-[#ffb000]/30 resize-none"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setRewriteTarget(null); setRewriteNote(""); }}
                                                className="px-3 py-1.5 rounded-md font-mono text-[8px] text-white/40 border border-white/10 hover:border-white/20 transition-colors"
                                            >
                                                Abbrechen
                                            </button>
                                            <button
                                                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md font-mono text-[8px] font-bold
                                                           bg-[#ffb000]/10 border border-[#ffb000]/30 text-[#ffb000] hover:bg-[#ffb000]/20 transition-all"
                                            >
                                                <RefreshCw size={8} /> An CMO senden
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4">
                                        <textarea
                                            value={sec.content}
                                            onChange={e => handleEdit(sec.key, e.target.value)}
                                            rows={sec.key === "twitter" ? 5 : 6}
                                            className={`w-full bg-transparent font-mono text-[10px] leading-relaxed resize-none outline-none
                                                ${overLimit ? "text-[#ff2d55]/80" : "text-white/65"}
                                                placeholder:text-white/20`}
                                        />
                                    </div>
                                )}

                                {/* Card Actions */}
                                {!isRewriting && (
                                    <div className="flex gap-2 px-4 py-2.5 border-t border-white/5">
                                        <button
                                            onClick={() => toggleApprove(sec.key)}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-mono text-[8px] font-bold uppercase tracking-wider transition-all
                                                ${isApproved
                                                    ? "bg-[#39ff14]/10 border border-[#39ff14]/40 text-[#39ff14]"
                                                    : "border border-white/15 text-white/40 hover:border-[#39ff14]/30 hover:text-[#39ff14]/70 hover:bg-[#39ff14]/5"
                                                }`}
                                        >
                                            <CheckCircle2 size={9} />
                                            {isApproved ? "Genehmigt" : "Genehmigen"}
                                        </button>
                                        <button
                                            onClick={() => setRewriteTarget(sec.key)}
                                            className="px-3 py-1.5 rounded-md font-mono text-[8px] border border-white/10 text-white/30
                                                       hover:border-[#ffb000]/30 hover:text-[#ffb000]/60 hover:bg-[#ffb000]/5 transition-all"
                                        >
                                            <RefreshCw size={8} />
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Decision Zone */}
            <div className="px-5 py-4 border-t border-white/8 shrink-0 space-y-2.5">
                <input
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="Optionale Anmerkung..."
                    className="w-full bg-white/3 border border-white/8 rounded-lg px-3 py-2 font-mono text-[10px] text-white/65
                               placeholder:text-white/20 outline-none focus:border-[#ff6b35]/25"
                />
                <div className="flex gap-2">
                    <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={handleLaunchAll}
                        disabled={submitting || (!allApproved && approvedCount === 0)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-mono text-[9px] font-bold uppercase tracking-wider transition-all
                            ${allApproved
                                ? "bg-[#ff6b35]/15 border border-[#ff6b35]/50 text-[#ff6b35] hover:bg-[#ff6b35]/25 hover:shadow-[0_0_20px_rgba(255,107,53,0.2)]"
                                : "bg-white/3 border border-white/12 text-white/30"
                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                        {submitting ? <Loader2 size={11} className="animate-spin" /> : <Rocket size={11} />}
                        {approvedCount > 0 ? `${approvedCount} Plattform(en) veröffentlichen` : "Alle genehmigen → Veröffentlichen"}
                    </motion.button>
                    <button
                        onClick={handleReject}
                        disabled={submitting}
                        className="px-4 py-3 rounded-lg font-mono text-[9px] border border-[#ff2d55]/25 text-[#ff2d55]/50
                                   hover:bg-[#ff2d55]/6 hover:border-[#ff2d55]/40 disabled:opacity-30 transition-all"
                    >
                        <XCircle size={11} />
                    </button>
                </div>
            </div>
        </div>
    );
};

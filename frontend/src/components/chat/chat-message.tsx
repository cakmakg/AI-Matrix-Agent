"use client";

import React from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage, AgentId } from "@/store/types";

// Türkçe agent etiketleri
const AGENT_LABELS: Partial<Record<AgentId, string>> = {
    ceo:         "Orkestratör",
    cto:         "Mimar (CTO)",
    scraper:     "Web Araştırma",
    analyst:     "Analizci",
    innovator:   "İnovatör",
    writer:      "İçerik Yazarı",
    qa:          "Kalite Kontrolü",
    hitl:        "İnsan Onayı",
    publisher:   "Yayımcı",
    cmo:         "Pazarlama (CMO)",
    cfo:         "Finans (CFO)",
    auditor:     "Denetçi",
    supplyChain: "Tedarik Zinciri",
    salesRep:    "Satış Temsilcisi",
    customerBot: "Müşteri Botu",
    radar:       "Radar",
};

// Agent renkler (açık tema)
const AGENT_COLORS: Partial<Record<AgentId, { bg: string; text: string; border: string }>> = {
    ceo:         { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE" },
    cto:         { bg: "#F0F9FF", text: "#0369A1", border: "#BAE6FD" },
    scraper:     { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
    analyst:     { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA" },
    innovator:   { bg: "#FDF4FF", text: "#7E22CE", border: "#E9D5FF" },
    writer:      { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
    qa:          { bg: "#FFF1F2", text: "#BE123C", border: "#FECDD3" },
    hitl:        { bg: "#FFFBEB", text: "#B45309", border: "#FDE68A" },
    publisher:   { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
    cmo:         { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA" },
    customerBot: { bg: "#F0F9FF", text: "#0369A1", border: "#BAE6FD" },
};

const ROLE_CONFIG = {
    user: {
        label: "Siz",
        avatar: "👤",
        side: "right" as const,
        bubbleBg: "#6366F1",
        bubbleText: "#FFFFFF",
        bubbleBorder: "transparent",
    },
    agent: {
        label: "AI Ajan",
        avatar: "🤖",
        side: "left" as const,
        bubbleBg: "#FFFFFF",
        bubbleText: "#374151",
        bubbleBorder: "#E5E7EB",
    },
    system: {
        label: "Sistem",
        avatar: "⚙️",
        side: "left" as const,
        bubbleBg: "#F9FAFB",
        bubbleText: "#6B7280",
        bubbleBorder: "#E5E7EB",
    },
    alert: {
        label: "Uyarı",
        avatar: "⚠️",
        side: "left" as const,
        bubbleBg: "#FEF3C7",
        bubbleText: "#92400E",
        bubbleBorder: "#FCD34D",
    },
};

interface Props {
    message: ChatMessage;
}

export function ChatMessageBubble({ message }: Props) {
    const roleConfig = ROLE_CONFIG[message.role] ?? ROLE_CONFIG.system;
    const isRight    = roleConfig.side === "right";

    // Agent label ve renk (sadece agent rol için)
    const agentColor = message.agentId ? AGENT_COLORS[message.agentId] : null;
    const agentLabel = message.agentId ? (AGENT_LABELS[message.agentId] ?? message.agentId) : roleConfig.label;

    const isMarkdown = message.content.length > 120 ||
        message.content.includes("#") ||
        message.content.includes("**") ||
        message.content.includes("- ") ||
        message.content.includes("|");

    const formattedTime = new Date(message.timestamp).toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`flex gap-2.5 mb-4 ${isRight ? "flex-row-reverse" : "flex-row"}`}
        >
            {/* Avatar */}
            <div
                className="w-7 h-7 rounded-xl flex items-center justify-center text-sm shrink-0 mt-0.5 border"
                style={
                    agentColor
                        ? { background: agentColor.bg, borderColor: agentColor.border }
                        : { background: isRight ? "#EEF2FF" : "#F9FAFB", borderColor: "#E5E7EB" }
                }
            >
                {roleConfig.avatar}
            </div>

            {/* Content */}
            <div className={`flex flex-col max-w-[78%] ${isRight ? "items-end" : "items-start"}`}>
                {/* Name + Time */}
                <div className={`flex items-center gap-1.5 mb-1 ${isRight ? "flex-row-reverse" : "flex-row"}`}>
                    {agentColor ? (
                        <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                            style={{ background: agentColor.bg, color: agentColor.text, borderColor: agentColor.border }}
                        >
                            {agentLabel}
                        </span>
                    ) : (
                        <span className="text-[11px] font-semibold text-gray-600">{agentLabel}</span>
                    )}
                    <span className="text-[10px] text-gray-400">{formattedTime}</span>
                </div>

                {/* Bubble */}
                <div
                    className="rounded-2xl px-4 py-3 border text-[13px] leading-relaxed"
                    style={{
                        background: isRight ? "#6366F1" : (agentColor ? agentColor.bg : "#FFFFFF"),
                        color: isRight ? "#FFFFFF" : (agentColor ? agentColor.text : "#374151"),
                        borderColor: isRight ? "transparent" : (agentColor ? agentColor.border : "#E5E7EB"),
                        borderTopLeftRadius: !isRight ? "4px" : undefined,
                        borderTopRightRadius: isRight ? "4px" : undefined,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    }}
                >
                    {isMarkdown ? (
                        <div className={`prose-light text-[13px] ${isRight ? "prose-invert-light" : ""}`}>
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    h1: ({ children }) => <h1 style={{ color: isRight ? "#FFFFFF" : "#111827", fontSize: "16px", fontWeight: "700", margin: "8px 0 4px" }}>{children}</h1>,
                                    h2: ({ children }) => <h2 style={{ color: isRight ? "#EEF2FF" : "#1F2937", fontSize: "14px", fontWeight: "600", margin: "8px 0 4px" }}>{children}</h2>,
                                    h3: ({ children }) => <h3 style={{ color: isRight ? "#E0E7FF" : "#374151", fontSize: "13px", fontWeight: "600", margin: "6px 0 2px" }}>{children}</h3>,
                                    p: ({ children }) => <p style={{ color: isRight ? "#E0E7FF" : "#374151", marginBottom: "6px" }}>{children}</p>,
                                    strong: ({ children }) => <strong style={{ color: isRight ? "#FFFFFF" : "#111827", fontWeight: "600" }}>{children}</strong>,
                                    code: ({ children }) => <code style={{ background: isRight ? "rgba(255,255,255,0.15)" : "#F3F4F6", color: isRight ? "#E0E7FF" : "#6366F1", padding: "1px 6px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace" }}>{children}</code>,
                                    li: ({ children }) => <li style={{ color: isRight ? "#E0E7FF" : "#374151", marginBottom: "2px" }}>{children}</li>,
                                    hr: () => <hr style={{ border: "none", borderTop: `1px solid ${isRight ? "rgba(255,255,255,0.25)" : "#E5E7EB"}`, margin: "8px 0" }} />,
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        <p>{message.content}</p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

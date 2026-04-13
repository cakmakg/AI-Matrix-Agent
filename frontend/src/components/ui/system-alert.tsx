"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";
import { useAgentStore } from "@/store/agent-store";
import type { SystemAlert } from "@/store/types";

const ALERT_CONFIG: Record<SystemAlert["type"], {
    icon: React.ReactNode;
    bg: string;
    border: string;
    text: string;
}> = {
    info:    { icon: <Info size={14} />,          bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" },
    success: { icon: <CheckCircle size={14} />,   bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D" },
    warning: { icon: <AlertTriangle size={14} />, bg: "#FFFBEB", border: "#FDE68A", text: "#B45309" },
    error:   { icon: <XCircle size={14} />,       bg: "#FFF1F2", border: "#FECDD3", text: "#BE123C" },
};

export const SystemAlerts = () => {
    const alerts = useAgentStore((s) => s.alerts);

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
            <AnimatePresence>
                {alerts.map((alert) => {
                    const config = ALERT_CONFIG[alert.type];
                    return (
                        <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, y: -16, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.97 }}
                            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-lg pointer-events-auto"
                            style={{ background: config.bg, borderColor: config.border }}
                        >
                            <span style={{ color: config.text }}>{config.icon}</span>
                            <span className="text-[12px] font-semibold" style={{ color: config.text }}>
                                {alert.message}
                            </span>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

"use client";

import React from "react";
import { motion } from "framer-motion";

interface ChartCardProps {
    title: string;
    subtitle?: string;
    accent?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    /** Chart minimum height — default 200 */
    minHeight?: number;
}

export const ChartCard = ({
    title,
    subtitle,
    accent = "#00f0ff",
    icon,
    children,
    className = "",
    minHeight = 200,
}: ChartCardProps) => (
    <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`rounded-xl border border-white/6 bg-white/[0.02] overflow-hidden ${className}`}
    >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
            {icon && <span style={{ color: accent }}>{icon}</span>}
            <span className="font-mono text-[10px] font-bold text-white/50 uppercase tracking-widest">
                {title}
            </span>
            {subtitle && (
                <span className="font-mono text-[8px] text-white/25 ml-auto">{subtitle}</span>
            )}
        </div>
        <div className="p-4" style={{ minHeight }}>
            {children}
        </div>
    </motion.div>
);

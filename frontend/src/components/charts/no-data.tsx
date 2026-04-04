"use client";

import React from "react";
import { BarChart3 } from "lucide-react";

interface NoDataProps {
    message?: string;
    accent?: string;
}

export const NoData = ({ message = "Veri yok — önce bir görev başlatın", accent = "#00f0ff" }: NoDataProps) => (
    <div className="flex flex-col items-center justify-center h-full min-h-[160px] gap-3">
        <BarChart3 size={24} style={{ color: accent, opacity: 0.2 }} />
        <p className="font-mono text-[10px] text-white/20 text-center max-w-[200px]">
            {message}
        </p>
    </div>
);

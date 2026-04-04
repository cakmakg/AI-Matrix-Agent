"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useAgentStore } from "@/store/agent-store";

const ACCENT: Record<string, string> = {
    ERROR:    "#ff2d55",
    CRITICAL: "#ff2d55",
    SUCCESS:  "#39ff14",
    WARN:     "#ffb000",
    INFO:     "#00f0ff",
};

export function MiniTerminal() {
    const logs          = useAgentStore((s) => s.logs);
    const expanded      = useAgentStore((s) => s.terminalExpanded);
    const setExpanded   = useAgentStore((s) => s.setTerminalExpanded);

    const reversed   = [...logs].reverse();
    const displayed  = expanded ? reversed.slice(0, 40) : reversed.slice(0, 5);
    const extra      = logs.length - 5;

    return (
        <div>
            <div className="flex items-center justify-between mb-2.5">
                <span className="font-mono text-[8px] text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff]/40 animate-pulse" />
                    Event Feed
                </span>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="p-0.5 rounded hover:bg-white/8 text-white/20 hover:text-white/50 transition-colors"
                    title={expanded ? "Einklappen" : "Ausklappen"}
                >
                    {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
            </div>

            <div className="space-y-0 font-mono">
                {displayed.length === 0 && (
                    <p className="text-[8px] text-white/15 py-2 text-center">
                        Noch keine Events
                    </p>
                )}

                {displayed.map((log) => (
                    <div
                        key={log.id}
                        className="flex gap-2 py-1 border-b border-white/3 last:border-0"
                    >
                        <span className="text-[7px] text-white/15 shrink-0 w-[46px] tabular-nums mt-px">
                            {log.timestamp.slice(0, 8)}
                        </span>
                        <span
                            className="text-[7px] font-bold w-[24px] shrink-0 mt-px"
                            style={{ color: `${ACCENT[log.level] ?? "#00f0ff"}88` }}
                        >
                            {log.agent.slice(0, 3)}
                        </span>
                        <span className="text-[7px] text-white/35 leading-relaxed truncate">
                            {log.message}
                        </span>
                    </div>
                ))}

                {!expanded && extra > 0 && (
                    <button
                        onClick={() => setExpanded(true)}
                        className="text-[7px] text-white/20 hover:text-white/45 font-mono py-1 w-full text-left transition-colors"
                    >
                        ... {extra} weitere Events
                    </button>
                )}
            </div>
        </div>
    );
}

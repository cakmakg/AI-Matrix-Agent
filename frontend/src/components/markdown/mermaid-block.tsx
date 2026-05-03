"use client";

import React, { useEffect, useRef, useState } from "react";

interface Props {
    children?: React.ReactNode;
    className?: string;
    [key: string]: unknown;
}

export const MermaidBlock = ({ children, className, ...rest }: Props) => {
    const language = (className ?? "").replace("language-", "");
    const code     = String(children ?? "").trim();
    const ref      = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);

    if (language !== "mermaid") {
        return <code className={className} {...rest}>{children}</code>;
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const mermaid = (await import("mermaid")).default;
                mermaid.initialize({ startOnLoad: false, theme: "dark", themeVariables: { background: "#090e1a", primaryColor: "#00f0ff", lineColor: "#ffffff40", textColor: "#ffffff90" } });
                const id = `mermaid-${Math.random().toString(36).slice(2)}`;
                const { svg } = await mermaid.render(id, code);
                if (!cancelled && ref.current) ref.current.innerHTML = svg;
            } catch (e) {
                if (!cancelled) setError(String(e));
            }
        })();
        return () => { cancelled = true; };
    }, [code]);

    if (error) {
        return (
            <pre className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 font-mono text-[10px] text-red-400 overflow-x-auto">
                {code}
            </pre>
        );
    }

    return (
        <div ref={ref} className="my-4 flex justify-center overflow-x-auto rounded-xl bg-white/2 border border-white/8 p-4 min-h-[80px]">
            <span className="font-mono text-[10px] text-white/30 animate-pulse">Lade Diagramm…</span>
        </div>
    );
};

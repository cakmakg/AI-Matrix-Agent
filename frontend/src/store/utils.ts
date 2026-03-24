import type { AgentId, AgentState } from "./types";

// SSE direct backend URL — Next.js proxy buffers SSE streams
export const BACKEND_SSE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000";

export const getTimestamp = (): string => {
    const now = new Date();
    return now.toLocaleTimeString("en-GB", { hour12: false }) + "." + String(now.getMilliseconds()).padStart(3, "0");
};

/** Build request headers: optionally adds Content-Type and x-api-key */
export const buildHeaders = (apiKey: string | null, json = false): Record<string, string> => {
    const h: Record<string, string> = json ? { "Content-Type": "application/json" } : {};
    if (apiKey) h["x-api-key"] = apiKey;
    return h;
};

/** Thin fetch wrappers — eliminates repeated fetch boilerplate */
export const apiFetch = {
    get: async <T>(url: string, apiKey: string | null): Promise<T> => {
        const res = await fetch(url, { headers: buildHeaders(apiKey) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<T>;
    },
    post: async <T>(url: string, body: unknown, apiKey: string | null): Promise<T> => {
        const res = await fetch(url, { method: "POST", headers: buildHeaders(apiKey, true), body: JSON.stringify(body) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<T>;
    },
    del: async (url: string, apiKey: string | null): Promise<void> => {
        await fetch(url, { method: "DELETE", headers: buildHeaders(apiKey) });
    },
};

export const DEFAULT_AGENTS: Record<AgentId, AgentState> = {
    ceo:       { id: "ceo",       label: "Orkestra Şefi",  shortLabel: "CEO",  icon: "👨‍💼", color: "#00f0ff", status: "IDLE" },
    cto:       { id: "cto",       label: "Baş Mimar",      shortLabel: "CTO",  icon: "👨‍💻", color: "#39ff14", status: "IDLE" },
    scraper:   { id: "scraper",   label: "Araştırmacı",    shortLabel: "SCR",  icon: "🕵️",  color: "#ffb000", status: "IDLE" },
    analyst:   { id: "analyst",   label: "Analist",        shortLabel: "ANL",  icon: "🧠",  color: "#00f0ff", status: "IDLE" },
    innovator: { id: "innovator", label: "Vizyoner",       shortLabel: "VZN",  icon: "💡",  color: "#bf5fff", status: "IDLE" },
    writer:    { id: "writer",    label: "İçerik Yön.",    shortLabel: "WRT",  icon: "✍️",  color: "#39ff14", status: "IDLE" },
    qa:        { id: "qa",        label: "Eleştirmen",     shortLabel: "QA",   icon: "🧐",  color: "#ffb000", status: "IDLE" },
    hitl:      { id: "hitl",      label: "İnsan Yargıç",  shortLabel: "HITL", icon: "👨‍⚖️", color: "#ff2d55", status: "IDLE" },
    publisher: { id: "publisher", label: "Dağıtımcı",      shortLabel: "PUB",  icon: "📢",  color: "#00f0ff", status: "IDLE" },
    radar:     { id: "radar",     label: "Ar-Ge Radar",    shortLabel: "RDR",  icon: "🔬",  color: "#39ff14", status: "IDLE" },
    cmo:       { id: "cmo",       label: "Pazarlama Dir.", shortLabel: "CMO",  icon: "📣",  color: "#ff6b35", status: "IDLE" },
    cfo:       { id: "cfo",       label: "Finans Dir.",    shortLabel: "CFO",  icon: "📊",  color: "#00d4aa", status: "IDLE" },
};

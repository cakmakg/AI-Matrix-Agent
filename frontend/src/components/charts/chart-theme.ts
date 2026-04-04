/**
 * Cyber-Nexus Chart Theme
 * Ortak renk paleti, grid stili, tooltip stili, axis font ayarlari.
 */

export const CHART_COLORS = {
    grid: "rgba(255,255,255,0.04)",
    axis: "rgba(255,255,255,0.25)",
    axisLabel: "rgba(255,255,255,0.35)",
    tooltipBg: "rgba(0,0,0,0.85)",
    tooltipBorder: "rgba(255,255,255,0.1)",
    positive: "#39ff14",
    negative: "#ff2d55",
    warning: "#ffb000",
    info: "#00f0ff",
    purple: "#bf5fff",
    emerald: "#10b981",
} as const;

export const PLATFORM_COLORS: Record<string, string> = {
    twitter: "#1DA1F2",
    linkedin: "#0077B5",
    instagram: "#E4405F",
    facebook: "#1877F2",
    youtube: "#FF0000",
    tiktok: "#69C9D0",
    email: "#00f0ff",
    whatsapp: "#25D366",
    telegram: "#0088cc",
    discord: "#5865F2",
};

export const URGENCY_COLORS: Record<string, string> = {
    CRITICAL: "#ff2d55",
    HIGH: "#ff6b35",
    MEDIUM: "#ffb000",
    LOW: "#39ff14",
};

export const AGENT_CHART_COLORS: Record<string, string> = {
    ORCHESTRATOR: "#00f0ff",
    SCRAPER: "#ffb000",
    ANALYZER: "#00f0ff",
    WRITER: "#39ff14",
    CRITIC: "#ffb000",
    ARCHITECT: "#10b981",
    CMO: "#ff6b35",
    PUBLISHER: "#bf5fff",
    AUDITOR: "#ff2d55",
    SUPPLY_CHAIN: "#ffb000",
    SALES_REP: "#39ff14",
    GUARDRAIL: "#ff2d55",
    SYSTEM: "#ffffff",
};

/** Recharts axis tick style */
export const axisTickStyle = {
    fontSize: 10,
    fontFamily: "monospace",
    fill: CHART_COLORS.axisLabel,
};

/** Recharts cartesian grid props */
export const gridProps = {
    strokeDasharray: "3 3",
    stroke: CHART_COLORS.grid,
    vertical: false as const,
};

/** Generate a palette of N colors cycling through department accent + extras */
export function generatePalette(accent: string, count: number): string[] {
    const extras = ["#00f0ff", "#39ff14", "#ffb000", "#ff2d55", "#bf5fff", "#10b981", "#ff6b35", "#1DA1F2"];
    const palette = [accent, ...extras.filter(c => c !== accent)];
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
        result.push(palette[i % palette.length]);
    }
    return result;
}

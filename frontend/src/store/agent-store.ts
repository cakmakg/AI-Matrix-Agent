import { create } from "zustand";

// SSE için direkt backend URL — Next.js dev proxy SSE stream'i bufferlar, kopyalar kesilir.
const BACKEND_SSE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000";

// ── Agent Status Types ──
export type AgentStatus = "IDLE" | "THINKING" | "ACTIVE" | "SUCCESS" | "ERROR";

export type AgentId =
    | "ceo"
    | "cto"
    | "scraper"
    | "analyst"
    | "innovator"
    | "writer"
    | "qa"
    | "hitl"
    | "publisher"
    | "radar"
    | "cmo"
    | "cfo";

export type WorkflowPhase =
    | "IDLE"
    | "DISPATCHING"
    | "RUNNING"
    | "AWAITING_APPROVAL"
    | "PUBLISHING"
    | "DELIVERED"
    | "REVISING";

export interface AgentState {
    id: AgentId;
    label: string;
    shortLabel: string;
    icon: string;
    color: string;
    status: AgentStatus;
}

export interface SystemAlert {
    id: string;
    message: string;
    type: "info" | "success" | "warning" | "error";
    timestamp: number;
}

export interface LogEntry {
    id: string;
    timestamp: string;
    agent: string;
    message: string;
    level: "INFO" | "WARN" | "ERROR" | "SUCCESS" | "CRITICAL";
}

export interface MissionSummary {
    threadId: string;
    task: string;
    status: "AWAITING_APPROVAL" | "APPROVED" | "REJECTED" | "PUBLISHED";
    humanFeedback: string;
    createdAt: string;
    contentPreview: string;
    content?: string; // full content when selected
}

export interface RagSource {
    title: string;
    score: number;
}

export interface SupportTicketSummary {
    _id: string;
    // ── n8n platform alanları ──
    platform: string;           // gmail | youtube | slack | instagram | twitter | tiktok
    platform_id?: string;
    author?: string;
    n8nCategory?: string;       // ACIL_DESTEK | SIKAYET_IADE | FIYAT_SORUSTURMASI | ...
    aiSummary?: string;
    priority?: "critical" | "high" | "medium" | "low";
    // ── eski alanlar (geriye dönük uyumluluk) ──
    emailMessageId?: string;
    gmailThreadId?: string;
    from: string;
    subject: string;
    category: "SUPPORT_PRICING" | "SUPPORT_BUG";
    draftResponse: string;
    ragSources: RagSource[];
    createdAt: string;
}

export interface CampaignDraftSummary {
    _id: string;
    threadId: string;
    reportTitle: string;
    campaignContent: string;
    status: "AWAITING_APPROVAL" | "PUBLISHED" | "REJECTED";
    createdAt: string;
}

export type SocialPlatform = "twitter" | "instagram" | "linkedin" | "facebook" | "google_ads";

export interface SocialAccount {
    _id: string;
    platform: SocialPlatform;
    label: string;
    username: string;
    accountId: string;
    pageId: string;
    isConnected: boolean;
    followerCount: number;
    profileImageUrl: string;
    lastSynced: string | null;
    createdAt: string;
}

export interface ScheduledPost {
    _id: string;
    platforms: SocialPlatform[];
    content: string;
    mediaUrls: string[];
    scheduledAt: string;
    status: "PENDING" | "PUBLISHED" | "FAILED" | "CANCELLED";
    publishedAt: string | null;
    errorMessage: string;
    title: string;
    threadId: string | null;
    campaignId: string | null;
    results: Record<string, unknown>;
    createdAt: string;
}

export interface SocialSummary {
    connectedCount: number;
    pendingCount: number;
    publishedThisWeek: number;
}

export type ActiveView = "control" | "cfo" | "knowledge" | "settings" | "skills" | "social";

export type DrawerItem =
    | { type: "report"; threadId: string }
    | { type: "support"; ticket: SupportTicketSummary }
    | { type: "campaign"; campaign: CampaignDraftSummary }
    | { type: "mission"; mission: MissionSummary };

export interface ChatMessage {
    id: string;
    role: "user" | "agent" | "system" | "alert";
    agentId?: AgentId;
    content: string;
    timestamp: string;
    phase?: WorkflowPhase;
}

interface AgentStore {
    // ── Agent States ──
    agents: Record<AgentId, AgentState>;
    activeAgent: AgentId | null;

    // ── Workflow ──
    workflowPhase: WorkflowPhase;
    threadId: string | null;
    pendingContent: string | null;
    missionMessage: string | null;
    missionCategory: "HOT_LEAD" | "CTO" | "SUPPORT" | null;

    // ── Logs & Alerts ──
    logs: LogEntry[];
    alerts: SystemAlert[];

    // ── Cron ──
    cronSecondsLeft: number;

    // ── Mission Archive ──
    missions: MissionSummary[];
    selectedMission: MissionSummary | null;
    archiveOpen: boolean;

    // ── Support Tickets (Gmail) ──
    supportTickets: SupportTicketSummary[];

    // ── Campaign Drafts (CMO) ──
    campaignDrafts: CampaignDraftSummary[];

    // ── Social Media ──
    socialAccounts: SocialAccount[];
    scheduledPosts: ScheduledPost[];
    socialSummary: SocialSummary;

    // ── UI Navigation ──
    activeView: ActiveView;
    drawerItem: DrawerItem | null;
    editedContent: string | null;

    // ── Chat Messages (agent aktivasyonları + kullanıcı mesajları) ──
    chatMessages: ChatMessage[];

    // ── Auth ──
    apiKey: string | null;

    // ── Actions ──
    setAgentStatus: (id: AgentId, status: AgentStatus) => void;
    setActiveAgent: (id: AgentId | null) => void;
    setWorkflowPhase: (phase: WorkflowPhase) => void;
    addLog: (entry: Omit<LogEntry, "id">) => void;
    addAlert: (alert: Omit<SystemAlert, "id" | "timestamp">) => void;
    removeAlert: (id: string) => void;
    setCronSeconds: (seconds: number) => void;
    resetAllAgents: () => void;

    // ── API Actions ──
    sendMission: (message: string) => Promise<void>;
    approveMission: (feedback?: string) => Promise<void>;
    rejectMission: (feedback: string) => Promise<void>;
    forceRdScan: () => Promise<void>;
    pullLatestArtifact: () => Promise<void>;
    fetchMissions: () => Promise<void>;
    selectMission: (threadId: string) => Promise<void>;
    toggleArchive: () => void;
    fetchSupportTickets: () => Promise<void>;
    approveSupportTicket: (ticketId: string, isApproved: boolean, feedback?: string) => Promise<void>;
    fetchCampaignDrafts: () => Promise<void>;
    approveCampaign: (campaignId: string, isApproved: boolean, feedback?: string) => Promise<void>;

    // ── Social Media Actions ──
    fetchSocialAccounts: () => Promise<void>;
    connectSocialAccount: (data: { platform: SocialPlatform; label: string; accessToken: string; accessTokenSecret?: string; refreshToken?: string; pageId?: string; customerId?: string }) => Promise<void>;
    disconnectSocialAccount: (id: string) => Promise<void>;
    syncSocialAccount: (id: string) => Promise<void>;
    fetchScheduledPosts: () => Promise<void>;
    createScheduledPost: (data: { platforms: SocialPlatform[]; content: string; scheduledAt: string; mediaUrls?: string[]; title?: string }) => Promise<void>;
    cancelScheduledPost: (id: string) => Promise<void>;
    publishPostNow: (id: string) => Promise<void>;
    fetchSocialSummary: () => Promise<void>;

    // ── UI Navigation ──
    setActiveView: (view: ActiveView) => void;
    setDrawerItem: (item: DrawerItem | null) => void;
    setEditedContent: (c: string | null) => void;
    addChatMessage: (msg: Omit<ChatMessage, "id">) => void;
    clearChatMessages: () => void;
    setApiKey: (key: string | null) => void;
}

const getTimestamp = (): string => {
    const now = new Date();
    return (
        now.toLocaleTimeString("en-GB", { hour12: false }) +
        "." +
        String(now.getMilliseconds()).padStart(3, "0")
    );
};

const DEFAULT_AGENTS: Record<AgentId, AgentState> = {
    ceo: { id: "ceo", label: "Orkestra Şefi", shortLabel: "CEO", icon: "👨‍💼", color: "#00f0ff", status: "IDLE" },
    cto: { id: "cto", label: "Baş Mimar", shortLabel: "CTO", icon: "👨‍💻", color: "#39ff14", status: "IDLE" },
    scraper: { id: "scraper", label: "Araştırmacı", shortLabel: "SCR", icon: "🕵️", color: "#ffb000", status: "IDLE" },
    analyst: { id: "analyst", label: "Analist", shortLabel: "ANL", icon: "🧠", color: "#00f0ff", status: "IDLE" },
    innovator: { id: "innovator", label: "Vizyoner", shortLabel: "VZN", icon: "💡", color: "#bf5fff", status: "IDLE" },
    writer: { id: "writer", label: "İçerik Yön.", shortLabel: "WRT", icon: "✍️", color: "#39ff14", status: "IDLE" },
    qa: { id: "qa", label: "Eleştirmen", shortLabel: "QA", icon: "🧐", color: "#ffb000", status: "IDLE" },
    hitl: { id: "hitl", label: "İnsan Yargıç", shortLabel: "HITL", icon: "👨‍⚖️", color: "#ff2d55", status: "IDLE" },
    publisher: { id: "publisher", label: "Dağıtımcı", shortLabel: "PUB", icon: "📢", color: "#00f0ff", status: "IDLE" },
    radar: { id: "radar", label: "Ar-Ge Radar", shortLabel: "RDR", icon: "🔬", color: "#39ff14", status: "IDLE" },
    cmo: { id: "cmo", label: "Pazarlama Dir.", shortLabel: "CMO", icon: "📣", color: "#ff6b35", status: "IDLE" },
    cfo: { id: "cfo", label: "Finans Dir.", shortLabel: "CFO", icon: "📊", color: "#00d4aa", status: "IDLE" },
};

export const useAgentStore = create<AgentStore>((set, get) => ({
    agents: { ...DEFAULT_AGENTS },
    activeAgent: null,
    workflowPhase: "IDLE",
    threadId: null,
    pendingContent: null,
    missionMessage: null,
    missionCategory: null,
    logs: [],
    alerts: [],
    cronSecondsLeft: 120,
    missions: [],
    selectedMission: null,
    archiveOpen: false,
    supportTickets: [],
    campaignDrafts: [],
    socialAccounts: [],
    scheduledPosts: [],
    socialSummary: { connectedCount: 0, pendingCount: 0, publishedThisWeek: 0 },
    activeView: "control",
    drawerItem: null,
    editedContent: null,
    chatMessages: [],
    apiKey: typeof window !== "undefined" ? localStorage.getItem("ai_orchestra_api_key") : null,

    setAgentStatus: (id, status) =>
        set((state) => ({
            agents: { ...state.agents, [id]: { ...state.agents[id], status } },
        })),

    setActiveAgent: (id) => set({ activeAgent: id }),

    setWorkflowPhase: (phase) => set({ workflowPhase: phase }),

    addLog: (entry) =>
        set((state) => ({
            logs: [...state.logs.slice(-120), { ...entry, id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }],
        })),

    addAlert: (alert) => {
        const id = `alert-${Date.now()}`;
        set((state) => ({
            alerts: [...state.alerts, { ...alert, id, timestamp: Date.now() }],
        }));
        // Auto-dismiss after 5 seconds
        setTimeout(() => get().removeAlert(id), 5000);
    },

    removeAlert: (id) =>
        set((state) => ({
            alerts: state.alerts.filter((a) => a.id !== id),
        })),

    setCronSeconds: (seconds) => set({ cronSecondsLeft: seconds }),

    setActiveView: (view) => set({ activeView: view }),
    setDrawerItem: (item) => set({ drawerItem: item }),
    setEditedContent: (c) => set({ editedContent: c }),
    addChatMessage: (msg) =>
        set((state) => ({
            chatMessages: [
                ...state.chatMessages.slice(-200),
                { ...msg, id: `cm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
            ],
        })),
    clearChatMessages: () => set({ chatMessages: [] }),
    setApiKey: (key) => {
        if (key) {
            localStorage.setItem("ai_orchestra_api_key", key);
        } else {
            localStorage.removeItem("ai_orchestra_api_key");
        }
        set({ apiKey: key });
    },

    resetAllAgents: () =>
        set({
            agents: { ...DEFAULT_AGENTS },
            activeAgent: null,
        }),

    // ── Send Mission to Backend ──
    sendMission: async (message: string) => {
        const { addLog, setAgentStatus, setActiveAgent, setWorkflowPhase, addAlert, addChatMessage, clearChatMessages } = get();
        set({ missionMessage: message, workflowPhase: "DISPATCHING" });
        clearChatMessages();
        addChatMessage({ role: "user", content: message, timestamp: getTimestamp() });
        addChatMessage({ role: "system", content: "Mission dispatching to AI Orchestra...", timestamp: getTimestamp() });

        addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: `Mission received: "${message.slice(0, 60)}..."`, level: "INFO" });
        addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: "Dispatching to AI Orchestra backend...", level: "INFO" });

        setAgentStatus("ceo", "THINKING");
        setActiveAgent("ceo");

        try {
            setWorkflowPhase("RUNNING");
            addLog({ timestamp: getTimestamp(), agent: "CEO", message: "Orchestrator analyzing request...", level: "INFO" });

            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (get().apiKey) headers["x-api-key"] = get().apiKey!;

            const res = await fetch("/api/inbox", {
                method: "POST",
                headers,
                body: JSON.stringify({ message, source: "operator" }),
            });

            const data = await res.json();

            // SPAM / OTHER
            if (data.status === "IGNORED") {
                setAgentStatus("ceo", "SUCCESS");
                setWorkflowPhase("IDLE");
                setActiveAgent(null);
                addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: "Message filtered: SPAM/OTHER", level: "WARN" });
                addAlert({ message: "MESSAGE FILTERED: SPAM/OTHER", type: "warning" });
                return;
            }

            // DESTEK TALEBİ — anlık dönüş, SSE yok
            if (data.status === "AWAITING_HUMAN_APPROVAL_SUPPORT") {
                set({
                    threadId: data.threadId,
                    pendingContent: data.pendingContent || "No content available.",
                    workflowPhase: "AWAITING_APPROVAL",
                    missionCategory: "SUPPORT",
                });
                setAgentStatus("ceo", "SUCCESS");
                setAgentStatus("hitl", "ACTIVE");
                setActiveAgent("hitl");
                addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: "Support request — HITL gate armed.", level: "WARN" });
                addAlert({ message: "SUPPORT REQUEST — AWAITING AUTHORIZATION", type: "warning" });
                return;
            }

            // HOT_LEAD — SSE ile gerçek zamanlı ajan takibi
            if (data.status === "PROCESSING" && data.threadId) {
                set({ threadId: data.threadId, missionCategory: "HOT_LEAD" });
                addLog({ timestamp: getTimestamp(), agent: "CEO", message: "Workflow started. Tracking agents via SSE...", level: "INFO" });

                let previousAgent: AgentId | null = "ceo";
                const eventSource = new EventSource(`${BACKEND_SSE}/api/events/${data.threadId}`);

                const agentLabels: Record<string, string> = {
                    ceo: "Orchestrator routing...",
                    scraper: "Connecting to Global Network... Fetching data...",
                    analyst: "Processing data blocks...",
                    innovator: "Breaking conventional thinking... generating contrarian 10x insight...",
                    writer: "Composing B2B content...",
                    qa: "Scanning output for errors...",
                    cto: "Generating architecture blueprint...",
                    hitl: "HITL gate armed. Awaiting authorization.",
                    publisher: "Initiating payload delivery...",
                    radar: "R&D scan in progress...",
                };

                eventSource.onmessage = (e: MessageEvent) => {
                    const event = JSON.parse(e.data) as {
                        type: string;
                        agent?: string;
                        status?: string;
                        pendingContent?: string;
                        message?: string;
                    };

                    if (event.type === "agent_active" && event.agent) {
                        const agentId = event.agent as AgentId;
                        if (previousAgent && previousAgent !== agentId && previousAgent !== "ceo") {
                            get().setAgentStatus(previousAgent, "SUCCESS");
                        }
                        get().setAgentStatus(agentId, "ACTIVE");
                        get().setActiveAgent(agentId);
                        // Upgrade category to CTO when architect agent fires
                        if (agentId === "cto") {
                            set({ missionCategory: "CTO" });
                        }
                        const label = agentLabels[agentId] ?? "Agent activated";
                        addLog({ timestamp: getTimestamp(), agent: agentId.toUpperCase(), message: label, level: "INFO" });
                        get().addChatMessage({ role: "agent", agentId, content: label, timestamp: getTimestamp() });
                        previousAgent = agentId;
                    }

                    if (event.type === "workflow_complete") {
                        eventSource.close();
                        if (event.status === "AWAITING_HUMAN_APPROVAL") {
                            if (previousAgent && previousAgent !== "ceo") {
                                get().setAgentStatus(previousAgent, "SUCCESS");
                            }
                            get().setAgentStatus("hitl", "ACTIVE");
                            get().setActiveAgent("hitl");
                            get().addChatMessage({ role: "alert", content: "Rapor hazır — HITL onayı bekleniyor. Inbox'tan inceleyin.", timestamp: getTimestamp(), phase: "AWAITING_APPROVAL" });

                            const content = event.pendingContent?.trim();
                            const currentThreadId = get().threadId;

                            if (content) {
                                // İçerik SSE ile geldi — direkt kullan
                                set({
                                    pendingContent: content,
                                    workflowPhase: "AWAITING_APPROVAL",
                                    drawerItem: { type: "report", threadId: currentThreadId! },
                                });
                                get().fetchMissions();
                                addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: "Workflow complete. Awaiting HITL authorization.", level: "WARN" });
                                addAlert({ message: "MISSION COMPLETE — AWAITING YOUR AUTHORIZATION", type: "warning" });
                            } else {
                                // İçerik boş — MongoDB'den çek (CTO/architect akışları)
                                addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: "Workflow complete. Fetching artifact from MongoDB...", level: "WARN" });
                                const url = currentThreadId
                                    ? `/api/artifact/${currentThreadId}`
                                    : `/api/artifact/latest`;

                                const fHeaders: Record<string, string> = {};
                                const apiKey = get().apiKey;
                                if (apiKey) fHeaders["x-api-key"] = apiKey;

                                fetch(url, { headers: fHeaders })
                                    .then((r) => r.json())
                                    .then((artifact) => {
                                        const fetched = artifact.content?.trim() || "*(İçerik hazır — yeniden yükleyin)*";
                                        set({
                                            pendingContent: fetched,
                                            workflowPhase: "AWAITING_APPROVAL",
                                            drawerItem: { type: "report", threadId: currentThreadId! },
                                        });
                                        get().fetchMissions();
                                        addAlert({ message: "MISSION COMPLETE — AWAITING YOUR AUTHORIZATION", type: "warning" });
                                    })
                                    .catch(() => {
                                        set({
                                            pendingContent: "*(Blueprint hazır — Pull Intel ile yükleyin)*",
                                            workflowPhase: "AWAITING_APPROVAL",
                                            drawerItem: { type: "report", threadId: currentThreadId! },
                                        });
                                        addAlert({ message: "MISSION COMPLETE — AWAITING YOUR AUTHORIZATION", type: "warning" });
                                    });
                            }
                        }
                    }

                    if (event.type === "error") {
                        eventSource.close();
                        const failedAgent = (previousAgent ?? "ceo") as AgentId;
                        get().setAgentStatus(failedAgent, "ERROR");
                        get().setWorkflowPhase("IDLE");
                        get().setActiveAgent(null);
                        addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: `ERROR: ${event.message}`, level: "ERROR" });
                        addAlert({ message: `MISSION FAILED: ${event.message}`, type: "error" });
                    }
                };

                eventSource.onerror = () => {
                    eventSource.close();
                    get().setWorkflowPhase("IDLE");
                    get().setActiveAgent(null);
                    addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: "SSE connection lost.", level: "ERROR" });
                    addAlert({ message: "SSE CONNECTION LOST — Check backend", type: "error" });
                };

                return; // EventSource geri kalanı halleder
            }

            // Beklenmeyen yanıt
            throw new Error(data.error || "Unexpected backend response");

        } catch (error) {
            setAgentStatus("ceo", "ERROR");
            setWorkflowPhase("IDLE");
            setActiveAgent(null);
            const errMsg = error instanceof Error ? error.message : "Connection failed";
            addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: `ERROR: ${errMsg}`, level: "ERROR" });
            addAlert({ message: `MISSION FAILED: ${errMsg}`, type: "error" });
        }
    },

    // ── Approve Mission ──
    approveMission: async (feedback?: string) => {
        const { threadId, addLog, setAgentStatus, setActiveAgent, setWorkflowPhase, addAlert } = get();
        if (!threadId) return;

        setWorkflowPhase("PUBLISHING");
        setAgentStatus("hitl", "SUCCESS");
        setAgentStatus("publisher", "ACTIVE");
        setActiveAgent("publisher");

        addLog({ timestamp: getTimestamp(), agent: "HITL", message: `AUTHORIZED${feedback ? ` — Note: "${feedback.slice(0, 50)}"` : ""}`, level: "SUCCESS" });
        addLog({ timestamp: getTimestamp(), agent: "PUBLISHER", message: "Initiating payload delivery sequence...", level: "INFO" });

        try {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (get().apiKey) headers["x-api-key"] = get().apiKey!;

            const res = await fetch("/api/approve", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    threadId,
                    isApproved: true,
                    feedback: feedback || "",
                    category: get().missionCategory === "SUPPORT" ? "SUPPORT_PRICING" : "HOT_LEAD",
                }),
            });

            // Safe JSON parse — backend 500 dönerse graceful handle
            let data: { success?: boolean; status?: string; error?: string };
            try {
                data = await res.json();
            } catch {
                throw new Error(`Server error ${res.status} — backend crashed. Check terminal.`);
            }

            if (data.success) {
                setAgentStatus("publisher", "SUCCESS");
                setWorkflowPhase("DELIVERED");
                addLog({ timestamp: getTimestamp(), agent: "PUBLISHER", message: "PAYLOAD DELIVERED to external channels.", level: "SUCCESS" });
                addAlert({ message: "PAYLOAD DELIVERED — TRANSMISSION COMPLETE", type: "success" });

                // Reset after 4 seconds
                setTimeout(() => {
                    get().resetAllAgents();
                    set({ workflowPhase: "IDLE", threadId: null, pendingContent: null, missionMessage: null, missionCategory: null });
                }, 4000);
            } else {
                throw new Error(data.error || "Approval failed");
            }
        } catch (error) {
            setAgentStatus("publisher", "ERROR");
            const errMsg = error instanceof Error ? error.message : "Delivery failed";
            addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: `PUBLISH ERROR: ${errMsg}`, level: "ERROR" });
            addAlert({ message: `DELIVERY FAILED: ${errMsg}`, type: "error" });
        }
    },

    // ── Reject Mission ──
    rejectMission: async (feedback: string) => {
        const { threadId, addLog, setAgentStatus, setActiveAgent, setWorkflowPhase, addAlert } = get();
        if (!threadId) return;

        setWorkflowPhase("REVISING");
        setAgentStatus("hitl", "ERROR");
        setActiveAgent("ceo");
        setAgentStatus("ceo", "THINKING");

        addLog({ timestamp: getTimestamp(), agent: "HITL", message: `OVERRIDDEN — Reason: "${feedback.slice(0, 80)}"`, level: "ERROR" });
        addLog({ timestamp: getTimestamp(), agent: "CEO", message: "Revision cycle initiated. Re-routing workflow...", level: "WARN" });
        addAlert({ message: "OVERRIDE — REVISION CYCLE INITIATED", type: "error" });

        try {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (get().apiKey) headers["x-api-key"] = get().apiKey!;

            const res = await fetch("/api/approve", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    threadId,
                    isApproved: false,
                    feedback,
                    category: get().missionCategory === "SUPPORT" ? "SUPPORT_PRICING" : "HOT_LEAD",
                }),
            });

            // Safe JSON parse
            let data: { success?: boolean; status?: string; error?: string };
            try {
                data = await res.json();
            } catch {
                throw new Error(`Server error ${res.status} — backend crashed. Check terminal.`);
            }

            if (data.success && data.status === "REVISED") {
                addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: "Revision started — waiting for agents...", level: "INFO" });
                setAgentStatus("ceo", "ACTIVE");
                setWorkflowPhase("REVISING");
                setActiveAgent("ceo");
                addAlert({ message: "REVISION CYCLE ACTIVE — AGENTS REWRITING...", type: "warning" });

                // Revision workflow arka planda çalışıyor — SSE'yi yeniden aç
                const revEventSource = new EventSource(`${BACKEND_SSE}/api/events/${threadId}`);
                let revPreviousAgent: AgentId | null = "ceo";

                revEventSource.onmessage = (e: MessageEvent) => {
                    const event = JSON.parse(e.data) as { type: string; agent?: string; pendingContent?: string; message?: string };

                    if (event.type === "agent_active" && event.agent) {
                        const agentId = event.agent as AgentId;
                        if (revPreviousAgent && revPreviousAgent !== agentId) {
                            get().setAgentStatus(revPreviousAgent, "SUCCESS");
                        }
                        get().setAgentStatus(agentId, "ACTIVE");
                        get().setActiveAgent(agentId);
                        addLog({ timestamp: getTimestamp(), agent: agentId.toUpperCase(), message: "Revising...", level: "INFO" });
                        revPreviousAgent = agentId;
                    }

                    if (event.type === "workflow_complete") {
                        revEventSource.close();
                        if (revPreviousAgent) get().setAgentStatus(revPreviousAgent, "SUCCESS");
                        get().setAgentStatus("hitl", "ACTIVE");
                        get().setActiveAgent("hitl");

                        const content = event.pendingContent?.trim();
                        set({
                            pendingContent: content || null,
                            workflowPhase: "AWAITING_APPROVAL",
                            drawerItem: { type: "report", threadId },
                        });
                        get().fetchMissions();
                        addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: "Revision complete — new report ready.", level: "SUCCESS" });
                        addAlert({ message: "REVISION COMPLETE — RE-REVIEW REQUIRED", type: "warning" });
                    }

                    if (event.type === "error") {
                        revEventSource.close();
                        setWorkflowPhase("AWAITING_APPROVAL");
                        addAlert({ message: `REVISION ERROR: ${event.message}`, type: "error" });
                    }
                };

                revEventSource.onerror = () => {
                    revEventSource.close();
                    setWorkflowPhase("AWAITING_APPROVAL");
                };
            }
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : "Revision failed";
            addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: `REVISION ERROR: ${errMsg}`, level: "ERROR" });
            addAlert({ message: `REVISION FAILED: ${errMsg}`, type: "error" });
        }
    },

    // ── Pull Latest Intel from MongoDB ──
    pullLatestArtifact: async () => {
        const { threadId, addLog, addAlert } = get();
        const primaryUrl = threadId ? `/api/artifact/${threadId}` : `/api/artifact/latest`;

        const tryFetch = async (url: string) => {
            const fHeaders: Record<string, string> = {};
            const apiKey = get().apiKey;
            if (apiKey) fHeaders["x-api-key"] = apiKey;

            const res = await fetch(url, { headers: fHeaders });
            if (!res.ok) return null;
            const data = await res.json();
            if (!data.success || !data.content) return null;
            return data;
        };

        try {
            // 1) threadId ile dene
            let data = await tryFetch(primaryUrl);

            // 2) Bulunamazsa /latest'e düş
            if (!data && threadId) {
                addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: `ThreadId ile bulunamadı — /latest deneniyor...`, level: "WARN" });
                data = await tryFetch(`/api/artifact/latest`);
            }

            if (!data) {
                addAlert({ message: "NO PENDING INTEL — System is still processing", type: "warning" });
                addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: "Intel pull: no pending reports found in MongoDB.", level: "WARN" });
                return;
            }

            set({
                pendingContent: data.content,
                workflowPhase: "AWAITING_APPROVAL",
                ...(data.threadId && !threadId ? { threadId: data.threadId } : {}),
            });
            addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: `Intel acquired: "${String(data.task ?? "").slice(0, 60)}..."`, level: "SUCCESS" });
            addAlert({ message: "INTEL ACQUIRED — ARTIFACT LOADED FROM DATABASE", type: "success" });
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : "Pull failed";
            addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: `Intel pull failed: ${errMsg}`, level: "ERROR" });
            addAlert({ message: `INTEL PULL FAILED: ${errMsg}`, type: "error" });
        }
    },

    // ── Force R&D Scan ──
    forceRdScan: async () => {
        const { addLog, setAgentStatus, setActiveAgent, setWorkflowPhase, addAlert } = get();

        // Guard: aktif bir workflow varsa başlatma
        if (get().workflowPhase !== "IDLE") {
            addAlert({ message: "WORKFLOW ACTIVE — R&D scan queued after completion", type: "warning" });
            return;
        }

        setAgentStatus("radar", "ACTIVE");
        setActiveAgent("radar");
        set({ workflowPhase: "RUNNING" });
        addLog({ timestamp: getTimestamp(), agent: "RADAR", message: "INNOVATION RADAR initiated — scanning Anthropic & OpenAI feeds...", level: "WARN" });
        addAlert({ message: "R&D PROTOCOL ACTIVATED — SCANNING AI LANDSCAPE", type: "warning" });

        try {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (get().apiKey) headers["x-api-key"] = get().apiKey!;

            const res = await fetch("/api/rnd", {
                method: "POST",
                headers,
            });

            const data = await res.json();

            if (!data.success || data.status !== "PROCESSING" || !data.threadId) {
                throw new Error(data.error || "Unexpected R&D response");
            }

            set({ threadId: data.threadId });
            addLog({ timestamp: getTimestamp(), agent: "RADAR", message: `R&D workflow started — threadId: ${data.threadId}`, level: "INFO" });

            // ── SSE: HOT_LEAD akışıyla aynı pattern ──
            let previousAgent: AgentId | null = "radar";
            const agentLabels: Record<string, string> = {
                ceo: "Orchestrator routing R&D mission...",
                scraper: "Tapping into Anthropic & OpenAI news feeds...",
                analyst: "Processing AI landscape data...",
                innovator: "Breaking conventional thinking... generating contrarian 10x insight...",
                writer: "Composing innovation summary...",
                qa: "Quality check on R&D output...",
                cto: "Generating integration blueprint...",
                hitl: "R&D blueprint ready — awaiting authorization.",
                publisher: "Dispatching R&D report...",
                radar: "INNOVATION_RADAR active — live feed connected.",
            };

            const eventSource = new EventSource(`${BACKEND_SSE}/api/events/${data.threadId}`);

            eventSource.onmessage = (e: MessageEvent) => {
                const event = JSON.parse(e.data) as {
                    type: string;
                    agent?: string;
                    status?: string;
                    pendingContent?: string;
                    message?: string;
                };

                if (event.type === "agent_active" && event.agent) {
                    const agentId = event.agent as AgentId;
                    if (previousAgent && previousAgent !== agentId && previousAgent !== "radar") {
                        get().setAgentStatus(previousAgent, "SUCCESS");
                    }
                    get().setAgentStatus(agentId, "ACTIVE");
                    get().setActiveAgent(agentId);
                    if (agentId === "cto") {
                        set({ missionCategory: "CTO" });
                    }
                    addLog({
                        timestamp: getTimestamp(),
                        agent: agentId.toUpperCase(),
                        message: agentLabels[agentId] ?? "R&D agent activated",
                        level: "INFO",
                    });
                    previousAgent = agentId;
                }

                if (event.type === "workflow_complete") {
                    eventSource.close();
                    if (event.status === "AWAITING_HUMAN_APPROVAL") {
                        if (previousAgent && previousAgent !== "radar") {
                            get().setAgentStatus(previousAgent, "SUCCESS");
                        }
                        set({
                            pendingContent: event.pendingContent || "No R&D content available.",
                            workflowPhase: "AWAITING_APPROVAL",
                        });
                        get().setAgentStatus("hitl", "ACTIVE");
                        get().setActiveAgent("hitl");
                        get().setAgentStatus("radar", "SUCCESS");
                        addLog({ timestamp: getTimestamp(), agent: "RADAR", message: "R&D SCAN COMPLETE — Innovation blueprint ready for authorization.", level: "SUCCESS" });
                        addAlert({ message: "R&D COMPLETE — BLUEPRINT AWAITING YOUR AUTHORIZATION", type: "success" });
                    }
                }

                if (event.type === "error") {
                    eventSource.close();
                    get().setAgentStatus("radar", "ERROR");
                    setWorkflowPhase("IDLE");
                    setActiveAgent(null);
                    addLog({ timestamp: getTimestamp(), agent: "RADAR", message: `R&D ERROR: ${event.message}`, level: "ERROR" });
                    addAlert({ message: `R&D SCAN FAILED: ${event.message}`, type: "error" });
                }
            };

            eventSource.onerror = () => {
                eventSource.close();
                get().setAgentStatus("radar", "ERROR");
                setWorkflowPhase("IDLE");
                setActiveAgent(null);
                addLog({ timestamp: getTimestamp(), agent: "RADAR", message: "R&D SSE connection lost.", level: "ERROR" });
                addAlert({ message: "R&D SSE LOST — Check backend", type: "error" });
            };

        } catch (error) {
            setAgentStatus("radar", "ERROR");
            setWorkflowPhase("IDLE");
            setActiveAgent(null);
            const errMsg = error instanceof Error ? error.message : "R&D scan failed";
            addLog({ timestamp: getTimestamp(), agent: "RADAR", message: `R&D FAILED: ${errMsg}`, level: "ERROR" });
            addAlert({ message: `R&D SCAN FAILED: ${errMsg}`, type: "error" });
        }
    },

    // ── Mission Archive ──
    fetchMissions: async () => {
        try {
            const headers: Record<string, string> = {};
            if (get().apiKey) headers["x-api-key"] = get().apiKey!;

            const res = await fetch("/api/missions?limit=50", { headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as { missions: import("./agent-store").MissionSummary[] };
            set({ missions: data.missions ?? [] });
        } catch (err) {
            console.error("fetchMissions failed:", err);
        }
    },

    selectMission: async (threadId: string) => {
        try {
            // First set from existing summary (instant update)
            const existing = get().missions.find(m => m.threadId === threadId);
            if (existing) set({ selectedMission: existing });

            // Then fetch full content
            const headers: Record<string, string> = {};
            if (get().apiKey) headers["x-api-key"] = get().apiKey!;

            const res = await fetch(`/api/missions/${threadId}`, { headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as import("./agent-store").MissionSummary & { content: string };
            set({ selectedMission: { ...data } });
        } catch (err) {
            console.error("selectMission failed:", err);
        }
    },

    toggleArchive: () => {
        const isOpen = get().archiveOpen;
        if (!isOpen) {
            get().fetchMissions();
        }
        set({ archiveOpen: !isOpen, selectedMission: null });
    },

    fetchSupportTickets: async () => {
        try {
            const headers: Record<string, string> = {};
            if (get().apiKey) headers["x-api-key"] = get().apiKey!;

            const res = await fetch("/api/support/pending", { headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as { tickets: SupportTicketSummary[] };
            set({ supportTickets: data.tickets ?? [] });
        } catch (err) {
            console.error("fetchSupportTickets failed:", err);
        }
    },

    approveSupportTicket: async (ticketId: string, isApproved: boolean, feedback?: string) => {
        const { addLog, addAlert, fetchSupportTickets } = get();
        try {
            addLog({ timestamp: getTimestamp(), agent: "HITL", message: `Support ticket ${isApproved ? "approved" : "rejected"}: ${ticketId}`, level: "INFO" });

            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (get().apiKey) headers["x-api-key"] = get().apiKey!;

            const res = await fetch(`/api/support/${ticketId}/approve`, {
                method: "POST",
                headers,
                body: JSON.stringify({ isApproved, feedback }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as { status: string };
            addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: `Ticket ${data.status} — ${isApproved ? "reply sent via n8n" : "rejected"}`, level: "SUCCESS" });
            addAlert({ message: isApproved ? "Yanit n8n üzerinden iletildi!" : "Ticket reddedildi.", type: isApproved ? "success" : "warning" });
            await fetchSupportTickets();
        } catch (err) {
            addAlert({ message: `Support ticket hatasi: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
        }
    },

    fetchCampaignDrafts: async () => {
        try {
            const headers: Record<string, string> = {};
            if (get().apiKey) headers["x-api-key"] = get().apiKey!;

            const res = await fetch("/api/campaign/pending", { headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as { campaigns: CampaignDraftSummary[] };
            set({ campaignDrafts: data.campaigns ?? [] });
        } catch (err) {
            console.error("fetchCampaignDrafts failed:", err);
        }
    },

    approveCampaign: async (campaignId: string, isApproved: boolean, feedback?: string) => {
        const { addLog, addAlert, fetchCampaignDrafts } = get();
        try {
            addLog({ timestamp: getTimestamp(), agent: "CMO", message: `Campaign ${isApproved ? "approved → publishing" : "rejected"}: ${campaignId}`, level: "INFO" });

            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (get().apiKey) headers["x-api-key"] = get().apiKey!;

            const res = await fetch(`/api/campaign/${campaignId}/approve`, {
                method: "POST",
                headers,
                body: JSON.stringify({ isApproved, feedback }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as { status: string };
            addLog({ timestamp: getTimestamp(), agent: "CMO", message: `Campaign ${data.status} — posted to Discord & Telegram`, level: "SUCCESS" });
            addAlert({ message: isApproved ? "Kampanya yayinlandi! Discord & Telegram'a gönderildi." : "Kampanya reddedildi.", type: isApproved ? "success" : "warning" });
            await fetchCampaignDrafts();
        } catch (err) {
            addAlert({ message: `Kampanya hatasi: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
        }
    },

    // ── Social Media ──
    fetchSocialAccounts: async () => {
        try {
            const headers: Record<string, string> = {};
            if (get().apiKey) headers["x-api-key"] = get().apiKey!;
            const res = await fetch("/api/social/accounts", { headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as { accounts: SocialAccount[] };
            set({ socialAccounts: data.accounts ?? [] });
        } catch (err) {
            console.error("fetchSocialAccounts failed:", err);
        }
    },

    connectSocialAccount: async (payload) => {
        const { addAlert } = get();
        try {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (get().apiKey) headers["x-api-key"] = get().apiKey!;
            const res = await fetch("/api/social/accounts/connect", { method: "POST", headers, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            addAlert({ message: `${payload.platform} hesabı bağlandı.`, type: "success" });
            await get().fetchSocialAccounts();
            await get().fetchSocialSummary();
        } catch (err) {
            addAlert({ message: `Bağlantı hatası: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
        }
    },

    disconnectSocialAccount: async (id: string) => {
        const { addAlert } = get();
        try {
            const headers: Record<string, string> = {};
            if (get().apiKey) headers["x-api-key"] = get().apiKey!;
            await fetch(`/api/social/accounts/${id}`, { method: "DELETE", headers });
            addAlert({ message: "Hesap bağlantısı kesildi.", type: "warning" });
            await get().fetchSocialAccounts();
            await get().fetchSocialSummary();
        } catch (err) {
            addAlert({ message: `Hata: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
        }
    },

    syncSocialAccount: async (id: string) => {
        const { addAlert } = get();
        try {
            const headers: Record<string, string> = {};
            if (get().apiKey) headers["x-api-key"] = get().apiKey!;
            const res = await fetch(`/api/social/accounts/${id}/sync`, { method: "POST", headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            addAlert({ message: "Hesap bilgileri güncellendi.", type: "success" });
            await get().fetchSocialAccounts();
        } catch (err) {
            addAlert({ message: `Sync hatası: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
        }
    },

    fetchScheduledPosts: async () => {
        try {
            const headers: Record<string, string> = {};
            if (get().apiKey) headers["x-api-key"] = get().apiKey!;
            const res = await fetch("/api/social/posts", { headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as { posts: ScheduledPost[] };
            set({ scheduledPosts: data.posts ?? [] });
        } catch (err) {
            console.error("fetchScheduledPosts failed:", err);
        }
    },

    createScheduledPost: async (payload) => {
        const { addAlert } = get();
        try {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (get().apiKey) headers["x-api-key"] = get().apiKey!;
            const res = await fetch("/api/social/posts", { method: "POST", headers, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            addAlert({ message: "Post zamanlandı.", type: "success" });
            await get().fetchScheduledPosts();
            await get().fetchSocialSummary();
        } catch (err) {
            addAlert({ message: `Post oluşturma hatası: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
        }
    },

    cancelScheduledPost: async (id: string) => {
        const { addAlert } = get();
        try {
            const headers: Record<string, string> = {};
            if (get().apiKey) headers["x-api-key"] = get().apiKey!;
            await fetch(`/api/social/posts/${id}`, { method: "DELETE", headers });
            addAlert({ message: "Post iptal edildi.", type: "warning" });
            await get().fetchScheduledPosts();
            await get().fetchSocialSummary();
        } catch (err) {
            addAlert({ message: `İptal hatası: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
        }
    },

    publishPostNow: async (id: string) => {
        const { addAlert } = get();
        try {
            const headers: Record<string, string> = {};
            if (get().apiKey) headers["x-api-key"] = get().apiKey!;
            const res = await fetch(`/api/social/posts/${id}/publish`, { method: "POST", headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as { status: string };
            addAlert({ message: data.status === "PUBLISHED" ? "Post yayınlandı!" : "Bazı platformlarda hata oluştu.", type: data.status === "PUBLISHED" ? "success" : "warning" });
            await get().fetchScheduledPosts();
            await get().fetchSocialSummary();
        } catch (err) {
            addAlert({ message: `Yayın hatası: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
        }
    },

    fetchSocialSummary: async () => {
        try {
            const headers: Record<string, string> = {};
            if (get().apiKey) headers["x-api-key"] = get().apiKey!;
            const res = await fetch("/api/social/summary", { headers });
            if (!res.ok) return;
            const data = await res.json() as SocialSummary & { success: boolean };
            set({ socialSummary: { connectedCount: data.connectedCount, pendingCount: data.pendingCount, publishedThisWeek: data.publishedThisWeek } });
        } catch {
            // silently fail
        }
    },
}));


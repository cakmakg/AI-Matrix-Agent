// ── Primitive Types ──
export type AgentStatus = "IDLE" | "THINKING" | "ACTIVE" | "SUCCESS" | "ERROR";
export type WorkflowPhase = "IDLE" | "DISPATCHING" | "RUNNING" | "AWAITING_APPROVAL" | "PUBLISHING" | "DELIVERED" | "REVISING";
export type ActiveView = "chat" | "control" | "analytics" | "berichte" | "cfo" | "knowledge" | "settings" | "skills" | "social" | "security" | "auditor" | "supply" | "admin";
export type SocialPlatform = "twitter" | "instagram" | "linkedin" | "facebook" | "google_ads";
export type SaaSProduct = "cx" | "growth" | "strategy" | "backoffice" | "engineering" | "holding";

export type AgentId =
    | "ceo" | "cto" | "scraper" | "analyst" | "innovator"
    | "writer" | "qa" | "hitl" | "publisher" | "radar" | "cmo" | "cfo"
    | "auditor" | "supplyChain" | "salesRep" | "customerBot";

// ── Entity Interfaces ──
export interface AgentState {
    id: AgentId; label: string; shortLabel: string; icon: string; color: string; status: AgentStatus;
}
export interface SystemAlert {
    id: string; message: string; type: "info" | "success" | "warning" | "error"; timestamp: number;
}
export interface LogEntry {
    id: string; timestamp: string; agent: string; message: string;
    level: "INFO" | "WARN" | "ERROR" | "SUCCESS" | "CRITICAL";
}
export interface MissionSummary {
    threadId: string; task: string;
    status: "AWAITING_APPROVAL" | "APPROVED" | "REJECTED" | "PUBLISHED";
    humanFeedback: string; createdAt: string; contentPreview: string; content?: string;
}
export interface RagSource { title: string; score: number; }
export interface SupportTicketSummary {
    _id: string; platform: string; platform_id?: string; author?: string;
    n8nCategory?: string; aiSummary?: string; priority?: "critical" | "high" | "medium" | "low";
    emailMessageId?: string; gmailThreadId?: string;
    from: string; subject: string; category: "SUPPORT_PRICING" | "SUPPORT_BUG";
    draftResponse: string; ragSources: RagSource[]; createdAt: string;
}
export interface CampaignDraftSummary {
    _id: string; threadId: string; reportTitle: string; campaignContent: string;
    status: "AWAITING_APPROVAL" | "PUBLISHED" | "REJECTED"; createdAt: string;
}
export interface SocialAccount {
    _id: string; platform: SocialPlatform; label: string; username: string; accountId: string;
    pageId: string; isConnected: boolean; followerCount: number; profileImageUrl: string;
    lastSynced: string | null; createdAt: string;
}
export interface ScheduledPost {
    _id: string; platforms: SocialPlatform[]; content: string; mediaUrls: string[];
    scheduledAt: string; status: "AWAITING_APPROVAL" | "PENDING" | "PUBLISHED" | "FAILED" | "CANCELLED";
    publishedAt: string | null; errorMessage: string; title: string;
    threadId: string | null; campaignId: string | null;
    results: Record<string, unknown>; createdAt: string;
}
export interface SocialSummary { connectedCount: number; pendingCount: number; publishedThisWeek: number; }
export interface ChatMessage {
    id: string; role: "user" | "agent" | "system" | "alert";
    agentId?: AgentId; content: string; timestamp: string; phase?: WorkflowPhase;
}
export type DrawerItem =
    | { type: "report"; threadId: string }
    | { type: "support"; ticket: SupportTicketSummary }
    | { type: "campaign"; campaign: CampaignDraftSummary }
    | { type: "mission"; mission: MissionSummary };

// 🛡️ Security
export type SecurityEventType = "THREAT_BLOCKED" | "THREAT_SANITIZED" | "ACTION_REJECTED" | "RATE_LIMIT_HIT" | "INVALID_API_KEY";
export type SecuritySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type SystemSecurityStatus = "NORMAL" | "ELEVATED" | "WARNING" | "CRITICAL";
export interface SecurityEventItem {
    id: string; eventType: SecurityEventType; severity: SecuritySeverity;
    threadId: string; agentId: string; threatScore: number; details: string; rawInput: string; createdAt: string;
}
export interface SecurityStatus {
    systemStatus: SystemSecurityStatus; maxThreatScore: number;
    eventCounts: Record<SecurityEventType, number>; severityCounts: Record<SecuritySeverity, number>;
    queue: { PENDING: number; PROCESSING: number; SUCCESS: number; FAILED: number; REJECTED: number };
    recentEvents: SecurityEventItem[];
}

// ── Slice Interfaces ──

export interface UISlice {
    agents: Record<AgentId, AgentState>;
    activeAgent: AgentId | null;
    logs: LogEntry[];
    alerts: SystemAlert[];
    cronSecondsLeft: number;
    activeView: ActiveView;
    activeTrack: string;  // TrackId — string to avoid circular import from center-panel
    drawerItem: DrawerItem | null;
    editedContent: string | null;
    chatMessages: ChatMessage[];
    // New redesign state
    expandedTaskId: string | null;
    expandedTaskType: "report" | "support" | "campaign" | null;
    monitorCollapsed: boolean;
    terminalExpanded: boolean;
    setAgentStatus: (id: AgentId, status: AgentStatus) => void;
    setActiveAgent: (id: AgentId | null) => void;
    addLog: (entry: Omit<LogEntry, "id">) => void;
    addAlert: (alert: Omit<SystemAlert, "id" | "timestamp">) => void;
    removeAlert: (id: string) => void;
    setCronSeconds: (s: number) => void;
    resetAllAgents: () => void;
    setActiveView: (view: ActiveView) => void;
    setActiveTrack: (track: string) => void;
    setDrawerItem: (item: DrawerItem | null) => void;
    setEditedContent: (c: string | null) => void;
    addChatMessage: (msg: Omit<ChatMessage, "id">) => void;
    clearChatMessages: () => void;
    setExpandedTask: (id: string | null, type: "report" | "support" | "campaign" | null) => void;
    setMonitorCollapsed: (v: boolean) => void;
    setTerminalExpanded: (v: boolean) => void;
}

export interface AuthSlice {
    apiKey: string | null;
    clientName: string | null;
    clientSlug: string | null;
    clientEmail: string | null;
    clientPlan: "free" | "pro" | "enterprise" | "holding" | null;
    clientProduct: SaaSProduct | null;
    isAdmin: boolean;
    workspaces: { name: string; slug: string; apiKey: string }[];
    setApiKey: (key: string | null) => void;
    setWorkspaceInfo: (info: { name: string; slug: string; email: string; apiKey: string; plan?: "free" | "pro" | "enterprise" | "holding"; product?: SaaSProduct; isAdmin?: boolean }) => void;
    addWorkspace: (ws: { name: string; slug: string; apiKey: string }) => void;
    switchWorkspace: (apiKey: string) => void;
    logout: () => void;
}

export interface WorkflowSlice {
    workflowPhase: WorkflowPhase;
    threadId: string | null;
    pendingContent: string | null;
    missionMessage: string | null;
    missionCategory: "HOT_LEAD" | "CTO" | "SUPPORT" | null;
    reportStatus: "AWAITING_APPROVAL" | "APPROVED" | "REJECTED" | "PUBLISHED" | null;
    _workflowSSE: EventSource | null;
    setWorkflowPhase: (phase: WorkflowPhase) => void;
    sendMission: (message: string) => Promise<void>;
    approveMission: (feedback?: string) => Promise<void>;
    rejectMission: (feedback: string) => Promise<void>;
    forceRdScan: () => Promise<void>;
    pullLatestArtifact: () => Promise<void>;
}

export interface InboxSlice {
    missions: MissionSummary[];
    selectedMission: MissionSummary | null;
    archiveOpen: boolean;
    supportTickets: SupportTicketSummary[];
    campaignDrafts: CampaignDraftSummary[];
    fetchMissions: () => Promise<void>;
    selectMission: (threadId: string) => Promise<void>;
    toggleArchive: () => void;
    fetchSupportTickets: () => Promise<void>;
    approveSupportTicket: (ticketId: string, isApproved: boolean, feedback?: string) => Promise<void>;
    fetchCampaignDrafts: () => Promise<void>;
    approveCampaign: (campaignId: string, isApproved: boolean, feedback?: string) => Promise<void>;
}

export interface SocialSlice {
    socialAccounts: SocialAccount[];
    scheduledPosts: ScheduledPost[];
    socialSummary: SocialSummary;
    fetchSocialAccounts: () => Promise<void>;
    connectSocialAccount: (data: { platform: SocialPlatform; label: string; accessToken: string; accessTokenSecret?: string; refreshToken?: string; pageId?: string; customerId?: string }) => Promise<void>;
    disconnectSocialAccount: (id: string) => Promise<void>;
    syncSocialAccount: (id: string) => Promise<void>;
    fetchScheduledPosts: () => Promise<void>;
    createScheduledPost: (data: { platforms: SocialPlatform[]; content: string; scheduledAt: string; mediaUrls?: string[]; title?: string }) => Promise<void>;
    cancelScheduledPost: (id: string) => Promise<void>;
    approveScheduledPost: (id: string) => Promise<void>;
    publishPostNow: (id: string) => Promise<void>;
    fetchSocialSummary: () => Promise<void>;
}

// ── Admin (God Mode) Types ──
export type TenantLiveStatus = "active" | "warning" | "error" | "idle" | "suspended";
export type MarginAlertLevel = "healthy" | "warning" | "danger" | "critical" | "loss";

export interface TenantSummary {
    _id: string; name: string; slug: string; plan: string; product: string;
    status: string; isAdmin: boolean; email: string; sector: string;
    language: string; workflowsThisMonth: number; createdAt: string;
    liveStatus?: TenantLiveStatus; lastAgent?: string;
}

export interface TenantDetail {
    client: TenantSummary;
    config: Record<string, unknown>;
    stats: {
        expense: number; revenue: number; pnl: number; margin: number;
        totalWorkflows: number; securityEventsThisMonth: number;
    };
}

export interface GlobalSecurityData {
    globalStatus: SystemSecurityStatus;
    totalThreats: number;
    severityCounts: Record<string, number>;
    byTenant: { _id: string; count: number; maxThreat: number }[];
    recentEvents: SecurityEventItem[];
}

export interface GlobalFinanceData {
    periodLabel: string; totalExpense: number; totalRevenue: number;
    projectedRevenue: number; netPnl: number; totalLLMCalls: number;
    stripePayments: number;
    byAgent: { agent: string; cost: number; calls: number }[];
    byTenant: { clientId: string; cost: number; calls: number }[];
}

export interface TenantPnL {
    name: string; slug: string; plan: string; revenue: number; expense: number;
    pnl: number; margin: number; llmCalls: number; alertLevel: MarginAlertLevel;
}

export interface MarginAlert {
    slug: string; name: string; plan: string; revenue: number;
    expense: number; margin: number; severity: string;
}

export interface AdminGlobalEvent {
    threadId: string; clientId: string; tenantSlug: string;
    type: string; agent: string; timestamp: number;
}

export interface AdminLogEntry {
    _id: string; adminId: { name: string; slug: string };
    action: string; target: { type: string; id: string };
    details: Record<string, unknown>; createdAt: string;
}

export interface BannedIPEntry {
    _id: string; ip: string; reason: string;
    source: "MANUAL" | "AUTO_PROMPT_INJECTION" | "AUTO_DDOS" | "AUTO_ABUSE";
    clientId: string | null; expiresAt: string | null;
    isActive: boolean; createdAt: string;
}


// -- Zaman Makinesi (Time Machine) --
export interface WorkflowSnapshotEntry {
    _id: string;
    threadId: string;
    step: number;
    nodeName: string;
    clientId: string;
    tenantSlug: string;
    output: Record<string, unknown>;
    keyState: {
        nextAgent: string;
        revisionCount: number;
        confidenceScore: number;
        threatScore: number;
        fileSaved: boolean;
    };
    createdAt: string;
}

export interface RecentWorkflow {
    threadId: string;
    clientId: string;
    tenantSlug: string;
    stepCount: number | null;
    lastNode: string | null;
    startedAt: string;
    lastActivity: string;
    isActive: boolean;
}
export interface CostEvent {
    type: "cost_tick";
    clientId: string;
    agentName: string;
    threadId: string;
    cost: number;
    inputTokens: number;
    outputTokens: number;
    model: string;
    timestamp: number;
}

export interface BurnRatePoint {
    timestamp: number;
    cost: number;
    cumulative: number;
}

export interface AdminSlice {
    adminTenants: TenantSummary[];
    selectedTenantSlug: string | null;
    ghostMode: boolean;
    globalEvents: AdminGlobalEvent[];
    globalSecurity: GlobalSecurityData | null;
    globalFinance: GlobalFinanceData | null;
    tenantPnL: TenantPnL[];
    financeAlerts: MarginAlert[];
    adminLogs: AdminLogEntry[];
    bannedIPs: BannedIPEntry[];
    burnRateHistory: BurnRatePoint[];
    _adminSSE: EventSource | null;
    _ghostSSE: EventSource | null;
    _financeSSE: EventSource | null;
    fetchAdminTenants: () => Promise<void>;
    fetchTenantDetail: (slug: string) => Promise<TenantDetail | null>;
    haltTenant: (slug: string, reason: string) => Promise<boolean>;
    resumeTenant: (slug: string) => Promise<boolean>;
    changeTenantPlan: (slug: string, plan: string) => Promise<boolean>;
    throttleTenant: (slug: string, throttle: boolean) => Promise<boolean>;
    fetchGlobalSecurity: () => Promise<void>;
    fetchGlobalFinance: () => Promise<void>;
    fetchTenantPnL: () => Promise<void>;
    fetchFinanceAlerts: () => Promise<void>;
    fetchAdminLogs: () => Promise<void>;
    fetchBannedIPs: () => Promise<void>;
    banIP: (ip: string, reason: string, durationHours?: number) => Promise<boolean>;
    unbanIP: (ip: string) => Promise<boolean>;
    connectGlobalSSE: () => void;
    disconnectGlobalSSE: () => void;
    connectGhostSSE: (slug: string) => void;
    disconnectGhostSSE: () => void;
    connectFinanceSSE: () => void;
    disconnectFinanceSSE: () => void;
    setSelectedTenant: (slug: string | null) => void;
    // Time Machine
    recentWorkflows: RecentWorkflow[];
    workflowSnapshots: WorkflowSnapshotEntry[];
    timeMachineThreadId: string | null;
    selectedSnapshotStep: number | null;
    fetchRecentWorkflows: () => Promise<void>;
    fetchWorkflowSnapshots: (threadId: string) => Promise<void>;
    setTimeMachineThread: (threadId: string | null) => void;
    setSelectedSnapshotStep: (step: number | null) => void;
}

// Combined store type
export type AgentStore = UISlice & AuthSlice & WorkflowSlice & InboxSlice & SocialSlice & AdminSlice;

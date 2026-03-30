import { create } from "zustand";
import type { AgentStore } from "./types";
import { createUISlice } from "./slices/uiSlice";
import { createAuthSlice } from "./slices/authSlice";
import { createWorkflowSlice } from "./slices/workflowSlice";
import { createInboxSlice } from "./slices/inboxSlice";
import { createSocialSlice } from "./slices/socialSlice";
import { createAdminSlice } from "./slices/adminSlice";

export const useAgentStore = create<AgentStore>()((...a) => ({
    ...createUISlice(...a),
    ...createAuthSlice(...a),
    ...createWorkflowSlice(...a),
    ...createInboxSlice(...a),
    ...createSocialSlice(...a),
    ...createAdminSlice(...a),
}));

// Re-export all types for backward compatibility with existing component imports
export type {
    AgentStatus, AgentId, WorkflowPhase, AgentState,
    SystemAlert, LogEntry, ChatMessage, DrawerItem, ActiveView,
    MissionSummary, RagSource,
    SupportTicketSummary, CampaignDraftSummary,
    SocialPlatform, SocialAccount, ScheduledPost, SocialSummary, SaaSProduct,
    SecurityEventType, SecuritySeverity, SystemSecurityStatus, SecurityEventItem, SecurityStatus,
    TenantSummary, TenantDetail, GlobalSecurityData, GlobalFinanceData,
    TenantPnL, MarginAlert, AdminGlobalEvent, AdminLogEntry, TenantLiveStatus, MarginAlertLevel, BannedIPEntry,
    CostEvent, BurnRatePoint,
    WorkflowSnapshotEntry, RecentWorkflow,
    AgentStore,
} from "./types";

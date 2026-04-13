import { StateCreator } from "zustand";
import type { AgentStore, UISlice, AgentId, AgentStatus, LogEntry, SystemAlert, DrawerItem, ActiveView, ChatMessage } from "../types";
import { DEFAULT_AGENTS } from "../utils";

export const createUISlice: StateCreator<AgentStore, [], [], UISlice> = (set, get) => ({
    agents: { ...DEFAULT_AGENTS },
    activeAgent: null,
    logs: [],
    alerts: [],
    cronSecondsLeft: 120,
    activeView: "control",
    activeTrack: "cx",
    drawerItem: null,
    editedContent: null,
    chatMessages: [],
    expandedTaskId: null,
    expandedTaskType: null,
    monitorCollapsed: false,
    terminalExpanded: false,

    setAgentStatus: (id: AgentId, status: AgentStatus) =>
        set((s) => ({ agents: { ...s.agents, [id]: { ...s.agents[id], status } } })),

    setActiveAgent: (id) => set({ activeAgent: id }),

    addLog: (entry: Omit<LogEntry, "id">) =>
        set((s) => ({
            logs: [
                ...s.logs.slice(-120),
                { ...entry, id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
            ],
        })),

    addAlert: (alert: Omit<SystemAlert, "id" | "timestamp">) => {
        const id = `alert-${Date.now()}`;
        set((s) => ({ alerts: [...s.alerts, { ...alert, id, timestamp: Date.now() }] }));
        setTimeout(() => get().removeAlert(id), 5000);
    },

    removeAlert: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),

    setCronSeconds: (s) => set({ cronSecondsLeft: s }),

    resetAllAgents: () => set({ agents: { ...DEFAULT_AGENTS }, activeAgent: null }),

    setActiveView: (view: ActiveView) => set({ activeView: view }),
    setActiveTrack: (track: string) => set({ activeTrack: track }),
    setDrawerItem: (item: DrawerItem | null) => set({ drawerItem: item }),
    setEditedContent: (c) => set({ editedContent: c }),

    addChatMessage: (msg: Omit<ChatMessage, "id">) =>
        set((s) => ({
            chatMessages: [
                ...s.chatMessages.slice(-200),
                { ...msg, id: `cm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
            ],
        })),

    clearChatMessages: () => set({ chatMessages: [] }),

    setExpandedTask: (id, type) => set({ expandedTaskId: id, expandedTaskType: type }),
    setMonitorCollapsed: (v) => set({ monitorCollapsed: v }),
    setTerminalExpanded: (v) => set({ terminalExpanded: v }),
});

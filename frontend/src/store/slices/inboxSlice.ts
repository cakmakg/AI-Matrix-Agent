import { StateCreator } from "zustand";
import type { AgentStore, InboxSlice, MissionSummary, SupportTicketSummary, CampaignDraftSummary } from "../types";
import { apiFetch, buildHeaders, getTimestamp } from "../utils";

export const createInboxSlice: StateCreator<AgentStore, [], [], InboxSlice> = (set, get) => ({
    missions: [],
    selectedMission: null,
    archiveOpen: false,
    supportTickets: [],
    campaignDrafts: [],

    fetchMissions: async () => {
        try {
            const data = await apiFetch.get<{ missions: MissionSummary[] }>("/api/missions?limit=50", get().apiKey);
            set({ missions: data.missions ?? [] });
        } catch (err) {
            console.error("fetchMissions failed:", err);
        }
    },

    selectMission: async (threadId: string) => {
        const existing = get().missions.find((m) => m.threadId === threadId);
        if (existing) set({ selectedMission: existing });
        try {
            const data = await apiFetch.get<MissionSummary & { content: string }>(`/api/missions/${threadId}`, get().apiKey);
            set({ selectedMission: { ...data } });
        } catch (err) {
            console.error("selectMission failed:", err);
        }
    },

    toggleArchive: () => {
        const isOpen = get().archiveOpen;
        if (!isOpen) get().fetchMissions();
        set({ archiveOpen: !isOpen, selectedMission: null });
    },

    fetchSupportTickets: async () => {
        try {
            const data = await apiFetch.get<{ tickets: SupportTicketSummary[] }>("/api/support/pending", get().apiKey);
            set({ supportTickets: data.tickets ?? [] });
        } catch (err) {
            console.error("fetchSupportTickets failed:", err);
        }
    },

    approveSupportTicket: async (ticketId: string, isApproved: boolean, feedback?: string) => {
        const { addLog, addAlert, fetchSupportTickets } = get();
        try {
            addLog({ timestamp: getTimestamp(), agent: "HITL", message: `Support ticket ${isApproved ? "approved" : "rejected"}: ${ticketId}`, level: "INFO" });
            const res = await fetch(`/api/support/${ticketId}/approve`, {
                method: "POST",
                headers: buildHeaders(get().apiKey, true),
                body: JSON.stringify({ isApproved, feedback }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as { status: string };
            addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: `Ticket ${data.status} — ${isApproved ? "reply sent via n8n" : "rejected"}`, level: "SUCCESS" });
            addAlert({ message: isApproved ? "Yanit n8n üzerinden iletildi!" : "Ticket reddedildi.", type: isApproved ? "success" : "warning" });
            await fetchSupportTickets();
        } catch (err) {
            get().addAlert({ message: `Support ticket hatasi: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
        }
    },

    fetchCampaignDrafts: async () => {
        try {
            const data = await apiFetch.get<{ campaigns: CampaignDraftSummary[] }>("/api/campaign/pending", get().apiKey);
            set({ campaignDrafts: data.campaigns ?? [] });
        } catch (err) {
            console.error("fetchCampaignDrafts failed:", err);
        }
    },

    approveCampaign: async (campaignId: string, isApproved: boolean, feedback?: string) => {
        const { addLog, addAlert, fetchCampaignDrafts } = get();
        try {
            addLog({ timestamp: getTimestamp(), agent: "CMO", message: `Campaign ${isApproved ? "approved → publishing" : "rejected"}: ${campaignId}`, level: "INFO" });
            const res = await fetch(`/api/campaign/${campaignId}/approve`, {
                method: "POST",
                headers: buildHeaders(get().apiKey, true),
                body: JSON.stringify({ isApproved, feedback }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as { status: string };
            addLog({ timestamp: getTimestamp(), agent: "CMO", message: `Campaign ${data.status} — posted to Discord & Telegram`, level: "SUCCESS" });
            addAlert({ message: isApproved ? "Kampanya yayinlandi! Discord & Telegram'a gönderildi." : "Kampanya reddedildi.", type: isApproved ? "success" : "warning" });
            await fetchCampaignDrafts();
        } catch (err) {
            get().addAlert({ message: `Kampanya hatasi: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
        }
    },
});

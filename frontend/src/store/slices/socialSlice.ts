import { StateCreator } from "zustand";
import type { AgentStore, SocialSlice, SocialAccount, ScheduledPost, SocialSummary } from "../types";
import { apiFetch, buildHeaders } from "../utils";

export const createSocialSlice: StateCreator<AgentStore, [], [], SocialSlice> = (set, get) => ({
    socialAccounts: [],
    scheduledPosts: [],
    socialSummary: { connectedCount: 0, pendingCount: 0, publishedThisWeek: 0 },

    fetchSocialAccounts: async () => {
        try {
            const data = await apiFetch.get<{ accounts: SocialAccount[] }>("/api/social/accounts", get().apiKey);
            set({ socialAccounts: data.accounts ?? [] });
        } catch (err) {
            console.error("fetchSocialAccounts failed:", err);
        }
    },

    connectSocialAccount: async (payload) => {
        try {
            await apiFetch.post("/api/social/accounts/connect", payload, get().apiKey);
            get().addAlert({ message: `${payload.platform} hesabı bağlandı.`, type: "success" });
            await get().fetchSocialAccounts();
            await get().fetchSocialSummary();
        } catch (err) {
            get().addAlert({ message: `Bağlantı hatası: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
        }
    },

    disconnectSocialAccount: async (id: string) => {
        try {
            await apiFetch.del(`/api/social/accounts/${id}`, get().apiKey);
            get().addAlert({ message: "Hesap bağlantısı kesildi.", type: "warning" });
            await get().fetchSocialAccounts();
            await get().fetchSocialSummary();
        } catch (err) {
            get().addAlert({ message: `Hata: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
        }
    },

    syncSocialAccount: async (id: string) => {
        try {
            await apiFetch.post(`/api/social/accounts/${id}/sync`, {}, get().apiKey);
            get().addAlert({ message: "Hesap bilgileri güncellendi.", type: "success" });
            await get().fetchSocialAccounts();
        } catch (err) {
            get().addAlert({ message: `Sync hatası: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
        }
    },

    fetchScheduledPosts: async () => {
        try {
            const data = await apiFetch.get<{ posts: ScheduledPost[] }>("/api/social/posts", get().apiKey);
            set({ scheduledPosts: data.posts ?? [] });
        } catch (err) {
            console.error("fetchScheduledPosts failed:", err);
        }
    },

    createScheduledPost: async (payload) => {
        try {
            await apiFetch.post("/api/social/posts", payload, get().apiKey);
            get().addAlert({ message: "Post zamanlandı.", type: "success" });
            await get().fetchScheduledPosts();
            await get().fetchSocialSummary();
        } catch (err) {
            get().addAlert({ message: `Post oluşturma hatası: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
        }
    },

    cancelScheduledPost: async (id: string) => {
        try {
            await apiFetch.del(`/api/social/posts/${id}`, get().apiKey);
            get().addAlert({ message: "Post iptal edildi.", type: "warning" });
            await get().fetchScheduledPosts();
            await get().fetchSocialSummary();
        } catch (err) {
            get().addAlert({ message: `İptal hatası: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
        }
    },

    publishPostNow: async (id: string) => {
        try {
            const res = await fetch(`/api/social/posts/${id}/publish`, { method: "POST", headers: buildHeaders(get().apiKey) });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as { status: string };
            get().addAlert({ message: data.status === "PUBLISHED" ? "Post yayınlandı!" : "Bazı platformlarda hata oluştu.", type: data.status === "PUBLISHED" ? "success" : "warning" });
            await get().fetchScheduledPosts();
            await get().fetchSocialSummary();
        } catch (err) {
            get().addAlert({ message: `Yayın hatası: ${err instanceof Error ? err.message : String(err)}`, type: "error" });
        }
    },

    fetchSocialSummary: async () => {
        try {
            const res = await fetch("/api/social/summary", { headers: buildHeaders(get().apiKey) });
            if (!res.ok) return;
            const data = await res.json() as SocialSummary & { success: boolean };
            set({ socialSummary: { connectedCount: data.connectedCount, pendingCount: data.pendingCount, publishedThisWeek: data.publishedThisWeek } });
        } catch {
            // silently fail
        }
    },
});

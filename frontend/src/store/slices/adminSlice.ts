import { StateCreator } from "zustand";
import type {
    AgentStore, AdminSlice, TenantSummary, TenantDetail,
    AdminGlobalEvent, GlobalSecurityData, GlobalFinanceData,
    TenantPnL, MarginAlert, AdminLogEntry,
} from "../types";
import { BACKEND_SSE, apiFetch, buildHeaders } from "../utils";

const API = "/api/admin";

export const createAdminSlice: StateCreator<AgentStore, [], [], AdminSlice> = (set, get) => ({
    // State
    adminTenants: [],
    selectedTenantSlug: null,
    ghostMode: false,
    globalEvents: [],
    globalSecurity: null,
    globalFinance: null,
    tenantPnL: [],
    financeAlerts: [],
    adminLogs: [],
    _adminSSE: null,
    _ghostSSE: null,

    // ── Fleet Radar ──
    fetchAdminTenants: async () => {
        try {
            const data = await apiFetch.get<{ tenants: TenantSummary[] }>(`${API}/tenants`, get().apiKey);
            set({ adminTenants: data.tenants });
        } catch (err) {
            console.error("Admin tenants fetch failed:", err);
        }
    },

    fetchTenantDetail: async (slug: string) => {
        try {
            return await apiFetch.get<TenantDetail>(`${API}/tenants/${slug}`, get().apiKey);
        } catch (err) {
            console.error("Tenant detail fetch failed:", err);
            return null;
        }
    },

    setSelectedTenant: (slug: string | null) => {
        set({ selectedTenantSlug: slug, ghostMode: slug !== null });
        if (slug) {
            get().connectGhostSSE(slug);
        } else {
            get().disconnectGhostSSE();
        }
    },

    // ── SOC ──
    haltTenant: async (slug: string, reason: string) => {
        try {
            await apiFetch.post(`${API}/tenants/${slug}/halt`, { reason }, get().apiKey);
            await get().fetchAdminTenants();
            return true;
        } catch (err) {
            console.error("Halt tenant failed:", err);
            return false;
        }
    },

    resumeTenant: async (slug: string) => {
        try {
            await apiFetch.post(`${API}/tenants/${slug}/resume`, {}, get().apiKey);
            await get().fetchAdminTenants();
            return true;
        } catch (err) {
            console.error("Resume tenant failed:", err);
            return false;
        }
    },

    changeTenantPlan: async (slug: string, plan: string) => {
        try {
            const res = await fetch(`${API}/tenants/${slug}/plan`, {
                method: "PATCH",
                headers: buildHeaders(get().apiKey, true),
                body: JSON.stringify({ plan }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            await get().fetchAdminTenants();
            return true;
        } catch (err) {
            console.error("Change plan failed:", err);
            return false;
        }
    },

    fetchGlobalSecurity: async () => {
        try {
            const data = await apiFetch.get<GlobalSecurityData>(`${API}/security/global`, get().apiKey);
            set({ globalSecurity: data });
        } catch (err) {
            console.error("Global security fetch failed:", err);
        }
    },

    // ── FinOps ──
    fetchGlobalFinance: async () => {
        try {
            const data = await apiFetch.get<GlobalFinanceData>(`${API}/finance/global`, get().apiKey);
            set({ globalFinance: data });
        } catch (err) {
            console.error("Global finance fetch failed:", err);
        }
    },

    fetchTenantPnL: async () => {
        try {
            const data = await apiFetch.get<{ tenants: TenantPnL[] }>(`${API}/finance/per-tenant`, get().apiKey);
            set({ tenantPnL: data.tenants });
        } catch (err) {
            console.error("Tenant PnL fetch failed:", err);
        }
    },

    fetchFinanceAlerts: async () => {
        try {
            const data = await apiFetch.get<{ alerts: MarginAlert[] }>(`${API}/finance/alerts`, get().apiKey);
            set({ financeAlerts: data.alerts });
        } catch (err) {
            console.error("Finance alerts fetch failed:", err);
        }
    },

    // ── Logs ──
    fetchAdminLogs: async () => {
        try {
            const data = await apiFetch.get<{ logs: AdminLogEntry[] }>(`${API}/logs`, get().apiKey);
            set({ adminLogs: data.logs });
        } catch (err) {
            console.error("Admin logs fetch failed:", err);
        }
    },

    // ── SSE: Global Event Stream ──
    connectGlobalSSE: () => {
        const existing = get()._adminSSE;
        if (existing) existing.close();

        const apiKey = get().apiKey;
        const url = `${BACKEND_SSE}${API}/events/global`;
        const es = new EventSource(`${url}${url.includes("?") ? "&" : "?"}apiKey=${apiKey}`);

        es.onopen = () => console.log("[GOD MODE] Global SSE connected");

        es.onmessage = (e) => {
            try {
                const event: AdminGlobalEvent = JSON.parse(e.data);
                if (event.type === "connected" || event.type === "active_workflows") return;

                set((s) => ({
                    globalEvents: [event, ...s.globalEvents].slice(0, 200),
                    // Canlı tenant durumunu güncelle
                    adminTenants: s.adminTenants.map((t) =>
                        t.slug === event.tenantSlug
                            ? { ...t, liveStatus: event.type === "error" ? "error" : "active", lastAgent: event.agent }
                            : t
                    ),
                }));
            } catch { /* parse error, ignore */ }
        };

        es.onerror = () => console.warn("[GOD MODE] Global SSE error — reconnecting...");

        set({ _adminSSE: es });
    },

    disconnectGlobalSSE: () => {
        const es = get()._adminSSE;
        if (es) {
            es.close();
            set({ _adminSSE: null });
        }
    },

    // ── SSE: Ghost Mode (tek tenant izleme) ──
    connectGhostSSE: (slug: string) => {
        const existing = get()._ghostSSE;
        if (existing) existing.close();

        const apiKey = get().apiKey;
        const url = `${BACKEND_SSE}${API}/tenants/${slug}/live`;
        const es = new EventSource(`${url}${url.includes("?") ? "&" : "?"}apiKey=${apiKey}`);

        es.onopen = () => console.log(`[GHOST MODE] Connected to ${slug}`);

        es.onmessage = (e) => {
            try {
                const event = JSON.parse(e.data);
                // Ghost event'leri de global events'e ekle (filtrelenmiş)
                set((s) => ({
                    globalEvents: [{ ...event, _ghost: true }, ...s.globalEvents].slice(0, 200),
                }));
            } catch { /* ignore */ }
        };

        es.onerror = () => console.warn(`[GHOST MODE] SSE error for ${slug}`);

        set({ _ghostSSE: es, ghostMode: true });
    },

    disconnectGhostSSE: () => {
        const es = get()._ghostSSE;
        if (es) {
            es.close();
            set({ _ghostSSE: null, ghostMode: false, selectedTenantSlug: null });
        }
    },
});

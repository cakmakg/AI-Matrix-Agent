import { StateCreator } from "zustand";
import type { AgentStore, AuthSlice, SaaSProduct } from "../types";

const LS = {
    apiKey:     "ai_orchestra_api_key",
    name:       "ai_orchestra_client_name",
    slug:       "ai_orchestra_client_slug",
    email:      "ai_orchestra_client_email",
    plan:       "ai_orchestra_client_plan",
    product:    "ai_orchestra_client_product",
    workspaces: "ai_orchestra_workspaces",
} as const;

const lsGet = (key: string): string | null =>
    typeof window !== "undefined" ? localStorage.getItem(key) : null;

const lsSet = (key: string, val: string): void => {
    if (typeof window !== "undefined") localStorage.setItem(key, val);
};

const lsDel = (key: string): void => {
    if (typeof window !== "undefined") localStorage.removeItem(key);
};

const lsWorkspaces = (): { name: string; slug: string; apiKey: string }[] => {
    try { return JSON.parse(lsGet(LS.workspaces) || "[]"); } catch { return []; }
};

export const createAuthSlice: StateCreator<AgentStore, [], [], AuthSlice> = (set, get) => ({
    apiKey:        lsGet(LS.apiKey),
    clientName:    lsGet(LS.name),
    clientSlug:    lsGet(LS.slug),
    clientEmail:   lsGet(LS.email),
    clientPlan:    lsGet(LS.plan) as "free" | "pro" | "enterprise" | "holding" | null,
    clientProduct: lsGet(LS.product) as SaaSProduct | null,
    isAdmin:       lsGet("ai_orchestra_is_admin") === "true",
    workspaces:    lsWorkspaces(),

    setApiKey: (key) => {
        key ? lsSet(LS.apiKey, key) : lsDel(LS.apiKey);
        set({ apiKey: key });
    },

    setWorkspaceInfo: ({ name, slug, email, apiKey, plan, product, isAdmin }) => {
        const resolvedPlan    = (plan    ?? "enterprise") as "free" | "pro" | "enterprise" | "holding";
        const resolvedProduct = product ?? "cx";
        lsSet(LS.apiKey,   apiKey);
        lsSet(LS.name,     name);
        lsSet(LS.slug,     slug);
        lsSet(LS.email,    email);
        lsSet(LS.plan,     resolvedPlan);
        lsSet(LS.product,  resolvedProduct);
        if (isAdmin) lsSet("ai_orchestra_is_admin", "true"); else lsDel("ai_orchestra_is_admin");
        const list = lsWorkspaces().filter((w) => w.slug !== slug);
        list.push({ name, slug, apiKey });
        lsSet(LS.workspaces, JSON.stringify(list));
        set((s) => ({
            apiKey, clientName: name, clientSlug: slug, clientEmail: email,
            clientPlan: resolvedPlan,
            clientProduct: resolvedProduct as SaaSProduct,
            isAdmin: isAdmin ?? false,
            workspaces: [...s.workspaces.filter((w) => w.slug !== slug), { name, slug, apiKey }],
        }));
    },

    addWorkspace: (ws) => {
        set((s) => {
            const list = [...s.workspaces.filter((w) => w.slug !== ws.slug), ws];
            lsSet(LS.workspaces, JSON.stringify(list));
            return { workspaces: list };
        });
    },

    switchWorkspace: (apiKey) => {
        const ws = get().workspaces.find((w) => w.apiKey === apiKey);
        if (!ws) return;
        lsSet(LS.apiKey, apiKey);
        lsSet(LS.name, ws.name);
        lsSet(LS.slug, ws.slug);
        set({ apiKey, clientName: ws.name, clientSlug: ws.slug });
    },

    logout: () => {
        [LS.apiKey, LS.name, LS.slug, LS.email, LS.plan, LS.product].forEach(lsDel);
        lsDel("ai_orchestra_is_admin");
        set({ apiKey: null, clientName: null, clientSlug: null, clientEmail: null, clientPlan: null, clientProduct: null, isAdmin: false });
    },
});

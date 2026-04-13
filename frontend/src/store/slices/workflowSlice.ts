import { StateCreator } from "zustand";
import type { AgentStore, WorkflowSlice, AgentId } from "../types";
import { buildHeaders, getTimestamp, BACKEND_SSE } from "../utils";

const AGENT_LABELS: Record<string, string> = {
    ceo:         "Orchestrator routing...",
    scraper:     "Connecting to Global Network... Fetching data...",
    analyst:     "Processing data blocks...",
    innovator:   "Breaking conventional thinking... generating contrarian 10x insight...",
    writer:      "Composing B2B content...",
    qa:          "Scanning output for errors...",
    cto:         "Generating architecture blueprint...",
    hitl:        "HITL gate armed. Awaiting authorization.",
    publisher:   "Initiating payload delivery...",
    radar:       "R&D scan in progress...",
    auditor:     "Auditing invoices... scanning for anomalies...",
    supplyChain: "Monitoring stock levels... checking supplier inventory...",
    salesRep:    "B2B negotiation in progress... generating sales pitch...",
    customerBot: "Processing customer ticket... generating response...",
};

const RD_AGENT_LABELS: Record<string, string> = {
    ...AGENT_LABELS,
    ceo:       "Orchestrator routing R&D mission...",
    scraper:   "Tapping into Anthropic & OpenAI news feeds...",
    analyst:   "Processing AI landscape data...",
    writer:    "Composing innovation summary...",
    qa:        "Quality check on R&D output...",
    cto:       "Generating integration blueprint...",
    hitl:      "R&D blueprint ready — awaiting authorization.",
    radar:     "INNOVATION_RADAR active — live feed connected.",
};

export const createWorkflowSlice: StateCreator<AgentStore, [], [], WorkflowSlice> = (set, get) => {

    // ── SSE handler factories ────────────────────────────────────────────────

    function openSSE(threadId: string, skipFirst: AgentId, labels: Record<string, string>) {
        get()._workflowSSE?.close();
        let prev: AgentId | null = skipFirst;
        const es = new EventSource(`${BACKEND_SSE}/api/events/${threadId}`);
        set({ _workflowSSE: es });

        es.onmessage = (e: MessageEvent) => {
            let event: { type: string; agent?: string; status?: string; pendingContent?: string; message?: string };
            try { event = JSON.parse(e.data); } catch { return; }

            if (event.type === "agent_active" && event.agent) {
                const agentId = event.agent as AgentId;
                if (prev && prev !== agentId && prev !== skipFirst) get().setAgentStatus(prev, "SUCCESS");
                get().setAgentStatus(agentId, "ACTIVE");
                get().setActiveAgent(agentId);
                if (agentId === "cto") set({ missionCategory: "CTO" });
                const label = labels[agentId] ?? "Agent activated";
                get().addLog({ timestamp: getTimestamp(), agent: agentId.toUpperCase(), message: label, level: "INFO" });
                get().addChatMessage({ role: "agent", agentId, content: label, timestamp: getTimestamp() });
                prev = agentId;
            }

            if (event.type === "workflow_complete") {
                es.close(); set({ _workflowSSE: null });
                if (event.status === "AWAITING_HUMAN_APPROVAL") {
                    if (prev && prev !== skipFirst) get().setAgentStatus(prev, "SUCCESS");
                    get().setAgentStatus("hitl", "ACTIVE");
                    get().setActiveAgent("hitl");
                    get().addChatMessage({ role: "alert", content: "Rapor hazır — HITL onayı bekleniyor. Inbox'tan inceleyin.", timestamp: getTimestamp(), phase: "AWAITING_APPROVAL" });

                    const content = event.pendingContent?.trim();
                    const currentThreadId = get().threadId;

                    if (content) {
                        set({ pendingContent: content, workflowPhase: "AWAITING_APPROVAL", drawerItem: { type: "report", threadId: currentThreadId! } });
                        get().fetchMissions();
                        get().addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: "Workflow complete. Awaiting HITL authorization.", level: "WARN" });
                        get().addAlert({ message: "MISSION COMPLETE — AWAITING YOUR AUTHORIZATION", type: "warning" });
                    } else {
                        get().addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: "Workflow complete. Fetching artifact from MongoDB...", level: "WARN" });
                        const url = currentThreadId ? `/api/artifact/${currentThreadId}` : `/api/artifact/latest`;
                        fetch(url, { headers: buildHeaders(get().apiKey) })
                            .then((r) => r.json())
                            .then((artifact) => {
                                if (get().threadId !== currentThreadId) return; // stale response — new workflow started
                                const fetched = artifact.content?.trim() || "*(İçerik hazır — yeniden yükleyin)*";
                                set({ pendingContent: fetched, workflowPhase: "AWAITING_APPROVAL", drawerItem: { type: "report", threadId: currentThreadId! } });
                                get().fetchMissions();
                                get().addAlert({ message: "MISSION COMPLETE — AWAITING YOUR AUTHORIZATION", type: "warning" });
                            })
                            .catch(() => {
                                if (get().threadId !== currentThreadId) return;
                                set({ pendingContent: "*(Blueprint hazır — Pull Intel ile yükleyin)*", workflowPhase: "AWAITING_APPROVAL", drawerItem: { type: "report", threadId: currentThreadId! } });
                                get().addAlert({ message: "MISSION COMPLETE — AWAITING YOUR AUTHORIZATION", type: "warning" });
                            });
                    }
                }
            }

            if (event.type === "error") {
                es.close(); set({ _workflowSSE: null });
                get().setAgentStatus((prev ?? "ceo") as AgentId, "ERROR");
                get().setWorkflowPhase("IDLE");
                get().setActiveAgent(null);
                get().addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: `ERROR: ${event.message}`, level: "ERROR" });
                get().addAlert({ message: `MISSION FAILED: ${event.message}`, type: "error" });
            }
        };

        es.onerror = () => {
            es.close(); set({ _workflowSSE: null });
            get().setWorkflowPhase("IDLE");
            get().setActiveAgent(null);
            get().addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: "SSE connection lost.", level: "ERROR" });
            get().addAlert({ message: "SSE CONNECTION LOST — Check backend", type: "error" });
        };
    }

    function openRevisionSSE(threadId: string) {
        get()._workflowSSE?.close();
        let prev: AgentId | null = "ceo";
        const es = new EventSource(`${BACKEND_SSE}/api/events/${threadId}`);
        set({ _workflowSSE: es });

        es.onmessage = (e: MessageEvent) => {
            let event: { type: string; agent?: string; pendingContent?: string; message?: string };
            try { event = JSON.parse(e.data); } catch { return; }

            if (event.type === "agent_active" && event.agent) {
                const agentId = event.agent as AgentId;
                if (prev && prev !== agentId) get().setAgentStatus(prev, "SUCCESS");
                get().setAgentStatus(agentId, "ACTIVE");
                get().setActiveAgent(agentId);
                get().addLog({ timestamp: getTimestamp(), agent: agentId.toUpperCase(), message: "Revising...", level: "INFO" });
                prev = agentId;
            }

            if (event.type === "workflow_complete") {
                es.close(); set({ _workflowSSE: null });
                if (prev) get().setAgentStatus(prev, "SUCCESS");
                get().setAgentStatus("hitl", "ACTIVE");
                get().setActiveAgent("hitl");
                set({ pendingContent: event.pendingContent?.trim() || null, workflowPhase: "AWAITING_APPROVAL", drawerItem: { type: "report", threadId } });
                get().fetchMissions();
                get().addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: "Revision complete — new report ready.", level: "SUCCESS" });
                get().addAlert({ message: "REVISION COMPLETE — RE-REVIEW REQUIRED", type: "warning" });
            }

            if (event.type === "error") {
                es.close(); set({ _workflowSSE: null });
                get().setWorkflowPhase("AWAITING_APPROVAL");
                get().addAlert({ message: `REVISION ERROR: ${event.message}`, type: "error" });
            }
        };

        es.onerror = () => { es.close(); set({ _workflowSSE: null }); get().setWorkflowPhase("AWAITING_APPROVAL"); };
    }

    // ── Slice ────────────────────────────────────────────────────────────────

    return {
        workflowPhase: "IDLE",
        threadId: null,
        pendingContent: null,
        missionMessage: null,
        missionCategory: null,
        reportStatus: null,
        _workflowSSE: null,

        setWorkflowPhase: (phase) => set({ workflowPhase: phase }),

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

                const res = await fetch("/api/inbox", {
                    method: "POST",
                    headers: buildHeaders(get().apiKey, true),
                    body: JSON.stringify({ message, source: "operator" }),
                });
                const data = await res.json();

                if (data.status === "IGNORED") {
                    setAgentStatus("ceo", "SUCCESS");
                    setWorkflowPhase("IDLE");
                    setActiveAgent(null);
                    addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: "Message filtered: SPAM/OTHER", level: "WARN" });
                    addAlert({ message: "MESSAGE FILTERED: SPAM/OTHER", type: "warning" });
                    return;
                }

                if (data.status === "AWAITING_HUMAN_APPROVAL_SUPPORT") {
                    set({ threadId: data.threadId, pendingContent: data.pendingContent || "No content available.", workflowPhase: "AWAITING_APPROVAL", missionCategory: "SUPPORT" });
                    setAgentStatus("ceo", "SUCCESS");
                    setAgentStatus("hitl", "ACTIVE");
                    setActiveAgent("hitl");
                    addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: "Support request — HITL gate armed.", level: "WARN" });
                    addAlert({ message: "SUPPORT REQUEST — AWAITING AUTHORIZATION", type: "warning" });
                    return;
                }

                if (data.status === "PROCESSING" && data.threadId) {
                    set({ threadId: data.threadId, missionCategory: "HOT_LEAD" });
                    addLog({ timestamp: getTimestamp(), agent: "CEO", message: "Workflow started. Tracking agents via SSE...", level: "INFO" });
                    openSSE(data.threadId, "ceo", AGENT_LABELS);
                    return;
                }

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
                const res = await fetch("/api/approve", {
                    method: "POST",
                    headers: buildHeaders(get().apiKey, true),
                    body: JSON.stringify({ threadId, isApproved: true, feedback: feedback || "", category: get().missionCategory === "SUPPORT" ? "SUPPORT_PRICING" : "HOT_LEAD" }),
                });

                let data: { success?: boolean; status?: string; error?: string };
                try { data = await res.json(); }
                catch { throw new Error(`Server error ${res.status} — backend crashed. Check terminal.`); }

                if (data.success) {
                    setAgentStatus("publisher", "SUCCESS");
                    setWorkflowPhase("DELIVERED");
                    set({ reportStatus: "PUBLISHED" });
                    addLog({ timestamp: getTimestamp(), agent: "PUBLISHER", message: "PAYLOAD DELIVERED to external channels.", level: "SUCCESS" });
                    addAlert({ message: "PAYLOAD DELIVERED — TRANSMISSION COMPLETE", type: "success" });
                    // Inbox mission listesini güncelle
                    get().fetchMissions();
                    setTimeout(() => {
                        get().resetAllAgents();
                        set({ workflowPhase: "IDLE", threadId: null, pendingContent: null, missionMessage: null, missionCategory: null });
                    }, 4000);
                } else {
                    throw new Error(data.error || "Approval failed");
                }
            } catch (error) {
                setAgentStatus("publisher", "ERROR");
                setWorkflowPhase("AWAITING_APPROVAL");
                const errMsg = error instanceof Error ? error.message : "Delivery failed";
                addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: `PUBLISH ERROR: ${errMsg}`, level: "ERROR" });
                addAlert({ message: `DELIVERY FAILED: ${errMsg}`, type: "error" });
            }
        },

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
                const res = await fetch("/api/approve", {
                    method: "POST",
                    headers: buildHeaders(get().apiKey, true),
                    body: JSON.stringify({ threadId, isApproved: false, feedback, category: get().missionCategory === "SUPPORT" ? "SUPPORT_PRICING" : "HOT_LEAD" }),
                });

                let data: { success?: boolean; status?: string; error?: string };
                try { data = await res.json(); }
                catch { throw new Error(`Server error ${res.status} — backend crashed.`); }

                if (data.success && data.status === "REVISED") {
                    addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: "Revision started — waiting for agents...", level: "INFO" });
                    setAgentStatus("ceo", "ACTIVE");
                    setWorkflowPhase("REVISING");
                    setActiveAgent("ceo");
                    addAlert({ message: "REVISION CYCLE ACTIVE — AGENTS REWRITING...", type: "warning" });
                    openRevisionSSE(threadId);
                }
            } catch (error) {
                const errMsg = error instanceof Error ? error.message : "Revision failed";
                addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: `REVISION ERROR: ${errMsg}`, level: "ERROR" });
                addAlert({ message: `REVISION FAILED: ${errMsg}`, type: "error" });
            }
        },

        pullLatestArtifact: async () => {
            const { threadId, addLog, addAlert } = get();
            const primaryUrl = threadId ? `/api/artifact/${threadId}` : `/api/artifact/latest`;

            const tryFetch = async (url: string) => {
                const res = await fetch(url, { headers: buildHeaders(get().apiKey) });
                if (!res.ok) return null;
                const data = await res.json();
                return (!data.success || !data.content) ? null : data;
            };

            try {
                let data = await tryFetch(primaryUrl);
                if (!data && threadId) {
                    addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: "ThreadId ile bulunamadı — /latest deneniyor...", level: "WARN" });
                    data = await tryFetch("/api/artifact/latest");
                }
                if (!data) {
                    addAlert({ message: "NO PENDING INTEL — System is still processing", type: "warning" });
                    addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: "Intel pull: no pending reports found.", level: "WARN" });
                    return;
                }
                set({ pendingContent: data.content, workflowPhase: "AWAITING_APPROVAL", ...(data.threadId && !threadId ? { threadId: data.threadId } : {}) });
                addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: `Intel acquired: "${String(data.task ?? "").slice(0, 60)}..."`, level: "SUCCESS" });
                addAlert({ message: "INTEL ACQUIRED — ARTIFACT LOADED FROM DATABASE", type: "success" });
            } catch (error) {
                const errMsg = error instanceof Error ? error.message : "Pull failed";
                addLog({ timestamp: getTimestamp(), agent: "SYSTEM", message: `Intel pull failed: ${errMsg}`, level: "ERROR" });
                addAlert({ message: `INTEL PULL FAILED: ${errMsg}`, type: "error" });
            }
        },

        forceRdScan: async () => {
            const { addLog, setAgentStatus, setActiveAgent, setWorkflowPhase, addAlert } = get();
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
                const res = await fetch("/api/rnd", { method: "POST", headers: buildHeaders(get().apiKey, true) });
                const data = await res.json();
                if (!data.success || data.status !== "PROCESSING" || !data.threadId) throw new Error(data.error || "Unexpected R&D response");

                set({ threadId: data.threadId });
                addLog({ timestamp: getTimestamp(), agent: "RADAR", message: `R&D workflow started — threadId: ${data.threadId}`, level: "INFO" });

                get()._workflowSSE?.close();
                let prev: AgentId | null = "radar";
                const es = new EventSource(`${BACKEND_SSE}/api/events/${data.threadId}`);
                set({ _workflowSSE: es });

                es.onmessage = (e: MessageEvent) => {
                    let event: { type: string; agent?: string; status?: string; pendingContent?: string; message?: string };
                    try { event = JSON.parse(e.data); } catch { return; }

                    if (event.type === "agent_active" && event.agent) {
                        const agentId = event.agent as AgentId;
                        if (prev && prev !== agentId && prev !== "radar") get().setAgentStatus(prev, "SUCCESS");
                        get().setAgentStatus(agentId, "ACTIVE");
                        get().setActiveAgent(agentId);
                        if (agentId === "cto") set({ missionCategory: "CTO" });
                        addLog({ timestamp: getTimestamp(), agent: agentId.toUpperCase(), message: RD_AGENT_LABELS[agentId] ?? "R&D agent activated", level: "INFO" });
                        prev = agentId;
                    }

                    if (event.type === "workflow_complete" && event.status === "AWAITING_HUMAN_APPROVAL") {
                        es.close(); set({ _workflowSSE: null });
                        if (prev && prev !== "radar") get().setAgentStatus(prev, "SUCCESS");
                        set({ pendingContent: event.pendingContent || "No R&D content available.", workflowPhase: "AWAITING_APPROVAL" });
                        get().setAgentStatus("hitl", "ACTIVE");
                        get().setActiveAgent("hitl");
                        get().setAgentStatus("radar", "SUCCESS");
                        addLog({ timestamp: getTimestamp(), agent: "RADAR", message: "R&D SCAN COMPLETE — Innovation blueprint ready.", level: "SUCCESS" });
                        addAlert({ message: "R&D COMPLETE — BLUEPRINT AWAITING YOUR AUTHORIZATION", type: "success" });
                    }

                    if (event.type === "error") {
                        es.close(); set({ _workflowSSE: null });
                        get().setAgentStatus("radar", "ERROR");
                        setWorkflowPhase("IDLE");
                        setActiveAgent(null);
                        addLog({ timestamp: getTimestamp(), agent: "RADAR", message: `R&D ERROR: ${event.message}`, level: "ERROR" });
                        addAlert({ message: `R&D SCAN FAILED: ${event.message}`, type: "error" });
                    }
                };

                es.onerror = () => {
                    es.close(); set({ _workflowSSE: null });
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
    };
};
